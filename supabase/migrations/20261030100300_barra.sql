-- =====================================================================
-- 004 · Barra El Astillero: carta, insumos, recetas, compras, kardex,
--       comandas, cobros, cortesías y cierres diarios
-- Unidad de control: los licores por botella se controlan en ONZAS
-- (1 botella de 750 ml = 25.4 oz). El resto, en su propia unidad.
-- =====================================================================

create table public.barras (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  nombre text not null,
  ubicacion text,
  activa boolean not null default true,
  orden int not null default 0,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now()
);
create index on public.barras (club_id);
alter table public.dispositivos add constraint dispositivos_barra_fk foreign key (barra_id) references public.barras(id);
create index on public.dispositivos (barra_id);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  nombre text not null,
  icono text,
  orden int not null default 0,
  activa boolean not null default true,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (club_id, nombre)
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  categoria_id uuid not null references public.categorias(id),
  nombre text not null,
  subgrupo text,                         -- Gin, Pisco, Ron, Whisky...
  descripcion text,
  precio numeric(10, 2) not null check (precio >= 0),
  precio_evento numeric(10, 2) check (precio_evento is null or precio_evento >= 0),
  por_confirmar boolean not null default false,
  nota_precio text,                      -- "Carta: S/ 20 · Lista interna: S/ 18"
  activo boolean not null default true,
  orden int not null default 0,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0)
);
create index on public.productos (club_id, categoria_id);
create index on public.productos (categoria_id);

create table public.insumos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  nombre text not null,
  grupo text not null,                   -- tal cual la lista del club
  unidad text not null check (unidad in ('botella', 'unidad', 'onza', 'kilo', 'gramo', 'gota', 'porcion')),
  oz_por_botella numeric(8, 2) check (oz_por_botella is null or oz_por_botella > 0),
  costo numeric(10, 2),                  -- costo por botella / unidad / kilo...
  costo_es_ejemplo boolean not null default true,
  stock_minimo numeric(10, 2) not null default 0,
  activo boolean not null default true,
  orden int not null default 0,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0),
  check (unidad <> 'botella' or oz_por_botella is not null),
  unique (club_id, nombre)
);

-- Cantidad en "unidad de control": onzas para botellas, si no la propia unidad
create or replace function app.a_control(p_insumo uuid, p_cantidad numeric)
returns numeric language sql stable security definer set search_path = '' as $$
  select case when i.unidad = 'botella' then p_cantidad * i.oz_por_botella else p_cantidad end
    from public.insumos i where i.id = p_insumo
$$;

create table public.recetas (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  producto_id uuid not null references public.productos(id),
  insumo_id uuid not null references public.insumos(id),
  cantidad numeric(10, 3) not null check (cantidad > 0), -- en unidad de control (onzas para licores)
  es_ejemplo boolean not null default true,
  creado_en timestamptz not null default now(),
  unique (producto_id, insumo_id)
);
create index on public.recetas (club_id);
create index on public.recetas (insumo_id);

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  nombre text not null,
  ruc text,
  contacto text,
  celular text,
  rubro text,
  activo boolean not null default true,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (club_id, nombre)
);

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  proveedor_id uuid not null references public.proveedores(id),
  barra_id uuid not null references public.barras(id),
  fecha date not null,
  comprobante text,
  total numeric(12, 2) not null default 0,
  nota text,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  eliminado_en timestamptz,
  eliminado_por uuid,
  eliminado_motivo text,
  check (eliminado_en is null or length(trim(coalesce(eliminado_motivo, ''))) > 0)
);
create index on public.compras (club_id, fecha);
create index on public.compras (proveedor_id);
create index on public.compras (barra_id);

create table public.compra_items (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  compra_id uuid not null references public.compras(id),
  insumo_id uuid not null references public.insumos(id),
  cantidad numeric(10, 3) not null check (cantidad > 0),          -- en unidad de compra (botellas, unidades, kilos)
  costo_unitario numeric(10, 2) not null check (costo_unitario >= 0),
  subtotal numeric(12, 2) generated always as (round(cantidad * costo_unitario, 2)) stored,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now()
);
create index on public.compra_items (compra_id);
create index on public.compra_items (insumo_id);
create index on public.compra_items (club_id);

