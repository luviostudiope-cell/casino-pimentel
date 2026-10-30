-- =====================================================================
-- 002 · Socios, familia, credenciales, cuotas, pagos y cuenta del socio
-- Borrado lógico: nadie borra filas; se marca eliminado_en con un motivo.
-- =====================================================================

create table public.socios (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  numero text not null,
  apellidos text not null,
  nombres text not null,
  dni text,
  celular text,
  correo text,
  fecha_nacimiento date,
  fecha_ingreso date,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo', 'suspendido')),
  foto_path text,
  cuota_mensual numeric(10, 2) check (cuota_mensual is null or cuota_mensual >= 0),
  notas text,
  user_id uuid unique references auth.users(id) on delete set null,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0),
  unique (club_id, numero)
);
create unique index socios_dni_unico on public.socios (club_id, dni) where dni is not null and eliminado_en is null;
create index on public.socios (club_id, estado);
create index socios_busqueda on public.socios (club_id, lower(apellidos), lower(nombres));

-- Titular, esposa e hijos: todos tienen carnet. El titular también es un miembro.
create table public.miembros (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  socio_id uuid not null references public.socios(id),
  nombres text not null,
  apellidos text not null,
  dni text,
  fecha_nacimiento date,
  parentesco text not null check (parentesco in ('titular', 'esposa', 'esposo', 'hijo', 'hija', 'otro')),
  foto_path text,
  puede_ingresar boolean not null default true,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0)
);
create index on public.miembros (socio_id);
create index on public.miembros (club_id);
create unique index miembros_dni_unico on public.miembros (club_id, dni) where dni is not null and eliminado_en is null;
create unique index miembros_un_titular on public.miembros (socio_id) where parentesco = 'titular' and eliminado_en is null;

-- Crea / sincroniza el miembro "titular" de cada socio
create or replace function app.sincronizar_titular()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.miembros (club_id, socio_id, nombres, apellidos, dni, fecha_nacimiento, parentesco, foto_path, es_ejemplo)
    values (new.club_id, new.id, new.nombres, new.apellidos, new.dni, new.fecha_nacimiento, 'titular', new.foto_path, new.es_ejemplo);
  else
    update public.miembros
       set nombres = new.nombres, apellidos = new.apellidos, dni = new.dni,
           fecha_nacimiento = new.fecha_nacimiento, foto_path = new.foto_path,
           puede_ingresar = (new.estado = 'activo'),
           eliminado_en = new.eliminado_en, eliminado_motivo = new.eliminado_motivo
     where socio_id = new.id and parentesco = 'titular';
  end if;
  return new;
end;
$$;
create trigger socios_titular after insert or update of nombres, apellidos, dni, fecha_nacimiento, foto_path, estado, eliminado_en
  on public.socios for each row execute function app.sincronizar_titular();

-- Credenciales de ingreso de socios (DNI + PIN de 6 dígitos)
create table public.credenciales_socio (
  user_id uuid primary key references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubes(id),
  socio_id uuid not null references public.socios(id),
  miembro_id uuid not null references public.miembros(id),
  dni text not null,
  debe_cambiar_pin boolean not null default true,
  intentos_fallidos int not null default 0,
  bloqueado_hasta timestamptz,
  ultimo_ingreso timestamptz,
  creado_en timestamptz not null default now(),
  unique (club_id, dni)
);
create index on public.credenciales_socio (socio_id);
create index on public.credenciales_socio (miembro_id);

-- ---------------------------------------------------------------------
-- Funciones auxiliares de seguridad (usadas por las políticas RLS)
-- STABLE + security definer: se evalúan una vez por consulta con (select ...)
-- ---------------------------------------------------------------------
create or replace function app.rol()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.rol from public.usuarios_staff s where s.id = (select auth.uid()) and s.activo),
    (select 'socio' from public.credenciales_socio c where c.user_id = (select auth.uid()))
  )
$$;

