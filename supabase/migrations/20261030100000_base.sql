-- =====================================================================
-- Casino de Pimentel · 001 · Base: clubes, configuración, staff, registro
-- Todas las tablas llevan club_id: el sistema sirve para varios clubes.
-- Las reglas del club viven en config.reglas (JSON validado), nunca en el código.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- Esquema privado para funciones auxiliares y secretos (no se expone en la API)
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Clubes
-- ---------------------------------------------------------------------
create table public.clubes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  nombre text not null,
  razon_social text,
  direccion text,
  telefono text,
  celular text,
  zona_horaria text not null default 'America/Lima',
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
comment on table public.clubes is 'Cada club que usa la plataforma.';

-- ---------------------------------------------------------------------
-- Configuración (reglas del club en JSON validado)
-- ---------------------------------------------------------------------
create or replace function app.config_valida(r jsonb)
returns boolean
language plpgsql immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(r) <> 'object' then return false; end if;
  -- Invitados
  if (r #>> '{invitados,max_por_socio_dia}')::int not between 0 and 50 then return false; end if;
  if (r #>> '{invitados,max_visitas_mes}')::int not between 0 and 31 then return false; end if;
  if (r #>> '{invitados,tarifas,club}')::numeric < 0 or (r #>> '{invitados,tarifas,piscina}')::numeric < 0 or (r #>> '{invitados,tarifas,comedor}')::numeric < 0 then return false; end if;
  -- Tenis
  if (r #>> '{tenis,hora_inicio}')::time >= (r #>> '{tenis,hora_fin}')::time then return false; end if;
  if (r #>> '{tenis,duracion_min}')::int not between 15 and 240 then return false; end if;
  if (r #>> '{tenis,max_por_dia}')::int not between 0 and 10 then return false; end if;
  if (r #>> '{tenis,max_por_semana}')::int not between 0 and 30 then return false; end if;
  if (r #>> '{tenis,edad_max_hijos}')::int not between 0 and 99 then return false; end if;
  if (r #>> '{tenis,dias_anticipacion}')::int not between 0 and 60 then return false; end if;
  -- Cuotas
  if (r #>> '{cuotas,mantenimiento}')::numeric < 0 then return false; end if;
  if (r #>> '{cuotas,dia_vencimiento}')::int not between 1 and 28 then return false; end if;
  if (r #>> '{cuotas,dias_aviso}')::int not between 0 and 28 then return false; end if;
  if (r #>> '{cuotas,mes_vencimiento}')::int not between 0 and 2 then return false; end if;
  -- Personal y reporte
  if (r #>> '{personal,tolerancia_tardanza_min}')::int not between 0 and 120 then return false; end if;
  if (r #>> '{reporte,hora}')::time is null then return false; end if;
  if jsonb_typeof(r #> '{morosos,bloquear_ingreso}') <> 'boolean' then return false; end if;
  if (r #>> '{qr,vigencia_seg}')::int not between 10 and 300 then return false; end if;
  if jsonb_typeof(r #> '{barra,modo_evento}') <> 'boolean' then return false; end if;
  if (r #>> '{barra,umbral_faltante}')::numeric < 0 then return false; end if;
  if (r #>> '{barra,umbral_cortesias_dia}')::int < 0 then return false; end if;
  if (r #>> '{caja,cierre_cada_dias}')::int not between 1 and 31 then return false; end if;
  if (r #>> '{alquiler,igv}')::numeric not between 0 and 1 then return false; end if;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function app.config_por_defecto()
returns jsonb language sql immutable set search_path = '' as $$
  select '{
    "invitados": {"max_por_socio_dia": 5, "max_visitas_mes": 3, "tarifas": {"club": 10, "piscina": 20, "comedor": 0}},
    "tenis": {"hora_inicio": "06:00", "hora_fin": "22:00", "duracion_min": 60, "max_por_dia": 1, "max_por_semana": 3,
              "edad_max_hijos": 25, "dias_anticipacion": 7, "pueden_reservar": ["titular", "esposa", "esposo", "hijo", "hija"]},
    "basquet": {"hora_inicio": "06:00", "hora_fin": "22:00", "reservable": false},
    "cuotas": {"mantenimiento": 80, "ingreso": 1500, "dia_vencimiento": 10, "mes_vencimiento": 1, "dias_aviso": 5, "ingreso_es_ejemplo": true},
    "personal": {"tolerancia_tardanza_min": 10, "refrigerio_min": 60},
    "reporte": {"hora": "22:30", "telegram": true, "push": true},
    "morosos": {"bloquear_ingreso": false, "avisar_administracion": true},
    "qr": {"vigencia_seg": 30},
    "barra": {"modo_evento": false, "umbral_faltante": 10, "umbral_cortesias_dia": 5, "oz_por_botella_750": 25.4},
    "caja": {"cierre_cada_dias": 2},
    "alquiler": {"igv": 0.18, "decoracion_dia_anterior": true},
    "horarios": {"club": "Martes a domingo, 8:00 a 22:00 [por confirmar]", "piscina": "9:00 a 18:00 [por confirmar]", "barra": "11:00 a 23:00 [por confirmar]"}
  }'::jsonb
$$;

create table public.config (
  club_id uuid primary key references public.clubes(id) on delete cascade,
  reglas jsonb not null default app.config_por_defecto() check (app.config_valida(reglas)),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid
);
comment on table public.config is 'Reglas del club: invitados, tenis, cuotas, tolerancia, hora del reporte. Solo administración la edita.';

-- Contadores correlativos por club (tickets de portería, comandas)
create table app.contadores (
  club_id uuid not null references public.clubes(id) on delete cascade,
  nombre text not null,
  valor bigint not null default 0,
  primary key (club_id, nombre)
);

create or replace function app.siguiente(p_club uuid, p_nombre text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v bigint;
begin
  insert into app.contadores (club_id, nombre, valor) values (p_club, p_nombre, 1)
  on conflict (club_id, nombre) do update set valor = app.contadores.valor + 1
  returning valor into v;
  return v;
end;
$$;

-- Secretos internos por club (firma del QR del carnet). Nunca expuestos.
create table app.secretos (
  club_id uuid primary key references public.clubes(id) on delete cascade,
  qr_clave bytea not null default extensions.gen_random_bytes(32)
);
revoke all on app.secretos from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Usuarios del personal administrativo y operativo (vinculados a auth.users)
-- ---------------------------------------------------------------------
create table public.usuarios_staff (
  id uuid primary key references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubes(id),
  nombre text not null,
  correo text not null,
  rol text not null check (rol in ('presidente', 'directivo', 'admin', 'barra', 'porteria')),
  cargo text,
  activo boolean not null default true,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now()
);
create index on public.usuarios_staff (club_id);

-- Tablets registradas
create table public.dispositivos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  nombre text not null,
  tipo text not null check (tipo in ('barra', 'porteria', 'admin', 'asistencia')),
  barra_id uuid,
  identificador text not null default encode(extensions.gen_random_bytes(8), 'hex'),
  activo boolean not null default true,
  ultimo_uso timestamptz,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (club_id, identificador)
);
create index on public.dispositivos (club_id);

-- ---------------------------------------------------------------------
-- Registro total: auditoría (por trigger) y accesos
-- ---------------------------------------------------------------------
create table public.auditoria (
  id bigint generated always as identity primary key,
  club_id uuid,
  tabla text not null,
  registro_id text,
  accion text not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  antes jsonb,
  despues jsonb,
  cambios text[],
  usuario_id uuid,
  usuario_nombre text,
  fecha timestamptz not null default now()
);
create index on public.auditoria (club_id, fecha desc);
create index on public.auditoria (tabla, registro_id);
create index on public.auditoria (usuario_id);

create table public.accesos (
  id bigint generated always as identity primary key,
  club_id uuid,
  user_id uuid,
  identificador text,
  evento text not null check (evento in ('login', 'logout', 'fallido', 'bloqueado', 'cambio_pin')),
  exito boolean not null,
  dispositivo text,
  detalle text,
  fecha timestamptz not null default now()
);
create index on public.accesos (club_id, fecha desc);
create index on public.accesos (user_id);
