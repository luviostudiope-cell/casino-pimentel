-- =====================================================================
-- 007 · Funciones (RPC): perfil, notificaciones, carnet QR firmado,
--       portería e invitados, tenis, ambientes, pagos y cuotas
-- Todas: security definer + search_path vacío + validan rol y club adentro.
-- Las reglas salen de config.reglas, nunca escritas aquí.
-- =====================================================================

alter table public.ambientes add column grupo text; -- ambientes que se cruzan (salón completo, 1/2, 1/3)
alter table public.comanda_items add column anulado boolean not null default false;

-- ---------------------------------------------------------------------
-- Notificaciones (centro de notificaciones + push)
-- ---------------------------------------------------------------------
create or replace function app.notificar_usuario(p_club uuid, p_user uuid, p_tipo text, p_titulo text, p_cuerpo text, p_url text default null, p_importante boolean default false)
returns void language sql security definer set search_path = '' as $$
  insert into public.notificaciones (club_id, user_id, tipo, titulo, cuerpo, url, importante)
  values (p_club, p_user, p_tipo, p_titulo, p_cuerpo, p_url, p_importante)
$$;

create or replace function app.notificar_directiva(p_club uuid, p_tipo text, p_titulo text, p_cuerpo text, p_url text default null, p_importante boolean default false)
returns void language sql security definer set search_path = '' as $$
  insert into public.notificaciones (club_id, user_id, tipo, titulo, cuerpo, url, importante)
  select p_club, s.id, p_tipo, p_titulo, p_cuerpo, p_url, p_importante
    from public.usuarios_staff s
   where s.club_id = p_club and s.activo and s.rol in ('presidente', 'directivo', 'admin')
$$;

create or replace function app.notificar_socio(p_socio uuid, p_tipo text, p_titulo text, p_cuerpo text, p_url text default null, p_importante boolean default false)
returns void language sql security definer set search_path = '' as $$
  insert into public.notificaciones (club_id, user_id, tipo, titulo, cuerpo, url, importante)
  select c.club_id, c.user_id, p_tipo, p_titulo, p_cuerpo, p_url, p_importante
    from public.credenciales_socio c where c.socio_id = p_socio
$$;

create or replace function app.soles(n numeric)
returns text language sql immutable set search_path = '' as $$
  select 'S/ ' || to_char(coalesce(n, 0), 'FM999,999,990.00')
$$;

create or replace function app.mes_nombre(d date)
returns text language sql immutable set search_path = '' as $$
  select (array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'])[extract(month from d)::int]
$$;

-- Al publicar un aviso: llega a todos los socios (y a la directiva) como notificación
create or replace function app.aviso_a_notificaciones()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.notificar and new.eliminado_en is null and new.publicado_en <= now() + interval '5 minutes' then
    insert into public.notificaciones (club_id, user_id, tipo, titulo, cuerpo, url)
    select new.club_id, c.user_id, 'aviso', new.titulo, left(new.texto, 180), '/app/socio/avisos'
      from public.credenciales_socio c where c.club_id = new.club_id;
  end if;
  return new;
end;
$$;
create trigger avisos_notificar after insert on public.avisos for each row execute function app.aviso_a_notificaciones();

-- ---------------------------------------------------------------------
-- Perfil y accesos
-- ---------------------------------------------------------------------
create or replace function public.mi_perfil()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object('tipo', 'staff', 'rol', s.rol, 'user_id', s.id, 'club_id', s.club_id, 'club_nombre', c.nombre,
            'nombre', s.nombre, 'socio_id', null, 'miembro_id', null, 'debe_cambiar_pin', false)
       from public.usuarios_staff s join public.clubes c on c.id = s.club_id
      where s.id = (select auth.uid()) and s.activo),
    (select jsonb_build_object('tipo', 'socio', 'rol', 'socio', 'user_id', cr.user_id, 'club_id', cr.club_id, 'club_nombre', c.nombre,
            'nombre', m.nombres || ' ' || m.apellidos, 'socio_id', cr.socio_id, 'miembro_id', cr.miembro_id, 'debe_cambiar_pin', cr.debe_cambiar_pin)
       from public.credenciales_socio cr join public.clubes c on c.id = cr.club_id join public.miembros m on m.id = cr.miembro_id
      where cr.user_id = (select auth.uid()))
  )
$$;