create or replace function app.club_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.club_id from public.usuarios_staff s where s.id = (select auth.uid()) and s.activo),
    (select c.club_id from public.credenciales_socio c where c.user_id = (select auth.uid()))
  )
$$;

create or replace function app.socio_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select c.socio_id from public.credenciales_socio c where c.user_id = (select auth.uid())
$$;

create or replace function app.miembro_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select c.miembro_id from public.credenciales_socio c where c.user_id = (select auth.uid())
$$;

create or replace function app.es_directiva()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.usuarios_staff s where s.id = (select auth.uid()) and s.activo and s.rol in ('presidente', 'directivo', 'admin'))
$$;

create or replace function app.es_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.usuarios_staff s where s.id = (select auth.uid()) and s.activo and s.rol = 'admin')
$$;

create or replace function app.es_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.usuarios_staff s where s.id = (select auth.uid()) and s.activo)
$$;

create or replace function app.tiene_rol(variadic p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.usuarios_staff s where s.id = (select auth.uid()) and s.activo and s.rol = any (p_roles))
$$;

create or replace function app.reglas(p_club uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select c.reglas from public.config c where c.club_id = p_club), app.config_por_defecto())
$$;

create or replace function app.zona(p_club uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select c.zona_horaria from public.clubes c where c.id = p_club), 'America/Lima')
$$;

create or replace function app.hoy(p_club uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone app.zona(p_club))::date
$$;

create or replace function app.ahora_local(p_club uuid)
returns timestamp language sql stable security definer set search_path = '' as $$
  select (now() at time zone app.zona(p_club))
$$;

create or replace function app.nombre_usuario(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.nombre from public.usuarios_staff s where s.id = p_user),
    (select m.nombres || ' ' || m.apellidos from public.credenciales_socio c join public.miembros m on m.id = c.miembro_id where c.user_id = p_user),
    'Sistema'
  )
$$;

-- ---------------------------------------------------------------------
-- Cuotas, pagos y cuenta del socio
-- ---------------------------------------------------------------------
create table public.cuotas (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  socio_id uuid not null references public.socios(id),
  tipo text not null default 'mantenimiento' check (tipo in ('mantenimiento', 'ingreso', 'extraordinaria')),
  periodo date not null check (extract(day from periodo) = 1),
  monto numeric(10, 2) not null check (monto >= 0),
  vencimiento date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado', 'vencido', 'anulada')),
  pagado_en timestamptz,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0),
  unique (socio_id, tipo, periodo)
);
create index on public.cuotas (club_id, periodo);
create index on public.cuotas (club_id, estado);

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  socio_id uuid not null references public.socios(id),
  medio text not null check (medio in ('yape', 'plin', 'transferencia', 'efectivo', 'tarjeta')),
  monto numeric(10, 2) not null check (monto > 0),
  operacion text,
  constancia_path text,
  origen text not null default 'app' check (origen in ('app', 'oficina')),
  estado text not null default 'por_validar' check (estado in ('por_validar', 'validado', 'rechazado')),
  nota text,
  validado_por uuid,
  validado_en timestamptz,
  motivo_rechazo text,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0)
);
create index on public.pagos (socio_id);
create index on public.pagos (club_id, estado);

-- Movimientos de la cuenta del socio: cargos (cuotas, consumos a cuenta, alquileres) y abonos (pagos)
create table public.cuenta_socio (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  socio_id uuid not null references public.socios(id),
  fecha timestamptz not null default now(),
  tipo text not null check (tipo in ('cargo', 'abono')),
  origen text not null check (origen in ('cuota', 'barra', 'alquiler', 'pago', 'ajuste', 'invitado')),
  concepto text not null,
  monto numeric(10, 2) not null check (monto > 0),
  cuota_id uuid references public.cuotas(id),
  pago_id uuid references public.pagos(id),
  comanda_id uuid,
  detalle jsonb,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0)
);
create index on public.cuenta_socio (socio_id, fecha);
create index on public.cuenta_socio (club_id, fecha);
create index on public.cuenta_socio (cuota_id);
create index on public.cuenta_socio (pago_id);
create index on public.cuenta_socio (comanda_id);

