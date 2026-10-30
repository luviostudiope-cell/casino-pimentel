-- =====================================================================
-- 008 · Funciones (RPC): barra, kardex, cierre del día, asistencia,
--       panel "Hoy", reportes, reporte diario, importador y web pública
-- =====================================================================

-- PIN del personal (bcrypt). Se usa para asistencia y para autorizar cortesías.
create or replace function public.fijar_pin_personal(p_personal_id uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_club uuid := app.club_id();
begin
  if not app.es_directiva() then raise exception 'Solo administración asigna PIN al personal.'; end if;
  if p_pin !~ '^[0-9]{4,6}$' then raise exception 'El PIN debe tener de 4 a 6 números.'; end if;
  if not exists (select 1 from public.personal where id = p_personal_id and club_id = v_club) then raise exception 'Persona no encontrada.'; end if;
  if exists (select 1 from app.personal_pin pp join public.personal p on p.id = pp.personal_id
              where p.club_id = v_club and p.activo and pp.personal_id <> p_personal_id and pp.pin_hash = extensions.crypt(p_pin, pp.pin_hash)) then
    raise exception 'Otra persona ya usa ese PIN. Elige otro.';
  end if;
  insert into app.personal_pin (personal_id, pin_hash) values (p_personal_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 6)))
  on conflict (personal_id) do update set pin_hash = excluded.pin_hash, actualizado_en = now();
  return jsonb_build_object('ok', true, 'mensaje', 'PIN asignado.');
end;
$$;

create or replace function app.personal_por_codigo(p_club uuid, p_codigo text)
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.id from public.personal p where p.club_id = p_club and p.activo and p.eliminado_en is null and p.dni = trim(p_codigo) limit 1),
    (select p.id from public.personal p join app.personal_pin pp on pp.personal_id = p.id
      where p.club_id = p_club and p.activo and p.eliminado_en is null and length(trim(p_codigo)) between 4 and 6
        and pp.pin_hash = extensions.crypt(trim(p_codigo), pp.pin_hash) limit 1)
  )
$$;

