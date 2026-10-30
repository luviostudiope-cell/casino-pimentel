-- =====================================================================
-- 006 · Seguridad: RLS en todas las tablas, permisos y auditoría total
--  - El socio solo ve lo suyo y lo de su familia.
--  - Barra y portería solo ven lo que operan.
--  - Directivos ven todo; solo administración edita la configuración.
--  - Nadie borra: no existe ninguna política DELETE y se revoca el permiso.
--  - La lógica crítica va por funciones RPC (siguiente migración).
-- =====================================================================

-- RLS en todas las tablas del esquema público; anon no lee tablas (la web usa una RPC pública)
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on public.%I from anon', t.tablename);
    execute format('revoke delete, truncate on public.%I from authenticated', t.tablename);
  end loop;
end $$;
revoke all on public.estado_socios, public.stock_actual, public.caja_con_saldo from anon;

-- Generador de políticas: (tabla, quién lee, quién crea, quién edita). null = nadie por la API.
do $$
declare
  CLUB constant text := 'club_id = (select app.club_id())';
  DIR constant text := '(select app.es_directiva())';
  ADM constant text := '(select app.es_admin())';
  STAFF constant text := '(select app.es_staff())';
  BARRA constant text := '(select app.tiene_rol(''barra'', ''presidente'', ''directivo'', ''admin''))';
  PORT constant text := '(select app.tiene_rol(''porteria'', ''presidente'', ''directivo'', ''admin''))';
  OPER constant text := '(select app.tiene_rol(''barra'', ''porteria'', ''presidente'', ''directivo'', ''admin''))';
  PROPIO constant text := 'socio_id = (select app.socio_id())';
  r record;