create or replace function public.registrar_acceso(p_evento text, p_exito boolean, p_identificador text default null, p_dispositivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_club uuid := app.club_id();
begin
  if p_evento not in ('login', 'logout', 'fallido') then return; end if;
  if v_club is null and p_identificador is not null then
    select club_id into v_club from public.usuarios_staff where lower(correo) = lower(left(p_identificador, 120)) limit 1;
  end if;
  insert into public.accesos (club_id, user_id, identificador, evento, exito, dispositivo)
  values (v_club, auth.uid(), left(p_identificador, 120), case when not p_exito and p_evento = 'login' then 'fallido' else p_evento end, p_exito, left(p_dispositivo, 160));
end;
$$;

-- ---------------------------------------------------------------------
-- Carnet: QR rotativo firmado (HMAC-SHA256) que vence a los N segundos
-- Formato: CP1.<miembro_id>.<vence_epoch>.<firma>
-- ---------------------------------------------------------------------
create or replace function app.firmar(p_club uuid, p_texto text)
returns text language sql stable security definer set search_path = '' as $$
  select left(encode(extensions.hmac(convert_to(p_texto, 'UTF8'), s.qr_clave, 'sha256'), 'hex'), 24)
    from app.secretos s where s.club_id = p_club
$$;

create or replace function public.carnet_token(p_miembro_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_miembro uuid := coalesce(p_miembro_id, app.miembro_id());
  v_m record;
  v_vig int;
  v_vence bigint;
begin
  select m.id, m.club_id, m.socio_id into v_m from public.miembros m where m.id = v_miembro and m.eliminado_en is null;
  if v_m.id is null then raise exception 'No encontramos este carnet.'; end if;
  if v_m.socio_id is distinct from app.socio_id() then raise exception 'Solo puedes mostrar los carnets de tu familia.'; end if;
  insert into app.secretos (club_id) values (v_m.club_id) on conflict do nothing;
  v_vig := (app.reglas(v_m.club_id) #>> '{qr,vigencia_seg}')::int;
  v_vence := extract(epoch from now())::bigint + v_vig;
  return jsonb_build_object(
    'token', 'CP1.' || v_m.id || '.' || v_vence || '.' || app.firmar(v_m.club_id, v_m.id || '.' || v_vence),
    'vence', v_vence, 'vigencia', v_vig);
end;
$$;

create or replace function app.leer_token(p_token text)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  p text[] := string_to_array(trim(p_token), '.');
  v_miembro uuid;
  v_club uuid;
  v_vence bigint;
begin
  if array_length(p, 1) <> 4 or p[1] <> 'CP1' then raise exception 'Este código no es un carnet del club.'; end if;
  begin
    v_miembro := p[2]::uuid; v_vence := p[3]::bigint;
  exception when others then raise exception 'Este código no es un carnet del club.';
  end;
  select club_id into v_club from public.miembros where id = v_miembro;
  if v_club is null or v_club <> app.club_id() then raise exception 'Este carnet no pertenece a este club.'; end if;
  if app.firmar(v_club, v_miembro || '.' || v_vence) is distinct from p[4] then raise exception 'El QR no es válido. Pide al socio que abra su carnet otra vez.'; end if;
  if v_vence < extract(epoch from now())::bigint - 5 then raise exception 'Este QR ya venció (dura 30 segundos). Pide al socio que lo muestre de nuevo desde la app.'; end if;
  return v_miembro;
end;
$$;

-- ---------------------------------------------------------------------
-- Portería
-- ---------------------------------------------------------------------
create or replace function app.edad(p_nac date, p_ref date)
returns int language sql immutable set search_path = '' as $$
  select extract(year from age(p_ref, p_nac))::int
$$;

create or replace function public.validar_ingreso(p_token text default null, p_miembro_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id();
  v_hoy date;
  v_miembro uuid;
  v_m record; v_s record; v_e record;
  v_reglas jsonb;
begin
  if not app.tiene_rol('porteria', 'presidente', 'directivo', 'admin') then raise exception 'Solo portería puede validar ingresos.'; end if;
  v_hoy := app.hoy(v_club);
  v_reglas := app.reglas(v_club);
  v_miembro := case when p_token is not null and length(trim(p_token)) > 0 then app.leer_token(p_token) else p_miembro_id end;
  select * into v_m from public.miembros where id = v_miembro and club_id = v_club and eliminado_en is null;
  if v_m.id is null then raise exception 'No encontramos a esta persona en el padrón.'; end if;
  select * into v_s from public.socios where id = v_m.socio_id;
  select * into v_e from public.estado_socios where socio_id = v_s.id;
  return jsonb_build_object(
    'metodo', case when p_token is not null then 'qr' else 'busqueda' end,
    'miembro', jsonb_build_object('id', v_m.id, 'nombres', v_m.nombres, 'apellidos', v_m.apellidos, 'parentesco', v_m.parentesco,
                                  'foto_path', v_m.foto_path, 'dni', v_m.dni, 'puede_ingresar', v_m.puede_ingresar,
                                  'edad', case when v_m.fecha_nacimiento is not null then app.edad(v_m.fecha_nacimiento, v_hoy) end, 'es_ejemplo', v_m.es_ejemplo),
    'socio', jsonb_build_object('id', v_s.id, 'numero', v_s.numero, 'nombres', v_s.nombres, 'apellidos', v_s.apellidos, 'estado', v_s.estado, 'es_ejemplo', v_s.es_ejemplo),
    'cuenta', jsonb_build_object('estado', coalesce(v_e.estado_cuenta, 'al_dia'), 'saldo', coalesce(v_e.saldo, 0), 'cuotas_vencidas', coalesce(v_e.cuotas_vencidas, 0)),
    'familia', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'nombres', f.nombres, 'apellidos', f.apellidos, 'parentesco', f.parentesco, 'foto_path', f.foto_path,
                      'dentro', exists (select 1 from public.ingresos i where i.miembro_id = f.id and i.fecha = v_hoy and i.estado = 'dentro'))
                      order by case f.parentesco when 'titular' then 0 when 'esposa' then 1 when 'esposo' then 1 else 2 end, f.fecha_nacimiento), '[]'::jsonb)
                  from public.miembros f where f.socio_id = v_s.id and f.eliminado_en is null),
    'ya_dentro', (select jsonb_build_object('hora', i.hora, 'ticket', i.ticket) from public.ingresos i
                   where i.miembro_id = v_m.id and i.fecha = v_hoy and i.estado = 'dentro' order by i.hora desc limit 1),
    'invitados_hoy', (select count(*) from public.ingresos i where i.socio_id = v_s.id and i.persona = 'invitado' and i.fecha = v_hoy and i.estado <> 'anulado'),
    'preregistrados', (select coalesce(jsonb_agg(jsonb_build_object('ingreso_id', i.id, 'dni', iv.dni, 'nombres', iv.nombres, 'tipo_ingreso', i.tipo_ingreso, 'monto', i.monto)), '[]'::jsonb)
                         from public.ingresos i join public.invitados iv on iv.id = i.invitado_id
                        where i.socio_id = v_s.id and i.fecha = v_hoy and i.estado = 'preregistrado'),
    'max_invitados_dia', (v_reglas #>> '{invitados,max_por_socio_dia}')::int,
    'bloquear_morosos', (v_reglas #>> '{morosos,bloquear_ingreso}')::boolean
  );
end;
$$;

create or replace function public.registrar_ingreso(p_miembro_id uuid, p_tipo_ingreso text default 'club', p_metodo text default 'busqueda', p_dispositivo text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id();
  v_hoy date;
  v_m record; v_s record; v_e record; v_previo record;
  v_reglas jsonb;
  v_deuda boolean;
  v_id uuid; v_ticket bigint;
begin
  if not app.tiene_rol('porteria', 'presidente', 'directivo', 'admin') then raise exception 'Solo portería puede registrar ingresos.'; end if;
  if p_tipo_ingreso not in ('club', 'piscina', 'comedor') then raise exception 'Tipo de ingreso no válido.'; end if;
  v_hoy := app.hoy(v_club);
  v_reglas := app.reglas(v_club);
  select * into v_m from public.miembros where id = p_miembro_id and club_id = v_club and eliminado_en is null;
  if v_m.id is null then raise exception 'No encontramos a esta persona en el padrón.'; end if;
  select * into v_s from public.socios where id = v_m.socio_id;
  if v_s.estado <> 'activo' then
    return jsonb_build_object('ok', false, 'mensaje', 'El socio está ' || v_s.estado || '. Comunícate con administración antes de dejarlo pasar.');
  end if;
  if not v_m.puede_ingresar then
    return jsonb_build_object('ok', false, 'mensaje', 'Esta persona tiene el ingreso suspendido. Comunícate con administración.');
  end if;
  select * into v_previo from public.ingresos where miembro_id = v_m.id and fecha = v_hoy and estado = 'dentro' order by hora desc limit 1;
  if v_previo.id is not null then
    return jsonb_build_object('ok', true, 'ya_estaba', true, 'ingreso_id', v_previo.id, 'ticket', v_previo.ticket,
      'mensaje', v_m.nombres || ' ya figura dentro desde las ' || to_char(v_previo.hora at time zone app.zona(v_club), 'HH24:MI') || '.');
  end if;
  select * into v_e from public.estado_socios where socio_id = v_s.id;
  v_deuda := coalesce(v_e.estado_cuenta, 'al_dia') = 'deuda';
  if v_deuda and (v_reglas #>> '{morosos,bloquear_ingreso}')::boolean then
    return jsonb_build_object('ok', false, 'mensaje', 'El socio tiene cuotas vencidas y la regla del club no permite el ingreso. Debe regularizar en administración.');
  end if;
  v_ticket := app.siguiente(v_club, 'ticket_porteria');
  insert into public.ingresos (club_id, fecha, persona, miembro_id, socio_id, tipo_ingreso, monto, ticket, estado, con_deuda, metodo, dispositivo, es_ejemplo)
  values (v_club, v_hoy, 'miembro', v_m.id, v_s.id, p_tipo_ingreso, 0, v_ticket, 'dentro', v_deuda,
          case when p_metodo in ('qr', 'busqueda', 'manual') then p_metodo else 'busqueda' end, left(p_dispositivo, 120), v_s.es_ejemplo)
  returning id into v_id;
  if v_deuda and (v_reglas #>> '{morosos,avisar_administracion}')::boolean then
    perform app.notificar_directiva(v_club, 'moroso_ingreso', 'Socio con deuda ingresó',
      v_m.nombres || ' ' || v_m.apellidos || ' (socio N° ' || v_s.numero || ') ingresó con ' || app.soles(v_e.saldo) || ' de deuda.',
      '/app/admin/socios/' || v_s.id, true);
  end if;
  return jsonb_build_object('ok', true, 'ingreso_id', v_id, 'ticket', v_ticket, 'con_deuda', v_deuda,
    'mensaje', case when v_deuda then 'Ingreso registrado. Recuérdale amablemente que tiene ' || app.soles(v_e.saldo) || ' pendiente.' else 'Ingreso registrado. ¡Bienvenido!' end);
end;
$$;

-- Invitados: máximo N por socio por día y M visitas por mes por DNI (de config)
create or replace function public.registrar_invitado(
  p_socio_id uuid, p_dni text, p_nombres text, p_tipo_ingreso text default 'club',
  p_medio_pago text default 'efectivo', p_fecha date default null, p_dispositivo text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id();
  v_rol text := app.rol();
  v_es_socio boolean := app.rol() = 'socio';
  v_socio uuid := case when app.rol() = 'socio' then app.socio_id() else p_socio_id end;
  v_hoy date;
  v_fecha date;
  v_reglas jsonb;
  v_max_dia int; v_max_mes int;
  v_dni text := upper(regexp_replace(coalesce(p_dni, ''), '\s', '', 'g'));
  v_nombres text := initcap(trim(regexp_replace(coalesce(p_nombres, ''), '\s+', ' ', 'g')));
  v_inv record; v_s record; v_pre record;
  v_hoy_cnt int; v_mes_cnt int;
  v_monto numeric; v_id uuid; v_ticket bigint;
  v_mes_ini date; v_mes_sig date;
begin
  if v_rol is null or v_rol not in ('socio', 'porteria', 'presidente', 'directivo', 'admin') then raise exception 'No tienes permiso para registrar invitados.'; end if;
  if p_tipo_ingreso not in ('club', 'piscina', 'comedor') then raise exception 'Tipo de ingreso no válido.'; end if;
  if v_dni !~ '^[0-9A-Z]{6,12}$' then return jsonb_build_object('ok', false, 'campo', 'dni', 'mensaje', 'Escribe el DNI completo: 8 números (o el carné de extranjería).'); end if;
  v_hoy := app.hoy(v_club);
  v_fecha := coalesce(p_fecha, v_hoy);
  if v_es_socio and (v_fecha < v_hoy or v_fecha > v_hoy + 7) then
    return jsonb_build_object('ok', false, 'campo', 'fecha', 'mensaje', 'Puedes registrar invitados desde hoy hasta 7 días antes de su visita.');
  end if;
  if not v_es_socio then v_fecha := v_hoy; end if;
  select * into v_s from public.socios where id = v_socio and club_id = v_club and eliminado_en is null;
  if v_s.id is null then raise exception 'Elige primero al socio que invita.'; end if;
  if v_s.estado <> 'activo' then return jsonb_build_object('ok', false, 'mensaje', 'El socio está ' || v_s.estado || ' y no puede invitar.'); end if;

  v_reglas := app.reglas(v_club);
  v_max_dia := (v_reglas #>> '{invitados,max_por_socio_dia}')::int;
  v_max_mes := (v_reglas #>> '{invitados,max_visitas_mes}')::int;
  v_mes_ini := date_trunc('month', v_fecha)::date;
  v_mes_sig := (date_trunc('month', v_fecha) + interval '1 month')::date;

  select * into v_inv from public.invitados where club_id = v_club and dni = v_dni;
  if v_inv.id is null and length(v_nombres) < 3 then
    return jsonb_build_object('ok', false, 'campo', 'nombres', 'mensaje', 'Escribe el nombre y apellido del invitado.');
  end if;

  -- ¿Ya estaba pre-registrado por el socio para hoy? Portería solo confirma y cobra.
  if v_inv.id is not null and not v_es_socio then
    select * into v_pre from public.ingresos where invitado_id = v_inv.id and socio_id = v_socio and fecha = v_fecha and estado = 'preregistrado' limit 1;
    if v_pre.id is not null then
      v_monto := case p_tipo_ingreso when 'comedor' then 0 else coalesce((v_reglas #>> array['invitados', 'tarifas', p_tipo_ingreso])::numeric, 0) end;
      v_ticket := app.siguiente(v_club, 'ticket_porteria');
      update public.ingresos set estado = 'dentro', hora = now(), tipo_ingreso = p_tipo_ingreso, monto = v_monto,
             medio_pago = case when v_monto > 0 then coalesce(p_medio_pago, 'efectivo') end, ticket = v_ticket, metodo = 'preregistro',
             registrado_por = auth.uid(), dispositivo = left(p_dispositivo, 120)
       where id = v_pre.id;
      return jsonb_build_object('ok', true, 'ingreso_id', v_pre.id, 'ticket', v_ticket, 'monto', v_monto, 'confirmado_preregistro', true,
        'mensaje', 'Invitado confirmado' || case when v_monto > 0 then '. Cobra ' || app.soles(v_monto) || '.' else '. Ingreso libre.' end);
    end if;
  end if;

  select count(*) into v_hoy_cnt from public.ingresos
   where socio_id = v_socio and persona = 'invitado' and fecha = v_fecha and estado <> 'anulado' and eliminado_en is null;
  if v_hoy_cnt >= v_max_dia then
    return jsonb_build_object('ok', false, 'regla', 'max_dia', 'invitados_hoy', v_hoy_cnt, 'max_dia', v_max_dia,
      'mensaje', 'El socio ya registró ' || v_hoy_cnt || ' invitados ' || case when v_fecha = v_hoy then 'hoy' else 'para ese día' end || '. El máximo es ' || v_max_dia || ' por día.');
  end if;

  if v_inv.id is not null then
    select count(*) into v_mes_cnt from public.ingresos
     where invitado_id = v_inv.id and fecha >= v_mes_ini and fecha < v_mes_sig and estado <> 'anulado' and eliminado_en is null;
    if v_mes_cnt >= v_max_mes then
      return jsonb_build_object('ok', false, 'regla', 'max_mes', 'visitas_mes', v_mes_cnt, 'max_mes', v_max_mes,
        'mensaje', coalesce(v_inv.nombres, 'Este invitado') || ' ya vino ' || v_mes_cnt || ' veces este mes. El máximo es ' || v_max_mes ||
                   '. Podrá volver desde el 1 de ' || app.mes_nombre(v_mes_sig) || '.');
    end if;
  else
    v_mes_cnt := 0;
  end if;

  if v_inv.id is null then
    insert into public.invitados (club_id, dni, nombres, es_ejemplo) values (v_club, v_dni, v_nombres, false) returning * into v_inv;
  elsif length(v_nombres) >= 3 and v_nombres <> v_inv.nombres and not v_es_socio then
    update public.invitados set nombres = v_nombres where id = v_inv.id;
  end if;

  v_monto := case p_tipo_ingreso when 'comedor' then 0 else coalesce((v_reglas #>> array['invitados', 'tarifas', p_tipo_ingreso])::numeric, 0) end;
  if v_es_socio then
    insert into public.ingresos (club_id, fecha, persona, invitado_id, socio_id, tipo_ingreso, monto, estado, metodo, dispositivo)
    values (v_club, v_fecha, 'invitado', v_inv.id, v_socio, p_tipo_ingreso, v_monto, 'preregistrado', 'preregistro', left(p_dispositivo, 120))
    returning id into v_id;
  else
    if v_monto > 0 and coalesce(p_medio_pago, '') not in ('efectivo', 'yape', 'tarjeta', 'cuenta_socio') then raise exception 'Elige cómo paga el invitado.'; end if;
    v_ticket := app.siguiente(v_club, 'ticket_porteria');
    insert into public.ingresos (club_id, fecha, persona, invitado_id, socio_id, tipo_ingreso, monto, medio_pago, ticket, estado, metodo, dispositivo)
    values (v_club, v_fecha, 'invitado', v_inv.id, v_socio, p_tipo_ingreso, v_monto, case when v_monto > 0 then p_medio_pago end, v_ticket, 'dentro', 'manual', left(p_dispositivo, 120))
    returning id into v_id;
    if v_monto > 0 and p_medio_pago = 'cuenta_socio' then
      insert into public.cuenta_socio (club_id, socio_id, tipo, origen, concepto, monto, detalle)
      values (v_club, v_socio, 'cargo', 'invitado', 'Ingreso de invitado: ' || v_inv.nombres, v_monto, jsonb_build_object('ingreso_id', v_id, 'tipo', p_tipo_ingreso));
      perform app.aplicar_pagos(v_socio);
    end if;
  end if;

  return jsonb_build_object('ok', true, 'ingreso_id', v_id, 'ticket', v_ticket, 'monto', v_monto, 'invitado', v_inv.nombres,
    'invitados_hoy', v_hoy_cnt + 1, 'max_dia', v_max_dia, 'visitas_mes', v_mes_cnt + 1, 'max_mes', v_max_mes,
    'mensaje', case when v_es_socio then v_inv.nombres || ' quedó registrado para el ' || to_char(v_fecha, 'DD/MM') || '. En portería solo dirá su DNI.'
                    else 'Invitado registrado' || case when v_monto > 0 then '. Cobra ' || app.soles(v_monto) || '.' else '. Ingreso libre.' end end);
end;
$$;

create or replace function public.cupos_invitados(p_socio_id uuid default null, p_dni text default null, p_fecha date default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id();
  v_socio uuid := case when app.rol() = 'socio' then app.socio_id() else p_socio_id end;
  v_fecha date := coalesce(p_fecha, app.hoy(app.club_id()));
  v_reglas jsonb := app.reglas(app.club_id());
  v_inv record;
  v_hoy_cnt int := 0; v_mes_cnt int := 0;
begin
  if app.rol() is null then raise exception 'Inicia sesión para continuar.'; end if;
  if v_socio is not null then
    select count(*) into v_hoy_cnt from public.ingresos
     where socio_id = v_socio and persona = 'invitado' and fecha = v_fecha and estado <> 'anulado' and eliminado_en is null;
  end if;
  if p_dni is not null then
    select * into v_inv from public.invitados where club_id = v_club and dni = upper(trim(p_dni));
    if v_inv.id is not null then
      select count(*) into v_mes_cnt from public.ingresos
       where invitado_id = v_inv.id and fecha >= date_trunc('month', v_fecha)::date and fecha < (date_trunc('month', v_fecha) + interval '1 month')::date
         and estado <> 'anulado' and eliminado_en is null;
    end if;
  end if;
  return jsonb_build_object(
    'invitados_hoy', v_hoy_cnt, 'max_dia', (v_reglas #>> '{invitados,max_por_socio_dia}')::int,
    'restantes_hoy', greatest(0, (v_reglas #>> '{invitados,max_por_socio_dia}')::int - v_hoy_cnt),
    'visitas_mes', v_mes_cnt, 'max_mes', (v_reglas #>> '{invitados,max_visitas_mes}')::int,
    'restantes_mes', greatest(0, (v_reglas #>> '{invitados,max_visitas_mes}')::int - v_mes_cnt),
    'nombre', case when app.es_staff() then v_inv.nombres end,
    'conocido', v_inv.id is not null,
    'tarifas', v_reglas #> '{invitados,tarifas}');
end;
$$;

create or replace function public.registrar_salida(p_ingreso_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not app.tiene_rol('porteria', 'presidente', 'directivo', 'admin') then raise exception 'Solo portería registra salidas.'; end if;
  update public.ingresos set estado = 'salio', hora_salida = now()
   where id = p_ingreso_id and club_id = app.club_id() and estado = 'dentro';
  if not found then return jsonb_build_object('ok', false, 'mensaje', 'Esta persona ya no figura dentro.'); end if;
  return jsonb_build_object('ok', true, 'mensaje', 'Salida registrada.');
end;
$$;

create or replace function public.anular_ingreso(p_ingreso_id uuid, p_motivo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not app.tiene_rol('porteria', 'presidente', 'directivo', 'admin') and not (app.rol() = 'socio') then raise exception 'No tienes permiso.'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 3 then raise exception 'Escribe el motivo de la anulación.'; end if;
  update public.ingresos set estado = 'anulado', eliminado_en = now(), eliminado_por = auth.uid(), eliminado_motivo = trim(p_motivo)
   where id = p_ingreso_id and club_id = app.club_id() and estado in ('preregistrado', 'dentro')
     and (app.rol() <> 'socio' or (socio_id = app.socio_id() and estado = 'preregistrado'));
  if not found then return jsonb_build_object('ok', false, 'mensaje', 'No se pudo anular este ingreso.'); end if;
  return jsonb_build_object('ok', true, 'mensaje', 'Ingreso anulado.');
end;
$$;

-- ---------------------------------------------------------------------
-- Tenis: 1 por día y 3 por semana por miembro; titular, esposa e hijos < 25
-- ---------------------------------------------------------------------
create or replace function public.reservar_tenis(p_cancha_id uuid, p_fecha date, p_hora time, p_miembro_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id();
  v_rol text := app.rol();
  v_t jsonb;
  v_c record; v_m record; v_s record;
  v_hoy date; v_ahora timestamp;
  v_ini time; v_fin time; v_dur int; v_hfin time;
  v_dia int; v_sem int; v_edad int; v_id uuid;
begin
  if v_rol is null or v_rol not in ('socio', 'porteria', 'presidente', 'directivo', 'admin') then raise exception 'No tienes permiso para reservar.'; end if;
  v_t := app.reglas(v_club) -> 'tenis';
  v_ini := (v_t ->> 'hora_inicio')::time; v_fin := (v_t ->> 'hora_fin')::time; v_dur := (v_t ->> 'duracion_min')::int;
  v_hoy := app.hoy(v_club); v_ahora := app.ahora_local(v_club);
  v_hfin := p_hora + make_interval(mins => v_dur);

  select * into v_c from public.canchas where id = p_cancha_id and club_id = v_club;
  if v_c.id is null or not v_c.activa then raise exception 'Esta cancha no está disponible.'; end if;
  if not v_c.reservable or v_c.deporte <> 'tenis' then return jsonb_build_object('ok', false, 'mensaje', 'La cancha de ' || v_c.deporte || ' es de uso libre: no necesita reserva.'); end if;

  select * into v_m from public.miembros where id = p_miembro_id and club_id = v_club and eliminado_en is null;
  if v_m.id is null then raise exception 'Elige quién va a jugar.'; end if;
  if v_rol = 'socio' and v_m.socio_id <> app.socio_id() then raise exception 'Solo puedes reservar para tu familia.'; end if;
  select * into v_s from public.socios where id = v_m.socio_id;
  if v_s.estado <> 'activo' or not v_m.puede_ingresar then return jsonb_build_object('ok', false, 'mensaje', 'Esta persona no está habilitada para reservar. Consulta en administración.'); end if;

  if p_hora < v_ini or v_hfin > v_fin or (extract(epoch from (p_hora - v_ini)) / 60)::int % v_dur <> 0 then
    return jsonb_build_object('ok', false, 'mensaje', 'Los turnos son de ' || v_dur || ' minutos, de ' || to_char(v_ini, 'HH24:MI') || ' a ' || to_char(v_fin, 'HH24:MI') || '. Elige uno de la lista.');
  end if;
  if p_fecha < v_hoy or (p_fecha = v_hoy and p_hora <= v_ahora::time) then
    return jsonb_build_object('ok', false, 'mensaje', 'Ese horario ya pasó. Elige uno más tarde.');
  end if;
  if v_rol = 'socio' and p_fecha > v_hoy + (v_t ->> 'dias_anticipacion')::int then
    return jsonb_build_object('ok', false, 'mensaje', 'Puedes reservar hasta con ' || (v_t ->> 'dias_anticipacion') || ' días de anticipación.');
  end if;

  if not (v_t -> 'pueden_reservar') ? v_m.parentesco then
    return jsonb_build_object('ok', false, 'mensaje', 'Pueden reservar el titular, su esposa o esposo y los hijos menores de ' || (v_t ->> 'edad_max_hijos') || ' años.');
  end if;
  if v_m.parentesco in ('hijo', 'hija') then
    if v_m.fecha_nacimiento is null then
      return jsonb_build_object('ok', false, 'mensaje', 'Falta la fecha de nacimiento de ' || v_m.nombres || ' en el padrón. Pídela a administración para poder reservar.');
    end if;
    v_edad := app.edad(v_m.fecha_nacimiento, p_fecha);
    if v_edad >= (v_t ->> 'edad_max_hijos')::int then
      return jsonb_build_object('ok', false, 'mensaje', v_m.nombres || ' tiene ' || v_edad || ' años. Los hijos pueden reservar hasta antes de cumplir ' || (v_t ->> 'edad_max_hijos') || '.');
    end if;
  end if;

  select count(*) into v_dia from public.reservas_cancha
   where miembro_id = v_m.id and fecha = p_fecha and estado = 'confirmada' and tipo = 'reserva';
  if v_dia >= (v_t ->> 'max_por_dia')::int then
    return jsonb_build_object('ok', false, 'regla', 'max_dia', 'mensaje', v_m.nombres || ' ya tiene una reserva ese día. Se puede reservar ' || (v_t ->> 'max_por_dia') || ' vez por día.');
  end if;
  select count(*) into v_sem from public.reservas_cancha
   where miembro_id = v_m.id and estado = 'confirmada' and tipo = 'reserva'
     and fecha >= date_trunc('week', p_fecha)::date and fecha < (date_trunc('week', p_fecha) + interval '7 days')::date;
  if v_sem >= (v_t ->> 'max_por_semana')::int then
    return jsonb_build_object('ok', false, 'regla', 'max_semana', 'mensaje', v_m.nombres || ' ya tiene ' || v_sem || ' reservas esta semana (de lunes a domingo). El máximo es ' || (v_t ->> 'max_por_semana') || '.');
  end if;

  if exists (select 1 from public.reservas_cancha r where r.cancha_id = v_c.id and r.fecha = p_fecha and r.estado = 'confirmada'
              and r.hora_inicio < v_hfin and r.hora_fin > p_hora) then
    return jsonb_build_object('ok', false, 'regla', 'ocupado', 'mensaje', 'Ese horario acaba de ocuparse. Elige otro.');
  end if;

  begin
    insert into public.reservas_cancha (club_id, cancha_id, fecha, hora_inicio, hora_fin, tipo, socio_id, miembro_id, es_ejemplo)
    values (v_club, v_c.id, p_fecha, p_hora, v_hfin, 'reserva', v_s.id, v_m.id, false) returning id into v_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'regla', 'ocupado', 'mensaje', 'Ese horario acaba de ocuparse. Elige otro.');
  end;
  perform app.notificar_socio(v_s.id, 'reserva', 'Reserva confirmada',
    v_c.nombre || ' · ' || to_char(p_fecha, 'DD/MM') || ' a las ' || to_char(p_hora, 'HH24:MI') || ' para ' || v_m.nombres || '.', '/app/socio/reservas');
  return jsonb_build_object('ok', true, 'reserva_id', v_id,
    'mensaje', '¡Listo! ' || v_c.nombre || ', ' || to_char(p_fecha, 'DD/MM') || ' a las ' || to_char(p_hora, 'HH24:MI') || '.');
end;
$$;

create or replace function public.cancelar_reserva(p_reserva_id uuid, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_r record; v_rol text := app.rol();
begin
  select * into v_r from public.reservas_cancha where id = p_reserva_id and club_id = app.club_id() and estado = 'confirmada';
  if v_r.id is null then return jsonb_build_object('ok', false, 'mensaje', 'La reserva ya no está activa.'); end if;
  if v_rol = 'socio' then
    if v_r.socio_id <> app.socio_id() then raise exception 'Solo puedes cancelar tus reservas.'; end if;
    if v_r.fecha < app.hoy(v_r.club_id) or (v_r.fecha = app.hoy(v_r.club_id) and v_r.hora_inicio <= app.ahora_local(v_r.club_id)::time) then
      return jsonb_build_object('ok', false, 'mensaje', 'Esa reserva ya empezó o ya pasó.');
    end if;
  elsif not app.tiene_rol('porteria', 'presidente', 'directivo', 'admin') then
    raise exception 'No tienes permiso.';
  end if;
  update public.reservas_cancha set estado = 'cancelada', cancelado_por = auth.uid(), cancelado_en = now(), motivo_cancelacion = left(p_motivo, 200)
   where id = v_r.id;
  if v_r.tipo = 'reserva' and v_r.socio_id is not null then
    perform app.notificar_socio(v_r.socio_id, 'reserva', 'Reserva cancelada',
      'Tu reserva del ' || to_char(v_r.fecha, 'DD/MM') || ' a las ' || to_char(v_r.hora_inicio, 'HH24:MI') || ' fue cancelada' ||
      coalesce('. Motivo: ' || nullif(trim(p_motivo), ''), '') || '.', '/app/socio/reservas');
  end if;
  return jsonb_build_object('ok', true, 'mensaje', 'Reserva cancelada.');
end;
$$;

create or replace function public.bloquear_cancha(p_cancha_id uuid, p_fecha date, p_hora_inicio time, p_hora_fin time, p_motivo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_club uuid := app.club_id(); v_r record; v_n int := 0; v_id uuid;
begin
  if not app.es_directiva() then raise exception 'Solo la directiva puede bloquear horarios.'; end if;
  if p_hora_fin <= p_hora_inicio then raise exception 'La hora final debe ser mayor que la inicial.'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 3 then raise exception 'Escribe el motivo (torneo, mantenimiento…).'; end if;
  if not exists (select 1 from public.canchas where id = p_cancha_id and club_id = v_club) then raise exception 'Cancha no encontrada.'; end if;
  for v_r in select * from public.reservas_cancha where cancha_id = p_cancha_id and fecha = p_fecha and estado = 'confirmada'
              and hora_inicio < p_hora_fin and hora_fin > p_hora_inicio loop
    perform public.cancelar_reserva(v_r.id, trim(p_motivo));
    v_n := v_n + 1;
  end loop;
  insert into public.reservas_cancha (club_id, cancha_id, fecha, hora_inicio, hora_fin, tipo, motivo)
  values (v_club, p_cancha_id, p_fecha, p_hora_inicio, p_hora_fin, 'bloqueo', trim(p_motivo)) returning id into v_id;
  return jsonb_build_object('ok', true, 'bloqueo_id', v_id, 'canceladas', v_n,
    'mensaje', 'Horario bloqueado' || case when v_n > 0 then '. Se cancelaron ' || v_n || ' reservas y se avisó a los socios.' else '.' end);
end;
$$;

create or replace function public.disponibilidad_tenis(p_fecha date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id();
  v_staff boolean := app.es_staff();
  v_socio uuid := app.socio_id();
  v_t jsonb;
  v_ini time; v_fin time; v_dur int;
  v_ahora timestamp;
  v_res jsonb := '[]'::jsonb;
  v_c record; v_slots jsonb; v_h time; v_r record;
begin
  if app.rol() is null then raise exception 'Inicia sesión para continuar.'; end if;
  v_t := app.reglas(v_club) -> 'tenis';
  v_ini := (v_t ->> 'hora_inicio')::time; v_fin := (v_t ->> 'hora_fin')::time; v_dur := (v_t ->> 'duracion_min')::int;
  v_ahora := app.ahora_local(v_club);
  for v_c in select * from public.canchas where club_id = v_club and activa and deporte = 'tenis' and reservable order by orden, nombre loop
    v_slots := '[]'::jsonb;
    v_h := v_ini;
    while v_h + make_interval(mins => v_dur) <= v_fin loop
      select r.*, m.nombres as m_nombres, m.apellidos as m_apellidos, s.numero as s_numero into v_r
        from public.reservas_cancha r
        left join public.miembros m on m.id = r.miembro_id
        left join public.socios s on s.id = r.socio_id
       where r.cancha_id = v_c.id and r.fecha = p_fecha and r.estado = 'confirmada'
         and r.hora_inicio < v_h + make_interval(mins => v_dur) and r.hora_fin > v_h
       limit 1;
      v_slots := v_slots || jsonb_build_object(
        'hora', to_char(v_h, 'HH24:MI'),
        'estado', case when v_r.id is not null then (case when v_r.tipo = 'bloqueo' then 'bloqueado' else 'reservado' end)
                       when p_fecha < v_ahora::date or (p_fecha = v_ahora::date and v_h <= v_ahora::time) then 'pasado' else 'libre' end,
        'propio', v_r.id is not null and v_r.socio_id = v_socio,
        'reserva_id', case when v_r.id is not null and (v_staff or v_r.socio_id = v_socio) then v_r.id end,
        'quien', case when v_r.id is not null and (v_staff or v_r.socio_id = v_socio) and v_r.tipo = 'reserva' then v_r.m_nombres || ' ' || v_r.m_apellidos end,
        'numero', case when v_staff then v_r.s_numero end,
        'motivo', case when v_r.tipo = 'bloqueo' then v_r.motivo end);
      v_h := v_h + make_interval(mins => v_dur);
    end loop;
    v_res := v_res || jsonb_build_object('id', v_c.id, 'nombre', v_c.nombre, 'slots', v_slots);
  end loop;
  return jsonb_build_object('fecha', p_fecha, 'duracion_min', v_dur, 'canchas', v_res,
    'reglas', jsonb_build_object('max_por_dia', v_t -> 'max_por_dia', 'max_por_semana', v_t -> 'max_por_semana', 'edad_max_hijos', v_t -> 'edad_max_hijos', 'dias_anticipacion', v_t -> 'dias_anticipacion'));
end;
$$;

-- ---------------------------------------------------------------------
-- Ambientes: disponibilidad, solicitudes desde la web y alquileres
-- ---------------------------------------------------------------------
create or replace function app.ambiente_ocupado(p_ambiente uuid, p_fecha date, p_excluir uuid default null)
returns text language sql stable security definer set search_path = '' as $$
  -- Devuelve el motivo si el ambiente (o uno de su mismo grupo) está ocupado ese día o reservado para decorar
  select case when a.fecha = p_fecha then 'ocupado' else 'decoracion' end
    from public.alquileres a
    join public.ambientes x on x.id = a.ambiente_id
    join public.ambientes y on y.id = p_ambiente
   where a.estado <> 'cancelado' and a.eliminado_en is null and (p_excluir is null or a.id <> p_excluir)
     and (a.ambiente_id = p_ambiente or (x.grupo is not null and x.grupo = y.grupo))
     and (a.fecha = p_fecha or a.dia_decoracion = p_fecha)
   limit 1
$$;

create or replace function public.disponibilidad_ambientes(p_desde date, p_hasta date)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when app.rol() is null then null else coalesce(jsonb_agg(jsonb_build_object(
           'ambiente_id', a.ambiente_id, 'fecha', a.fecha, 'dia_decoracion', a.dia_decoracion,
           'estado', a.estado,
           'cliente', case when app.es_directiva() or a.socio_id = app.socio_id() then a.cliente_nombre end) order by a.fecha), '[]'::jsonb) end
    from public.alquileres a
   where a.club_id = app.club_id() and a.estado <> 'cancelado' and a.eliminado_en is null
     and (a.fecha between p_desde and p_hasta or a.dia_decoracion between p_desde and p_hasta)
$$;

create or replace function public.solicitar_alquiler(p_club_slug text, p_nombre text, p_celular text, p_fecha date, p_ambiente_id uuid, p_tipo_cliente text, p_mensaje text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid; v_id uuid; v_amb text; v_cel text := regexp_replace(coalesce(p_celular, ''), '[^0-9+]', '', 'g');
begin
  select id into v_club from public.clubes where slug = p_club_slug and activo;
  if v_club is null then raise exception 'Club no encontrado.'; end if;
  if length(trim(coalesce(p_nombre, ''))) < 2 then return jsonb_build_object('ok', false, 'campo', 'nombre', 'mensaje', 'Escribe tu nombre.'); end if;
  if length(v_cel) < 9 then return jsonb_build_object('ok', false, 'campo', 'celular', 'mensaje', 'Escribe un celular de 9 dígitos para llamarte.'); end if;
  if p_fecha is null or p_fecha < app.hoy(v_club) then return jsonb_build_object('ok', false, 'campo', 'fecha', 'mensaje', 'Elige una fecha desde hoy en adelante.'); end if;
  if p_tipo_cliente not in ('socio', 'no_socio', 'institucion') then return jsonb_build_object('ok', false, 'campo', 'tipo_cliente', 'mensaje', 'Elige si eres socio, no socio o institución.'); end if;
  if p_ambiente_id is not null then
    select nombre into v_amb from public.ambientes where id = p_ambiente_id and club_id = v_club and activo;
    if v_amb is null then return jsonb_build_object('ok', false, 'campo', 'ambiente', 'mensaje', 'Elige un ambiente de la lista.'); end if;
  end if;
  if (select count(*) from public.solicitudes_alquiler where club_id = v_club and celular = v_cel and creado_en > now() - interval '1 day') >= 5 then
    return jsonb_build_object('ok', false, 'mensaje', 'Ya recibimos tus solicitudes de hoy. Te llamaremos pronto.');
  end if;
  insert into public.solicitudes_alquiler (club_id, nombre, celular, fecha, ambiente_id, tipo_cliente, mensaje, origen, socio_id)
  values (v_club, left(trim(p_nombre), 120), v_cel, p_fecha, p_ambiente_id, p_tipo_cliente, left(p_mensaje, 1000),
          case when app.rol() = 'socio' then 'app' else 'web' end, case when app.rol() = 'socio' then app.socio_id() end)
  returning id into v_id;
  perform app.notificar_directiva(v_club, 'alquiler', 'Alquiler solicitado',
    left(trim(p_nombre), 60) || ' pide ' || coalesce(v_amb, 'un ambiente') || ' para el ' || to_char(p_fecha, 'DD/MM') || '. Cel. ' || v_cel || '.',
    '/app/admin/ambientes', true);
  return jsonb_build_object('ok', true, 'solicitud_id', v_id, 'mensaje', 'Recibimos tu solicitud. Administración te llamará para confirmar disponibilidad y tarifa.');
end;
$$;

create or replace function public.registrar_alquiler(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id();
  v_reglas jsonb;
  v_amb record; v_tar record;
  v_fecha date := (p ->> 'fecha')::date;
  v_tipo text := p ->> 'tipo_cliente';
  v_tarifa numeric; v_igv numeric; v_total numeric; v_garantia numeric;
  v_deco date; v_ocupado text; v_id uuid; v_socio uuid := nullif(p ->> 'socio_id', '')::uuid;
begin
  if not app.es_directiva() then raise exception 'Solo administración registra alquileres.'; end if;
  v_reglas := app.reglas(v_club);
  select * into v_amb from public.ambientes where id = (p ->> 'ambiente_id')::uuid and club_id = v_club;
  if v_amb.id is null then raise exception 'Elige el ambiente.'; end if;
  if v_tipo not in ('socio', 'no_socio', 'institucion') then raise exception 'Elige el tipo de cliente.'; end if;
  if v_fecha is null then raise exception 'Elige la fecha del evento.'; end if;
  if length(trim(coalesce(p ->> 'cliente_nombre', ''))) < 2 then raise exception 'Escribe el nombre del cliente.'; end if;
  if v_amb.solo_temporada_baja and extract(month from v_fecha) in (12, 1, 2, 3) then
    return jsonb_build_object('ok', false, 'mensaje', v_amb.nombre || ' solo se alquila en temporada baja (abril a noviembre).');
  end if;
  v_deco := case when coalesce((p ->> 'con_decoracion')::boolean, true) and (v_reglas #>> '{alquiler,decoracion_dia_anterior}')::boolean then v_fecha - 1 end;
  v_ocupado := app.ambiente_ocupado(v_amb.id, v_fecha);
  if v_ocupado is not null then
    return jsonb_build_object('ok', false, 'mensaje', v_amb.nombre || ' no está libre ese día (' || case when v_ocupado = 'ocupado' then 'ya hay un evento' else 'otro cliente decora ese día' end || ').');
  end if;
  if v_deco is not null and app.ambiente_ocupado(v_amb.id, v_deco) = 'ocupado' then
    return jsonb_build_object('ok', false, 'mensaje', 'El día anterior hay otro evento: no se podrá decorar. Desmarca "día para decorar" o elige otra fecha.');
  end if;
  select * into v_tar from public.tarifas_ambiente where ambiente_id = v_amb.id and tipo_cliente = v_tipo;
  v_tarifa := coalesce(nullif(p ->> 'tarifa_manual', '')::numeric, v_tar.precio);
  if v_tarifa is null then
    return jsonb_build_object('ok', false, 'mensaje', 'La tarifa de ' || v_amb.nombre || ' para este tipo de cliente está por confirmar. Escríbela a mano.');
  end if;
  v_igv := round(v_tarifa * (v_reglas #>> '{alquiler,igv}')::numeric, 2);
  v_total := v_tarifa + v_igv;
  v_garantia := coalesce(nullif(p ->> 'garantia_manual', '')::numeric, v_tar.garantia, 0);
  insert into public.alquileres (club_id, ambiente_id, fecha, dia_decoracion, cliente_nombre, cliente_documento, cliente_celular, tipo_cliente, socio_id,
                                 tarifa, igv, total, garantia, estado, solicitud_id, nota)
  values (v_club, v_amb.id, v_fecha, v_deco, trim(p ->> 'cliente_nombre'), p ->> 'cliente_documento', p ->> 'cliente_celular', v_tipo, v_socio,
          v_tarifa, v_igv, v_total, v_garantia, coalesce(p ->> 'estado', 'confirmado'), nullif(p ->> 'solicitud_id', '')::uuid, p ->> 'nota')
  returning id into v_id;
  if nullif(p ->> 'solicitud_id', '') is not null then
    update public.solicitudes_alquiler set estado = 'convertida', atendido_por = auth.uid() where id = (p ->> 'solicitud_id')::uuid;
  end if;
  if v_socio is not null and coalesce((p ->> 'cargar_cuenta')::boolean, false) then
    insert into public.cuenta_socio (club_id, socio_id, tipo, origen, concepto, monto, detalle)
    values (v_club, v_socio, 'cargo', 'alquiler', 'Alquiler de ' || v_amb.nombre || ' · ' || to_char(v_fecha, 'DD/MM/YYYY'), v_total, jsonb_build_object('alquiler_id', v_id));
    perform app.aplicar_pagos(v_socio);
  end if;
  if v_socio is not null then
    perform app.notificar_socio(v_socio, 'alquiler', 'Alquiler confirmado', v_amb.nombre || ' para el ' || to_char(v_fecha, 'DD/MM') || '. Total ' || app.soles(v_total) || '.', '/app/socio/reservas');
  end if;
  return jsonb_build_object('ok', true, 'alquiler_id', v_id, 'tarifa', v_tarifa, 'igv', v_igv, 'total', v_total, 'garantia', v_garantia, 'dia_decoracion', v_deco,
    'mensaje', 'Alquiler registrado: ' || app.soles(v_total) || ' (incluye IGV) + garantía ' || app.soles(v_garantia) || '.');
end;
$$;

-- ---------------------------------------------------------------------
-- Pagos y cuotas
-- ---------------------------------------------------------------------
create or replace function public.validar_pago(p_pago_id uuid, p_aprobar boolean, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_p record;
begin
  if not app.es_directiva() then raise exception 'Solo administración valida pagos.'; end if;
  select * into v_p from public.pagos where id = p_pago_id and club_id = app.club_id() for update;
  if v_p.id is null then raise exception 'Pago no encontrado.'; end if;
  if v_p.estado <> 'por_validar' then return jsonb_build_object('ok', false, 'mensaje', 'Este pago ya fue ' || v_p.estado || '.'); end if;
  if p_aprobar then
    update public.pagos set estado = 'validado', validado_por = auth.uid(), validado_en = now() where id = v_p.id;
    insert into public.cuenta_socio (club_id, socio_id, tipo, origen, concepto, monto, pago_id, es_ejemplo)
    values (v_p.club_id, v_p.socio_id, 'abono', 'pago', 'Pago por ' || initcap(v_p.medio) || coalesce(' · op. ' || v_p.operacion, ''), v_p.monto, v_p.id, v_p.es_ejemplo);
    perform app.aplicar_pagos(v_p.socio_id);
    perform app.notificar_socio(v_p.socio_id, 'pago', 'Pago validado', 'Recibimos tu pago de ' || app.soles(v_p.monto) || '. ¡Gracias!', '/app/socio/cuenta');
    return jsonb_build_object('ok', true, 'mensaje', 'Pago validado. Se aplicó a las cuotas más antiguas.');
  else
    if length(trim(coalesce(p_motivo, ''))) < 3 then raise exception 'Escribe el motivo del rechazo para avisarle al socio.'; end if;
    update public.pagos set estado = 'rechazado', validado_por = auth.uid(), validado_en = now(), motivo_rechazo = trim(p_motivo) where id = v_p.id;
    perform app.notificar_socio(v_p.socio_id, 'pago', 'Pago no validado', 'No pudimos validar tu pago de ' || app.soles(v_p.monto) || ': ' || trim(p_motivo), '/app/socio/cuenta', true);
    return jsonb_build_object('ok', true, 'mensaje', 'Pago rechazado. Se avisó al socio.');
  end if;
end;
$$;

create or replace function public.registrar_pago_oficina(p_socio_id uuid, p_monto numeric, p_medio text, p_nota text default null, p_comprobante text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_club uuid := app.club_id(); v_s record; v_id uuid;
begin
  if not app.es_directiva() then raise exception 'Solo administración registra pagos.'; end if;
  if coalesce(p_monto, 0) <= 0 then raise exception 'Escribe un monto mayor a cero.'; end if;
  if p_medio not in ('yape', 'plin', 'transferencia', 'efectivo', 'tarjeta') then raise exception 'Elige el medio de pago.'; end if;
  select * into v_s from public.socios where id = p_socio_id and club_id = v_club;
  if v_s.id is null then raise exception 'Socio no encontrado.'; end if;
  insert into public.pagos (club_id, socio_id, medio, monto, origen, estado, nota, operacion, validado_por, validado_en)
  values (v_club, v_s.id, p_medio, round(p_monto, 2), 'oficina', 'validado', p_nota, p_comprobante, auth.uid(), now()) returning id into v_id;
  insert into public.cuenta_socio (club_id, socio_id, tipo, origen, concepto, monto, pago_id)
  values (v_club, v_s.id, 'abono', 'pago', 'Pago en oficina · ' || initcap(p_medio), round(p_monto, 2), v_id);
  if p_medio = 'efectivo' then
    insert into public.caja_movimientos (club_id, fecha, comprobante, descripcion, categoria, tipo, monto)
    values (v_club, app.hoy(v_club), p_comprobante, 'Cuota de socio N° ' || v_s.numero || ' · ' || v_s.apellidos, 'Cuotas de socios', 'ingreso', round(p_monto, 2));
  end if;
  perform app.aplicar_pagos(v_s.id);
  perform app.notificar_socio(v_s.id, 'pago', 'Pago registrado', 'Registramos tu pago de ' || app.soles(p_monto) || ' en oficina. ¡Gracias!', '/app/socio/cuenta');
  return jsonb_build_object('ok', true, 'pago_id', v_id, 'mensaje', 'Pago registrado' || case when p_medio = 'efectivo' then ' y sumado a la caja de oficina.' else '.' end);
end;
$$;

create or replace function public.generar_cuotas_mes(p_periodo date default null, p_club uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid; v_periodo date; v_reglas jsonb; v_n int := 0; v_k int;
begin
  if auth.uid() is not null and not app.es_directiva() then raise exception 'Solo administración genera cuotas.'; end if;
  for v_club in select id from public.clubes where activo and (
      (auth.uid() is not null and id = app.club_id()) or (auth.uid() is null and (p_club is null or id = p_club))) loop
    v_reglas := app.reglas(v_club);
    v_periodo := date_trunc('month', coalesce(p_periodo, app.hoy(v_club)))::date;
    insert into public.cuotas (club_id, socio_id, tipo, periodo, monto, vencimiento, estado, es_ejemplo)
    select s.club_id, s.id, 'mantenimiento', v_periodo,
           coalesce(s.cuota_mensual, (v_reglas #>> '{cuotas,mantenimiento}')::numeric),
           (v_periodo + make_interval(months => (v_reglas #>> '{cuotas,mes_vencimiento}')::int))::date + ((v_reglas #>> '{cuotas,dia_vencimiento}')::int - 1),
           'pendiente', s.es_ejemplo
      from public.socios s
     where s.club_id = v_club and s.estado = 'activo' and s.eliminado_en is null
       and (s.fecha_ingreso is null or s.fecha_ingreso < (v_periodo + interval '1 month')::date)
    on conflict (socio_id, tipo, periodo) do nothing;
    get diagnostics v_k = row_count;
    v_n := v_n + v_k;
    -- Si el socio tenía saldo a favor, la cuota nueva puede quedar pagada
    perform app.aplicar_pagos(s.id) from public.socios s
     where s.club_id = v_club and exists (select 1 from public.cuenta_socio c where c.socio_id = s.id and c.tipo = 'abono');
  end loop;
  return v_n;
end;
$$;

-- Marca vencidas y avisa: cuota por vencer (N días antes) y cuota vencida
create or replace function public.marcar_cuotas_vencidas(p_club uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare v_club uuid; v_hoy date; v_reglas jsonb; v_n int := 0; v_k int; r record;
begin
  if auth.uid() is not null and not app.es_directiva() then raise exception 'Solo administración.'; end if;
  for v_club in select id from public.clubes where activo and (
      (auth.uid() is not null and id = app.club_id()) or (auth.uid() is null and (p_club is null or id = p_club))) loop
    v_hoy := app.hoy(v_club);
    v_reglas := app.reglas(v_club);
    for r in update public.cuotas set estado = 'vencido'
              where club_id = v_club and estado = 'pendiente' and vencimiento < v_hoy and eliminado_en is null
              returning socio_id, monto, periodo loop
      perform app.notificar_socio(r.socio_id, 'cuota', 'Cuota vencida',
        'Tu cuota de ' || app.mes_nombre(r.periodo) || ' (' || app.soles(r.monto) || ') venció. Puedes pagarla desde "Mi cuenta".', '/app/socio/cuenta', true);
      v_n := v_n + 1;
    end loop;
    for r in select socio_id, monto, periodo, vencimiento from public.cuotas
              where club_id = v_club and estado = 'pendiente' and eliminado_en is null
                and vencimiento = v_hoy + (v_reglas #>> '{cuotas,dias_aviso}')::int loop
      perform app.notificar_socio(r.socio_id, 'cuota', 'Cuota por vencer',
        'Tu cuota de ' || app.mes_nombre(r.periodo) || ' (' || app.soles(r.monto) || ') vence el ' || to_char(r.vencimiento, 'DD/MM') || '.', '/app/socio/cuenta');
    end loop;
  end loop;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------
-- Notificaciones push y centro de notificaciones
-- ---------------------------------------------------------------------
create or replace function public.guardar_suscripcion_push(p_endpoint text, p_p256dh text, p_auth text, p_dispositivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or app.club_id() is null then raise exception 'Inicia sesión para activar notificaciones.'; end if;
  insert into public.suscripciones_push (club_id, user_id, endpoint, p256dh, auth, dispositivo)
  values (app.club_id(), auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_dispositivo, 160))
  on conflict (endpoint) do update set user_id = excluded.user_id, club_id = excluded.club_id, p256dh = excluded.p256dh, auth = excluded.auth, ultimo_error = null;
end;
$$;

create or replace function public.borrar_suscripcion_push(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.suscripciones_push where endpoint = p_endpoint and user_id = (select auth.uid())
$$;

create or replace function public.marcar_notificaciones_leidas(p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  update public.notificaciones set leida = true, leida_en = now()
   where user_id = auth.uid() and not leida and (p_ids is null or id = any (p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
