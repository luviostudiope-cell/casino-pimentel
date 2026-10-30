-- =====================================================================
-- 003 · Portería, personal y asistencia, tenis y ambientes
-- =====================================================================

-- ---------------------------------------------------------------------
-- Portería
-- ---------------------------------------------------------------------
create table public.invitados (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  dni text not null check (dni ~ '^[0-9A-Za-z]{6,12}$'),
  nombres text not null,
  celular text,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0),
  unique (club_id, dni)
);

create table public.ingresos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  fecha date not null,
  hora timestamptz not null default now(),
  persona text not null check (persona in ('miembro', 'invitado')),
  miembro_id uuid references public.miembros(id),
  invitado_id uuid references public.invitados(id),
  socio_id uuid not null references public.socios(id), -- el socio (o el anfitrión del invitado)
  tipo_ingreso text not null default 'club' check (tipo_ingreso in ('club', 'piscina', 'comedor')),
  monto numeric(10, 2) not null default 0 check (monto >= 0),
  medio_pago text check (medio_pago in ('efectivo', 'yape', 'tarjeta', 'cuenta_socio')),
  ticket bigint,
  estado text not null default 'dentro' check (estado in ('preregistrado', 'dentro', 'salio', 'anulado')),
  hora_salida timestamptz,
  con_deuda boolean not null default false,
  metodo text not null default 'busqueda' check (metodo in ('qr', 'busqueda', 'preregistro', 'manual')),
  registrado_por uuid default auth.uid(),
  dispositivo text,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0),
  check ((persona = 'miembro' and miembro_id is not null) or (persona = 'invitado' and invitado_id is not null))
);
create index on public.ingresos (club_id, fecha);
create index on public.ingresos (socio_id, fecha);
create index on public.ingresos (invitado_id, fecha);
create index on public.ingresos (miembro_id);

-- ---------------------------------------------------------------------
-- Personal y asistencia
-- ---------------------------------------------------------------------
create table public.personal (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  nombres text not null,
  apellidos text not null,
  dni text not null,
  area text not null check (area in ('barra', 'porteria', 'administracion', 'mantenimiento', 'limpieza', 'piscina', 'seguridad', 'jardineria', 'cocina', 'otro')),
  cargo text not null,
  tipo_contrato text not null check (tipo_contrato in ('planilla', 'recibo')),
  sueldo_mensual numeric(10, 2),
  pago_hora numeric(10, 2),
  es_encargado boolean not null default false, -- puede autorizar cortesías
  celular text,
  foto_path text,
  activo boolean not null default true,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0),
  unique (club_id, dni)
);
create index on public.personal (club_id, area);

-- El PIN del personal vive aparte (hash bcrypt) y nadie lo puede leer por la API.
create table app.personal_pin (
  personal_id uuid primary key references public.personal(id) on delete cascade,
  pin_hash text not null,
  actualizado_en timestamptz not null default now()
);
revoke all on app.personal_pin from public, anon, authenticated;

create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  personal_id uuid not null references public.personal(id),
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  refrigerio_min int not null default 60 check (refrigerio_min between 0 and 180),
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0)
);
create unique index turnos_uno_por_dia on public.turnos (personal_id, fecha) where eliminado_en is null;
create index on public.turnos (club_id, fecha);

create table public.marcaciones (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  personal_id uuid not null references public.personal(id),
  fecha date not null,
  tipo text not null check (tipo in ('entrada', 'inicio_refrigerio', 'fin_refrigerio', 'salida')),
  hora timestamptz not null default now(),
  minutos_tarde int not null default 0,
  turno_id uuid references public.turnos(id),
  foto_path text,
  dispositivo text,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0)
);
create index on public.marcaciones (club_id, fecha);
create index on public.marcaciones (personal_id, fecha);
create index on public.marcaciones (turno_id);

