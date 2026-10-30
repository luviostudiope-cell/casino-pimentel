-- =====================================================================
-- Seed 01 · Club, configuración, barras, carta REAL de El Astillero,
-- insumos REALES (lista del club, con su unidad), proveedores reales,
-- canchas y ambientes con tarifas reales.
-- Lo que es de ejemplo lleva es_ejemplo = true (recetas, costos, stock).
-- =====================================================================

insert into public.clubes (id, slug, nombre, razon_social, direccion, telefono, celular)
values ('c1000000-0000-4000-8000-000000000001', 'casino-pimentel', 'Casino de Pimentel', 'Casino de Pimentel (asociación civil)',
        'Calle Manuel Seoane 725, Cercado, Pimentel, Chiclayo', '074-425244', '920 349 713')
on conflict (id) do nothing;

insert into public.config (club_id) values ('c1000000-0000-4000-8000-000000000001') on conflict do nothing;
insert into app.secretos (club_id) values ('c1000000-0000-4000-8000-000000000001') on conflict do nothing;

-- ---------------------------------------------------------------------
-- Barras y carta
-- ---------------------------------------------------------------------
insert into public.barras (id, club_id, nombre, ubicacion, orden, es_ejemplo) values
  ('b1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'Barra 1', '[ubicación por confirmar]', 1, false),
  ('b1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'Barra 2', '[ubicación por confirmar]', 2, false);

insert into public.categorias (id, club_id, nombre, icono, orden) values
  ('ca000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'Tragos de autor', 'sparkles', 1),
  ('ca000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'Preparados', 'martini', 2),
  ('ca000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001', 'Botellas', 'wine', 3),
  ('ca000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000001', 'Cervezas', 'beer', 4),
  ('ca000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000001', 'Gaseosas y agua', 'cup-soda', 5),
  ('ca000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000001', 'Otros', 'package', 6);

-- Carta real (precios en soles). Precios con diferencia entre carta impresa y lista interna: se usa la carta y se marca "por confirmar".
insert into public.productos (club_id, categoria_id, nombre, subgrupo, descripcion, precio, por_confirmar, nota_precio, orden)
select 'c1000000-0000-4000-8000-000000000001', ('ca000000-0000-4000-8000-00000000000' || c)::uuid, n, sg, d, p, pc, np, o
from (values
  -- Tragos de autor
  (1, 'Bienvenido a Pimentel', null, 'Sirope de hierba buena y kion, gin, limón y ginger ale', 15, false, null, 1),
  (1, 'Sunset Beach', null, 'Piña, Smirnoff spicy y coco', 15, true, 'Carta impresa: S/ 15 · Lista interna: S/ 12', 2),
  (1, 'Tropicana', null, 'Piña, fresa, vodka, vermut rosso, coco y limón', 15, false, null, 3),
  (1, 'Capitán', null, 'Whisky, crema de cognac, café y vermut rosso', 20, false, null, 4),
  -- Preparados
  (2, 'Pisco Sour', null, null, 15, false, null, 1),
  (2, 'Chilcano', null, null, 12, false, null, 2),
  (2, 'Algarrobina', null, null, 15, false, null, 3),
  (2, 'Gin Tonic London', null, null, 15, false, null, 4),
  (2, 'Moscow Mule', null, null, 15, false, null, 5),
  (2, 'Margarita', null, null, 20, true, 'Carta impresa: S/ 20 · Lista interna: S/ 18', 6),
  (2, 'Negroni', null, null, 20, true, 'Carta impresa: S/ 20 · Lista interna: S/ 18', 7),
  (2, 'Vodka Tonic', null, null, 12, false, null, 8),
  (2, 'Vodka Tonic Grey Goose', null, null, 25, false, null, 9),
  (2, 'Whisky', null, 'Vaso', 15, false, null, 10),
  (2, 'Cuba Libre', null, null, 12, false, null, 11),
  (2, 'Piña Colada', null, null, 15, false, null, 12),
  (2, 'Daiquiri de fresa', null, null, 15, false, null, 13),
  (2, 'Daiquiri de durazno', null, null, 15, false, null, 14),
  (2, 'Tinto de Verano', null, null, 15, false, null, 15),
  (2, 'Aperol', null, null, 18, false, null, 16),
  (2, 'Baileys', null, null, 12, false, null, 17),
  (2, 'Disaronno', null, null, 15, false, null, 18),
  -- Botellas
  (3, 'Hendrick''s', 'Gin', null, 170, false, null, 1),
  (3, 'Bombay Sapphire', 'Gin', null, 120, false, null, 2),
  (3, 'Bombay Bramble', 'Gin', null, 140, false, null, 3),
  (3, 'Tanqueray Royal Berry 700 ml', 'Gin', null, 130, false, null, 4),
  (3, 'Gran Cruz', 'Pisco', null, 120, false, null, 5),
  (3, 'Portón', 'Pisco', null, 120, false, null, 6),
  (3, '4 Gallos Quebranta', 'Pisco', null, 80, false, null, 7),
  (3, 'Bacardí Añejo', 'Ron', null, 70, false, null, 8),
  (3, 'Diplomático Mantuano', 'Ron', null, 180, false, null, 9),
  (3, 'Diplomático Reserva Exclusiva', 'Ron', null, 240, false, null, 10),
  (3, 'Jimador', 'Tequila', null, 120, false, null, 11),
  (3, 'Patrón Silver', 'Tequila', null, 240, false, null, 12),
  (3, 'Patrón Reposado', 'Tequila', null, 260, false, null, 13),
  (3, 'Patrón Añejo', 'Tequila', null, 390, false, null, 14),
  (3, 'Absolut', 'Vodka', null, 80, false, null, 15),
  (3, 'Grey Goose 750 ml', 'Vodka', null, 220, false, null, 16),
  (3, 'Old Parr 750 ml', 'Whisky', null, 120, false, null, 17),
  (3, 'Chivas 13 años', 'Whisky', null, 120, false, null, 18),
  (3, 'Chivas XV', 'Whisky', null, 230, false, null, 19),
  (3, 'Johnnie Walker Swing', 'Whisky', null, 250, false, null, 20),
  (3, 'Johnnie Walker Gold Label', 'Whisky', null, 550, false, null, 21),
  (3, 'Johnnie Walker Blue', 'Whisky', null, 1600, false, null, 22),
  -- Cervezas
  (4, 'Cerveza', null, 'Personal', 6, false, null, 1),
  -- Gaseosas y agua
  (5, 'Gaseosa', null, 'Personal', 4, false, null, 1),
  (5, 'Agua', null, 'Personal', 3, false, null, 2),
  (5, 'Red Bull', null, null, 10, false, null, 3),
  (5, 'Agua tónica lata (Britvic)', null, null, 6, false, null, 4),
  (5, 'Agua tónica botella 1.5 L', null, null, 15, false, null, 5),
  (5, 'Ginger 1.5 L', null, null, 15, false, null, 6),
  (5, 'Coca-Cola 1.5 L', null, null, 12, false, null, 7),
  -- Otros
  (6, 'Hielera', null, null, 5, false, null, 1),
  (6, 'Cigarros x10', null, null, 15, false, null, 2),
  (6, 'Derecho de corcho', null, null, 20, false, null, 3)
) as t(c, n, sg, d, p, pc, np, o);

-- ---------------------------------------------------------------------
-- Insumos: lista REAL del club (RELACION_DE_INSUMOS_BARRAS_OCT_2026.xlsx), con su unidad.
-- Licores por botella se controlan en onzas (750 ml = 25.4 oz; 700 ml = 23.67 oz).
-- Costos: de ejemplo (costo_es_ejemplo = true).
-- ---------------------------------------------------------------------
insert into public.insumos (club_id, nombre, grupo, unidad, oz_por_botella, costo, stock_minimo, orden)
select 'c1000000-0000-4000-8000-000000000001', n, g, u, oz, costo, minimo, row_number() over ()
from (values
  ('Amaretto Disaronno', 'Licores por botella', 'botella', 25.4, 95, 1),
  ('Anisado', 'Licores por botella', 'botella', 25.4, 38, 1),
  ('Bailys', 'Licores por botella', 'botella', 25.4, 72, 1),
  ('Campari bitter', 'Licores por botella', 'botella', 25.4, 58, 1),
  ('Cogñac', 'Licores por botella', 'botella', 25.4, 110, 1),
  ('Curasao', 'Licores por botella', 'botella', 25.4, 45, 1),
  ('ESPUMANTE', 'Licores por botella', 'botella', 25.4, 40, 2),
  ('GIN', 'Licores por botella', 'botella', 25.4, 78, 3),
  ('Jaggermeister', 'Licores por botella', 'botella', 25.4, 85, 1),
  ('Licor 43', 'Licores por botella', 'botella', 25.4, 98, 1),
  ('Licor de Café', 'Licores por botella', 'botella', 25.4, 52, 1),
  ('Malibu. Crema de coco con ron', 'Licores por botella', 'botella', 25.4, 60, 1),
  ('MENTA VERDE BARDINET', 'Licores por botella', 'botella', 25.4, 42, 1),
  ('PISCO 0.700 lt', 'Licores por botella', 'botella', 23.67, 42, 4),
  ('PISCO 1.750 lt', 'Licores por botella', 'botella', 59.17, 88, 1),
  ('PISCO DAMAJUANA 4lt', 'Licores por botella', 'botella', 135.26, 160, 0),
  ('RON 0.700 lt', 'Licores por botella', 'botella', 23.67, 38, 3),
  ('RON 1.750 lt', 'Licores por botella', 'botella', 59.17, 75, 1),
  ('TEQUILA', 'Licores por botella', 'botella', 25.4, 82, 2),
  ('VINO BLANCO', 'Licores por botella', 'botella', 25.4, 32, 2),
  ('VINO TINTO', 'Licores por botella', 'botella', 25.4, 32, 2),
  ('VODKA', 'Licores por botella', 'botella', 25.4, 55, 3),
  ('WHISKY', 'Licores por botella', 'botella', 25.4, 85, 3),
  ('Agua c/gas (pqt 15 und)', 'Bebidas sin alcohol', 'unidad', null, 1.6, 15),
  ('Agua Perkins bot/lata', 'Bebidas sin alcohol', 'unidad', null, 2.5, 6),
  ('Agua s/gas (pqt 15 und)', 'Bebidas sin alcohol', 'unidad', null, 1.2, 15),
  ('Agua Saborizada', 'Bebidas sin alcohol', 'unidad', null, 2.2, 6),
  ('Agua tonica 1.5 lt (pqt 6 und)', 'Bebidas sin alcohol', 'unidad', null, 6.5, 6),
  ('Brit Vic LATA', 'Bebidas sin alcohol', 'unidad', null, 2.8, 24),
  ('Coca 500ml', 'Bebidas sin alcohol', 'unidad', null, 2.2, 12),
  ('Coca Cola de 1.5 lt.', 'Bebidas sin alcohol', 'unidad', null, 6.0, 6),
  ('Coca SA 500ml', 'Bebidas sin alcohol', 'unidad', null, 2.2, 6),
  ('Ginger Ale 1.5Lt (pqt 6 unid)', 'Bebidas sin alcohol', 'unidad', null, 6.5, 6),
  ('Ginger Ale/Everest 500Lt', 'Bebidas sin alcohol', 'unidad', null, 2.2, 12),
  ('Inka diet', 'Bebidas sin alcohol', 'unidad', null, 2.2, 6),
  ('Inka Kola 500/600ml.', 'Bebidas sin alcohol', 'unidad', null, 2.2, 12),
  ('Limonada/Maracuya Jarra', 'Bebidas sin alcohol', 'unidad', null, 5.0, 0),
  ('Limonada/Maracuya Vaso', 'Bebidas sin alcohol', 'unidad', null, 1.5, 0),
  ('Red Bull', 'Bebidas sin alcohol', 'unidad', null, 5.5, 12),
  ('Corona bt PERSONAL 305ml', 'Cerveza', 'unidad', null, 4.2, 12),
  ('Pilsen bt y lata PERSONAL 305/355 ml', 'Cerveza', 'unidad', null, 3.1, 24),
  ('Cerveza negra bt personal 305ml', 'Cerveza', 'unidad', null, 3.3, 12),
  ('Cuzqueña/Pilsen trigo bt PERSONAL 310ml', 'Cerveza', 'unidad', null, 3.4, 12),
  ('Stella/Heineken bt PERSONAL 330ml', 'Cerveza', 'unidad', null, 4.0, 12),
  ('Algarronina', 'Mixers, modificadores y saborizantes', 'onza', null, 0.9, 16),
  ('Amargo de Angostura', 'Mixers, modificadores y saborizantes', 'onza', null, 4.5, 2),
  ('Aperol 075', 'Mixers, modificadores y saborizantes', 'onza', null, 2.4, 25),
  ('Durazno lt', 'Mixers, modificadores y saborizantes', 'unidad', null, 9.0, 2),
  ('Icehot frutos rojos', 'Mixers, modificadores y saborizantes', 'unidad', null, 3.5, 4),
  ('Jarabe de Goma/Granadina', 'Mixers, modificadores y saborizantes', 'onza', null, 0.5, 30),
  ('Jugo Naranja lt', 'Mixers, modificadores y saborizantes', 'onza', null, 0.35, 34),
  ('Piña lata', 'Mixers, modificadores y saborizantes', 'unidad', null, 8.5, 2),
  ('ARANDANOS/fresas', 'Abarrotes', 'unidad', null, 0.3, 30),
  ('AZUCAR', 'Abarrotes', 'kilo', null, 4.2, 2),
  ('CANELA/CLAVO/ANIS/Hierbas aromatizantes', 'Abarrotes', 'unidad', null, 0.5, 10),
  ('CAFÉ', 'Abarrotes', 'gramo', null, 0.08, 250),
  ('KION', 'Abarrotes', 'unidad', null, 0.4, 10),
  ('LECHE EVAPORADA', 'Abarrotes', 'onza', null, 0.25, 24),
  ('LIMON', 'Abarrotes', 'unidad', null, 0.25, 60),
  ('MARACUYA', 'Abarrotes', 'unidad', null, 0.6, 10),
  ('NARANJA', 'Abarrotes', 'unidad', null, 0.5, 10),
  ('PIÑA', 'Abarrotes', 'unidad', null, 4.5, 2),
  ('crema de coco', 'Salsas', 'gota', null, 0.05, 200),
  ('CIGARROS x10', 'Otros', 'unidad', null, 9.0, 5),
  ('CIGARROS x20', 'Otros', 'unidad', null, 17.0, 3),
  ('DERECHO DE CORCHO', 'Otros', 'unidad', null, 0, 0),
  ('ENCENDEDOR', 'Otros', 'unidad', null, 1.0, 5),
  ('HIELO', 'Otros', 'unidad', null, 3.0, 10),
  ('TRAGOS PREPARADOS', 'Otros', 'unidad', null, 0, 0),
  ('ACEITUNAS', 'Piqueos', 'gramo', null, 0.03, 500),
  ('EMBUTIDOS', 'Piqueos', 'gramo', null, 0.05, 500),
  ('GALLETAS', 'Piqueos', 'unidad', null, 0.6, 20),
  ('MAQUIS', 'Piqueos', 'porcion', null, 2.5, 10),
  ('SNACK, CHIFLES, MANI', 'Piqueos', 'gramo', null, 0.02, 1000),
  ('QUESOS', 'Piqueos', 'gramo', null, 0.04, 500)
) as t(n, g, u, oz, costo, minimo);

-- Recetas de ejemplo (en onzas para licores; en su unidad para lo demás)
insert into public.recetas (club_id, producto_id, insumo_id, cantidad, es_ejemplo)
select 'c1000000-0000-4000-8000-000000000001', p.id, i.id, r.cant, true
from (values
  ('Bienvenido a Pimentel', 'GIN', 2), ('Bienvenido a Pimentel', 'KION', 1), ('Bienvenido a Pimentel', 'Jarabe de Goma/Granadina', 1), ('Bienvenido a Pimentel', 'LIMON', 1), ('Bienvenido a Pimentel', 'Ginger Ale/Everest 500Lt', 0.5),
  ('Sunset Beach', 'VODKA', 2), ('Sunset Beach', 'Piña lata', 0.25), ('Sunset Beach', 'crema de coco', 10),
  ('Tropicana', 'VODKA', 1.5), ('Tropicana', 'Piña lata', 0.2), ('Tropicana', 'ARANDANOS/fresas', 3), ('Tropicana', 'LIMON', 0.5), ('Tropicana', 'crema de coco', 8),
  ('Capitán', 'WHISKY', 1.5), ('Capitán', 'Cogñac', 0.5), ('Capitán', 'CAFÉ', 10),
  ('Pisco Sour', 'PISCO 0.700 lt', 3), ('Pisco Sour', 'LIMON', 2), ('Pisco Sour', 'Jarabe de Goma/Granadina', 1), ('Pisco Sour', 'Amargo de Angostura', 0.1),
  ('Chilcano', 'PISCO 0.700 lt', 2), ('Chilcano', 'Ginger Ale/Everest 500Lt', 0.5), ('Chilcano', 'LIMON', 1),
  ('Algarrobina', 'PISCO 0.700 lt', 2), ('Algarrobina', 'Algarronina', 1), ('Algarrobina', 'LECHE EVAPORADA', 2), ('Algarrobina', 'Jarabe de Goma/Granadina', 0.5), ('Algarrobina', 'CANELA/CLAVO/ANIS/Hierbas aromatizantes', 1),
  ('Gin Tonic London', 'GIN', 2), ('Gin Tonic London', 'Brit Vic LATA', 1), ('Gin Tonic London', 'LIMON', 0.5),
  ('Moscow Mule', 'VODKA', 2), ('Moscow Mule', 'Ginger Ale/Everest 500Lt', 1), ('Moscow Mule', 'LIMON', 1),
  ('Margarita', 'TEQUILA', 2), ('Margarita', 'Curasao', 1), ('Margarita', 'LIMON', 1),
  ('Negroni', 'GIN', 1), ('Negroni', 'Campari bitter', 1),
  ('Vodka Tonic', 'VODKA', 2), ('Vodka Tonic', 'Brit Vic LATA', 1),
  ('Vodka Tonic Grey Goose', 'VODKA', 2), ('Vodka Tonic Grey Goose', 'Brit Vic LATA', 1),
  ('Whisky', 'WHISKY', 2),
  ('Cuba Libre', 'RON 0.700 lt', 2), ('Cuba Libre', 'Coca 500ml', 1), ('Cuba Libre', 'LIMON', 0.5),
  ('Piña Colada', 'RON 0.700 lt', 2), ('Piña Colada', 'Piña lata', 0.25), ('Piña Colada', 'Malibu. Crema de coco con ron', 1), ('Piña Colada', 'crema de coco', 10),
  ('Daiquiri de fresa', 'RON 0.700 lt', 2), ('Daiquiri de fresa', 'ARANDANOS/fresas', 4), ('Daiquiri de fresa', 'Jarabe de Goma/Granadina', 1), ('Daiquiri de fresa', 'LIMON', 1),
  ('Daiquiri de durazno', 'RON 0.700 lt', 2), ('Daiquiri de durazno', 'Durazno lt', 0.2), ('Daiquiri de durazno', 'Jarabe de Goma/Granadina', 1), ('Daiquiri de durazno', 'LIMON', 1),
  ('Tinto de Verano', 'VINO TINTO', 4), ('Tinto de Verano', 'Ginger Ale/Everest 500Lt', 0.5), ('Tinto de Verano', 'LIMON', 0.5),
  ('Aperol', 'Aperol 075', 3), ('Aperol', 'ESPUMANTE', 3), ('Aperol', 'Agua c/gas (pqt 15 und)', 0.3),
  ('Baileys', 'Bailys', 2),
  ('Disaronno', 'Amaretto Disaronno', 2),
  ('Hendrick''s', 'GIN', 25.4), ('Bombay Sapphire', 'GIN', 25.4), ('Bombay Bramble', 'GIN', 25.4), ('Tanqueray Royal Berry 700 ml', 'GIN', 23.67),
  ('Gran Cruz', 'PISCO 0.700 lt', 23.67), ('Portón', 'PISCO 0.700 lt', 23.67), ('4 Gallos Quebranta', 'PISCO 0.700 lt', 23.67),
  ('Bacardí Añejo', 'RON 0.700 lt', 23.67), ('Diplomático Mantuano', 'RON 0.700 lt', 23.67), ('Diplomático Reserva Exclusiva', 'RON 0.700 lt', 23.67),
  ('Jimador', 'TEQUILA', 25.4), ('Patrón Silver', 'TEQUILA', 25.4), ('Patrón Reposado', 'TEQUILA', 25.4), ('Patrón Añejo', 'TEQUILA', 25.4),
  ('Absolut', 'VODKA', 25.4), ('Grey Goose 750 ml', 'VODKA', 25.4),
  ('Old Parr 750 ml', 'WHISKY', 25.4), ('Chivas 13 años', 'WHISKY', 25.4), ('Chivas XV', 'WHISKY', 25.4), ('Johnnie Walker Swing', 'WHISKY', 25.4),
  ('Johnnie Walker Gold Label', 'WHISKY', 25.4), ('Johnnie Walker Blue', 'WHISKY', 25.4),
  ('Cerveza', 'Pilsen bt y lata PERSONAL 305/355 ml', 1),
  ('Gaseosa', 'Inka Kola 500/600ml.', 1), ('Agua', 'Agua s/gas (pqt 15 und)', 1), ('Red Bull', 'Red Bull', 1),
  ('Agua tónica lata (Britvic)', 'Brit Vic LATA', 1), ('Agua tónica botella 1.5 L', 'Agua tonica 1.5 lt (pqt 6 und)', 1),
  ('Ginger 1.5 L', 'Ginger Ale 1.5Lt (pqt 6 unid)', 1), ('Coca-Cola 1.5 L', 'Coca Cola de 1.5 lt.', 1),
  ('Hielera', 'HIELO', 1), ('Cigarros x10', 'CIGARROS x10', 1), ('Derecho de corcho', 'DERECHO DE CORCHO', 1)
) as r(prod, ins, cant)
join public.productos p on p.nombre = r.prod and p.club_id = 'c1000000-0000-4000-8000-000000000001'
join public.insumos i on i.nombre = r.ins and i.club_id = 'c1000000-0000-4000-8000-000000000001';

-- Proveedores reales del club
insert into public.proveedores (club_id, nombre, rubro) values
  ('c1000000-0000-4000-8000-000000000001', 'La Taberna', 'Licores'),
  ('c1000000-0000-4000-8000-000000000001', 'Backus', 'Cervezas'),
  ('c1000000-0000-4000-8000-000000000001', 'Empresa Comercializadora de Bebidas', 'Gaseosas y aguas'),
  ('c1000000-0000-4000-8000-000000000001', 'Donofrio', 'Helados'),
  ('c1000000-0000-4000-8000-000000000001', 'Ms Paleta', 'Helados'),
  ('c1000000-0000-4000-8000-000000000001', 'Metro', 'Supermercado'),
  ('c1000000-0000-4000-8000-000000000001', 'Tottus', 'Supermercado'),
  ('c1000000-0000-4000-8000-000000000001', 'MP Fares Insumos Institucional', 'Insumos'),
  ('c1000000-0000-4000-8000-000000000001', 'Makro', 'Mayorista'),
  ('c1000000-0000-4000-8000-000000000001', 'Soluciones de Limpieza B y G', 'Limpieza');

-- ---------------------------------------------------------------------
-- Canchas y ambientes (tarifas reales, sin IGV)
-- ---------------------------------------------------------------------
insert into public.canchas (club_id, nombre, deporte, reservable, orden) values
  ('c1000000-0000-4000-8000-000000000001', 'Tenis 1', 'tenis', true, 1),
  ('c1000000-0000-4000-8000-000000000001', 'Tenis 2', 'tenis', true, 2),
  ('c1000000-0000-4000-8000-000000000001', 'Básquet', 'basquet', false, 3);

insert into public.ambientes (id, club_id, nombre, descripcion, solo_temporada_baja, es_adicional, grupo, orden) values
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'Salón principal', 'El salón para matrimonios, quinceañeros y eventos grandes.', false, false, 'salon', 1),
  ('a1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'Salón principal 1/2', 'La mitad del salón principal.', false, false, 'salon', 2),
  ('a1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001', 'Salón principal 1/3', 'Un tercio del salón principal.', false, false, 'salon', 3),
  ('a1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000001', 'Rincón parrillero', 'Parrilla y mesas al aire libre.', false, false, 'parrilla', 4),
  ('a1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000001', 'Rincón parrillero + jardín', 'La parrilla con el jardín para más invitados.', false, false, 'parrilla', 5),
  ('a1000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000001', 'Adicional cocina (rincón parrillero)', 'Uso de cocina para el rincón parrillero.', false, true, null, 6),
  ('a1000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000001', 'Piscina', 'Solo en temporada baja.', true, false, 'piscina', 7),
  ('a1000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000001', 'Deck', 'Terraza frente al mar. Tarifa por confirmar.', false, false, 'deck', 8);

insert into public.tarifas_ambiente (club_id, ambiente_id, tipo_cliente, precio, garantia, nota)
select 'c1000000-0000-4000-8000-000000000001', ('a1000000-0000-4000-8000-00000000000' || a)::uuid, t, p, g, n
from (values
  (1, 'socio', 1500, 1500, null), (1, 'no_socio', 3000, 1500, null), (1, 'institucion', 3500, 1500, null),
  (2, 'socio', 700, null, 'Tarifa solo para socios'), (2, 'no_socio', null, null, 'Por confirmar'), (2, 'institucion', null, null, 'Por confirmar'),
  (3, 'socio', 350, null, 'Tarifa solo para socios'), (3, 'no_socio', null, null, 'Por confirmar'), (3, 'institucion', null, null, 'Por confirmar'),
  (4, 'socio', 400, 1000, null), (4, 'no_socio', 700, 1000, null), (4, 'institucion', 1000, 1000, null),
  (5, 'socio', 600, 1500, null), (5, 'no_socio', 1200, 1500, null), (5, 'institucion', 2000, 1500, null),
  (6, 'socio', 400, null, null), (6, 'no_socio', 400, null, null), (6, 'institucion', 400, null, null),
  (7, 'socio', 500, null, 'Solo temporada baja'), (7, 'no_socio', null, null, 'Por confirmar'), (7, 'institucion', null, null, 'Por confirmar'),
  (8, 'socio', null, null, 'Por confirmar'), (8, 'no_socio', null, null, 'Por confirmar'), (8, 'institucion', null, null, 'Por confirmar')
) as x(a, t, p, g, n);