-- Kardex: cada entrada y salida de stock
create table public.movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  barra_id uuid not null references public.barras(id),
  insumo_id uuid not null references public.insumos(id),
  fecha timestamptz not null default now(),
  tipo text not null check (tipo in ('inicial', 'ingreso', 'venta', 'cortesia', 'ajuste', 'merma', 'traslado')),
  cantidad numeric(12, 3) not null,       -- en unidad de control; + entra, - sale
  costo_unitario numeric(10, 4),
  compra_item_id uuid references public.compra_items(id),
  comanda_item_id uuid,
  conteo_id uuid,
  nota text,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid()
);
create index on public.movimientos_stock (club_id, barra_id, insumo_id, fecha);
create index on public.movimientos_stock (insumo_id);
create index on public.movimientos_stock (compra_item_id);
create index on public.movimientos_stock (comanda_item_id);
create index on public.movimientos_stock (conteo_id);

-- Al registrar una compra: entra al kardex y actualiza el costo del insumo
create or replace function app.compra_a_kardex()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_barra uuid; v_fecha date; v_ej boolean;
begin
  select barra_id, fecha, es_ejemplo into v_barra, v_fecha, v_ej from public.compras where id = new.compra_id;
  insert into public.movimientos_stock (club_id, barra_id, insumo_id, fecha, tipo, cantidad, costo_unitario, compra_item_id, es_ejemplo, nota)
  select new.club_id, v_barra, new.insumo_id, (v_fecha::timestamp + time '09:00') at time zone app.zona(new.club_id), 'ingreso',
         app.a_control(new.insumo_id, new.cantidad),
         case when i.unidad = 'botella' then new.costo_unitario / i.oz_por_botella else new.costo_unitario end,
         new.id, v_ej or new.es_ejemplo, 'Compra'
    from public.insumos i where i.id = new.insumo_id;
  update public.insumos set costo = new.costo_unitario, costo_es_ejemplo = (v_ej or new.es_ejemplo) where id = new.insumo_id;
  update public.compras set total = (select coalesce(sum(subtotal), 0) from public.compra_items where compra_id = new.compra_id) where id = new.compra_id;
  return new;
end;
$$;
create trigger compra_items_kardex after insert on public.compra_items for each row execute function app.compra_a_kardex();

create table public.conteos_fisicos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  barra_id uuid not null references public.barras(id),
  fecha date not null,
  realizado_por uuid default auth.uid(),
  nota text,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now()
);
create index on public.conteos_fisicos (club_id, barra_id, fecha);

create table public.conteo_items (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  conteo_id uuid not null references public.conteos_fisicos(id),
  insumo_id uuid not null references public.insumos(id),
  teorico numeric(12, 3) not null,   -- en unidad de control
  contado numeric(12, 3) not null,
  diferencia numeric(12, 3) generated always as (contado - teorico) stored,
  valor_diferencia numeric(12, 2),
  es_ejemplo boolean not null default false,
  unique (conteo_id, insumo_id)
);
create index on public.conteo_items (insumo_id);
create index on public.conteo_items (club_id);

-- Turno de barra: barra + mesero
create table public.turnos_barra (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  barra_id uuid not null references public.barras(id),
  mesero_id uuid not null references public.personal(id),
  abierto_en timestamptz not null default now(),
  cerrado_en timestamptz,
  dispositivo text,
  abierto_por uuid default auth.uid(),
  es_ejemplo boolean not null default false
);
create index on public.turnos_barra (club_id, barra_id, abierto_en);
create index on public.turnos_barra (mesero_id);

