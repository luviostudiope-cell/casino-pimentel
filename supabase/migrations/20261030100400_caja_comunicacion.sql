-- =====================================================================
-- 005 · Caja de oficina, avisos, notificaciones, push y reportes diarios
-- =====================================================================

create table public.caja_movimientos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  fecha date not null,
  comprobante text,
  descripcion text not null,
  categoria text not null,
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  monto numeric(12, 2) not null check (monto > 0),
  cierre_id uuid,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0)
);
create index on public.caja_movimientos (club_id, fecha);
create index on public.caja_movimientos (cierre_id);

create table public.caja_cierres (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  desde date not null,
  hasta date not null check (hasta >= desde),
  saldo_inicial numeric(12, 2) not null,
  ingresos numeric(12, 2) not null,
  egresos numeric(12, 2) not null,
  saldo_final numeric(12, 2) not null,
  contado numeric(12, 2) not null,
  diferencia numeric(12, 2) not null,
  nota text,
  cerrado_por uuid default auth.uid(),
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now()
);
create index on public.caja_cierres (club_id, hasta);
alter table public.caja_movimientos add constraint caja_cierre_fk foreign key (cierre_id) references public.caja_cierres(id);

-- Saldo corrido de la caja (vista con permisos de quien consulta)
create or replace view public.caja_con_saldo with (security_invoker = true) as
select m.*,
       sum(case when m.tipo = 'ingreso' then m.monto else -m.monto end)
         over (partition by m.club_id order by m.fecha, m.creado_en, m.id rows between unbounded preceding and current row)::numeric(12, 2) as saldo
  from public.caja_movimientos m
 where m.eliminado_en is null;

create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  titulo text not null check (length(titulo) between 3 and 140),
  texto text not null,
  foto_path text,
  publicado_en timestamptz not null default now(),
  expira_en timestamptz,
  fijado boolean not null default false,
  publico_web boolean not null default false,
  notificar boolean not null default true,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0)
);
create index on public.avisos (club_id, publicado_en desc);

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  cuerpo text,
  url text,
  importante boolean not null default false,
  leida boolean not null default false,
  leida_en timestamptz,
  push_enviado boolean not null default false,
  creado_en timestamptz not null default now()
);
create index on public.notificaciones (user_id, leida, creado_en desc);
create index on public.notificaciones (club_id, creado_en desc);

create table public.suscripciones_push (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  dispositivo text,
  creado_en timestamptz not null default now(),
  ultimo_error text
);
create index on public.suscripciones_push (user_id);
create index on public.suscripciones_push (club_id);

create table public.reportes_diarios (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  fecha date not null,
  datos jsonb not null,
  texto text not null,
  generado_con text not null check (generado_con in ('claude', 'plantilla')),
  enviado_telegram boolean not null default false,
  enviado_push boolean not null default false,
  error text,
  disparado_por text not null default 'cron' check (disparado_por in ('cron', 'manual')),
  creado_en timestamptz not null default now()
);
create index on public.reportes_diarios (club_id, fecha desc);