-- ---------------------------------------------------------------------
-- Asistencia (kiosco en la tablet de portería)
-- ---------------------------------------------------------------------
create or replace function public.identificar_personal(p_codigo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id(); v_hoy date; v_id uuid; v_p record; v_t record; v_ult text; v_sug text;
begin
  if not app.tiene_rol('porteria', 'presidente', 'directivo', 'admin') then raise exception 'La asistencia se marca en la tablet de portería.'; end if;
  if coalesce(trim(p_codigo), '') !~ '^[0-9]{4,8}$' then return jsonb_build_object('ok', false, 'mensaje', 'Escribe tu DNI (8 números) o tu PIN.'); end if;
  v_id := app.personal_por_codigo(v_club, p_codigo);
  if v_id is null then return jsonb_build_object('ok', false, 'mensaje', 'No encontramos ese DNI o PIN. Revisa el número o pide ayuda a administración.'); end if;
  v_hoy := app.hoy(v_club);
  select * into v_p from public.personal where id = v_id;
  select * into v_t from public.turnos where personal_id = v_id and fecha = v_hoy and eliminado_en is null;
  select tipo into v_ult from public.marcaciones where personal_id = v_id and fecha = v_hoy and eliminado_en is null order by hora desc limit 1;
  v_sug := case v_ult when 'entrada' then case when coalesce(v_t.refrigerio_min, 0) > 0 then 'inicio_refrigerio' else 'salida' end
                      when 'inicio_refrigerio' then 'fin_refrigerio' when 'fin_refrigerio' then 'salida' when 'salida' then 'entrada' else 'entrada' end;
  return jsonb_build_object('ok', true, 'personal_id', v_p.id, 'nombres', v_p.nombres, 'apellidos', v_p.apellidos, 'cargo', v_p.cargo, 'area', v_p.area,
    'foto_path', v_p.foto_path, 'sugerido', v_sug, 'ultima', v_ult, 'es_ejemplo', v_p.es_ejemplo,
    'turno', case when v_t.id is not null then jsonb_build_object('inicio', to_char(v_t.hora_inicio, 'HH24:MI'), 'fin', to_char(v_t.hora_fin, 'HH24:MI')) end);
end;
$$;

create or replace function public.marcar_asistencia(p_personal_id uuid, p_tipo text, p_foto_path text default null, p_dispositivo text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id(); v_hoy date; v_ahora timestamp; v_p record; v_t record; v_tol int; v_tarde int := 0; v_id uuid; v_msg text;
begin
  if not app.tiene_rol('porteria', 'presidente', 'directivo', 'admin') then raise exception 'La asistencia se marca en la tablet de portería.'; end if;
  if p_tipo not in ('entrada', 'inicio_refrigerio', 'fin_refrigerio', 'salida') then raise exception 'Elige qué vas a marcar.'; end if;
  select * into v_p from public.personal where id = p_personal_id and club_id = v_club and activo and eliminado_en is null;
  if v_p.id is null then raise exception 'Persona no encontrada.'; end if;
  v_hoy := app.hoy(v_club); v_ahora := app.ahora_local(v_club);
  if exists (select 1 from public.marcaciones where personal_id = v_p.id and tipo = p_tipo and hora > now() - interval '2 minutes') then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya marcaste ' || replace(p_tipo, '_', ' de ') || ' hace un momento.');
  end if;
  select * into v_t from public.turnos where personal_id = v_p.id and fecha = v_hoy and eliminado_en is null;
  v_tol := (app.reglas(v_club) #>> '{personal,tolerancia_tardanza_min}')::int;
  if p_tipo = 'entrada' and v_t.id is not null
     and not exists (select 1 from public.marcaciones where personal_id = v_p.id and fecha = v_hoy and tipo = 'entrada' and eliminado_en is null) then
    v_tarde := greatest(0, floor(extract(epoch from (v_ahora - (v_hoy + v_t.hora_inicio))) / 60))::int;
    if v_tarde <= v_tol then v_tarde := 0; end if;
  end if;
  insert into public.marcaciones (club_id, personal_id, fecha, tipo, minutos_tarde, turno_id, foto_path, dispositivo)
  values (v_club, v_p.id, v_hoy, p_tipo, v_tarde, v_t.id, p_foto_path, left(p_dispositivo, 120)) returning id into v_id;
  if v_tarde > 0 then
    perform app.notificar_directiva(v_club, 'tardanza', 'Tardanza del personal',
      v_p.nombres || ' ' || v_p.apellidos || ' (' || v_p.cargo || ') llegó ' || v_tarde || ' min tarde.', '/app/admin/personal');
  end if;
  v_msg := case p_tipo
    when 'entrada' then (case when extract(hour from v_ahora) < 12 then 'Buenos días' when extract(hour from v_ahora) < 19 then 'Buenas tardes' else 'Buenas noches' end) || ', ' || v_p.nombres || '. Entrada registrada.'
    when 'inicio_refrigerio' then 'Buen provecho, ' || v_p.nombres || '. Refrigerio iniciado.'
    when 'fin_refrigerio' then 'De vuelta, ' || v_p.nombres || '. Fin de refrigerio registrado.'
    else 'Hasta mañana, ' || v_p.nombres || '. Salida registrada.' end;
  return jsonb_build_object('ok', true, 'marcacion_id', v_id, 'tipo', p_tipo, 'hora', to_char(v_ahora, 'HH24:MI'), 'minutos_tarde', v_tarde, 'mensaje', v_msg,
    'aviso_tarde', case when v_tarde > 0 then 'Llegaste ' || v_tarde || ' min tarde' end);
end;
$$;

-- ---------------------------------------------------------------------
-- Barra: comandas, cortesías, cobro y descuento de stock por receta
-- ---------------------------------------------------------------------
create or replace function app.verificar_pin(p_personal uuid, p_pin text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.personal_pin pp where pp.personal_id = p_personal and pp.pin_hash = extensions.crypt(coalesce(p_pin, ''), pp.pin_hash))
$$;

create or replace function public.guardar_comanda(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id();
  v_reglas jsonb;
  v_evento boolean;
  v_c record; v_id uuid; v_num bigint;
  v_item jsonb; v_prod record; v_precio numeric; v_cort uuid; v_aut record; v_fecha date;
  v_socio uuid := nullif(p ->> 'socio_id', '')::uuid;
  v_miembro uuid := nullif(p ->> 'miembro_id', '')::uuid;
  v_barra uuid := (p ->> 'barra_id')::uuid;
begin
  if not app.tiene_rol('barra', 'presidente', 'directivo', 'admin') then raise exception 'Solo la barra registra comandas.'; end if;
  if not exists (select 1 from public.barras where id = v_barra and club_id = v_club and activa) then raise exception 'Elige la barra.'; end if;
  if jsonb_array_length(coalesce(p -> 'items', '[]'::jsonb)) = 0 then raise exception 'Agrega al menos un producto.'; end if;
  if v_socio is not null and not exists (select 1 from public.socios where id = v_socio and club_id = v_club) then raise exception 'Socio no encontrado.'; end if;
  v_reglas := app.reglas(v_club);
  v_evento := coalesce((v_reglas #>> '{barra,modo_evento}')::boolean, false);
  v_fecha := app.hoy(v_club);

  if nullif(p ->> 'id', '') is not null then
    select * into v_c from public.comandas where id = (p ->> 'id')::uuid and club_id = v_club for update;
    if v_c.id is null then raise exception 'Comanda no encontrada.'; end if;
    if v_c.estado <> 'abierta' then raise exception 'Esta comanda ya está %.', v_c.estado; end if;
    update public.comandas set mesa = p ->> 'mesa', mesero_id = nullif(p ->> 'mesero_id', '')::uuid, n_personas = nullif(p ->> 'n_personas', '')::int,
           cliente_tipo = case when v_socio is not null then 'socio' else 'externo' end, socio_id = v_socio, miembro_id = v_miembro,
           cliente_nombre = nullif(trim(p ->> 'cliente_nombre'), '')
     where id = v_c.id;
    -- Las líneas anteriores se anulan (no se borran) y se registran las actuales
    update public.comanda_items set anulado = true where comanda_id = v_c.id and not anulado;
    v_id := v_c.id; v_num := v_c.numero;
  else
    v_num := app.siguiente(v_club, 'comanda');
    insert into public.comandas (club_id, barra_id, turno_barra_id, numero, fecha, mesa, mesero_id, n_personas, cliente_tipo, socio_id, miembro_id, cliente_nombre, modo_evento)
    values (v_club, v_barra, nullif(p ->> 'turno_barra_id', '')::uuid, v_num, v_fecha, nullif(trim(p ->> 'mesa'), ''), nullif(p ->> 'mesero_id', '')::uuid,
            nullif(p ->> 'n_personas', '')::int, case when v_socio is not null then 'socio' else 'externo' end, v_socio, v_miembro,
            nullif(trim(p ->> 'cliente_nombre'), ''), v_evento)
    returning id into v_id;
  end if;

  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    select * into v_prod from public.productos where id = (v_item ->> 'producto_id')::uuid and club_id = v_club and activo and eliminado_en is null;
    if v_prod.id is null then raise exception 'Un producto de la comanda ya no está en la carta.'; end if;
    if coalesce((v_item ->> 'cantidad')::numeric, 0) <= 0 then raise exception 'La cantidad de % debe ser mayor a cero.', v_prod.nombre; end if;
    v_precio := case when v_evento then coalesce(v_prod.precio_evento, v_prod.precio) else v_prod.precio end;
    v_cort := null;
    if coalesce((v_item ->> 'cortesia')::boolean, false) then
      if length(trim(coalesce(v_item ->> 'motivo', ''))) < 3 then raise exception 'Escribe el motivo de la cortesía de %.', v_prod.nombre; end if;
      select * into v_aut from public.personal where id = (v_item ->> 'autorizado_por')::uuid and club_id = v_club and activo and es_encargado;
      if v_aut.id is null then raise exception 'La cortesía debe autorizarla un encargado.'; end if;
      if v_item ? 'pin' and not app.verificar_pin(v_aut.id, v_item ->> 'pin') then raise exception 'El PIN del encargado no es correcto.'; end if;
      if not (v_item ? 'pin') and not exists (select 1 from public.cortesias where id = nullif(v_item ->> 'cortesia_id', '')::uuid and comanda_id = v_id) then
        raise exception 'Falta el PIN del encargado para la cortesía.';
      end if;
      v_cort := nullif(v_item ->> 'cortesia_id', '')::uuid;
      if v_cort is null then
        insert into public.cortesias (club_id, barra_id, comanda_id, fecha, motivo, autorizado_por, valor)
        values (v_club, v_barra, v_id, v_fecha, trim(v_item ->> 'motivo'), v_aut.id, round(v_precio * (v_item ->> 'cantidad')::numeric, 2))
        returning id into v_cort;
      end if;
    end if;
    insert into public.comanda_items (club_id, comanda_id, producto_id, cantidad, precio_unitario, es_cortesia, cortesia_id, nota)
    values (v_club, v_id, v_prod.id, (v_item ->> 'cantidad')::numeric, v_precio, v_cort is not null, v_cort, nullif(trim(v_item ->> 'nota'), ''));
  end loop;

  update public.comandas c set
    total = (select coalesce(sum(subtotal), 0) from public.comanda_items i where i.comanda_id = c.id and not i.anulado and not i.es_cortesia),
    total_cortesias = (select coalesce(sum(subtotal), 0) from public.comanda_items i where i.comanda_id = c.id and not i.anulado and i.es_cortesia)
   where c.id = v_id;
  return (select jsonb_build_object('ok', true, 'comanda_id', c.id, 'numero', c.numero, 'total', c.total, 'total_cortesias', c.total_cortesias, 'modo_evento', c.modo_evento)
            from public.comandas c where c.id = v_id);
end;
$$;

create or replace function public.cerrar_comanda(p_comanda_id uuid, p_pagos jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id();
  v_c record; v_pago jsonb; v_suma numeric := 0; v_vuelto numeric := 0; v_cuenta numeric := 0;
  v_reglas jsonb; v_cort_hoy int; v_bajo record; v_detalle jsonb;
begin
  if not app.tiene_rol('barra', 'presidente', 'directivo', 'admin') then raise exception 'Solo la barra cobra comandas.'; end if;
  select * into v_c from public.comandas where id = p_comanda_id and club_id = v_club for update;
  if v_c.id is null then raise exception 'Comanda no encontrada.'; end if;
  if v_c.estado <> 'abierta' then return jsonb_build_object('ok', false, 'mensaje', 'Esta comanda ya está ' || v_c.estado || '.'); end if;
  if not exists (select 1 from public.comanda_items where comanda_id = v_c.id and not anulado) then raise exception 'La comanda está vacía.'; end if;

  for v_pago in select * from jsonb_array_elements(coalesce(p_pagos, '[]'::jsonb)) loop
    if v_pago ->> 'medio' not in ('efectivo', 'yape', 'tarjeta', 'cuenta_socio') then raise exception 'Medio de pago no válido.'; end if;
    if coalesce((v_pago ->> 'monto')::numeric, 0) <= 0 then raise exception 'Cada pago debe ser mayor a cero.'; end if;
    if v_pago ->> 'medio' = 'cuenta_socio' and v_c.socio_id is null then raise exception 'Para cargar a cuenta, primero elige al socio.'; end if;
    v_suma := v_suma + (v_pago ->> 'monto')::numeric;
    if v_pago ->> 'medio' = 'efectivo' and (v_pago ->> 'recibido') is not null then
      if (v_pago ->> 'recibido')::numeric < (v_pago ->> 'monto')::numeric then raise exception 'El efectivo recibido es menor que el monto.'; end if;
      v_vuelto := v_vuelto + (v_pago ->> 'recibido')::numeric - (v_pago ->> 'monto')::numeric;
    end if;
    if v_pago ->> 'medio' = 'cuenta_socio' then v_cuenta := v_cuenta + (v_pago ->> 'monto')::numeric; end if;
  end loop;
  if round(v_suma, 2) <> round(v_c.total, 2) then
    raise exception 'Los pagos suman % y el total es %. Revisa los montos.', app.soles(v_suma), app.soles(v_c.total);
  end if;

  insert into public.cobros (club_id, barra_id, comanda_id, fecha, medio, monto, recibido, vuelto)
  select v_club, v_c.barra_id, v_c.id, v_c.fecha, x ->> 'medio', round((x ->> 'monto')::numeric, 2),
         nullif(x ->> 'recibido', '')::numeric,
         case when x ->> 'medio' = 'efectivo' and nullif(x ->> 'recibido', '') is not null then (x ->> 'recibido')::numeric - (x ->> 'monto')::numeric end
    from jsonb_array_elements(coalesce(p_pagos, '[]'::jsonb)) x;

  -- Descuento de stock por receta (en onzas para licores)
  insert into public.movimientos_stock (club_id, barra_id, insumo_id, fecha, tipo, cantidad, costo_unitario, comanda_item_id, es_ejemplo)
  select v_club, v_c.barra_id, r.insumo_id, now(), case when i.es_cortesia then 'cortesia' else 'venta' end,
         -(r.cantidad * i.cantidad),
         case when ins.unidad = 'botella' then ins.costo / ins.oz_por_botella else ins.costo end,
         i.id, r.es_ejemplo
    from public.comanda_items i
    join public.recetas r on r.producto_id = i.producto_id
    join public.insumos ins on ins.id = r.insumo_id
   where i.comanda_id = v_c.id and not i.anulado;

  -- A cuenta del socio
  if v_cuenta > 0 then
    select jsonb_agg(jsonb_build_object('producto', pr.nombre, 'cantidad', i.cantidad, 'precio', i.precio_unitario, 'subtotal', i.subtotal, 'cortesia', i.es_cortesia))
      into v_detalle
      from public.comanda_items i join public.productos pr on pr.id = i.producto_id
     where i.comanda_id = v_c.id and not i.anulado;
    insert into public.cuenta_socio (club_id, socio_id, tipo, origen, concepto, monto, comanda_id, detalle)
    values (v_club, v_c.socio_id, 'cargo', 'barra',
            'Consumo en ' || (select nombre from public.barras where id = v_c.barra_id) || ' · comanda N° ' || v_c.numero,
            round(v_cuenta, 2), v_c.id, jsonb_build_object('items', v_detalle, 'mesa', v_c.mesa));
    perform app.aplicar_pagos(v_c.socio_id);
  end if;

  update public.comandas set estado = 'cerrada', cerrada_en = now(), cerrada_por = auth.uid() where id = v_c.id;

  -- Alertas: cortesías fuera de lo normal y stock bajo
  v_reglas := app.reglas(v_club);
  if v_c.total_cortesias > 0 then
    select count(*) into v_cort_hoy from public.cortesias where barra_id = v_c.barra_id and fecha = v_c.fecha;
    if v_cort_hoy = (v_reglas #>> '{barra,umbral_cortesias_dia}')::int + 1 then
      perform app.notificar_directiva(v_club, 'cortesia', 'Cortesías fuera de lo normal',
        'La ' || (select nombre from public.barras where id = v_c.barra_id) || ' ya lleva ' || v_cort_hoy || ' cortesías hoy.', '/app/admin/barra', true);
    end if;
  end if;
  for v_bajo in
    select ins.id, ins.nombre, ins.unidad, ins.oz_por_botella, ins.stock_minimo, st.cantidad
      from (select distinct r.insumo_id from public.comanda_items i join public.recetas r on r.producto_id = i.producto_id where i.comanda_id = v_c.id and not i.anulado) u
      join public.insumos ins on ins.id = u.insumo_id
      join lateral (select coalesce(sum(m.cantidad), 0) as cantidad from public.movimientos_stock m where m.insumo_id = ins.id and m.barra_id = v_c.barra_id) st on true
     where ins.stock_minimo > 0 and st.cantidad < app.a_control(ins.id, ins.stock_minimo)
       and not exists (select 1 from public.notificaciones n where n.club_id = v_club and n.tipo = 'stock_bajo' and n.cuerpo like ins.nombre || '%' and n.creado_en > now() - interval '1 day')
  loop
    perform app.notificar_directiva(v_club, 'stock_bajo', 'Stock bajo',
      v_bajo.nombre || ': quedan ' || case when v_bajo.unidad = 'botella' then round(v_bajo.cantidad / v_bajo.oz_por_botella, 1) || ' botellas' else round(v_bajo.cantidad, 1) || ' ' || v_bajo.unidad end ||
      ' en la ' || (select nombre from public.barras where id = v_c.barra_id) || '.', '/app/admin/barra');
  end loop;

  return jsonb_build_object('ok', true, 'comanda_id', v_c.id, 'numero', v_c.numero, 'total', v_c.total, 'vuelto', v_vuelto,
    'mensaje', 'Cobrado ' || app.soles(v_c.total) || case when v_vuelto > 0 then '. Vuelto: ' || app.soles(v_vuelto) else '' end || '.');
end;
$$;

create or replace function public.anular_comanda(p_comanda_id uuid, p_motivo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not app.tiene_rol('barra', 'presidente', 'directivo', 'admin') then raise exception 'Sin permiso.'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 3 then raise exception 'Escribe el motivo.'; end if;
  update public.comandas set estado = 'anulada', motivo_anulacion = trim(p_motivo)
   where id = p_comanda_id and club_id = app.club_id() and estado = 'abierta';
  if not found then return jsonb_build_object('ok', false, 'mensaje', 'Solo se anulan comandas abiertas.'); end if;
  return jsonb_build_object('ok', true, 'mensaje', 'Comanda anulada.');
end;
$$;

create or replace function public.resumen_barra_dia(p_barra_id uuid, p_fecha date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_club uuid := app.club_id(); v_fecha date := coalesce(p_fecha, app.hoy(app.club_id()));
begin
  if not app.tiene_rol('barra', 'presidente', 'directivo', 'admin') then raise exception 'Sin permiso.'; end if;
  return jsonb_build_object(
    'fecha', v_fecha,
    'esperado', (select jsonb_build_object(
        'efectivo', coalesce(sum(monto) filter (where medio = 'efectivo'), 0),
        'yape', coalesce(sum(monto) filter (where medio = 'yape'), 0),
        'tarjeta', coalesce(sum(monto) filter (where medio = 'tarjeta'), 0),
        'cuenta_socio', coalesce(sum(monto) filter (where medio = 'cuenta_socio'), 0))
      from public.cobros where barra_id = p_barra_id and fecha = v_fecha and club_id = v_club),
    'total_ventas', (select coalesce(sum(total), 0) from public.comandas where barra_id = p_barra_id and fecha = v_fecha and estado = 'cerrada'),
    'total_cortesias', (select coalesce(sum(total_cortesias), 0) from public.comandas where barra_id = p_barra_id and fecha = v_fecha and estado = 'cerrada'),
    'n_comandas', (select count(*) from public.comandas where barra_id = p_barra_id and fecha = v_fecha and estado = 'cerrada'),
    'abiertas', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'numero', numero, 'mesa', mesa, 'total', total, 'cliente', cliente_nombre) order by numero), '[]'::jsonb)
                   from public.comandas where barra_id = p_barra_id and estado = 'abierta' and club_id = v_club),
    'cortesias', (select coalesce(jsonb_agg(jsonb_build_object('motivo', co.motivo, 'valor', co.valor, 'autorizo', pe.nombres || ' ' || pe.apellidos)), '[]'::jsonb)
                    from public.cortesias co join public.personal pe on pe.id = co.autorizado_por where co.barra_id = p_barra_id and co.fecha = v_fecha),
    'cierre', (select to_jsonb(cb) from public.cierres_barra cb where cb.barra_id = p_barra_id and cb.fecha = v_fecha)
  );
end;
$$;

-- Kardex por período: inicio + ingresos − ventas − cortesías ± ajustes = saldo teórico
create or replace function public.kardex(p_barra_id uuid default null, p_desde date default null, p_hasta date default null)
returns table (
  insumo_id uuid, nombre text, grupo text, unidad text, oz_por_botella numeric, costo numeric, costo_es_ejemplo boolean, stock_minimo numeric,
  inicio numeric, ingresos numeric, ventas numeric, cortesias numeric, ajustes numeric, saldo numeric,
  ultimo_conteo date, contado numeric, diferencia numeric, valor_diferencia numeric, venta_soles numeric
) language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_club uuid := app.club_id(); v_desde timestamptz; v_hasta timestamptz; v_d date; v_h date;
begin
  if not app.tiene_rol('barra', 'presidente', 'directivo', 'admin') then raise exception 'Sin permiso.'; end if;
  v_d := coalesce(p_desde, date_trunc('month', app.hoy(v_club))::date);
  v_h := coalesce(p_hasta, app.hoy(v_club));
  v_desde := v_d::timestamp at time zone app.zona(v_club);
  v_hasta := (v_h + 1)::timestamp at time zone app.zona(v_club);
  return query
  with mov as (
    select m.insumo_id,
      sum(m.cantidad) filter (where m.fecha < v_desde) as inicio,
      sum(m.cantidad) filter (where m.fecha >= v_desde and m.fecha < v_hasta and m.tipo in ('ingreso', 'inicial')) as ingresos,
      -sum(m.cantidad) filter (where m.fecha >= v_desde and m.fecha < v_hasta and m.tipo = 'venta') as ventas,
      -sum(m.cantidad) filter (where m.fecha >= v_desde and m.fecha < v_hasta and m.tipo = 'cortesia') as cortesias,
      sum(m.cantidad) filter (where m.fecha >= v_desde and m.fecha < v_hasta and m.tipo in ('ajuste', 'merma', 'traslado')) as ajustes,
      sum(m.cantidad) filter (where m.fecha < v_hasta and not (m.tipo = 'ajuste' and m.conteo_id is not null and m.fecha >= v_desde)) as teorico_sin_conteo,
      sum(m.cantidad) filter (where m.fecha < v_hasta) as saldo
    from public.movimientos_stock m
    where m.club_id = v_club and (p_barra_id is null or m.barra_id = p_barra_id)
    group by m.insumo_id
  ), conteo as (
    select distinct on (ci.insumo_id) ci.insumo_id, cf.fecha, ci.contado, ci.diferencia, ci.valor_diferencia
      from public.conteo_items ci join public.conteos_fisicos cf on cf.id = ci.conteo_id
     where cf.club_id = v_club and (p_barra_id is null or cf.barra_id = p_barra_id) and cf.fecha between v_d and v_h
     order by ci.insumo_id, cf.fecha desc, cf.creado_en desc
  ), venta as (
    select r.insumo_id, sum(i.subtotal * (r.cantidad / nullif(tot.total_receta, 0))) as soles
      from public.comanda_items i
      join public.comandas c on c.id = i.comanda_id
      join public.recetas r on r.producto_id = i.producto_id
      join (select producto_id, sum(cantidad) as total_receta from public.recetas group by producto_id) tot on tot.producto_id = r.producto_id
     where c.club_id = v_club and c.estado = 'cerrada' and not i.anulado and not i.es_cortesia
       and c.fecha between v_d and v_h and (p_barra_id is null or c.barra_id = p_barra_id)
     group by r.insumo_id
  )
  select i.id, i.nombre, i.grupo, i.unidad, i.oz_por_botella, i.costo, i.costo_es_ejemplo, i.stock_minimo,
         coalesce(mov.inicio, 0), coalesce(mov.ingresos, 0), coalesce(mov.ventas, 0), coalesce(mov.cortesias, 0), coalesce(mov.ajustes, 0), coalesce(mov.saldo, 0),
         conteo.fecha, conteo.contado, conteo.diferencia, conteo.valor_diferencia, round(coalesce(venta.soles, 0), 2)
    from public.insumos i
    left join mov on mov.insumo_id = i.id
    left join conteo on conteo.insumo_id = i.id
    left join venta on venta.insumo_id = i.id
   where i.club_id = v_club and i.activo and i.eliminado_en is null
   order by i.orden, i.nombre;
end;
$$;

-- Cierre del día por barra: esperado vs contado por medio de pago + conteo físico
create or replace function public.cerrar_barra(p_barra_id uuid, p_contado jsonb, p_conteo jsonb default '[]'::jsonb, p_nota text default null, p_fecha date default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id();
  v_fecha date := coalesce(p_fecha, app.hoy(app.club_id()));
  v_res jsonb; v_esp jsonb; v_cont jsonb; v_dif jsonb; v_dif_total numeric;
  v_conteo uuid; v_x jsonb; v_ins record; v_teo numeric; v_faltante numeric := 0; v_valor numeric;
  v_reglas jsonb; v_id uuid; v_barra text; v_abiertas int;
begin
  if not app.tiene_rol('barra', 'presidente', 'directivo', 'admin') then raise exception 'Sin permiso.'; end if;
  select nombre into v_barra from public.barras where id = p_barra_id and club_id = v_club;
  if v_barra is null then raise exception 'Barra no encontrada.'; end if;
  if exists (select 1 from public.cierres_barra where barra_id = p_barra_id and fecha = v_fecha) then
    return jsonb_build_object('ok', false, 'mensaje', 'La ' || v_barra || ' ya se cerró hoy.');
  end if;
  select count(*) into v_abiertas from public.comandas where barra_id = p_barra_id and estado = 'abierta';
  if v_abiertas > 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'Hay ' || v_abiertas || ' comanda(s) abierta(s). Cóbralas o anúlalas antes de cerrar.');
  end if;
  v_res := public.resumen_barra_dia(p_barra_id, v_fecha);
  v_esp := v_res -> 'esperado';
  v_cont := jsonb_build_object(
    'efectivo', coalesce((p_contado ->> 'efectivo')::numeric, 0),
    'yape', coalesce((p_contado ->> 'yape')::numeric, 0),
    'tarjeta', coalesce((p_contado ->> 'tarjeta')::numeric, 0),
    'cuenta_socio', (v_esp ->> 'cuenta_socio')::numeric);
  v_dif := jsonb_build_object(
    'efectivo', (v_cont ->> 'efectivo')::numeric - (v_esp ->> 'efectivo')::numeric,
    'yape', (v_cont ->> 'yape')::numeric - (v_esp ->> 'yape')::numeric,
    'tarjeta', (v_cont ->> 'tarjeta')::numeric - (v_esp ->> 'tarjeta')::numeric,
    'cuenta_socio', 0);
  v_dif_total := (v_dif ->> 'efectivo')::numeric + (v_dif ->> 'yape')::numeric + (v_dif ->> 'tarjeta')::numeric;

  if jsonb_array_length(coalesce(p_conteo, '[]'::jsonb)) > 0 then
    insert into public.conteos_fisicos (club_id, barra_id, fecha, nota) values (v_club, p_barra_id, v_fecha, 'Conteo de cierre') returning id into v_conteo;
    for v_x in select * from jsonb_array_elements(p_conteo) loop
      select * into v_ins from public.insumos where id = (v_x ->> 'insumo_id')::uuid and club_id = v_club;
      if v_ins.id is null then continue; end if;
      select coalesce(sum(cantidad), 0) into v_teo from public.movimientos_stock where insumo_id = v_ins.id and barra_id = p_barra_id;
      v_valor := round(((v_x ->> 'contado')::numeric - v_teo) * coalesce(case when v_ins.unidad = 'botella' then v_ins.costo / v_ins.oz_por_botella else v_ins.costo end, 0), 2);
      insert into public.conteo_items (club_id, conteo_id, insumo_id, teorico, contado, valor_diferencia)
      values (v_club, v_conteo, v_ins.id, v_teo, (v_x ->> 'contado')::numeric, v_valor);
      if (v_x ->> 'contado')::numeric <> v_teo then
        insert into public.movimientos_stock (club_id, barra_id, insumo_id, tipo, cantidad, costo_unitario, conteo_id, nota)
        values (v_club, p_barra_id, v_ins.id, 'ajuste', (v_x ->> 'contado')::numeric - v_teo,
                case when v_ins.unidad = 'botella' then v_ins.costo / v_ins.oz_por_botella else v_ins.costo end, v_conteo, 'Ajuste por conteo físico');
        if v_valor < 0 then v_faltante := v_faltante - v_valor; end if;
      end if;
    end loop;
  end if;

  insert into public.cierres_barra (club_id, barra_id, fecha, esperado, contado, diferencia, diferencia_total, total_ventas, total_cortesias, n_comandas, faltante_kardex, conteo_id, nota)
  values (v_club, p_barra_id, v_fecha, v_esp, v_cont, v_dif, v_dif_total, (v_res ->> 'total_ventas')::numeric, (v_res ->> 'total_cortesias')::numeric,
          (v_res ->> 'n_comandas')::int, v_faltante, v_conteo, p_nota)
  returning id into v_id;

  v_reglas := app.reglas(v_club);
  if v_dif_total < -(v_reglas #>> '{barra,umbral_faltante}')::numeric or v_faltante > (v_reglas #>> '{barra,umbral_faltante}')::numeric then
    perform app.notificar_directiva(v_club, 'faltante', 'Faltante en barra',
      v_barra || ' cerró con ' ||
      case when v_dif_total < 0 then 'faltante de caja de ' || app.soles(-v_dif_total) else 'caja cuadrada' end ||
      case when v_faltante > 0 then ' y faltante de licor de ' || app.soles(v_faltante) else '' end || '.', '/app/admin/barra', true);
  end if;
  return jsonb_build_object('ok', true, 'cierre_id', v_id, 'esperado', v_esp, 'contado', v_cont, 'diferencia', v_dif, 'diferencia_total', v_dif_total,
    'faltante_kardex', v_faltante, 'total_ventas', v_res -> 'total_ventas',
    'mensaje', case when v_dif_total = 0 and v_faltante = 0 then 'Cierre listo: todo cuadra.'
                    when v_dif_total < 0 then 'Cierre guardado con faltante de ' || app.soles(-v_dif_total) || '. Se avisó a administración.'
                    else 'Cierre guardado.' end);
end;
$$;

-- ---------------------------------------------------------------------
-- Panel "Hoy"
-- ---------------------------------------------------------------------
create or replace function public.hoy_resumen()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_club uuid := app.club_id(); v_hoy date; v_atencion jsonb := '[]'::jsonb; v_r record;
begin
  if not app.es_directiva() then raise exception 'Solo la directiva ve el panel.'; end if;
  v_hoy := app.hoy(v_club);
  -- Requiere tu atención
  for v_r in select cb.*, b.nombre as barra from public.cierres_barra cb join public.barras b on b.id = cb.barra_id
              where cb.club_id = v_club and cb.fecha >= v_hoy - 1 and (cb.diferencia_total < 0 or cb.faltante_kardex > 0) loop
    v_atencion := v_atencion || jsonb_build_object('tipo', 'faltante', 'importante', true, 'url', '/admin/barra',
      'titulo', 'Faltante en ' || v_r.barra || case when v_r.fecha < v_hoy then ' (ayer)' else '' end,
      'detalle', case when v_r.diferencia_total < 0 then 'Caja: ' || app.soles(-v_r.diferencia_total) else '' end ||
                 case when v_r.faltante_kardex > 0 then case when v_r.diferencia_total < 0 then ' · ' else '' end || 'Licor: ' || app.soles(v_r.faltante_kardex) else '' end);
  end loop;
  if exists (select 1 from public.pagos where club_id = v_club and estado = 'por_validar' and eliminado_en is null) then
    v_atencion := v_atencion || (select jsonb_build_object('tipo', 'pagos', 'importante', false, 'url', '/admin/cobranza',
      'titulo', count(*) || case when count(*) = 1 then ' pago por validar' else ' pagos por validar' end, 'detalle', 'Total ' || app.soles(sum(monto)))
      from public.pagos where club_id = v_club and estado = 'por_validar' and eliminado_en is null);
  end if;
  if exists (select 1 from public.ingresos where club_id = v_club and fecha = v_hoy and con_deuda and estado <> 'anulado') then
    v_atencion := v_atencion || (select jsonb_build_object('tipo', 'morosos', 'importante', false, 'url', '/admin/porteria',
      'titulo', count(distinct socio_id) || ' socio(s) con deuda ingresaron hoy', 'detalle', string_agg(distinct s.apellidos, ', '))
      from public.ingresos i join public.socios s on s.id = i.socio_id where i.club_id = v_club and i.fecha = v_hoy and i.con_deuda and i.estado <> 'anulado');
  end if;
  if exists (select 1 from public.solicitudes_alquiler where club_id = v_club and estado = 'nueva') or exists (select 1 from public.alquileres where club_id = v_club and estado = 'por_confirmar' and eliminado_en is null) then
    v_atencion := v_atencion || jsonb_build_object('tipo', 'alquileres', 'importante', false, 'url', '/admin/ambientes',
      'titulo', ((select count(*) from public.solicitudes_alquiler where club_id = v_club and estado = 'nueva') + (select count(*) from public.alquileres where club_id = v_club and estado = 'por_confirmar' and eliminado_en is null)) || ' alquiler(es) por confirmar',
      'detalle', 'Solicitudes desde la web y alquileres sin confirmar');
  end if;

  return jsonb_build_object(
    'fecha', v_hoy,
    'ventas_barra', (select coalesce(sum(total), 0) from public.comandas where club_id = v_club and fecha = v_hoy and estado = 'cerrada'),
    'por_barra', (select coalesce(jsonb_agg(jsonb_build_object('barra', b.nombre, 'total', coalesce(x.total, 0), 'comandas', coalesce(x.n, 0)) order by b.orden), '[]'::jsonb)
                    from public.barras b left join (select barra_id, sum(total) total, count(*) n from public.comandas where club_id = v_club and fecha = v_hoy and estado = 'cerrada' group by barra_id) x on x.barra_id = b.id
                   where b.club_id = v_club and b.activa),
    'por_medio', (select coalesce(jsonb_object_agg(medio, total), '{}'::jsonb) from (select medio, sum(monto) total from public.cobros where club_id = v_club and fecha = v_hoy group by medio) m),
    'caja', jsonb_build_object(
      'saldo', (select coalesce(sum(case when tipo = 'ingreso' then monto else -monto end), 0) from public.caja_movimientos where club_id = v_club and eliminado_en is null),
      'ingresos_hoy', (select coalesce(sum(monto), 0) from public.caja_movimientos where club_id = v_club and fecha = v_hoy and tipo = 'ingreso' and eliminado_en is null),
      'egresos_hoy', (select coalesce(sum(monto), 0) from public.caja_movimientos where club_id = v_club and fecha = v_hoy and tipo = 'egreso' and eliminado_en is null)),
    'porteria', jsonb_build_object(
      'dentro', (select count(*) from public.ingresos where club_id = v_club and fecha = v_hoy and estado = 'dentro'),
      'ingresos', (select count(*) from public.ingresos where club_id = v_club and fecha = v_hoy and estado in ('dentro', 'salio')),
      'invitados', (select count(*) from public.ingresos where club_id = v_club and fecha = v_hoy and persona = 'invitado' and estado in ('dentro', 'salio')),
      'cobrado', (select coalesce(sum(monto), 0) from public.ingresos where club_id = v_club and fecha = v_hoy and estado in ('dentro', 'salio'))),
    'personal', jsonb_build_object(
      'programados', (select count(*) from public.turnos where club_id = v_club and fecha = v_hoy and eliminado_en is null),
      'presentes', (select count(distinct personal_id) from public.marcaciones where club_id = v_club and fecha = v_hoy and tipo = 'entrada' and eliminado_en is null),
      'tardanzas', (select count(*) from public.marcaciones where club_id = v_club and fecha = v_hoy and tipo = 'entrada' and minutos_tarde > 0 and eliminado_en is null),
      'faltas', (select count(*) from public.turnos t where t.club_id = v_club and t.fecha = v_hoy and t.eliminado_en is null
                   and (v_hoy + t.hora_inicio + interval '30 minutes') < app.ahora_local(v_club)
                   and not exists (select 1 from public.marcaciones m where m.personal_id = t.personal_id and m.fecha = v_hoy and m.tipo = 'entrada' and m.eliminado_en is null))),
    'tenis', (select count(*) from public.reservas_cancha where club_id = v_club and fecha = v_hoy and estado = 'confirmada' and tipo = 'reserva'),
    'pagos_por_validar', (select count(*) from public.pagos where club_id = v_club and estado = 'por_validar' and eliminado_en is null),
    'morosos', (select count(*) from public.estado_socios where club_id = v_club and estado_cuenta = 'deuda'),
    'atencion', v_atencion
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Datos del reporte diario (los usa la Edge Function reporte-diario)
-- ---------------------------------------------------------------------
create or replace function public.datos_reporte_diario(p_club uuid default null, p_fecha date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_club uuid := coalesce(p_club, app.club_id()); v_f date;
begin
  if auth.uid() is not null and not (app.es_directiva() and v_club = app.club_id()) then raise exception 'Solo la directiva.'; end if;
  if v_club is null then raise exception 'Club requerido.'; end if;
  v_f := coalesce(p_fecha, app.hoy(v_club));
  return jsonb_build_object(
    'club', (select nombre from public.clubes where id = v_club),
    'fecha', v_f,
    'barras', (select coalesce(jsonb_agg(jsonb_build_object('barra', b.nombre,
                  'ventas', (select coalesce(sum(total), 0) from public.comandas c where c.barra_id = b.id and c.fecha = v_f and c.estado = 'cerrada'),
                  'comandas', (select count(*) from public.comandas c where c.barra_id = b.id and c.fecha = v_f and c.estado = 'cerrada'),
                  'por_medio', (select coalesce(jsonb_object_agg(medio, t), '{}'::jsonb) from (select medio, sum(monto) t from public.cobros co where co.barra_id = b.id and co.fecha = v_f group by medio) m),
                  'cortesias', (select coalesce(sum(valor), 0) from public.cortesias co where co.barra_id = b.id and co.fecha = v_f),
                  'cierre', (select jsonb_build_object('diferencia_caja', cb.diferencia_total, 'faltante_licor', cb.faltante_kardex) from public.cierres_barra cb where cb.barra_id = b.id and cb.fecha = v_f)
               ) order by b.orden), '[]'::jsonb) from public.barras b where b.club_id = v_club and b.activa),
    'caja_oficina', jsonb_build_object(
      'ingresos', (select coalesce(sum(monto), 0) from public.caja_movimientos where club_id = v_club and fecha = v_f and tipo = 'ingreso' and eliminado_en is null),
      'egresos', (select coalesce(sum(monto), 0) from public.caja_movimientos where club_id = v_club and fecha = v_f and tipo = 'egreso' and eliminado_en is null),
      'saldo', (select coalesce(sum(case when tipo = 'ingreso' then monto else -monto end), 0) from public.caja_movimientos where club_id = v_club and fecha <= v_f and eliminado_en is null)),
    'faltantes_kardex', (select coalesce(jsonb_agg(jsonb_build_object('insumo', i.nombre, 'diferencia', ci.diferencia, 'unidad', case when i.unidad = 'botella' then 'oz' else i.unidad end, 'valor', ci.valor_diferencia)), '[]'::jsonb)
                           from public.conteo_items ci join public.conteos_fisicos cf on cf.id = ci.conteo_id join public.insumos i on i.id = ci.insumo_id
                          where cf.club_id = v_club and cf.fecha = v_f and ci.diferencia < 0),
    'porteria', jsonb_build_object(
      'ingresos', (select count(*) from public.ingresos where club_id = v_club and fecha = v_f and estado in ('dentro', 'salio')),
      'socios', (select count(*) from public.ingresos where club_id = v_club and fecha = v_f and persona = 'miembro' and estado in ('dentro', 'salio')),
      'invitados', (select count(*) from public.ingresos where club_id = v_club and fecha = v_f and persona = 'invitado' and estado in ('dentro', 'salio')),
      'cobrado', (select coalesce(sum(monto), 0) from public.ingresos where club_id = v_club and fecha = v_f and estado in ('dentro', 'salio')),
      'con_deuda', (select count(distinct socio_id) from public.ingresos where club_id = v_club and fecha = v_f and con_deuda and estado <> 'anulado')),
    'asistencia', jsonb_build_object(
      'programados', (select count(*) from public.turnos where club_id = v_club and fecha = v_f and eliminado_en is null),
      'presentes', (select count(distinct personal_id) from public.marcaciones where club_id = v_club and fecha = v_f and tipo = 'entrada' and eliminado_en is null),
      'tardanzas', (select coalesce(jsonb_agg(p.nombres || ' ' || p.apellidos || ' (' || m.minutos_tarde || ' min)'), '[]'::jsonb)
                      from public.marcaciones m join public.personal p on p.id = m.personal_id
                     where m.club_id = v_club and m.fecha = v_f and m.tipo = 'entrada' and m.minutos_tarde > 0 and m.eliminado_en is null),
      'faltas', (select coalesce(jsonb_agg(p.nombres || ' ' || p.apellidos), '[]'::jsonb) from public.turnos t join public.personal p on p.id = t.personal_id
                  where t.club_id = v_club and t.fecha = v_f and t.eliminado_en is null
                    and not exists (select 1 from public.marcaciones m where m.personal_id = t.personal_id and m.fecha = v_f and m.tipo = 'entrada' and m.eliminado_en is null))),
    'reservas_manana', (select coalesce(jsonb_agg(jsonb_build_object('cancha', c.nombre, 'hora', to_char(r.hora_inicio, 'HH24:MI'), 'quien', m.nombres || ' ' || m.apellidos) order by r.hora_inicio), '[]'::jsonb)
                          from public.reservas_cancha r join public.canchas c on c.id = r.cancha_id left join public.miembros m on m.id = r.miembro_id
                         where r.club_id = v_club and r.fecha = v_f + 1 and r.estado = 'confirmada' and r.tipo = 'reserva'),
    'alquileres_manana', (select coalesce(jsonb_agg(jsonb_build_object('ambiente', a.nombre, 'cliente', al.cliente_nombre)), '[]'::jsonb)
                            from public.alquileres al join public.ambientes a on a.id = al.ambiente_id
                           where al.club_id = v_club and al.fecha = v_f + 1 and al.estado <> 'cancelado' and al.eliminado_en is null),
    'morosos', (select jsonb_build_object('socios', count(*), 'deuda_total', coalesce(sum(saldo), 0)) from public.estado_socios where club_id = v_club and estado_cuenta = 'deuda'),
    'pagos_por_validar', (select count(*) from public.pagos where club_id = v_club and estado = 'por_validar' and eliminado_en is null)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Reportes por período (ventas, márgenes, portería, morosidad, asistencia)
-- ---------------------------------------------------------------------
create or replace function public.reporte_periodo(p_desde date, p_hasta date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_club uuid := app.club_id();
begin
  if not app.es_directiva() then raise exception 'Solo la directiva.'; end if;
  return jsonb_build_object(
    'desde', p_desde, 'hasta', p_hasta,
    'ventas_por_dia', (select coalesce(jsonb_agg(jsonb_build_object('fecha', d.fecha, 'total', d.total, 'comandas', d.n) order by d.fecha), '[]'::jsonb)
                         from (select fecha, sum(total) total, count(*) n from public.comandas where club_id = v_club and estado = 'cerrada' and fecha between p_desde and p_hasta group by fecha) d),
    'ventas_por_barra', (select coalesce(jsonb_agg(jsonb_build_object('barra', b.nombre, 'total', coalesce(x.t, 0))), '[]'::jsonb)
                           from public.barras b left join (select barra_id, sum(total) t from public.comandas where club_id = v_club and estado = 'cerrada' and fecha between p_desde and p_hasta group by barra_id) x on x.barra_id = b.id
                          where b.club_id = v_club),
    'ventas_por_medio', (select coalesce(jsonb_object_agg(medio, t), '{}'::jsonb) from (select medio, sum(monto) t from public.cobros where club_id = v_club and fecha between p_desde and p_hasta group by medio) m),
    'productos', (select coalesce(jsonb_agg(x order by (x ->> 'monto')::numeric desc), '[]'::jsonb) from (
                    select jsonb_build_object('producto', p.nombre, 'categoria', cat.nombre, 'cantidad', sum(i.cantidad), 'monto', sum(i.subtotal),
                           'precio', p.precio, 'costo_receta', rc.costo, 'margen', case when rc.costo is not null then p.precio - rc.costo end,
                           'margen_pct', case when rc.costo is not null and p.precio > 0 then round((p.precio - rc.costo) / p.precio * 100, 1) end,
                           'costo_es_ejemplo', rc.ejemplo) as x
                      from public.comanda_items i join public.comandas c on c.id = i.comanda_id join public.productos p on p.id = i.producto_id
                      join public.categorias cat on cat.id = p.categoria_id
                      left join lateral (select sum(r.cantidad * case when ins.unidad = 'botella' then ins.costo / ins.oz_por_botella else ins.costo end) costo,
                                                bool_or(ins.costo_es_ejemplo or r.es_ejemplo) ejemplo
                                           from public.recetas r join public.insumos ins on ins.id = r.insumo_id where r.producto_id = p.id) rc on true
                     where c.club_id = v_club and c.estado = 'cerrada' and not i.anulado and not i.es_cortesia and c.fecha between p_desde and p_hasta
                     group by p.id, p.nombre, cat.nombre, p.precio, rc.costo, rc.ejemplo) q),
    'cortesias', (select jsonb_build_object('cantidad', count(*), 'valor', coalesce(sum(valor), 0)) from public.cortesias where club_id = v_club and fecha between p_desde and p_hasta),
    'porteria_por_dia', (select coalesce(jsonb_agg(jsonb_build_object('fecha', d.fecha, 'ingresos', d.n, 'invitados', d.inv, 'cobrado', d.cob) order by d.fecha), '[]'::jsonb)
                           from (select fecha, count(*) n, count(*) filter (where persona = 'invitado') inv, sum(monto) cob from public.ingresos
                                  where club_id = v_club and estado in ('dentro', 'salio') and fecha between p_desde and p_hasta group by fecha) d),
    'morosidad', (select jsonb_build_object('socios_con_deuda', count(*) filter (where estado_cuenta = 'deuda'), 'por_vencer', count(*) filter (where estado_cuenta = 'por_vencer'),
                         'al_dia', count(*) filter (where estado_cuenta = 'al_dia'), 'deuda_total', coalesce(sum(saldo) filter (where saldo > 0), 0))
                    from public.estado_socios where club_id = v_club),
    'asistencia', (select coalesce(jsonb_agg(x order by x ->> 'nombre'), '[]'::jsonb) from (
                     select jsonb_build_object('personal_id', p.id, 'nombre', p.apellidos || ', ' || p.nombres, 'area', p.area, 'tipo_contrato', p.tipo_contrato,
                       'dias_programados', (select count(*) from public.turnos t where t.personal_id = p.id and t.fecha between p_desde and p_hasta and t.eliminado_en is null),
                       'dias_trabajados', (select count(distinct m.fecha) from public.marcaciones m where m.personal_id = p.id and m.tipo = 'entrada' and m.fecha between p_desde and p_hasta and m.eliminado_en is null),
                       'tardanzas', (select count(*) from public.marcaciones m where m.personal_id = p.id and m.tipo = 'entrada' and m.minutos_tarde > 0 and m.fecha between p_desde and p_hasta and m.eliminado_en is null),
                       'minutos_tarde', (select coalesce(sum(m.minutos_tarde), 0) from public.marcaciones m where m.personal_id = p.id and m.fecha between p_desde and p_hasta and m.eliminado_en is null),
                       'faltas', (select count(*) from public.turnos t where t.personal_id = p.id and t.fecha between p_desde and p_hasta and t.fecha < app.hoy(v_club) and t.eliminado_en is null
                                    and not exists (select 1 from public.marcaciones m where m.personal_id = p.id and m.fecha = t.fecha and m.tipo = 'entrada' and m.eliminado_en is null)),
                       'horas', (select round(coalesce(sum(extract(epoch from (s.hora - e.hora)) / 3600 - coalesce(rf.min, 0) / 60.0), 0)::numeric, 1)
                                   from public.marcaciones e
                                   join lateral (select m.hora from public.marcaciones m where m.personal_id = e.personal_id and m.fecha = e.fecha and m.tipo = 'salida' and m.eliminado_en is null order by m.hora desc limit 1) s on true
                                   left join lateral (select extract(epoch from (f.hora - i.hora)) / 60 as min from public.marcaciones i
                                                        join public.marcaciones f on f.personal_id = i.personal_id and f.fecha = i.fecha and f.tipo = 'fin_refrigerio'
                                                       where i.personal_id = e.personal_id and i.fecha = e.fecha and i.tipo = 'inicio_refrigerio' limit 1) rf on true
                                  where e.personal_id = p.id and e.tipo = 'entrada' and e.fecha between p_desde and p_hasta and e.eliminado_en is null),
                       'sueldo_mensual', p.sueldo_mensual, 'pago_hora', p.pago_hora, 'es_ejemplo', p.es_ejemplo) as x
                       from public.personal p where p.club_id = v_club and p.eliminado_en is null) q)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Importador del padrón (desde Excel, con vista previa)
-- ---------------------------------------------------------------------
create or replace function public.importar_socios(p_filas jsonb, p_solo_validar boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id();
  v_f jsonb; v_i int := 0; v_err jsonb := '[]'::jsonb; v_ok int := 0; v_nuevos int := 0; v_act int := 0;
  v_num text; v_dni text; v_ap text; v_no text; v_existe uuid; v_nums text[] := '{}'; v_dnis text[] := '{}';
begin
  if not app.es_directiva() then raise exception 'Solo administración importa el padrón.'; end if;
  for v_f in select * from jsonb_array_elements(p_filas) loop
    v_i := v_i + 1;
    v_num := nullif(trim(v_f ->> 'numero'), '');
    v_dni := nullif(regexp_replace(coalesce(v_f ->> 'dni', ''), '\s', '', 'g'), '');
    v_ap := initcap(trim(coalesce(v_f ->> 'apellidos', '')));
    v_no := initcap(trim(coalesce(v_f ->> 'nombres', '')));
    if v_num is null then v_err := v_err || jsonb_build_object('fila', v_i, 'mensaje', 'Falta el N° de socio.'); continue; end if;
    if length(v_ap) < 2 or length(v_no) < 2 then v_err := v_err || jsonb_build_object('fila', v_i, 'mensaje', 'Faltan apellidos o nombres.'); continue; end if;
    if v_dni is not null and v_dni !~ '^[0-9]{8}$' then v_err := v_err || jsonb_build_object('fila', v_i, 'mensaje', 'El DNI "' || v_dni || '" no tiene 8 números.'); continue; end if;
    if v_num = any (v_nums) then v_err := v_err || jsonb_build_object('fila', v_i, 'mensaje', 'El N° ' || v_num || ' está repetido en el archivo.'); continue; end if;
    if v_dni is not null and v_dni = any (v_dnis) then v_err := v_err || jsonb_build_object('fila', v_i, 'mensaje', 'El DNI ' || v_dni || ' está repetido en el archivo.'); continue; end if;
    v_nums := v_nums || v_num; if v_dni is not null then v_dnis := v_dnis || v_dni; end if;
    v_ok := v_ok + 1;
    if not p_solo_validar then
      select id into v_existe from public.socios where club_id = v_club and numero = v_num;
      if v_existe is null then
        insert into public.socios (club_id, numero, apellidos, nombres, dni, celular, correo, fecha_ingreso, es_ejemplo)
        values (v_club, v_num, v_ap, v_no, v_dni, nullif(trim(v_f ->> 'celular'), ''), nullif(lower(trim(v_f ->> 'correo')), ''), nullif(v_f ->> 'fecha_ingreso', '')::date, false);
        v_nuevos := v_nuevos + 1;
      else
        update public.socios set apellidos = v_ap, nombres = v_no, dni = coalesce(v_dni, dni), celular = coalesce(nullif(trim(v_f ->> 'celular'), ''), celular),
               correo = coalesce(nullif(lower(trim(v_f ->> 'correo')), ''), correo), es_ejemplo = false
         where id = v_existe;
        v_act := v_act + 1;
      end if;
    end if;
  end loop;
  return jsonb_build_object('total', v_i, 'validas', v_ok, 'errores', v_err, 'nuevos', v_nuevos, 'actualizados', v_act, 'solo_validar', p_solo_validar);
end;
$$;

-- ---------------------------------------------------------------------
-- Web pública: lee los mismos datos (avisos públicos, ambientes, horarios)
-- ---------------------------------------------------------------------
create or replace function public.web_publica(p_club_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'club', jsonb_build_object('nombre', c.nombre, 'direccion', c.direccion, 'telefono', c.telefono, 'celular', c.celular),
    'horarios', cfg.reglas -> 'horarios',
    'tenis', jsonb_build_object('hora_inicio', cfg.reglas #>> '{tenis,hora_inicio}', 'hora_fin', cfg.reglas #>> '{tenis,hora_fin}'),
    'ambientes', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'nombre', a.nombre, 'descripcion', a.descripcion, 'capacidad', a.capacidad,
                     'solo_temporada_baja', a.solo_temporada_baja, 'foto_path', a.foto_path) order by a.orden), '[]'::jsonb)
                    from public.ambientes a where a.club_id = c.id and a.activo and a.publicado_web and not a.es_adicional),
    'avisos', (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'titulo', v.titulo, 'texto', v.texto, 'foto_path', v.foto_path,
                  'publicado_en', v.publicado_en, 'fijado', v.fijado) order by v.fijado desc, v.publicado_en desc), '[]'::jsonb)
                 from (select * from public.avisos v where v.club_id = c.id and v.publico_web and v.eliminado_en is null and v.publicado_en <= now()
                         and (v.expira_en is null or v.expira_en > now()) order by v.fijado desc, v.publicado_en desc limit 12) v)
  )
  from public.clubes c left join public.config cfg on cfg.club_id = c.id
  where c.slug = p_club_slug and c.activo
$$;

-- Lectura de secretos de Vault: solo para el rol de servicio (Edge Functions)
create or replace function public.leer_secreto(p_nombre text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v text;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), (current_setting('request.jwt.claims', true)::jsonb ->> 'role')) is distinct from 'service_role' then
    raise exception 'No permitido.';
  end if;
  if to_regclass('vault.decrypted_secrets') is null then return null; end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into v using p_nombre;
  return v;
end;
$$;

-- ---------------------------------------------------------------------
-- Permisos de ejecución: por defecto nadie; luego, solo quien corresponde
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to authenticated, service_role;
revoke execute on function public.leer_secreto(text) from authenticated;
grant execute on function public.web_publica(text), public.solicitar_alquiler(text, text, text, date, uuid, text, text),
  public.registrar_acceso(text, boolean, text, text) to anon;
alter default privileges in schema public revoke execute on functions from public, anon;
