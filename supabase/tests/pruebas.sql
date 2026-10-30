-- =====================================================================
-- Pruebas de RLS y de las funciones (RPC): casos que deben pasar y casos que deben fallar.
-- Cada caso corre en una subtransacción que se deshace al final: no deja datos.
-- Se ejecuta igual en Supabase (SQL editor / MCP) y en local con PGlite.
-- Resultado: tabla con caso, ok y detalle.
-- =====================================================================

create temp table if not exists resultados (n serial, caso text, ok boolean, detalle text);
truncate resultados;

create or replace function pg_temp.como(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.anonimo() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;

do $$
declare
  v_club uuid := (select id from public.clubes where slug = 'casino-pimentel');
  u_a uuid; u_b uuid; u_payo uuid; u_julita uuid; u_barra uuid; u_port uuid;
  s_a uuid; s_b uuid; m_a uuid; m_b uuid; m_hijo27 uuid;
  c_t1 uuid; c_t2 uuid; b1 uuid := 'b1000000-0000-4000-8000-000000000001'; b2 uuid := 'b1000000-0000-4000-8000-000000000002';
  p_pisco uuid; p_cerveza uuid; i_pisco uuid; kevin uuid; marco uuid := 'e1000000-0000-4000-8000-000000000004';
  v_hoy date; v_lun date; v_hora_local time; v_res jsonb; v_det text; v_n int; v_x numeric; v_y numeric; v_tok text; v_id uuid;
begin
  select c.user_id, c.socio_id, c.miembro_id into u_a, s_a, m_a from public.credenciales_socio c join public.socios s on s.id = c.socio_id where s.apellidos = 'Peralta Ugaz';
  select c.user_id, c.socio_id, c.miembro_id into u_b, s_b, m_b from public.credenciales_socio c join public.socios s on s.id = c.socio_id where s.apellidos = 'Chirinos Vera';
  select id into m_hijo27 from public.miembros where socio_id = s_a and fecha_nacimiento = date '1999-06-15';
  select id into u_payo from public.usuarios_staff where correo = 'payo@casinopimentel.test';
  select id into u_julita from public.usuarios_staff where correo = 'julita@casinopimentel.test';
  select id into u_barra from public.usuarios_staff where correo = 'barra1@casinopimentel.test';
  select id into u_port from public.usuarios_staff where correo = 'porteria1@casinopimentel.test';
  select id into c_t1 from public.canchas where nombre = 'Tenis 1';
  select id into c_t2 from public.canchas where nombre = 'Tenis 2';
  select id into p_pisco from public.productos where nombre = 'Pisco Sour';
  select id into p_cerveza from public.productos where nombre = 'Cerveza';
  select id into i_pisco from public.insumos where nombre = 'PISCO 0.700 lt';
  select id into kevin from public.personal where dni = '97000112';
  v_hoy := app.hoy(v_club);
  v_lun := (date_trunc('week', v_hoy) + interval '7 days')::date; -- lunes de la próxima semana
  v_hora_local := app.ahora_local(v_club)::time;

  -- 1 ---------------------------------------------------------------
  begin
    perform pg_temp.como(u_a);
    if (select count(*) from public.socios) <> 1 then raise exception 've % socios', (select count(*) from public.socios); end if;
    if (select count(*) from public.miembros where socio_id <> s_a) <> 0 then raise exception 've miembros de otras familias'; end if;
    if (select count(*) from public.miembros) < 2 then raise exception 'no ve a su familia'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('RLS · el socio solo ve su ficha y su familia', v_det = 'OK', v_det);

  -- 2 ---------------------------------------------------------------
  begin
    perform pg_temp.como(u_a);
    if (select count(*) from public.pagos where socio_id <> s_a) <> 0 then raise exception 've pagos ajenos'; end if;
    if (select count(*) from public.cuenta_socio where socio_id <> s_a) <> 0 then raise exception 've cuentas ajenas'; end if;
    if (select count(*) from public.caja_movimientos) + (select count(*) from public.auditoria) + (select count(*) from public.cobros) <> 0 then raise exception 've caja, registro o cobros'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('RLS · el socio no ve pagos ajenos, la caja ni el registro', v_det = 'OK', v_det);

  -- 3 ---------------------------------------------------------------
  begin
    perform pg_temp.como(u_a);
    update public.config set reglas = reglas;
    get diagnostics v_n = row_count;
    if v_n <> 0 then raise exception 'pudo editar config'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('RLS · el socio no edita la configuración', v_det = 'OK', v_det);

  -- 4 ---------------------------------------------------------------
  begin
    perform pg_temp.como(u_julita);
    delete from public.avisos;
    raise exception 'pudo borrar';
  exception when others then v_det := case when sqlerrm ilike '%permission denied%' then 'OK' else sqlerrm end; end;
  insert into resultados (caso, ok, detalle) values ('Nadie borra: ni administración puede hacer DELETE', v_det = 'OK', v_det);

  -- 5 ---------------------------------------------------------------
  begin
    perform pg_temp.como(u_barra);
    if (select count(*) from public.productos) = 0 or (select count(*) from public.insumos) = 0 then raise exception 'no ve la carta o los insumos'; end if;
    if (select count(*) from public.caja_movimientos) + (select count(*) from public.pagos) + (select count(*) from public.ingresos) <> 0 then raise exception 've caja, pagos o ingresos'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('RLS · barra ve la carta pero no la caja, los pagos ni la portería', v_det = 'OK', v_det);

  -- 6 ---------------------------------------------------------------
  begin
    perform pg_temp.como(u_port);
    if (select count(*) from public.socios) <> 60 then raise exception 'no ve el padrón completo'; end if;
    if (select count(*) from public.cobros) + (select count(*) from public.caja_movimientos) + (select count(*) from public.marcaciones) <> 0 then raise exception 've ventas, caja o marcaciones'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('RLS · portería ve el padrón pero no las ventas ni la caja', v_det = 'OK', v_det);

  -- 7 ---------------------------------------------------------------
  begin
    perform pg_temp.como(u_payo);
    if (select count(*) from public.socios) <> 60 or (select count(*) from public.caja_movimientos) = 0 or (select count(*) from public.cobros) = 0 then raise exception 'no ve todo'; end if;
    update public.config set reglas = reglas;
    get diagnostics v_n = row_count;
    if v_n <> 0 then raise exception 'el presidente pudo editar config (solo admin)'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('RLS · el directivo ve todo pero solo administración edita la configuración', v_det = 'OK', v_det);

  -- 8 ---------------------------------------------------------------
  begin
    perform pg_temp.como(u_julita);
    update public.config set reglas = jsonb_set(reglas, '{invitados,max_por_socio_dia}', '6');
    get diagnostics v_n = row_count;
    if v_n <> 1 then raise exception 'admin no pudo editar config'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Administración edita la configuración', v_det = 'OK', v_det);

  -- 9 ---------------------------------------------------------------
  begin
    perform pg_temp.como(u_julita);
    update public.config set reglas = jsonb_set(reglas, '{invitados,max_por_socio_dia}', '-1');
    raise exception 'aceptó una regla inválida';
  exception when others then v_det := case when sqlerrm ilike '%check%' or sqlerrm ilike '%violates%' then 'OK' else sqlerrm end; end;
  insert into resultados (caso, ok, detalle) values ('La configuración rechaza reglas inválidas', v_det = 'OK', v_det);

  -- 10 --------------------------------------------------------------
  begin
    perform pg_temp.anonimo();
    perform count(*) from public.socios;
    raise exception 'anónimo leyó socios';
  exception when others then v_det := case when sqlerrm ilike '%permission denied%' then 'OK' else sqlerrm end; end;
  insert into resultados (caso, ok, detalle) values ('Un visitante anónimo no lee ninguna tabla', v_det = 'OK', v_det);

  -- 11 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_julita);
    perform count(*) from app.personal_pin;
    raise exception 'leyó los PIN';
  exception when others then v_det := case when sqlerrm ilike '%permission denied%' then 'OK' else sqlerrm end; end;
  insert into resultados (caso, ok, detalle) values ('Nadie lee los PIN del personal (ni administración)', v_det = 'OK', v_det);

  -- 12 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_port);
    for v_n in 1..5 loop
      v_res := public.registrar_invitado(s_a, '9555000' || v_n, 'Invitado Prueba ' || v_n, 'club', 'efectivo');
      if not (v_res ->> 'ok')::boolean then raise exception 'falló el invitado %: %', v_n, v_res ->> 'mensaje'; end if;
    end loop;
    v_res := public.registrar_invitado(s_a, '95550006', 'Invitado Prueba 6', 'club', 'efectivo');
    if (v_res ->> 'ok')::boolean or v_res ->> 'regla' <> 'max_dia' then raise exception 'el 6.º no se bloqueó: %', v_res; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Invitados · 5 por socio al día; el 6.º se bloquea con mensaje claro', v_det = 'OK', v_det);

  -- 13 --------------------------------------------------------------
  begin
    insert into public.invitados (club_id, dni, nombres) values (v_club, '95559999', 'Visitante Frecuente') returning id into v_id;
    insert into public.ingresos (club_id, fecha, persona, invitado_id, socio_id, tipo_ingreso, estado)
    select v_club, d, 'invitado', v_id, s_a, 'club', 'salio' from unnest(array[date_trunc('month', v_hoy)::date, date_trunc('month', v_hoy)::date]) d
    where date_trunc('month', v_hoy)::date < v_hoy;
    perform pg_temp.como(u_port);
    if date_trunc('month', v_hoy)::date < v_hoy then
      v_res := public.registrar_invitado(s_a, '95559999', '', 'club', 'efectivo');
      if not (v_res ->> 'ok')::boolean then raise exception 'la 3.ª visita debió pasar: %', v_res ->> 'mensaje'; end if;
      v_res := public.registrar_invitado(s_b, '95559999', '', 'club', 'efectivo');
      if (v_res ->> 'ok')::boolean or v_res ->> 'regla' <> 'max_mes' then raise exception 'la 4.ª visita no se bloqueó: %', v_res; end if;
    end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Invitados · un DNI no pasa de 3 visitas al mes', v_det = 'OK', v_det);

  -- 14 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_a);
    v_res := public.registrar_invitado(null, '95551234', 'Amiga De Prueba', 'piscina', null, v_hoy);
    if not (v_res ->> 'ok')::boolean then raise exception 'pre-registro falló: %', v_res ->> 'mensaje'; end if;
    execute 'reset role';
    perform pg_temp.como(u_port);
    v_res := public.registrar_invitado(s_a, '95551234', '', 'piscina', 'yape');
    if not coalesce((v_res ->> 'confirmado_preregistro')::boolean, false) or (v_res ->> 'monto')::numeric <> 20 then raise exception 'portería no confirmó el pre-registro: %', v_res; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Invitados · el socio pre-registra y portería confirma y cobra S/ 20 de piscina', v_det = 'OK', v_det);

  -- 15 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_a);
    v_res := public.reservar_tenis(c_t1, v_lun, '07:00', m_a);
    if not (v_res ->> 'ok')::boolean then raise exception 'reserva válida falló: %', v_res ->> 'mensaje'; end if;
    v_res := public.reservar_tenis(c_t2, v_lun, '09:00', m_a);
    if (v_res ->> 'ok')::boolean or v_res ->> 'regla' <> 'max_dia' then raise exception '2.ª del día no se bloqueó: %', v_res; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Tenis · reserva válida y bloqueo de la 2.ª del mismo día', v_det = 'OK', v_det);

  -- 16 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_a);
    for v_n in 0..2 loop
      v_res := public.reservar_tenis(c_t1, v_lun + v_n, '08:00', m_a);
      if not (v_res ->> 'ok')::boolean then raise exception 'reserva % falló: %', v_n + 1, v_res ->> 'mensaje'; end if;
    end loop;
    v_res := public.reservar_tenis(c_t1, v_lun + 3, '08:00', m_a);
    if (v_res ->> 'ok')::boolean or v_res ->> 'regla' <> 'max_semana' then raise exception 'la 4.ª de la semana no se bloqueó: %', v_res; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Tenis · 3 por semana; la 4.ª se bloquea', v_det = 'OK', v_det);

  -- 17 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_a);
    v_res := public.reservar_tenis(c_t2, v_lun + 4, '10:00', m_a);
    if not (v_res ->> 'ok')::boolean then raise exception 'primera reserva falló: %', v_res ->> 'mensaje'; end if;
    execute 'reset role';
    perform pg_temp.como(u_b);
    v_res := public.reservar_tenis(c_t2, v_lun + 4, '10:00', m_b);
    if (v_res ->> 'ok')::boolean or v_res ->> 'regla' <> 'ocupado' then raise exception 'se permitió doble reserva: %', v_res; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Tenis · no hay doble reserva del mismo turno', v_det = 'OK', v_det);

  -- 18 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_a);
    v_res := public.reservar_tenis(c_t1, v_hoy + 1, '11:00', m_hijo27);
    if (v_res ->> 'ok')::boolean or v_res ->> 'mensaje' not ilike '%25%' then raise exception 'hijo de 27 pudo reservar: %', v_res; end if;
    v_res := public.reservar_tenis(c_t1, v_hoy - 1, '11:00', m_a);
    if (v_res ->> 'ok')::boolean then raise exception 'se reservó en el pasado'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Tenis · hijos de 25 o más y fechas pasadas no reservan', v_det = 'OK', v_det);

  -- 19 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_a);
    v_tok := public.carnet_token() ->> 'token';
    execute 'reset role';
    perform pg_temp.como(u_port);
    v_res := public.validar_ingreso(v_tok);
    if (v_res #>> '{miembro,id}')::uuid <> m_a then raise exception 'el QR no identificó al socio'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Carnet · el QR firmado identifica al socio en portería', v_det = 'OK', v_det);

  -- 20 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_a);
    v_tok := public.carnet_token() ->> 'token';
    execute 'reset role';
    perform pg_temp.como(u_port);
    perform public.validar_ingreso(left(v_tok, -1) || case when right(v_tok, 1) = 'a' then 'b' else 'a' end);
    raise exception 'aceptó un QR alterado';
  exception when others then v_det := case when sqlerrm ilike '%no es válido%' then 'OK' else sqlerrm end; end;
  insert into resultados (caso, ok, detalle) values ('Carnet · un QR alterado se rechaza', v_det = 'OK', v_det);

  -- 21 --------------------------------------------------------------
  begin
    v_x := extract(epoch from now())::bigint - 120;
    v_tok := 'CP1.' || m_a || '.' || v_x::bigint || '.' || app.firmar(v_club, m_a || '.' || v_x::bigint);
    perform pg_temp.como(u_port);
    perform public.validar_ingreso(v_tok);
    raise exception 'aceptó un QR vencido (captura de pantalla)';
  exception when others then v_det := case when sqlerrm ilike '%venció%' then 'OK' else sqlerrm end; end;
  insert into resultados (caso, ok, detalle) values ('Carnet · una captura de pantalla (QR vencido) no sirve', v_det = 'OK', v_det);

  -- 22 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_a);
    perform public.carnet_token(m_b);
    raise exception 'generó el QR de otra familia';
  exception when others then v_det := case when sqlerrm ilike '%tu familia%' then 'OK' else sqlerrm end; end;
  insert into resultados (caso, ok, detalle) values ('Carnet · un socio no genera el QR de otra familia', v_det = 'OK', v_det);

  -- 23 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_port);
    v_res := public.registrar_ingreso(m_b, 'club', 'qr');
    if not (v_res ->> 'ok')::boolean or not (v_res ->> 'con_deuda')::boolean then raise exception 'ingreso con deuda mal registrado: %', v_res; end if;
    execute 'reset role';
    if not exists (select 1 from public.notificaciones where tipo = 'moroso_ingreso' and creado_en > now() - interval '1 minute') then raise exception 'no avisó a administración'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Portería · socio con deuda entra (no se bloquea) y se avisa a administración', v_det = 'OK', v_det);

  -- 24 --------------------------------------------------------------
  begin
    select coalesce(sum(cantidad), 0) into v_x from public.movimientos_stock where insumo_id = i_pisco and barra_id = b1;
    perform pg_temp.como(u_barra);
    v_res := public.guardar_comanda(jsonb_build_object('barra_id', b1, 'mesa', '4', 'socio_id', s_a, 'miembro_id', m_a, 'items', jsonb_build_array(jsonb_build_object('producto_id', p_pisco, 'cantidad', 1))));
    v_id := (v_res ->> 'comanda_id')::uuid;
    v_res := public.cerrar_comanda(v_id, jsonb_build_array(jsonb_build_object('medio', 'cuenta_socio', 'monto', 15)));
    if not (v_res ->> 'ok')::boolean then raise exception 'no cobró: %', v_res; end if;
    execute 'reset role';
    select coalesce(sum(cantidad), 0) into v_y from public.movimientos_stock where insumo_id = i_pisco and barra_id = b1;
    if round(v_x - v_y, 2) <> 3 then raise exception 'descontó % oz de pisco (esperado 3)', v_x - v_y; end if;
    if not exists (select 1 from public.cuenta_socio where comanda_id = v_id and socio_id = s_a and tipo = 'cargo' and monto = 15) then raise exception 'no cargó a la cuenta del socio'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Barra · Pisco Sour a cuenta del socio: descuenta 3 oz y carga S/ 15 a su cuenta', v_det = 'OK', v_det);

  -- 25 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_barra);
    v_res := public.guardar_comanda(jsonb_build_object('barra_id', b1, 'items', jsonb_build_array(jsonb_build_object('producto_id', p_cerveza, 'cantidad', 2))));
    perform public.cerrar_comanda((v_res ->> 'comanda_id')::uuid, jsonb_build_array(jsonb_build_object('medio', 'efectivo', 'monto', 10, 'recibido', 10)));
    raise exception 'aceptó pagos que no suman el total';
  exception when others then v_det := case when sqlerrm ilike '%suman%' then 'OK' else sqlerrm end; end;
  insert into resultados (caso, ok, detalle) values ('Barra · pagos que no suman el total se rechazan', v_det = 'OK', v_det);

  -- 26 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_barra);
    begin
      perform public.guardar_comanda(jsonb_build_object('barra_id', b1, 'items', jsonb_build_array(jsonb_build_object('producto_id', p_cerveza, 'cantidad', 1, 'cortesia', true, 'motivo', 'Cumpleaños', 'autorizado_por', marco, 'pin', '0000'))));
      raise exception 'aceptó PIN incorrecto';
    exception when others then if sqlerrm not ilike '%PIN%' then raise; end if; end;
    v_res := public.guardar_comanda(jsonb_build_object('barra_id', b1, 'items', jsonb_build_array(jsonb_build_object('producto_id', p_cerveza, 'cantidad', 1, 'cortesia', true, 'motivo', 'Cumpleaños', 'autorizado_por', marco, 'pin', '4321'))));
    if (v_res ->> 'total')::numeric <> 0 or (v_res ->> 'total_cortesias')::numeric <> 6 then raise exception 'cortesía mal calculada: %', v_res; end if;
    v_res := public.cerrar_comanda((v_res ->> 'comanda_id')::uuid, '[]'::jsonb);
    if not (v_res ->> 'ok')::boolean then raise exception 'no cerró la cortesía'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Barra · la cortesía exige motivo y PIN del encargado', v_det = 'OK', v_det);

  -- 27 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_barra);
    v_res := public.guardar_comanda(jsonb_build_object('barra_id', b2, 'items', jsonb_build_array(jsonb_build_object('producto_id', p_cerveza, 'cantidad', 3))));
    perform public.cerrar_comanda((v_res ->> 'comanda_id')::uuid, jsonb_build_array(jsonb_build_object('medio', 'efectivo', 'monto', 18, 'recibido', 20)));
    v_res := public.cerrar_barra(b2, jsonb_build_object('efectivo', 0, 'yape', 0, 'tarjeta', 0), '[]'::jsonb, 'Prueba');
    if not (v_res ->> 'ok')::boolean or (v_res ->> 'diferencia_total')::numeric <> -18 then raise exception 'cierre mal calculado: %', v_res; end if;
    execute 'reset role';
    if not exists (select 1 from public.notificaciones where tipo = 'faltante' and creado_en > now() - interval '1 minute') then raise exception 'no avisó el faltante'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Barra · cierre del día con faltante: diferencia resaltada y aviso a la directiva', v_det = 'OK', v_det);

  -- 28 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_julita);
    v_n := public.generar_cuotas_mes((date_trunc('month', v_hoy) + interval '1 month')::date);
    if v_n <> 60 then raise exception 'generó % cuotas (esperado 60)', v_n; end if;
    v_n := public.generar_cuotas_mes((date_trunc('month', v_hoy) + interval '1 month')::date);
    if v_n <> 0 then raise exception 'duplicó cuotas'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Cuotas · se generan una vez por mes para los socios activos', v_det = 'OK', v_det);

  -- 29 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_b);
    insert into public.pagos (club_id, socio_id, medio, monto, operacion) values (v_club, s_b, 'yape', 80, '123456') returning id into v_id;
    execute 'reset role';
    perform pg_temp.como(u_julita);
    v_res := public.validar_pago(v_id, true);
    execute 'reset role';
    if (select estado from public.cuotas where socio_id = s_b and periodo = date '2026-08-01') <> 'pagado' then raise exception 'no se aplicó a la cuota más antigua'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Pagos · el socio sube su pago y al validarlo se aplica a la cuota más antigua', v_det = 'OK', v_det);

  -- 30 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_a);
    begin
      insert into public.pagos (club_id, socio_id, medio, monto) values (v_club, s_b, 'yape', 80);
      raise exception 'registró un pago a nombre de otro socio';
    exception when others then if sqlerrm not ilike '%row-level security%' then raise; end if; end;
    insert into public.pagos (club_id, socio_id, medio, monto, estado) values (v_club, s_a, 'yape', 80, 'validado');
    raise exception 'registró un pago ya validado';
  exception when others then v_det := case when sqlerrm ilike '%row-level security%' then 'OK' else sqlerrm end; end;
  insert into resultados (caso, ok, detalle) values ('Pagos · un socio no registra pagos ajenos ni pagos "validados"', v_det = 'OK', v_det);

  -- 31 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_port);
    v_res := public.identificar_personal('9090');
    if not (v_res ->> 'ok')::boolean or (v_res ->> 'personal_id')::uuid <> kevin then raise exception 'el PIN no identificó al trabajador: %', v_res; end if;
    v_res := public.marcar_asistencia(kevin, v_res ->> 'sugerido', null, 'Prueba');
    if not (v_res ->> 'ok')::boolean then raise exception 'no marcó: %', v_res; end if;
    if v_hora_local > time '07:11' and (v_res ->> 'minutos_tarde')::int = 0 and v_res ->> 'tipo' = 'entrada' then raise exception 'no calculó la tardanza'; end if;
    v_res := public.identificar_personal('12345678');
    if (v_res ->> 'ok')::boolean then raise exception 'aceptó un DNI desconocido'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Asistencia · PIN identifica al trabajador, marca y calcula la tardanza', v_det = 'OK', v_det);

  -- 32 --------------------------------------------------------------
  begin
    perform pg_temp.anonimo();
    v_res := public.solicitar_alquiler('casino-pimentel', 'Cliente Web', '987654321', v_hoy + 40, 'a1000000-0000-4000-8000-000000000001', 'no_socio', 'Boda');
    if not (v_res ->> 'ok')::boolean then raise exception 'la web no pudo solicitar: %', v_res; end if;
    execute 'reset role';
    if (select count(*) from public.notificaciones where tipo = 'alquiler' and creado_en > now() - interval '1 minute') < 4 then raise exception 'no avisó a la directiva'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Web · una solicitud de alquiler llega al panel con notificación', v_det = 'OK', v_det);

  -- 33 --------------------------------------------------------------
  begin
    perform pg_temp.anonimo();
    v_res := public.web_publica('casino-pimentel');
    if jsonb_array_length(v_res -> 'avisos') <> 2 then raise exception 'la web muestra % avisos (esperado 2 públicos)', jsonb_array_length(v_res -> 'avisos'); end if;
    if v_res::text ilike '%Asamblea%' then raise exception 'mostró un aviso solo para socios'; end if;
    if v_res::text ilike '%precio%' or v_res::text ilike '%garantia%' then raise exception 'la web expone tarifas'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Web · solo muestra avisos públicos y nunca tarifas', v_det = 'OK', v_det);

  -- 34 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_julita);
    update public.socios set notas = 'Prueba de auditoría' where id = s_a;
    execute 'reset role';
    if not exists (select 1 from public.auditoria where tabla = 'socios' and registro_id = s_a::text and usuario_nombre = 'Julita' and 'notas' = any (cambios)) then
      raise exception 'el registro no guardó quién cambió qué';
    end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Registro · la auditoría guarda quién cambió qué y cuándo', v_det = 'OK', v_det);

  -- 35 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_julita);
    v_res := public.registrar_alquiler(jsonb_build_object('ambiente_id', 'a1000000-0000-4000-8000-000000000004', 'fecha', '2026-11-20', 'tipo_cliente', 'no_socio', 'cliente_nombre', 'Cliente Prueba'));
    if (v_res ->> 'tarifa')::numeric <> 700 or (v_res ->> 'igv')::numeric <> 126 or (v_res ->> 'garantia')::numeric <> 1000 or v_res ->> 'dia_decoracion' <> '2026-11-19' then raise exception 'tarifa mal calculada: %', v_res; end if;
    v_res := public.registrar_alquiler(jsonb_build_object('ambiente_id', 'a1000000-0000-4000-8000-000000000005', 'fecha', '2026-11-19', 'tipo_cliente', 'socio', 'cliente_nombre', 'Otro', 'con_decoracion', false));
    if (v_res ->> 'ok')::boolean then raise exception 'permitió alquilar el día de decoración de otro cliente'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Ambientes · tarifa automática con IGV, garantía y día de decoración bloqueado', v_det = 'OK', v_det);

  -- 36 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_julita);
    select (k.inicio + k.ingresos - k.ventas - k.cortesias + k.ajustes - k.saldo) into v_x
      from public.kardex(b1, date '2026-10-01', date '2026-10-29') k where k.nombre = 'WHISKY';
    if abs(v_x) > 0.01 then raise exception 'el kardex no cuadra: %', v_x; end if;
    if (select k.diferencia from public.kardex(b1, date '2026-10-01', date '2026-10-29') k where k.nombre = 'WHISKY') <> -3.5 then raise exception 'no muestra el faltante del conteo'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Kardex · inicio + compras − ventas − cortesías ± ajustes = saldo; muestra el faltante del conteo', v_det = 'OK', v_det);

  -- 37 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_b);
    perform public.hoy_resumen();
    raise exception 'un socio abrió el panel';
  exception when others then v_det := case when sqlerrm ilike '%directiva%' then 'OK' else sqlerrm end; end;
  insert into resultados (caso, ok, detalle) values ('Panel · un socio no puede abrir el resumen de Hoy', v_det = 'OK', v_det);

  -- 38 --------------------------------------------------------------
  begin
    perform pg_temp.como(u_payo);
    v_res := public.hoy_resumen();
    if v_res -> 'porteria' is null or v_res -> 'atencion' is null then raise exception 'resumen incompleto'; end if;
    v_res := public.datos_reporte_diario();
    if jsonb_array_length(v_res -> 'barras') <> 2 then raise exception 'reporte sin las 2 barras'; end if;
    raise exception 'OK';
  exception when others then v_det := sqlerrm; end;
  insert into resultados (caso, ok, detalle) values ('Panel · el presidente ve el resumen de Hoy y los datos del reporte diario', v_det = 'OK', v_det);
end $$;

select caso, ok, detalle from resultados order by n;