-- ---------------------------------------------------------------------
-- Canchas y reservas de tenis
-- ---------------------------------------------------------------------
create table public.canchas (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  nombre text not null,
  deporte text not null check (deporte in ('tenis', 'basquet', 'otro')),
  reservable boolean not null default true,
  activa boolean not null default true,
  orden int not null default 0,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now()
);
create index on public.canchas (club_id);

create table public.reservas_cancha (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  cancha_id uuid not null references public.canchas(id),
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null check (hora_fin > hora_inicio),
  tipo text not null default 'reserva' check (tipo in ('reserva', 'bloqueo')),
  socio_id uuid references public.socios(id),
  miembro_id uuid references public.miembros(id),
  motivo text,
  estado text not null default 'confirmada' check (estado in ('confirmada', 'cancelada')),
  cancelado_por uuid,
  cancelado_en timestamptz,
  motivo_cancelacion text,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  check (tipo = 'bloqueo' or miembro_id is not null)
);
-- Sin doble reserva: un turno por cancha, fecha y hora mientras esté confirmada
create unique index reservas_sin_doble on public.reservas_cancha (cancha_id, fecha, hora_inicio) where estado = 'confirmada';
create index on public.reservas_cancha (club_id, fecha);
create index on public.reservas_cancha (miembro_id, fecha);
create index on public.reservas_cancha (socio_id);

-- ---------------------------------------------------------------------
-- Ambientes en alquiler (se alquilan, no se reservan)
-- ---------------------------------------------------------------------
create table public.ambientes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  nombre text not null,
  descripcion text,
  capacidad int,
  solo_temporada_baja boolean not null default false,
  publicado_web boolean not null default true,
  es_adicional boolean not null default false, -- p. ej. adicional de cocina
  orden int not null default 0,
  foto_path text,
  activo boolean not null default true,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now()
);
create index on public.ambientes (club_id);

create table public.tarifas_ambiente (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  ambiente_id uuid not null references public.ambientes(id),
  tipo_cliente text not null check (tipo_cliente in ('socio', 'no_socio', 'institucion')),
  precio numeric(10, 2),            -- sin IGV; null = por confirmar
  garantia numeric(10, 2),
  nota text,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (ambiente_id, tipo_cliente)
);
create index on public.tarifas_ambiente (club_id);

create table public.solicitudes_alquiler (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  nombre text not null check (length(nombre) between 2 and 120),
  celular text not null check (length(celular) between 6 and 20),
  fecha date not null,
  ambiente_id uuid references public.ambientes(id),
  tipo_cliente text not null check (tipo_cliente in ('socio', 'no_socio', 'institucion')),
  mensaje text check (length(mensaje) <= 1000),
  origen text not null default 'web' check (origen in ('web', 'app')),
  socio_id uuid references public.socios(id),
  estado text not null default 'nueva' check (estado in ('nueva', 'contactada', 'convertida', 'descartada')),
  atendido_por uuid,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now()
);
create index on public.solicitudes_alquiler (club_id, estado);
create index on public.solicitudes_alquiler (ambiente_id);

create table public.alquileres (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  ambiente_id uuid not null references public.ambientes(id),
  fecha date not null,
  dia_decoracion date,               -- se bloquea el día anterior para decorar
  cliente_nombre text not null,
  cliente_documento text,
  cliente_celular text,
  tipo_cliente text not null check (tipo_cliente in ('socio', 'no_socio', 'institucion')),
  socio_id uuid references public.socios(id),
  tarifa numeric(10, 2) not null check (tarifa >= 0),
  igv numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  garantia numeric(10, 2) not null default 0,
  garantia_devuelta boolean not null default false,
  estado text not null default 'confirmado' check (estado in ('por_confirmar', 'confirmado', 'pagado', 'realizado', 'cancelado')),
  solicitud_id uuid references public.solicitudes_alquiler(id),
  nota text,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0)
);
create unique index alquiler_un_evento_por_dia on public.alquileres (ambiente_id, fecha) where estado <> 'cancelado' and eliminado_en is null;
create index on public.alquileres (club_id, fecha);
create index on public.alquileres (socio_id);
create index on public.alquileres (solicitud_id);
