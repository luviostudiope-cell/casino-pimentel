-- =====================================================================
-- Seed 02 · DATOS DE EJEMPLO (todos con es_ejemplo = true)
-- 60 socios ficticios con familia (nunca nombres reales de socios),
-- personal y turnos, stock inicial, compras e historial de octubre 2026.
-- Se genera con semilla fija: siempre produce los mismos datos.
-- =====================================================================

-- El historial de ejemplo no llena el Registro (auditoría): se desactiva solo ese trigger
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename not in ('auditoria', 'accesos') loop
    execute format('alter table public.%I disable trigger auditar', t.tablename);
  end loop;
end $$;

select setseed(0.2026);

-- ---------------------------------------------------------------------
-- Personal de ejemplo (nombres ficticios) con PIN de ejemplo
-- ---------------------------------------------------------------------
insert into public.personal (id, club_id, nombres, apellidos, dni, area, cargo, tipo_contrato, sueldo_mensual, pago_hora, es_encargado, es_ejemplo)
select ('e1000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'c1000000-0000-4000-8000-000000000001', nom, ape, dni, area, cargo, tipo, sueldo, hora, enc, true
from (values
  (1, 'Rosa', 'Quispe Llontop', '97000101', 'barra', 'Bartender', 'planilla', 1400, null, false),
  (2, 'Luis', 'Vílchez Sánchez', '97000102', 'barra', 'Bartender', 'planilla', 1400, null, false),
  (3, 'Jhonatan', 'Cieza Díaz', '97000103', 'barra', 'Mesero', 'recibo', null, 9, false),
  (4, 'Marco Antonio', 'Neyra Ruiz', '97000104', 'barra', 'Encargado de barra', 'planilla', 1800, null, true),
  (5, 'Segundo', 'Carrasco Bances', '97000105', 'porteria', 'Portero', 'planilla', 1250, null, false),
  (6, 'Wilmer', 'Guevara Ñopo', '97000106', 'porteria', 'Portero', 'recibo', null, 8, false),
  (7, 'Milagros', 'Ortiz Paz', '97000107', 'administracion', 'Asistente administrativa', 'planilla', 1600, null, true),
  (8, 'Pedro', 'Llontop Chapoñán', '97000108', 'mantenimiento', 'Técnico de mantenimiento', 'planilla', 1350, null, false),
  (9, 'José', 'Fiestas Ayasta', '97000109', 'mantenimiento', 'Ayudante', 'recibo', null, 8, false),
  (10, 'Juana', 'Sandoval Cumpa', '97000110', 'limpieza', 'Limpieza', 'planilla', 1130, null, false),
  (11, 'Doris', 'Purizaca Vidaurre', '97000111', 'limpieza', 'Limpieza', 'planilla', 1130, null, false),
  (12, 'Kevin', 'Mío Santamaría', '97000112', 'piscina', 'Salvavidas', 'recibo', null, 10, false),
  (13, 'Brenda', 'Uypan Siesquén', '97000113', 'piscina', 'Salvavidas', 'recibo', null, 10, false),
  (14, 'Ronald', 'Chancafe Huamán', '97000114', 'seguridad', 'Vigilante', 'planilla', 1250, null, false),
  (15, 'Eusebio', 'Sirlopú Inoñán', '97000115', 'jardineria', 'Jardinero', 'planilla', 1130, null, false)
) as t(n, nom, ape, dni, area, cargo, tipo, sueldo, hora, enc);

-- PIN de ejemplo de cada trabajador (ver RESUMEN.md)
insert into app.personal_pin (personal_id, pin_hash)
select p.id, extensions.crypt(v.pin, extensions.gen_salt('bf', 6))
from (values ('97000101', '2468'), ('97000102', '1357'), ('97000103', '8080'), ('97000104', '4321'), ('97000105', '1010'),
             ('97000106', '2020'), ('97000107', '3030'), ('97000108', '4040'), ('97000109', '5050'), ('97000110', '6060'),
             ('97000111', '7070'), ('97000112', '9090'), ('97000113', '1212'), ('97000114', '3434'), ('97000115', '5656')) v(dni, pin)
join public.personal p on p.dni = v.dni;

-- Turnos de ejemplo: semana pasada, esta semana y la próxima (un día libre por semana)
insert into public.turnos (club_id, personal_id, fecha, hora_inicio, hora_fin, refrigerio_min, es_ejemplo)
select p.club_id, p.id, d::date,
       case p.dni when '97000101' then '11:00' when '97000102' then '15:00' when '97000103' then '15:00' when '97000104' then '14:00'
                  when '97000105' then '07:00' when '97000106' then '15:00' when '97000114' then '22:00' when '97000107' then '08:00' else '07:00' end::time,
       case p.dni when '97000101' then '19:00' when '97000102' then '23:00' when '97000103' then '23:00' when '97000104' then '22:00'
                  when '97000105' then '15:00' when '97000106' then '23:00' when '97000114' then '23:59' when '97000107' then '16:00' else '15:00' end::time,
       case when p.dni = '97000114' then 0 else 60 end, true
from public.personal p
cross join generate_series(date '2026-10-20', date '2026-11-09', interval '1 day') d
where extract(isodow from d) <> (1 + (substr(p.dni, 7, 2)::int % 7));

-- ---------------------------------------------------------------------
-- 60 socios ficticios con familia
-- ---------------------------------------------------------------------
do $$
declare
  ape text[] := array['Alarcón','Barrios','Bazán','Cabrera','Castañeda','Chirinos','Córdova','Delgado','Espinoza','Falla','Flores','Gálvez','Guevara','Herrera','Ibáñez',
                      'Jiménez','Larrea','León','Linares','Lozada','Medina','Mendoza','Montenegro','Morales','Muñoz','Navarro','Núñez','Olivares','Paredes','Peralta',
                      'Quiroz','Ramírez','Reyes','Ríos','Romero','Ruiz','Salazar','Sánchez','Santisteban','Soto','Tello','Torres','Ugaz','Vallejos','Vásquez',
                      'Vera','Villanueva','Zapata','Zevallos','Burga','Carranza','Dávila','Rivadeneira','Saavedra','Távara','Benites','Aguinaga','Cornejo'];
  hom text[] := array['Alberto','Alfredo','Andrés','Antonio','Arturo','Carlos','César','Daniel','Eduardo','Enrique','Ernesto','Fernando','Francisco','Gonzalo','Guillermo',
                      'Gustavo','Héctor','Hugo','Javier','Jorge','José','Juan','Julio','Luis','Manuel','Mario','Miguel','Óscar','Pablo','Pedro','Raúl','Ricardo','Roberto','Rodrigo','Sergio','Víctor'];
  muj text[] := array['Ana','Andrea','Beatriz','Carmen','Cecilia','Claudia','Diana','Elena','Gabriela','Gloria','Isabel','Julia','Karina','Laura','Liliana','Lucía','María',
                      'Mariela','Mónica','Patricia','Pilar','Rocío','Rosa','Silvia','Sofía','Susana','Teresa','Verónica','Ximena','Valeria','Camila','Daniela','Fernanda','Natalia','Paola'];
  v_club uuid := 'c1000000-0000-4000-8000-000000000001';
  i int; v_id uuid; v_mujer boolean; v_nom text; v_ap1 text; v_ap2 text; v_nac date; v_hijos int; h int; v_conyuge boolean; v_ap_c text;
  r float;
begin
  for i in 1..60 loop
    v_mujer := random() < 0.25;
    v_ap1 := ape[1 + floor(random() * array_length(ape, 1))::int];
    v_ap2 := ape[1 + floor(random() * array_length(ape, 1))::int];
    v_nom := case when v_mujer then muj[1 + floor(random() * array_length(muj, 1))::int] else hom[1 + floor(random() * array_length(hom, 1))::int] end
             || case when random() < 0.45 then ' ' || case when v_mujer then muj[1 + floor(random() * array_length(muj, 1))::int] else hom[1 + floor(random() * array_length(hom, 1))::int] end else '' end;
    -- Dos socios de demostración con nombre fijo (también ficticios)
    if i = 1 then v_mujer := false; v_nom := 'Gonzalo'; v_ap1 := 'Peralta'; v_ap2 := 'Ugaz'; end if;
    if i = 2 then v_mujer := true; v_nom := 'Mariela'; v_ap1 := 'Chirinos'; v_ap2 := 'Vera'; end if;
    v_nac := date '1950-01-01' + floor(random() * 365 * 32)::int;
    if i = 1 then v_nac := date '1966-04-12'; end if;
    if i = 2 then v_nac := date '1971-09-03'; end if;
    insert into public.socios (club_id, numero, apellidos, nombres, dni, celular, correo, fecha_nacimiento, fecha_ingreso, es_ejemplo)
    values (v_club, lpad((i * 4 + (i % 3))::text, 4, '0'), v_ap1 || ' ' || v_ap2, v_nom, '99' || lpad((100000 + i * 7919 % 899999)::text, 6, '0'),
            '9' || lpad((floor(random() * 99999999))::text, 8, '0'), null, v_nac,
            date '1985-01-01' + floor(random() * 365 * 40)::int, true)
    returning id into v_id;
    -- Familia
    v_conyuge := random() < 0.72 or i in (1, 2);
    if v_conyuge then
      v_ap_c := ape[1 + floor(random() * array_length(ape, 1))::int] || ' ' || ape[1 + floor(random() * array_length(ape, 1))::int];
      insert into public.miembros (club_id, socio_id, nombres, apellidos, dni, fecha_nacimiento, parentesco, es_ejemplo)
      values (v_club, v_id,
              case when v_mujer then hom[1 + floor(random() * array_length(hom, 1))::int] else muj[1 + floor(random() * array_length(muj, 1))::int] end,
              case when i = 1 then 'Linares Soto' when i = 2 then 'Burga Távara' else v_ap_c end,
              '98' || lpad((100000 + i * 6007 % 899999)::text, 6, '0'), v_nac + floor(random() * 2000 - 1000)::int,
              case when v_mujer then 'esposo' else 'esposa' end, true);
    end if;
    v_hijos := case when i = 1 then 2 when i = 2 then 2 else floor(random() * 4)::int end;
    for h in 1..v_hijos loop
      r := random();
      insert into public.miembros (club_id, socio_id, nombres, apellidos, dni, fecha_nacimiento, parentesco, es_ejemplo)
      values (v_club, v_id,
              case when r < 0.5 then hom[1 + floor(random() * array_length(hom, 1))::int] else muj[1 + floor(random() * array_length(muj, 1))::int] end,
              v_ap1 || ' ' || case when v_conyuge then split_part(coalesce(v_ap_c, 'Linares Soto'), ' ', 1) else v_ap2 end,
              '97' || lpad((200000 + i * 131 + h * 17)::text, 6, '0'),
              -- hijos entre 8 y 34 años; el socio 1 tiene uno de 19 y uno de 27 (para probar la regla de menores de 25)
              case when i = 1 and h = 1 then date '2007-02-20' when i = 1 and h = 2 then date '1999-06-15' else date '2026-10-30' - (8 * 365 + floor(random() * 26 * 365)::int) end,
              case when r < 0.5 then 'hijo' else 'hija' end, true);
    end loop;
  end loop;
end $$;

-- Deuda anterior migrada de ejemplo (para probar montos grandes en pantalla)
insert into public.cuenta_socio (club_id, socio_id, fecha, tipo, origen, concepto, monto, es_ejemplo)
select s.club_id, s.id, timestamptz '2026-01-01 05:00+00', 'cargo', 'ajuste', 'Deuda anterior a 2026 (pasada del Excel)', 11200, true
from public.socios s where s.numero = lpad((59 * 4 + 59 % 3)::text, 4, '0');

-- ---------------------------------------------------------------------
-- Cuotas de enero a octubre de 2026 y pagos de ejemplo
--  - socios 1, 3..38: al día (pagaron hasta octubre)
--  - socios 39..50: por vencer (octubre pendiente, vence el 10/11)
--  - socio 2 y 51..60: con deuda (cuotas vencidas)
-- ---------------------------------------------------------------------
do $$
declare
  v_club uuid := 'c1000000-0000-4000-8000-000000000001';
  s record; m int; v_hasta int; v_pago uuid; v_medio text; v_n int := 0;
begin
  for m in 1..10 loop
    insert into public.cuotas (club_id, socio_id, tipo, periodo, monto, vencimiento, estado, es_ejemplo, creado_en)
    select v_club, x.id, 'mantenimiento', make_date(2026, m, 1), 80, (make_date(2026, m, 1) + interval '1 month')::date + 9, 'pendiente', true, make_date(2026, m, 1)
      from public.socios x where x.club_id = v_club;
  end loop;
  for s in select x.id, x.numero, row_number() over (order by x.numero) as k from public.socios x where x.club_id = v_club order by x.numero loop
    v_hasta := case when s.k = 1 or s.k between 3 and 38 then 10
                    when s.k between 39 and 50 then 9
                    when s.k = 2 then 7
                    else 2 + (s.k::int % 6) end;
    for m in 1..v_hasta loop
      v_medio := (array['yape', 'yape', 'efectivo', 'transferencia'])[1 + floor(random() * 4)::int];
      insert into public.pagos (club_id, socio_id, medio, monto, origen, estado, validado_en, es_ejemplo, creado_en)
      values (v_club, s.id, v_medio, 80, case when v_medio = 'yape' then 'app' else 'oficina' end, 'validado',
              make_date(2026, m, 1) + interval '1 month' + make_interval(days => floor(random() * 9)::int), true,
              make_date(2026, m, 1) + interval '1 month' + make_interval(days => floor(random() * 9)::int))
      returning id into v_pago;
      insert into public.cuenta_socio (club_id, socio_id, fecha, tipo, origen, concepto, monto, pago_id, es_ejemplo)
      values (v_club, s.id, make_date(2026, m, 1) + interval '1 month' + interval '3 days', 'abono', 'pago', 'Pago por ' || initcap(v_medio), 80, v_pago, true);
    end loop;
  end loop;
end $$;

select app.aplicar_pagos(id) from public.socios;

-- Tres constancias de ejemplo esperando validación
insert into public.pagos (club_id, socio_id, medio, monto, operacion, origen, estado, nota, es_ejemplo, creado_en)
select s.club_id, s.id, 'yape', 80, '0' || (12345678 + s.n * 97)::text, 'app', 'por_validar', 'Constancia de ejemplo', true, now() - make_interval(hours => (s.n * 5)::int)
from (select y.*, row_number() over (order by y.numero) n from (select x.*, row_number() over (order by x.numero) k from public.socios x) y where y.k in (40, 44, 48)) s;

-- ---------------------------------------------------------------------
-- Stock inicial (1 de octubre) y compras de ejemplo
-- ---------------------------------------------------------------------
insert into public.movimientos_stock (club_id, barra_id, insumo_id, fecha, tipo, cantidad, costo_unitario, nota, es_ejemplo)
select i.club_id, b.id, i.id, timestamptz '2026-10-01 12:00+00', 'inicial',
       case when i.unidad = 'botella' then (3 + floor(random() * 5)) * i.oz_por_botella
            when i.unidad in ('gramo', 'gota') then 1000 + floor(random() * 1000)
            when i.unidad = 'onza' then 60 + floor(random() * 60)
            when i.grupo = 'Cerveza' then 72 + floor(random() * 48)
            else 20 + floor(random() * 30) end,
       case when i.unidad = 'botella' then i.costo / i.oz_por_botella else i.costo end, 'Inventario de arranque (ejemplo)', true
from public.insumos i cross join public.barras b
where i.costo > 0 and i.nombre not in ('DERECHO DE CORCHO', 'TRAGOS PREPARADOS', 'Limonada/Maracuya Jarra', 'Limonada/Maracuya Vaso');

do $$
declare v_compra uuid; v_club uuid := 'c1000000-0000-4000-8000-000000000001'; f date; b uuid;
begin
  foreach f in array array[date '2026-10-16'] loop
    foreach b in array array['b1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000002'::uuid] loop
      insert into public.compras (club_id, proveedor_id, barra_id, fecha, comprobante, es_ejemplo)
      values (v_club, (select id from public.proveedores where nombre = 'La Taberna'), b, f, 'F001-' || (4000 + floor(random() * 900))::int, true) returning id into v_compra;
      insert into public.compra_items (club_id, compra_id, insumo_id, cantidad, costo_unitario, es_ejemplo)
      select v_club, v_compra, i.id, q, i.costo, true from (values ('GIN', 4), ('PISCO 0.700 lt', 6), ('RON 0.700 lt', 4), ('VODKA', 4), ('WHISKY', 4), ('TEQUILA', 2)) v(n, q)
      join public.insumos i on i.nombre = v.n;
      insert into public.compras (club_id, proveedor_id, barra_id, fecha, comprobante, es_ejemplo)
      values (v_club, (select id from public.proveedores where nombre = 'Backus'), b, f, 'F002-' || (9000 + floor(random() * 900))::int, true) returning id into v_compra;
      insert into public.compra_items (club_id, compra_id, insumo_id, cantidad, costo_unitario, es_ejemplo)
      select v_club, v_compra, i.id, 48, i.costo, true from public.insumos i where i.nombre = 'Pilsen bt y lata PERSONAL 305/355 ml';
      insert into public.compras (club_id, proveedor_id, barra_id, fecha, comprobante, es_ejemplo)
      values (v_club, (select id from public.proveedores where nombre = 'Makro'), b, f, 'B010-' || (1000 + floor(random() * 900))::int, true) returning id into v_compra;
      insert into public.compra_items (club_id, compra_id, insumo_id, cantidad, costo_unitario, es_ejemplo)
      select v_club, v_compra, i.id, q, i.costo, true from (values ('LIMON', 120), ('Jarabe de Goma/Granadina', 64), ('Brit Vic LATA', 24), ('Ginger Ale/Everest 500Lt', 24), ('Inka Kola 500/600ml.', 24)) v(n, q)
      join public.insumos i on i.nombre = v.n;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Historial de barra de ejemplo: 1 al 29 de octubre (S/ 100-300 por barra y día)
-- ---------------------------------------------------------------------
do $$
declare
  v_club uuid := 'c1000000-0000-4000-8000-000000000001';
  d date; b record; v_meta numeric; v_acum numeric; v_com uuid; v_num bigint; v_tot numeric; v_medio text; v_socio uuid;
  v_prod record; v_cant int; v_k int; v_item uuid; v_cort uuid; v_hora timestamptz; v_esp jsonb; v_dif numeric;
  v_prods uuid[]; v_pesos numeric[]; v_ix int;
begin
  select array_agg(p.id order by p.orden, p.nombre) into v_prods from public.productos p
   where p.nombre in ('Cerveza', 'Cerveza', 'Pisco Sour', 'Chilcano', 'Gaseosa', 'Agua', 'Cuba Libre', 'Gin Tonic London', 'Bienvenido a Pimentel', 'Algarrobina', 'Piña Colada', 'Red Bull', 'Hielera', 'Whisky', 'Moscow Mule', 'Aperol');
  for d in select generate_series(date '2026-10-01', date '2026-10-29', interval '1 day')::date loop
    for b in select * from public.barras where club_id = v_club order by orden loop
      v_meta := case when extract(isodow from d) in (6, 7) then 220 + random() * 80 else 100 + random() * 90 end;
      v_acum := 0;
      while v_acum < v_meta loop
        v_num := app.siguiente(v_club, 'comanda');
        v_hora := (d + time '13:00' + make_interval(mins => floor(random() * 540)::int)) at time zone 'America/Lima';
        v_medio := (array['tarjeta', 'tarjeta', 'tarjeta', 'tarjeta', 'tarjeta', 'efectivo', 'efectivo', 'yape', 'yape', 'cuenta_socio'])[1 + floor(random() * 10)::int];
        v_socio := case when v_medio = 'cuenta_socio' or random() < 0.3 then (select id from public.socios where club_id = v_club and apellidos not in ('Peralta Ugaz', 'Chirinos Vera') order by random() limit 1) end;
        insert into public.comandas (club_id, barra_id, numero, fecha, mesa, mesero_id, n_personas, cliente_tipo, socio_id, cliente_nombre, estado, abierta_en, cerrada_en, es_ejemplo, creado_en)
        values (v_club, b.id, v_num, d, (1 + floor(random() * 12))::int::text, 'e1000000-0000-4000-8000-000000000003', 1 + floor(random() * 5)::int,
                case when v_socio is not null then 'socio' else 'externo' end, v_socio, case when v_socio is null then null end, 'cerrada', v_hora, v_hora + interval '40 minutes', true, v_hora)
        returning id into v_com;
        for v_k in 1..(1 + floor(random() * 3))::int loop
          v_ix := 1 + floor(random() * array_length(v_prods, 1))::int;
          select * into v_prod from public.productos where id = v_prods[v_ix];
          v_cant := case when v_prod.precio <= 6 then 1 + floor(random() * 4)::int else 1 + floor(random() * 2)::int end;
          v_cort := null;
          if random() < 0.04 then
            insert into public.cortesias (club_id, barra_id, comanda_id, fecha, motivo, autorizado_por, valor, es_ejemplo, creado_en)
            values (v_club, b.id, v_com, d, (array['Cumpleaños del socio', 'Atención por demora', 'Directiva'])[1 + floor(random() * 3)::int],
                    'e1000000-0000-4000-8000-000000000004', v_prod.precio, true, v_hora) returning id into v_cort;
            v_cant := 1;
          end if;
          insert into public.comanda_items (club_id, comanda_id, producto_id, cantidad, precio_unitario, es_cortesia, cortesia_id, es_ejemplo, creado_en)
          values (v_club, v_com, v_prod.id, v_cant, v_prod.precio, v_cort is not null, v_cort, true, v_hora) returning id into v_item;
          insert into public.movimientos_stock (club_id, barra_id, insumo_id, fecha, tipo, cantidad, costo_unitario, comanda_item_id, es_ejemplo)
          select v_club, b.id, r.insumo_id, v_hora + interval '40 minutes', case when v_cort is not null then 'cortesia' else 'venta' end, -(r.cantidad * v_cant),
                 case when i.unidad = 'botella' then i.costo / i.oz_por_botella else i.costo end, v_item, true
            from public.recetas r join public.insumos i on i.id = r.insumo_id where r.producto_id = v_prod.id;
        end loop;
        select coalesce(sum(subtotal) filter (where not es_cortesia), 0), coalesce(sum(subtotal) filter (where es_cortesia), 0)
          into v_tot, v_dif from public.comanda_items where comanda_id = v_com;
        update public.comandas set total = v_tot, total_cortesias = v_dif where id = v_com;
        if v_tot > 0 then
          insert into public.cobros (club_id, barra_id, comanda_id, fecha, medio, monto, recibido, vuelto, es_ejemplo, creado_en)
          values (v_club, b.id, v_com, d, v_medio, v_tot, case when v_medio = 'efectivo' then ceil(v_tot / 10) * 10 end,
                  case when v_medio = 'efectivo' then ceil(v_tot / 10) * 10 - v_tot end, true, v_hora + interval '40 minutes');
          if v_medio = 'cuenta_socio' then
            insert into public.cuenta_socio (club_id, socio_id, fecha, tipo, origen, concepto, monto, comanda_id, detalle, es_ejemplo)
            values (v_club, v_socio, v_hora + interval '40 minutes', 'cargo', 'barra', 'Consumo en ' || b.nombre || ' · comanda N° ' || v_num, v_tot, v_com,
                    jsonb_build_object('items', (select jsonb_agg(jsonb_build_object('producto', p.nombre, 'cantidad', ci.cantidad, 'precio', ci.precio_unitario, 'subtotal', ci.subtotal))
                                                  from public.comanda_items ci join public.productos p on p.id = ci.producto_id where ci.comanda_id = v_com)), true);
          end if;
        end if;
        v_acum := v_acum + v_tot;
      end loop;
      -- Cierre del día (algunos días con pequeño faltante de caja)
      select jsonb_build_object('efectivo', coalesce(sum(monto) filter (where medio = 'efectivo'), 0), 'yape', coalesce(sum(monto) filter (where medio = 'yape'), 0),
                                'tarjeta', coalesce(sum(monto) filter (where medio = 'tarjeta'), 0), 'cuenta_socio', coalesce(sum(monto) filter (where medio = 'cuenta_socio'), 0))
        into v_esp from public.cobros where barra_id = b.id and fecha = d;
      v_dif := case when random() < 0.12 then -(5 + floor(random() * 4) * 5) else 0 end;
      insert into public.cierres_barra (club_id, barra_id, fecha, esperado, contado, diferencia, diferencia_total, total_ventas, total_cortesias, n_comandas, nota, es_ejemplo, creado_en)
      select v_club, b.id, d, v_esp, jsonb_set(v_esp, '{efectivo}', to_jsonb((v_esp ->> 'efectivo')::numeric + v_dif)),
             jsonb_build_object('efectivo', v_dif, 'yape', 0, 'tarjeta', 0, 'cuenta_socio', 0), v_dif,
             (select coalesce(sum(total), 0) from public.comandas where barra_id = b.id and fecha = d),
             (select coalesce(sum(total_cortesias), 0) from public.comandas where barra_id = b.id and fecha = d),
             (select count(*) from public.comandas where barra_id = b.id and fecha = d), null, true,
             (d + time '23:30') at time zone 'America/Lima';
    end loop;
  end loop;
end $$;

-- Conteo físico de ejemplo de ayer en la Barra 1, con faltante de licor
do $$
declare v_conteo uuid; v_club uuid := 'c1000000-0000-4000-8000-000000000001'; b uuid := 'b1000000-0000-4000-8000-000000000001'; r record; v_teo numeric; v_cont numeric;
begin
  insert into public.conteos_fisicos (club_id, barra_id, fecha, nota, es_ejemplo, creado_en)
  values (v_club, b, date '2026-10-29', 'Conteo de cierre (ejemplo)', true, timestamptz '2026-10-30 04:20+00') returning id into v_conteo;
  for r in select i.* from public.insumos i where i.grupo = 'Licores por botella' and i.club_id = v_club loop
    select coalesce(sum(cantidad), 0) into v_teo from public.movimientos_stock where insumo_id = r.id and barra_id = b;
    v_cont := case r.nombre when 'WHISKY' then v_teo - 3.5 when 'PISCO 0.700 lt' then v_teo - 2 when 'GIN' then v_teo - 1 else v_teo end;
    insert into public.conteo_items (club_id, conteo_id, insumo_id, teorico, contado, valor_diferencia, es_ejemplo)
    values (v_club, v_conteo, r.id, v_teo, v_cont, round((v_cont - v_teo) * coalesce(r.costo / r.oz_por_botella, 0), 2), true);
    if v_cont <> v_teo then
      insert into public.movimientos_stock (club_id, barra_id, insumo_id, fecha, tipo, cantidad, costo_unitario, conteo_id, nota, es_ejemplo)
      values (v_club, b, r.id, timestamptz '2026-10-30 04:20+00', 'ajuste', v_cont - v_teo, r.costo / r.oz_por_botella, v_conteo, 'Ajuste por conteo físico', true);
    end if;
  end loop;
  update public.cierres_barra set conteo_id = v_conteo,
         faltante_kardex = (select -sum(valor_diferencia) from public.conteo_items where conteo_id = v_conteo and valor_diferencia < 0)
   where barra_id = b and fecha = date '2026-10-29';
end $$;

-- ---------------------------------------------------------------------
-- Portería de ejemplo: invitados y ingresos del 1 al 29 de octubre + hoy
-- ---------------------------------------------------------------------
insert into public.invitados (club_id, dni, nombres, es_ejemplo)
select 'c1000000-0000-4000-8000-000000000001', '96' || lpad((300000 + g * 53)::text, 6, '0'),
       (array['Alonso','Bruno','Camila','Diego','Elisa','Fabio','Grecia','Iván','Jimena','Kiara','Lorenzo','Mía','Nicolás','Olga','Piero','Renata','Sebastián','Tatiana','Ulises','Vania'])[1 + (g % 20)]
       || ' ' || (array['Acosta','Bravo','Campos','Durand','Estela','Farfán','Gil','Hurtado','Infante','Jara','Lazo','Mori','Nieto','Ortega','Pinto','Rojas','Salas','Tapia','Ureta','Yáñez'])[1 + ((g * 7) % 20)],
       true
from generate_series(1, 160) g;

do $$
declare
  v_club uuid := 'c1000000-0000-4000-8000-000000000001'; d date; n int; k int; v_m record; v_inv record; v_tipo text; v_monto numeric; v_hora timestamptz; v_ticket bigint; v_dentro boolean;
begin
  for d in select generate_series(date '2026-10-01', date '2026-10-30', interval '1 day')::date loop
    n := case when extract(isodow from d) in (6, 7) then 45 + floor(random() * 25)::int else 18 + floor(random() * 18)::int end;
    if d = date '2026-10-30' then n := 22; end if;
    for v_m in select m.* from public.miembros m where m.club_id = v_club order by random() limit n loop
      v_hora := (d + time '08:00' + make_interval(mins => floor(random() * 600)::int)) at time zone 'America/Lima';
      v_ticket := app.siguiente(v_club, 'ticket_porteria');
      v_dentro := d = date '2026-10-30';
      insert into public.ingresos (club_id, fecha, hora, persona, miembro_id, socio_id, tipo_ingreso, monto, ticket, estado, hora_salida, metodo,
                                   con_deuda, es_ejemplo, creado_en)
      values (v_club, d, v_hora, 'miembro', v_m.id, v_m.socio_id, 'club', 0, v_ticket, case when v_dentro then 'dentro' else 'salio' end,
              case when v_dentro then null else v_hora + interval '3 hours' end, case when random() < 0.6 then 'qr' else 'busqueda' end,
              exists (select 1 from public.estado_socios e where e.socio_id = v_m.socio_id and e.estado_cuenta = 'deuda'), true, v_hora);
    end loop;
    -- Invitados (respetando 5 por socio/día y 3 visitas/mes)
    k := case when extract(isodow from d) in (6, 7) then 6 + floor(random() * 5)::int else 2 + floor(random() * 4)::int end;
    for v_inv in select i.* from public.invitados i
                  where i.club_id = v_club and (select count(*) from public.ingresos x where x.invitado_id = i.id and x.fecha >= date '2026-10-01') < 3
                  order by random() limit k loop
      v_tipo := (array['club', 'club', 'club', 'piscina', 'comedor'])[1 + floor(random() * 5)::int];
      v_monto := case v_tipo when 'club' then 10 when 'piscina' then 20 else 0 end;
      v_hora := (d + time '10:00' + make_interval(mins => floor(random() * 480)::int)) at time zone 'America/Lima';
      v_ticket := app.siguiente(v_club, 'ticket_porteria');
      insert into public.ingresos (club_id, fecha, hora, persona, invitado_id, socio_id, tipo_ingreso, monto, medio_pago, ticket, estado, metodo, es_ejemplo, creado_en)
      select v_club, d, v_hora, 'invitado', v_inv.id, s.id, v_tipo, v_monto, case when v_monto > 0 then (array['efectivo', 'efectivo', 'yape'])[1 + floor(random() * 3)::int] end,
             v_ticket, case when d = date '2026-10-30' then 'dentro' else 'salio' end, 'manual', true, v_hora
        from public.socios s
       where s.club_id = v_club and (select count(*) from public.ingresos x where x.socio_id = s.id and x.fecha = d and x.persona = 'invitado') < 5
       order by random() limit 1;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Asistencia de ejemplo: del 20 al 29 de octubre completa; hoy, según la hora
-- ---------------------------------------------------------------------
insert into public.marcaciones (club_id, personal_id, fecha, tipo, hora, minutos_tarde, turno_id, es_ejemplo, creado_en)
select t.club_id, t.personal_id, t.fecha, x.tipo,
       ((t.fecha + t.hora_inicio + x.desfase) at time zone 'America/Lima'),
       case when x.tipo = 'entrada' and extract(epoch from x.desfase) / 60 > 10 then (extract(epoch from x.desfase) / 60)::int else 0 end,
       t.id, true, ((t.fecha + t.hora_inicio + x.desfase) at time zone 'America/Lima')
from public.turnos t
cross join lateral (values
  ('entrada', make_interval(mins => case when random() < 0.12 then 11 + floor(random() * 15)::int else -8 + floor(random() * 12)::int end)),
  ('inicio_refrigerio', make_interval(hours => 4)),
  ('fin_refrigerio', make_interval(hours => 5)),
  ('salida', (t.hora_fin - t.hora_inicio) + make_interval(mins => floor(random() * 10)::int))
) as x(tipo, desfase)
where t.fecha between date '2026-10-20' and date '2026-10-29' and (t.refrigerio_min > 0 or x.tipo in ('entrada', 'salida'))
  and not (t.personal_id = 'e1000000-0000-4000-8000-000000000009' and t.fecha = date '2026-10-24');

-- Hoy: entran quienes ya empezaron su turno (Doris falta; Kevin queda para marcar en la demo; Pedro llega tarde)
insert into public.marcaciones (club_id, personal_id, fecha, tipo, hora, minutos_tarde, turno_id, es_ejemplo)
select t.club_id, t.personal_id, t.fecha, 'entrada',
       ((t.fecha + t.hora_inicio + make_interval(mins => case when p.dni = '97000108' then 14 else -6 + floor(random() * 9)::int end)) at time zone 'America/Lima'),
       case when p.dni = '97000108' then 14 else 0 end, t.id, true
from public.turnos t join public.personal p on p.id = t.personal_id
where t.fecha = app.hoy(t.club_id) and (t.fecha + t.hora_inicio + interval '15 minutes') < app.ahora_local(t.club_id)
  and p.dni not in ('97000111', '97000112');

-- ---------------------------------------------------------------------
-- Caja de oficina de ejemplo (octubre), con cierres cada dos días
-- ---------------------------------------------------------------------
insert into public.caja_movimientos (club_id, fecha, comprobante, descripcion, categoria, tipo, monto, es_ejemplo, creado_en)
select 'c1000000-0000-4000-8000-000000000001', f, c, d, cat, t, m, true, (f + time '10:00') at time zone 'America/Lima'
from (values
  (date '2026-10-01', null, 'Saldo inicial de caja', 'Saldo inicial', 'ingreso', 1500),
  (date '2026-10-02', 'B001-2231', 'Bidones de agua (6)', 'Servicios', 'egreso', 36),
  (date '2026-10-03', 'R-0145', 'Cuotas de mantenimiento en efectivo', 'Cuotas de socios', 'ingreso', 240),
  (date '2026-10-05', 'B003-8812', 'Sika y tubos para mantenimiento de baños', 'Mantenimiento', 'egreso', 128.5),
  (date '2026-10-07', 'F001-0098', 'Mantenimiento de cámaras de seguridad', 'Mantenimiento', 'egreso', 250),
  (date '2026-10-08', 'R-0146', 'Cuotas de mantenimiento en efectivo', 'Cuotas de socios', 'ingreso', 160),
  (date '2026-10-10', 'B002-4410', 'Almuerzos de evento de directiva', 'Eventos', 'egreso', 180),
  (date '2026-10-12', 'S/N', 'Recibo de luz (Electronorte)', 'Servicios', 'egreso', 842.3),
  (date '2026-10-14', 'R-0147', 'Cuotas de mantenimiento en efectivo', 'Cuotas de socios', 'ingreso', 320),
  (date '2026-10-16', 'B001-2290', 'Bidones de agua (6)', 'Servicios', 'egreso', 36),
  (date '2026-10-18', 'B005-1201', 'Útiles de limpieza', 'Limpieza', 'egreso', 94.8),
  (date '2026-10-20', 'R-0148', 'Cuotas de mantenimiento en efectivo', 'Cuotas de socios', 'ingreso', 80),
  (date '2026-10-22', 'B003-8901', 'Pintura para la reja del malecón', 'Mantenimiento', 'egreso', 156),
  (date '2026-10-24', 'R-0149', 'Garantía devuelta de alquiler', 'Alquileres', 'egreso', 1000),
  (date '2026-10-24', 'R-0150', 'Garantía recibida de alquiler', 'Alquileres', 'ingreso', 1000),
  (date '2026-10-27', 'B002-4467', 'Almuerzo de evento de socios', 'Eventos', 'egreso', 210),
  (date '2026-10-28', 'R-0151', 'Cuotas de mantenimiento en efectivo', 'Cuotas de socios', 'ingreso', 240),
  (date '2026-10-29', 'B001-2333', 'Bidones de agua (6)', 'Servicios', 'egreso', 36)
) as x(f, c, d, cat, t, m);

insert into public.caja_cierres (club_id, desde, hasta, saldo_inicial, ingresos, egresos, saldo_final, contado, diferencia, nota, es_ejemplo, creado_en)
select 'c1000000-0000-4000-8000-000000000001', g::date, (g + interval '1 day')::date,
       coalesce((select sum(case when tipo = 'ingreso' then monto else -monto end) from public.caja_movimientos where fecha < g::date), 0),
       coalesce((select sum(monto) from public.caja_movimientos where tipo = 'ingreso' and fecha between g::date and (g + interval '1 day')::date), 0),
       coalesce((select sum(monto) from public.caja_movimientos where tipo = 'egreso' and fecha between g::date and (g + interval '1 day')::date), 0),
       coalesce((select sum(case when tipo = 'ingreso' then monto else -monto end) from public.caja_movimientos where fecha <= (g + interval '1 day')::date), 0),
       coalesce((select sum(case when tipo = 'ingreso' then monto else -monto end) from public.caja_movimientos where fecha <= (g + interval '1 day')::date), 0)
         - case when g::date = date '2026-10-11' then 5 else 0 end,
       case when g::date = date '2026-10-11' then -5 else 0 end,
       case when g::date = date '2026-10-11' then 'Faltan S/ 5 (ejemplo)' end, true, (g + interval '1 day' + time '18:00') at time zone 'America/Lima'
from generate_series(date '2026-10-01', date '2026-10-27', interval '2 days') g;
update public.caja_movimientos m set cierre_id = c.id from public.caja_cierres c where m.fecha between c.desde and c.hasta;

-- ---------------------------------------------------------------------
-- Tenis, alquileres, solicitudes y avisos de ejemplo
-- ---------------------------------------------------------------------
-- El titular del socio de demostración ya jugó lunes y martes de esta semana (para probar el límite de 3 por semana)
insert into public.reservas_cancha (club_id, cancha_id, fecha, hora_inicio, hora_fin, tipo, socio_id, miembro_id, es_ejemplo)
select m.club_id, (select id from public.canchas where nombre = 'Tenis 1'), f, h, h + interval '1 hour', 'reserva', m.socio_id, m.id, true
from public.miembros m join public.socios s on s.id = m.socio_id
cross join (values (date '2026-10-27', time '07:00'), (date '2026-10-28', time '18:00')) v(f, h)
where s.nombres = 'Gonzalo' and s.apellidos = 'Peralta Ugaz' and m.parentesco = 'titular';

insert into public.reservas_cancha (club_id, cancha_id, fecha, hora_inicio, hora_fin, tipo, socio_id, miembro_id, es_ejemplo)
select x.club_id, c.id, x.f, x.h, x.h + interval '1 hour', 'reserva', x.socio_id, x.id, true
from (select m.*, (date '2026-10-30' + (row_number() over (order by m.id) % 5)::int) as f,
             (time '07:00' + make_interval(hours => (row_number() over (order by m.dni) % 14)::int)) as h
        from public.miembros m where m.parentesco in ('titular', 'esposa') and m.club_id = 'c1000000-0000-4000-8000-000000000001'
        order by m.id limit 14) x
join public.canchas c on c.nombre = case when extract(minute from x.h) = 0 and (extract(hour from x.h)::int % 2) = 0 then 'Tenis 1' else 'Tenis 2' end
on conflict do nothing;

insert into public.reservas_cancha (club_id, cancha_id, fecha, hora_inicio, hora_fin, tipo, motivo, es_ejemplo)
select 'c1000000-0000-4000-8000-000000000001', id, date '2026-11-01', '08:00', '12:00', 'bloqueo', 'Torneo interno de dobles (ejemplo)', true
from public.canchas where nombre = 'Tenis 2' on conflict do nothing;

insert into public.alquileres (club_id, ambiente_id, fecha, dia_decoracion, cliente_nombre, cliente_celular, tipo_cliente, socio_id, tarifa, igv, total, garantia, estado, nota, es_ejemplo)
values
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000004', date '2026-11-02', date '2026-11-01', 'Familia Peralta Ugaz', '9' || '12345678', 'socio',
   (select id from public.socios where apellidos = 'Peralta Ugaz'), 400, 72, 472, 1000, 'confirmado', 'Almuerzo familiar (ejemplo)', true),
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', date '2026-11-15', date '2026-11-14', 'Quinceañero (cliente de ejemplo)', '9' || '87654321', 'no_socio',
   null, 3000, 540, 3540, 1500, 'por_confirmar', 'Pidió ver el salón el sábado (ejemplo)', true),
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', date '2026-11-08', null, 'Cena de promoción (ejemplo)', '9' || '11223344', 'socio',
   (select id from public.socios order by numero offset 5 limit 1), 350, 63, 413, 0, 'pagado', null, true);

