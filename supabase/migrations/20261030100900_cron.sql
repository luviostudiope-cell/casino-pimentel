-- =====================================================================
-- 010 · Tareas automáticas (pg_cron + pg_net) y llamadas a Edge Functions
--  - Día 1 de cada mes: generar cuotas.
--  - Cada día: marcar cuotas vencidas y avisar las que están por vencer.
--  - Cada 5 min: disparar el reporte diario cuando llega la hora de config (22:30 Lima por defecto).
--  - Cada 15 min: avisar faltas del personal (turno empezado hace 30 min sin entrada).
--  - Cada notificación nueva se envía como push (Edge Function enviar-push).
-- La URL del proyecto y el secreto del cron viven en Supabase Vault (nunca en el código).
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Secreto compartido entre el cron y las Edge Functions (se genera en el servidor)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'cron_secret', 'Firma las llamadas del cron a las Edge Functions');
  end if;
end $$;

create or replace function app.secreto(p_nombre text)
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_nombre limit 1
$$;
revoke all on function app.secreto(text) from public, anon, authenticated;

create or replace function app.llamar_funcion(p_nombre text, p_body jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_url text := app.secreto('supabase_url'); v_req bigint;
begin
  if v_url is null then return null; end if; -- aún sin configurar
  select net.http_post(
    url := v_url || '/functions/v1/' || p_nombre,
    body := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', app.secreto('cron_secret')),
    timeout_milliseconds := 30000
  ) into v_req;
  return v_req;
end;
$$;
revoke all on function app.llamar_funcion(text, jsonb) from public, anon, authenticated;

-- Push: una llamada por lote de notificaciones nuevas (solo si el destinatario activó notificaciones)
create or replace function app.notificaciones_a_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ids jsonb;
begin
  select jsonb_agg(n.id) into v_ids from nuevas n
   where exists (select 1 from public.suscripciones_push s where s.user_id = n.user_id);
  if v_ids is not null then perform app.llamar_funcion('enviar-push', jsonb_build_object('ids', v_ids)); end if;
  return null;
end;
$$;
create trigger notificaciones_push after insert on public.notificaciones
  referencing new table as nuevas for each statement execute function app.notificaciones_a_push();

-- Reporte diario: se dispara una vez por club y día cuando llega la hora de config
create table app.reporte_disparos (
  club_id uuid not null references public.clubes(id) on delete cascade,
  fecha date not null,
  disparado_en timestamptz not null default now(),
  primary key (club_id, fecha)
);

create or replace function app.disparar_reportes()
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select c.id, app.hoy(c.id) as hoy from public.clubes c where c.activo
            and app.ahora_local(c.id)::time >= (app.reglas(c.id) #>> '{reporte,hora}')::time loop
    insert into app.reporte_disparos (club_id, fecha) values (r.id, r.hoy) on conflict do nothing;
    if found then
      perform app.llamar_funcion('reporte-diario', jsonb_build_object('club_id', r.id, 'fecha', r.hoy, 'origen', 'cron'));
    end if;
  end loop;
end;
$$;

-- Faltas del personal: turno empezado hace más de 30 minutos y sin marcar entrada
create table app.faltas_avisadas (turno_id uuid primary key references public.turnos(id) on delete cascade, avisado_en timestamptz not null default now());

create or replace function app.revisar_faltas()
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select t.id, t.club_id, t.hora_inicio, p.nombres, p.apellidos, p.cargo
             from public.turnos t join public.personal p on p.id = t.personal_id
            where t.eliminado_en is null and t.fecha = app.hoy(t.club_id)
              and (t.fecha + t.hora_inicio + interval '30 minutes') < app.ahora_local(t.club_id)
              and not exists (select 1 from public.marcaciones m where m.personal_id = t.personal_id and m.fecha = t.fecha and m.tipo = 'entrada' and m.eliminado_en is null)
              and not exists (select 1 from app.faltas_avisadas f where f.turno_id = t.id) loop
    insert into app.faltas_avisadas (turno_id) values (r.id);
    perform app.notificar_directiva(r.club_id, 'falta', 'Falta del personal',
      r.nombres || ' ' || r.apellidos || ' (' || r.cargo || ') no marcó entrada. Su turno empezó a las ' || to_char(r.hora_inicio, 'HH24:MI') || '.', '/app/admin/personal');
  end loop;
end;
$$;

-- Programación (pg_cron trabaja en UTC; Lima = UTC-5)
select cron.schedule('cuotas-del-mes', '5 5 1 * *', $$select public.generar_cuotas_mes()$$);          -- 00:05 Lima del día 1
select cron.schedule('cuotas-vencidas', '10 5 * * *', $$select public.marcar_cuotas_vencidas()$$);     -- 00:10 Lima cada día
select cron.schedule('reporte-diario', '*/5 * * * *', $$select app.disparar_reportes()$$);
select cron.schedule('faltas-personal', '*/15 * * * *', $$select app.revisar_faltas()$$);