begin
  for r in
    select * from (values
      -- tabla,                 lectura,                                                         creación,              edición
      ('clubes',               'id = (select app.club_id())',                                    null,                  'id = (select app.club_id()) and ' || ADM),
      ('config',               CLUB,                                                             CLUB || ' and ' || ADM, CLUB || ' and ' || ADM),
      ('usuarios_staff',       CLUB || ' and (' || DIR || ' or id = (select auth.uid()))',      CLUB || ' and ' || ADM, CLUB || ' and ' || ADM),
      ('dispositivos',         CLUB || ' and ' || STAFF,                                         CLUB || ' and ' || ADM, CLUB || ' and ' || ADM),
      ('auditoria',            CLUB || ' and ' || DIR,                                           null,                  null),
      ('accesos',              CLUB || ' and ' || DIR,                                           null,                  null),
      ('socios',               CLUB || ' and (' || OPER || ' or id = (select app.socio_id()))', CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('miembros',             CLUB || ' and (' || OPER || ' or ' || PROPIO || ')',              CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('credenciales_socio',   CLUB || ' and (' || DIR || ' or user_id = (select auth.uid()))', null,                  null),
      ('cuotas',               CLUB || ' and (' || PORT || ' or ' || PROPIO || ')',              CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('pagos',                CLUB || ' and (' || DIR || ' or ' || PROPIO || ')',               CLUB || ' and (' || DIR || ' or (' || PROPIO || ' and estado = ''por_validar'' and origen = ''app''))', CLUB || ' and ' || DIR),
      ('cuenta_socio',         CLUB || ' and (' || DIR || ' or ' || PROPIO || ')',               CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('invitados',            CLUB || ' and ' || PORT,                                          CLUB || ' and ' || PORT, CLUB || ' and ' || PORT),
      ('ingresos',             CLUB || ' and (' || PORT || ' or ' || PROPIO || ')',              null,                  null),
      ('personal',             CLUB || ' and ' || STAFF,                                         CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('turnos',               CLUB || ' and ' || PORT,                                          CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('marcaciones',          CLUB || ' and ' || DIR,                                           null,                  null),
      ('canchas',              CLUB,                                                             CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('reservas_cancha',      CLUB || ' and (' || PORT || ' or ' || PROPIO || ')',              null,                  null),
      ('ambientes',            CLUB,                                                             CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('tarifas_ambiente',     CLUB,                                                             CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('solicitudes_alquiler', CLUB || ' and (' || DIR || ' or ' || PROPIO || ')',               null,                  CLUB || ' and ' || DIR),
      ('alquileres',           CLUB || ' and (' || DIR || ' or ' || PROPIO || ')',               CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('barras',               CLUB,                                                             CLUB || ' and ' || ADM, CLUB || ' and ' || ADM),
      ('categorias',           CLUB,                                                             CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('productos',            CLUB,                                                             CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('insumos',              CLUB || ' and ' || BARRA,                                         CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('recetas',              CLUB || ' and ' || BARRA,                                         CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('proveedores',          CLUB || ' and ' || DIR,                                           CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('compras',              CLUB || ' and ' || DIR,                                           CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('compra_items',         CLUB || ' and ' || DIR,                                           CLUB || ' and ' || DIR, null),
      ('movimientos_stock',    CLUB || ' and ' || BARRA,                                         CLUB || ' and ' || DIR || ' and tipo in (''ajuste'', ''merma'', ''inicial'', ''traslado'')', null),
      ('conteos_fisicos',      CLUB || ' and ' || BARRA,                                         null,                  null),
      ('conteo_items',         CLUB || ' and ' || BARRA,                                         null,                  null),
      ('turnos_barra',         CLUB || ' and ' || BARRA,                                         CLUB || ' and ' || BARRA, CLUB || ' and ' || BARRA),
      ('comandas',             CLUB || ' and (' || BARRA || ' or (' || PROPIO || ' and estado = ''cerrada''))', null, null),
      ('comanda_items',        CLUB || ' and (' || BARRA || ' or exists (select 1 from public.comandas c where c.id = comanda_id and c.socio_id = (select app.socio_id()) and c.estado = ''cerrada''))', null, null),
      ('cobros',               CLUB || ' and ' || BARRA,                                         null,                  null),
      ('cortesias',            CLUB || ' and ' || BARRA,                                         null,                  null),
      ('cierres_barra',        CLUB || ' and ' || BARRA,                                         null,                  null),
      ('caja_movimientos',     CLUB || ' and ' || DIR,                                           CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('caja_cierres',         CLUB || ' and ' || DIR,                                           null,                  null),
      ('avisos',               CLUB || ' and (' || DIR || ' or (eliminado_en is null and publicado_en <= now() and (expira_en is null or expira_en > now())))', CLUB || ' and ' || DIR, CLUB || ' and ' || DIR),
      ('notificaciones',       'user_id = (select auth.uid())',                                  null,                  'user_id = (select auth.uid())'),
      ('suscripciones_push',   'user_id = (select auth.uid())',                                  null,                  null),
      ('reportes_diarios',     CLUB || ' and ' || DIR,                                           null,                  null)
    ) as p(tabla, leer, crear, editar)
  loop
    execute format('create policy %I on public.%I for select to authenticated using (%s)', r.tabla || '_leer', r.tabla, r.leer);
    if r.crear is not null then
      execute format('create policy %I on public.%I for insert to authenticated with check (%s)', r.tabla || '_crear', r.tabla, r.crear);
    else
      execute format('revoke insert on public.%I from authenticated', r.tabla);
    end if;
    if r.editar is not null then
      execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)', r.tabla || '_editar', r.tabla, r.editar, r.editar);
    else
      execute format('revoke update on public.%I from authenticated', r.tabla);
    end if;
  end loop;
end $$;

-- Verificación: ninguna tabla pública queda sin RLS ni sin política de lectura
do $$
declare n int;
begin
  select count(*) into n from pg_tables t
   where t.schemaname = 'public'
     and (not t.rowsecurity or not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename and p.cmd = 'SELECT'));
  if n > 0 then raise exception 'Hay % tablas públicas sin RLS o sin política de lectura', n; end if;
end $$;

-- ---------------------------------------------------------------------
-- Auditoría total: un trigger genérico en todas las tablas
-- ---------------------------------------------------------------------
create or replace function app.auditar()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_antes jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'pin_hash' end;
  v_despues jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'pin_hash' end;
  v_fila jsonb := coalesce(v_despues, v_antes);
  v_cambios text[];
  v_usuario uuid := auth.uid();
begin
  if tg_op = 'UPDATE' then
    select array_agg(k) into v_cambios from jsonb_object_keys(v_despues) k where v_despues -> k is distinct from v_antes -> k;
    if v_cambios is null then return new; end if; -- nada cambió
  end if;
  insert into public.auditoria (club_id, tabla, registro_id, accion, antes, despues, cambios, usuario_id, usuario_nombre)
  values (
    coalesce((v_fila ->> 'club_id')::uuid, case when tg_table_name = 'clubes' then (v_fila ->> 'id')::uuid end),
    case when tg_table_schema = 'public' then tg_table_name else tg_table_schema || '.' || tg_table_name end,
    coalesce(v_fila ->> 'id', v_fila ->> 'club_id', v_fila ->> 'user_id', v_fila ->> 'personal_id'),
    tg_op, v_antes, v_despues, v_cambios, v_usuario,
    case when v_usuario is null then 'Sistema' else app.nombre_usuario(v_usuario) end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename not in ('auditoria', 'accesos') loop
    execute format('create trigger auditar after insert or update or delete on public.%I for each row execute function app.auditar()', t.tablename);
  end loop;
end $$;
-- La personal_pin vive en el esquema privado: se audita el cambio sin guardar el hash
create trigger auditar after insert or update on app.personal_pin for each row execute function app.auditar();
-- personal_pin no tiene club_id: se resuelve por el personal
create or replace function app.personal_pin_club()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.auditoria a set club_id = p.club_id
    from public.personal p
   where a.tabla = 'app.personal_pin' and a.club_id is null and a.registro_id = new.personal_id::text and p.id = new.personal_id;
  return new;
end;
$$;
create trigger personal_pin_club after insert or update on app.personal_pin for each row execute function app.personal_pin_club();

-- Las funciones auxiliares no se ejecutan desde fuera salvo las que usan las políticas
revoke all on all functions in schema app from public;
grant execute on function app.rol(), app.club_id(), app.socio_id(), app.miembro_id(), app.es_directiva(), app.es_admin(),
  app.es_staff(), app.tiene_rol(text[]) to anon, authenticated;
-- La restricción CHECK y el valor por defecto de config usan estas funciones
grant execute on function app.config_valida(jsonb), app.config_por_defecto() to authenticated;