insert into public.solicitudes_alquiler (club_id, nombre, celular, fecha, ambiente_id, tipo_cliente, mensaje, origen, es_ejemplo, creado_en) values
  ('c1000000-0000-4000-8000-000000000001', 'Empresa de ejemplo S.A.C.', '944556677', date '2026-12-05', 'a1000000-0000-4000-8000-000000000005', 'institucion',
   'Almuerzo de fin de año para 80 personas (ejemplo).', 'web', true, now() - interval '6 hours');

insert into public.avisos (club_id, titulo, texto, publicado_en, fijado, publico_web, notificar, es_ejemplo) values
  ('c1000000-0000-4000-8000-000000000001', 'Horario de piscina en temporada baja',
   'La piscina atiende de martes a domingo. Los lunes se hace mantenimiento. [Horario por confirmar con administración]',
   now() - interval '3 days', false, true, false, true),
  ('c1000000-0000-4000-8000-000000000001', 'Torneo interno de tenis de noviembre',
   'Inscripciones abiertas para el torneo de dobles del 1 de noviembre. La cancha 2 estará reservada de 8:00 a 12:00. [Texto de ejemplo]',
   now() - interval '1 day', true, true, false, true),
  ('c1000000-0000-4000-8000-000000000001', 'Asamblea general de socios',
   'Se convoca a los socios a la asamblea general. Fecha y agenda por confirmar con la directiva. [Texto de ejemplo]',
   now() - interval '5 hours', false, false, false, true);

-- Aplicar pagos (FIFO) y marcar cuotas vencidas
select app.aplicar_pagos(id) from public.socios;

-- Reactivar la auditoría
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename not in ('auditoria', 'accesos') loop
    execute format('alter table public.%I enable trigger auditar', t.tablename);
  end loop;
end $$;