-- Cada cuota genera su cargo en la cuenta del socio
create or replace function app.cuota_a_cuenta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.estado <> 'anulada' then
    insert into public.cuenta_socio (club_id, socio_id, fecha, tipo, origen, concepto, monto, cuota_id, es_ejemplo, creado_por)
    values (new.club_id, new.socio_id, (new.periodo::timestamp at time zone app.zona(new.club_id)), 'cargo', 'cuota',
            case new.tipo when 'mantenimiento' then 'Cuota de mantenimiento ' || to_char(new.periodo, 'MM/YYYY')
                          when 'ingreso' then 'Cuota de ingreso' else 'Cuota extraordinaria' end,
            new.monto, new.id, new.es_ejemplo, new.creado_por);
  end if;
  return new;
end;
$$;
create trigger cuotas_cargo after insert on public.cuotas for each row execute function app.cuota_a_cuenta();

-- Aplica los abonos a los cargos en orden de antigüedad (FIFO) y actualiza el estado de las cuotas.
create or replace function app.aplicar_pagos(p_socio uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_abonos numeric;
  v_acum numeric := 0;
  r record;
  v_hoy date;
  v_club uuid;
begin
  select club_id into v_club from public.socios where id = p_socio;
  v_hoy := app.hoy(v_club);
  select coalesce(sum(monto), 0) into v_abonos from public.cuenta_socio
   where socio_id = p_socio and tipo = 'abono' and eliminado_en is null;
  for r in
    select cs.monto, cs.cuota_id, c.vencimiento, c.estado
      from public.cuenta_socio cs
      left join public.cuotas c on c.id = cs.cuota_id
     where cs.socio_id = p_socio and cs.tipo = 'cargo' and cs.eliminado_en is null
     order by cs.fecha, cs.creado_en, cs.id
  loop
    v_acum := v_acum + r.monto;
    if r.cuota_id is not null and r.estado <> 'anulada' then
      if v_acum <= v_abonos + 0.001 then
        update public.cuotas set estado = 'pagado', pagado_en = coalesce(pagado_en, now()) where id = r.cuota_id and estado <> 'pagado';
      else
        update public.cuotas set estado = case when r.vencimiento < v_hoy then 'vencido' else 'pendiente' end, pagado_en = null
         where id = r.cuota_id and estado is distinct from (case when r.vencimiento < v_hoy then 'vencido' else 'pendiente' end);
      end if;
    end if;
  end loop;
end;
$$;

-- Estado de cuenta de cada socio (vista con los permisos de quien consulta)
create or replace view public.estado_socios with (security_invoker = true) as
select
  s.id as socio_id,
  s.club_id,
  s.numero,
  s.apellidos,
  s.nombres,
  s.estado as estado_socio,
  coalesce(sum(case when cs.tipo = 'cargo' then cs.monto else -cs.monto end), 0)::numeric(12, 2) as saldo,
  (select count(*) from public.cuotas c where c.socio_id = s.id and c.estado = 'vencido' and c.eliminado_en is null) as cuotas_vencidas,
  (select count(*) from public.cuotas c where c.socio_id = s.id and c.estado = 'pendiente' and c.eliminado_en is null) as cuotas_pendientes,
  (select min(c.vencimiento) from public.cuotas c where c.socio_id = s.id and c.estado in ('pendiente', 'vencido') and c.eliminado_en is null) as proximo_vencimiento,
  case
    when exists (select 1 from public.cuotas c where c.socio_id = s.id and c.estado = 'vencido' and c.eliminado_en is null) then 'deuda'
    when exists (select 1 from public.cuotas c where c.socio_id = s.id and c.estado = 'pendiente' and c.eliminado_en is null) then 'por_vencer'
    else 'al_dia'
  end as estado_cuenta,
  s.es_ejemplo
from public.socios s
left join public.cuenta_socio cs on cs.socio_id = s.id and cs.eliminado_en is null
where s.eliminado_en is null
group by s.id;