create table public.comandas (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  barra_id uuid not null references public.barras(id),
  turno_barra_id uuid references public.turnos_barra(id),
  numero bigint not null,
  fecha date not null,
  mesa text,
  mesero_id uuid references public.personal(id),
  n_personas int check (n_personas is null or n_personas between 1 and 99),
  cliente_tipo text not null default 'externo' check (cliente_tipo in ('externo', 'socio')),
  socio_id uuid references public.socios(id),
  miembro_id uuid references public.miembros(id),
  cliente_nombre text,
  modo_evento boolean not null default false,
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada', 'anulada')),
  total numeric(12, 2) not null default 0,
  total_cortesias numeric(12, 2) not null default 0,
  abierta_en timestamptz not null default now(),
  cerrada_en timestamptz,
  cerrada_por uuid,
  motivo_anulacion text,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid(),
  check (cliente_tipo = 'externo' or socio_id is not null),
  unique (club_id, numero)
);
create index on public.comandas (club_id, barra_id, fecha);
create index on public.comandas (socio_id);
create index on public.comandas (miembro_id);
create index on public.comandas (mesero_id);
create index on public.comandas (turno_barra_id);

create table public.cortesias (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  barra_id uuid not null references public.barras(id),
  comanda_id uuid not null references public.comandas(id),
  fecha date not null,
  motivo text not null check (length(trim(motivo)) > 2),
  autorizado_por uuid not null references public.personal(id),
  valor numeric(10, 2) not null default 0,  -- a precio de carta
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid()
);
create index on public.cortesias (club_id, fecha);
create index on public.cortesias (comanda_id);
create index on public.cortesias (autorizado_por);
create index on public.cortesias (barra_id);

create table public.comanda_items (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  comanda_id uuid not null references public.comandas(id),
  producto_id uuid not null references public.productos(id),
  cantidad numeric(8, 2) not null check (cantidad > 0),
  precio_unitario numeric(10, 2) not null check (precio_unitario >= 0),
  subtotal numeric(12, 2) generated always as (round(cantidad * precio_unitario, 2)) stored,
  es_cortesia boolean not null default false,
  cortesia_id uuid references public.cortesias(id),
  nota text,
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid()
);
create index on public.comanda_items (comanda_id);
create index on public.comanda_items (producto_id);
create index on public.comanda_items (cortesia_id);
create index on public.comanda_items (club_id);
alter table public.movimientos_stock add constraint mov_comanda_item_fk foreign key (comanda_item_id) references public.comanda_items(id);
alter table public.movimientos_stock add constraint mov_conteo_fk foreign key (conteo_id) references public.conteos_fisicos(id);
alter table public.cuenta_socio add constraint cuenta_comanda_fk foreign key (comanda_id) references public.comandas(id);

create table public.cobros (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  barra_id uuid not null references public.barras(id),
  comanda_id uuid not null references public.comandas(id),
  fecha date not null,
  medio text not null check (medio in ('efectivo', 'yape', 'tarjeta', 'cuenta_socio')),
  monto numeric(12, 2) not null check (monto > 0),
  recibido numeric(12, 2),
  vuelto numeric(12, 2),
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid()
);
create index on public.cobros (club_id, barra_id, fecha);
create index on public.cobros (comanda_id);

create table public.cierres_barra (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubes(id),
  barra_id uuid not null references public.barras(id),
  fecha date not null,
  esperado jsonb not null,     -- {"efectivo": 0, "yape": 0, "tarjeta": 0, "cuenta_socio": 0}
  contado jsonb not null,
  diferencia jsonb not null,
  diferencia_total numeric(12, 2) not null,
  total_ventas numeric(12, 2) not null,
  total_cortesias numeric(12, 2) not null default 0,
  n_comandas int not null default 0,
  faltante_kardex numeric(12, 2) not null default 0, -- valor de lo que falta en el conteo
  conteo_id uuid references public.conteos_fisicos(id),
  nota text,
  cerrado_por uuid default auth.uid(),
  es_ejemplo boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (barra_id, fecha)
);
create index on public.cierres_barra (club_id, fecha);
create index on public.cierres_barra (conteo_id);

-- Stock teórico por barra e insumo (vista con permisos de quien consulta)
create or replace view public.stock_actual with (security_invoker = true) as
select m.club_id, m.barra_id, m.insumo_id, sum(m.cantidad)::numeric(12, 3) as cantidad
  from public.movimientos_stock m
 group by m.club_id, m.barra_id, m.insumo_id;
