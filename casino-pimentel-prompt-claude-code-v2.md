Eres el equipo de diseño e ingeniería de Luvio Studio. Vas a construir, de forma autónoma y de principio a fin, la plataforma completa del CASINO DE PIMENTEL (club social de playa en Pimentel, Chiclayo, Perú): web pública del club + panel de administración + tablet de barra + tablet de portería con asistencia del personal + app del socio + notificaciones + reporte diario, todo sobre Supabase y publicado en Netlify.

Es UN SOLO SISTEMA con una sola base de datos y un solo inicio de sesión. Nada de "un sistema para entrar y otro para otra cosa". La web pública es la puerta de entrada: desde ella se llega a la app ("Soy socio") y lee los mismos datos (avisos, ambientes, horarios).

====================================================================
PASO 0 · CUENTAS (ya decidido, no me preguntes)
====================================================================
- Supabase: crea un proyecto NUEVO llamado "casino-pimentel" en la organización de pago (plan Pro), la que tiene más proyectos. Lista las organizaciones con el MCP de Supabase y elige esa. Región: la más cercana a Perú disponible (São Paulo, sa-east-1).
- Netlify: crea un sitio NUEVO llamado "casino-pimentel" en mi equipo.
Trabaja sin detenerte hasta terminar el PASO 10. No estoy frente a la computadora. Si algo depende de mí (claves, datos reales, logo oficial), déjalo funcionando con datos de ejemplo, anótalo en PENDIENTES.md y sigue.

====================================================================
REGLA DE CALIDAD (NO NEGOCIABLE): SKILLS DE DISEÑO OBLIGATORIAS
====================================================================
Antes de diseñar o construir CADA parte, carga con la herramienta Skill la skill que corresponde y aplícala. No es opcional. Si alguna no está instalada, sigue con las demás y anótalo en PENDIENTES.md.

| Proceso | Skills que cargas y aplicas |
|---|---|
| Definir para quién es cada pantalla (socios adultos, personal operativo, directivos) | definicion-publico-kontrola |
| Dirección visual y sistema de diseño (tokens, color, tipografía, componentes) | frontend-design, impeccable, ui-ux-pro-max (usa su buscador y su checklist de references/pro-rules.md), emil-design-eng, apple-design |
| Cada componente (botones, pills, tarjetas, hojas, inputs, tablas) | emil-design-eng + impeccable |
| Hojas inferiores, gestos, springs, tipografía óptica | apple-design |
| Cada animación nueva | animate |
| Barrido por pantalla buscando dónde falta movimiento | find-animation-opportunities |
| Que todo vaya a 60 fps (solo transform y opacity) | animation-performance |
| Auditoría de movimiento al cerrar cada pantalla | review-animations e improve-animations |
| Nombrar un efecto | animation-vocabulary |
| Base de datos, RLS, triggers, cron, Edge Functions, Auth, Storage, Realtime | supabase + supabase-postgres-best-practices |
| Gráficos, contadores y tarjetas de indicadores del panel | dataviz (si no está, ui-ux-pro-max --domain chart) |
| Textos de interfaz, botones, mensajes vacíos y de error | copywriting |
| Ayudas en pantalla y primer uso para socios mayores y personal no técnico | demo-comprensible-kontrola |
| Web pública: secciones, textos y datos estructurados para Google | frontend-design, impeccable, copywriting, schema |
| Datos extremos (nombres larguísimos, 0 y 500 registros, montos enormes) | break-ui |
| Revisión final de diseño y accesibilidad | impeccable (modo auditoría) + checklist de ui-ux-pro-max |

Abre cada pantalla en el navegador (servidor local) y revísala con capturas en celular (390 px), tablet (820 px) y escritorio (1440 px) antes de darla por terminada. Corrige lo que veas. Haz un commit claro al terminar cada paso.

====================================================================
CONTEXTO DEL CLUB (dato real: no lo inventes ni lo cambies)
====================================================================
- Casino de Pimentel: asociación civil, club social de socios frente al malecón. Calle Manuel Seoane 725, Cercado, Pimentel, Chiclayo. Telf. 074-425244 · Cel. 920 349 713.
- Directiva y usuarios clave: Payo (presidente), Lalo (vicepresidente), Sebastián (directivo, a cargo de sistemas), Julita (administración: caja de oficina, compras, cuotas).
- Socios: 265 titulares activos. Cada titular puede tener esposa e hijos asociados. Cuota de mantenimiento mensual (ejemplo: S/ 80). Hoy el padrón (la lista oficial de socios) está en Excel: N°, apellidos y nombres, cuota de ingreso y cuotas de mantenimiento mes a mes marcadas por color.
- Una sola puerta de ingreso. Hoy se anota nombre, DNI y hora, y se cobra con talonario "Ingreso Portería" numerado.
- Invitados: máximo 5 por socio por día. Un mismo invitado (por DNI) no puede pasar de 3 visitas al mes. Ingreso al club S/ 10; ingreso a piscina S/ 20; si el invitado solo va al comedor, entra libre.
- Canchas: 2 de tenis (las únicas que se reservan) y 1 de básquet (libre, no se reserva). Horario 6:00 a 22:00. Tenis: turnos de 1 hora; un miembro puede reservar 1 vez por día y 3 veces por semana; pueden reservar el titular, la esposa y los hijos menores de 25 años.
- Bar "El Astillero": 2 barras, exclusivas del club. La cocina y el comedor NO los maneja el club (quedan fuera del sistema). Pagos en barra: efectivo, Yape con QR, tarjeta y "a cuenta del socio". Hoy la barra se cierra una vez al mes (casi todo es Visa): el sistema debe cerrar cada día.
- Control actual de barra (replícalo y mejóralo): kardex por período con inicio (botella y onzas), ingresos, ventas (botella y vaso), cortesía o insumo, saldo (botella y onzas) y total de venta; resumen por efectivo, tarjeta y "pago por administración". Comanda en papel con mesa, mesero, fecha, n° de personas, cantidad, concepto, unitario, total y cliente.
- Caja de oficina (caja chica): la cierra Julita cada dos días. Movimientos con fecha, n° de boleta o recibo, descripción, ingreso o egreso y saldo. Ejemplos reales de conceptos: compras de mantenimiento (sika, tubos), bidones de agua, almuerzos de eventos, cuotas de mantenimiento de socios, mantenimiento de cámaras, recibo de luz.
- Ventas de referencia: barras S/ 100 a S/ 300 por día; portería unos S/ 50 por día; más altas sábado y domingo.
- Compras: 1 vez al mes (2 en temporada alta). Proveedores: La Taberna, Backus, Empresa Comercializadora de Bebidas, Donofrio, Ms Paleta, Metro, Tottus, MP Fares Insumos Institucional, Makro, Soluciones de Limpieza B y G.
- Personal: unos 10-11 en planilla y 10 a 30 por recibo por honorarios (sube en verano).
- Alquiler de ambientes (se alquilan, no se reservan; tarifas sin IGV; columnas socio / no socio / instituciones y empresas / garantía):
  - Rincón parrillero: 400 / 700 / 1,000 / 1,000
  - Rincón parrillero + jardín: 600 / 1,200 / 2,000 / 1,500
  - Salón principal: 1,500 / 3,000 / 3,500 / 1,500
  - Adicional cocina (rincón parrillero): 400 / 400 / 400 / —
  - Salón principal 1/2: 700 (socio) · Salón principal 1/3: 350 (socio)
  - Piscina: 500 (socio), solo en temporada baja
  - Deck: tarifa por confirmar
  - Reglas: cuidar los ambientes; quien alquila trae a sus proveedores libremente; se le da el día anterior para decorar.

CARTA DE EL ASTILLERO (precios reales en soles):
- Gin (botella): Hendrick's 170 · Bombay Sapphire 120 · Bombay Bramble 140 · Tanqueray Royal Berry 700 ml 130
- Pisco: Gran Cruz 120 · Portón 120 · 4 Gallos Quebranta 80
- Ron: Bacardí Añejo 70 · Diplomático Mantuano 180 · Diplomático Reserva Exclusiva 240
- Tequila: Jimador 120 · Patrón Silver 240 · Patrón Reposado 260 · Patrón Añejo 390
- Vodka: Absolut 80 · Grey Goose 750 ml 220
- Whisky: Old Parr 750 ml 120 · Chivas 13 años 120 · Chivas XV 230 · Johnnie Walker Swing 250 · Johnnie Walker Gold Label 550 · Johnnie Walker Blue 1,600
- Complementos: Cervezas 6 · Gaseosas 4 · Agua 3 · Red Bull 10 · Agua tónica lata (Britvic) 6 · Agua tónica botella 1.5 L 15 · Ginger 1.5 L 15 · Coca-Cola 1.5 L 12 · Hielera 5 · Cigarros x10 15 · Derecho de corcho 20
- Tragos de autor: Bienvenido a Pimentel 15 (sirope de hierba buena y kion, gin, limón, ginger ale) · Sunset Beach 15 (piña, Smirnoff spicy, coco) · Tropicana 15 (piña, fresa, vodka, vermut rosso, coco, limón) · Capitán 20 (whisky, crema de cognac, café, vermut rosso)
- Tragos preparados: Moscow Mule 15 · Margarita 20 · Vodka Tonic 12 · Vodka Tonic Grey Goose 25 · Negroni 20 · Gin Tonic London 15 · Whisky 15 · Cuba Libre 12 · Chilcano 12 · Algarrobina 15 · Pisco Sour 15 · Piña Colada 15 · Daiquiri fresa o durazno 15 · Tinto de Verano 15 · Aperol 18 · Baileys 12 · Disaronno 15
- Precios por confirmar (la carta impresa y la lista interna no coinciden): Margarita 20 o 18, Negroni 20 o 18, Sunset Beach 15 o 12. Usa los de la carta impresa y márcalos "por confirmar".
- Los precios cambian según el evento: cada producto tiene precio normal y puede tener precio de evento.

INSUMOS: la lista completa está en ./assets-cliente/RELACION_DE_INSUMOS_BARRAS_OCT_2026.xlsx (licores por botella, bebidas sin alcohol, cervezas, mixers en onzas o unidades, abarrotes en kilos, gramos o unidades, otros, piqueos en gramos o porciones). Cárgala tal cual con su unidad. En ./assets-cliente/INFORMACION_SISTEMA.pdf están la carta, los formatos actuales y las tarifas: úsalo como referencia visual.

DATOS DE EJEMPLO: costo de compra de cada insumo, recetas de cada trago en onzas, stock inicial, personal, turnos, cuota de ingreso, socios y familiares todavía no los tengo. Créalos realistas y márcalos SIEMPRE como ejemplo (columna es_ejemplo = true y etiqueta discreta "Dato de ejemplo" en pantalla). Usa 1 botella de 750 ml = 25.4 oz. Socios: crea 60 socios ficticios con familias (nunca uses nombres reales de socios; el padrón real se importa después con el importador del PASO 4). Nunca inventes testimonios ni cifras del club.

====================================================================
DIRECCIÓN VISUAL (APROBADA, respétala)
====================================================================
Concepto: "Malecón de Pimentel": cielo claro, mar azul y arena del muelle. Luminoso, amable y muy fácil de leer. Nada de fondos negros u oscuros. Nada de rosados ni salmón.

- Colores (tokens semánticos; nunca hex sueltos en componentes):
  - Fondo cielo #F6FAFD · superficie blanca #FFFFFF · superficie celeste #E8F2FA (tarjetas secundarias, inputs, filas alternas)
  - Azul Pimentel #1B4F8F (primario: header, botones principales, títulos; es el azul del logo del club) · azul activo #2A6BC0 (hover, seleccionado, enlaces) · tinta #0E2236 (texto principal) · texto secundario #4A5B6E
  - Arena #EADFCB y arena oscura #8C6D45 (solo para el módulo de barra El Astillero y detalles cálidos)
  - Sol #F4B53F (solo destellos: insignias de "nuevo", pendientes)
  - Estados, siempre con texto además del color: al día / presente / pagado #1E9A68 · por vencer / tardanza #C98410 · deuda / falta / faltante #D14343
  - Contraste AA mínimo en todo (4.5:1 en texto). Verifícalo.
- Tipografía (autoalojada en woff2):
  - Títulos y cifras grandes: Outfit 700/800, interlineado ajustado.
  - Texto e interfaz: Figtree 400/500/600.
  - Números de montos, horas y tablas con font-variant-numeric: tabular-nums (si Figtree no lo soporta bien, usa Outfit para cifras).
  - Escala pensada para socios mayores: texto base 17 px en celular; títulos de pantalla 32-40 px; cifras protagonistas (deuda, total del día) 44-56 px; nada por debajo de 14 px.
- Formas: TODO en pill muy redondeado (radio 999 px) en botones, chips, filtros, pestañas, estados y turnos · tarjetas con radio 28 px · inputs con radio 18 px · alto mínimo de botones 52 px y áreas táctiles de 48 px · sombras casi invisibles con tinte azul · íconos de línea (Lucide) con etiqueta de texto; nunca emojis como íconos.
- Movimiento (Emil Kowalski + Apple): 150-250 ms en interfaz, curvas ease-out propias, springs suaves en hojas inferiores, paneles y menús; las pills cambian de tamaño con fluidez al seleccionarse; los contadores del panel suben al cargar; feedback visible en cada acción (cobrar, marcar, reservar). Respeta prefers-reduced-motion. Anima solo transform y opacity.
- Logo: no tengo el logo oficial en buena calidad. Usa un wordmark de texto "Casino de Pimentel" en Outfit con un ícono simple de ola, y anótalo en PENDIENTES.md para reemplazarlo. El módulo de barra lleva el nombre "El Astillero" en su encabezado.
- MOMENTO FIRMA (app del socio): el carnet digital. Tarjeta grande con degradado cielo-mar suave, nombre, foto, tipo de miembro y una pill de estado ("Al día" en verde o "Debes S/ 160" en rojo). Al tocarla, se voltea con un spring y muestra el QR a pantalla completa con brillo máximo y un anillo que marca los segundos hasta que el QR se renueva.

====================================================================
PASO 1 · ESTRUCTURA
====================================================================
Un solo repositorio y un solo sitio de Netlify con dos partes que comparten el sistema de diseño y la base de datos:
- web/ → WEB PÚBLICA en Astro (páginas estáticas, rápidas y bien posicionadas en Google). Se publica en la raíz "/".
- app/ → la APP en React + Vite + TypeScript, como PWA instalable, servida en "/app". Librería Motion para springs y transiciones de layout. Supabase JS. Lector de QR con la cámara (BarcodeDetector nativo y respaldo con una librería ligera como jsQR).
- design/ → tokens (CSS variables) y fuentes compartidas por web/ y app/. Un cambio de color o de tipografía se hace en un solo lugar.
- La app tiene un solo login (/app/ingresar). Tras iniciar sesión, enruta por rol:
  - /app/admin → panel (administración y directivos)
  - /app/barra → tablet de barra
  - /app/porteria → tablet de portería (incluye el modo asistencia)
  - /app/socio → app del socio
- Carpetas de la app: src/modulos/{admin,barra,porteria,socio}, src/lib (supabase, roles, formatos de fecha y moneda en es-PE y hora de Lima). Base de datos: supabase/migrations, supabase/functions, supabase/seed.
- netlify.toml que construye ambas partes y las une en un solo despliegue (redirects para que /app/* caiga en la SPA).
- Archivos de control: DESIGN.md, PENDIENTES.md y, al final, RESUMEN.md.
- Inicializa git y haz commit.

====================================================================
PASO 2 · SISTEMA DE DISEÑO
====================================================================
Antes de las pantallas, construye y documenta en DESIGN.md los tokens (color, tipografía, espaciado en múltiplos de 4/8, radios, sombras, curvas y duraciones) y todos los componentes compartidos: botones (principal, secundario, fantasma, ícono con etiqueta), pills, chips y filtros, pestañas en pill, tarjetas, tarjeta de indicador con contador animado, inputs con etiqueta visible y estados (foco, error, deshabilitado, cargando), teclado numérico grande (PIN y montos), buscador, lista con avatar, hoja inferior (móvil), panel lateral (escritorio), diálogo de confirmación, toasts, estado vacío que enseña qué hacer, skeletons, pill de estado (al día / por vencer / deuda / presente / tardanza / falta), calendario de turnos en pills, lector de QR, tarjeta de carnet. Crea la ruta interna /app/sistema que muestre todo para revisarlo.

====================================================================
PASO 3 · BASE DE DATOS EN SUPABASE (todo queda registrado)
====================================================================
Usa el proyecto "casino-pimentel" creado en el PASO 0. Todo por migraciones versionadas.

Pensado para vender a otros clubes: TODAS las tablas llevan club_id, y TODAS las reglas del club (invitados por día, visitas por mes, tarifas, horarios, reglas de tenis, cuota de mantenimiento, tolerancia de tardanza, hora del reporte) viven en la tabla config del club, nunca escritas en el código.

Tablas mínimas:
- Organización: clubes, config (reglas en JSON validado), usuarios_staff (vinculado a auth.users, rol: presidente, directivo, admin, barra, porteria), dispositivos (tablets registradas).
- Socios: socios (titular: n° de socio, nombres, DNI, celular, correo, fecha de ingreso, estado, foto), miembros (esposa e hijos con DNI, fecha de nacimiento y parentesco; también pueden tener carnet), cuotas (periodo, monto, vencimiento, estado), pagos (medio, monto, constancia en Storage, estado por validar / validado / rechazado, validado_por), cuenta_socio (cargos y abonos: consumos de barra a cuenta, cuotas, alquileres).
- Portería: invitados (DNI, nombre), ingresos (quién entró: socio, miembro o invitado; socio anfitrión; tipo de ingreso club / piscina / comedor; cobro; hora; usuario de portería), salidas opcionales.
- Personal: personal (nombre, DNI, área, cargo, tipo planilla o recibo, PIN con hash), turnos (por persona y día), marcaciones (entrada, salida, inicio y fin de refrigerio, foto en Storage, dispositivo, hora).
- Tenis: canchas, reservas_cancha (cancha, fecha, hora, miembro, estado).
- Ambientes: ambientes, tarifas_ambiente, alquileres (ambiente, fecha, cliente, tipo de cliente, tarifa, garantía, IGV, estado, día de decoración bloqueado).
- Barra: barras, categorias, productos (carta, precio normal y precio de evento), insumos (unidad, costo), recetas (producto → insumos y cantidades), proveedores, compras y compra_items, movimientos_stock (el kardex: ingreso, venta, cortesía, ajuste por conteo, merma), conteos_fisicos, comandas y comanda_items (barra, mesa, mesero, cliente, estado), cobros (medio, monto), cortesias (motivo y quién autoriza), cierres_barra (por día y barra: esperado vs contado por medio de pago, diferencia).
- Caja de oficina: caja_movimientos (fecha, n° de comprobante, descripción, categoría, ingreso o egreso, saldo).
- Comunicación: avisos (título, texto, foto, fecha de publicación y de expiración, fijado, visible en la web pública sí/no), solicitudes_alquiler (desde la web), notificaciones (para quién, tipo, leída), suscripciones_push.
- Registro total: auditoria (tabla, id, acción, antes, después, usuario, fecha y hora) llenada por un trigger genérico en TODAS las tablas; accesos (inicio y cierre de sesión, dispositivo, éxito o fallo).

Reglas:
- RLS en todas las tablas: el socio solo ve lo suyo y lo de su familia; barra y portería solo lo que operan; directivos ven todo pero solo admin edita configuración; nadie borra (borrado lógico con motivo).
- Funciones en la base (RPC) para la lógica crítica: validar_ingreso (QR o búsqueda), registrar_invitado (aplica 5 por día y 3 por mes y responde con un mensaje claro si se pasa), reservar_tenis (aplica todas las reglas, sin doble reserva), cerrar_comanda (descuenta stock por receta en onzas y carga a la cuenta del socio si corresponde), cerrar_barra, generar_cuotas_mes.
- pg_cron: generar cuotas el día 1 de cada mes; marcar cuotas vencidas; disparar el reporte diario.
- Auth: personal con correo y clave. Socios con DNI + PIN de 6 dígitos (por debajo, un correo técnico derivado del DNI); el primer ingreso obliga a cambiar el PIN. Bloqueo tras 5 intentos fallidos.
- Storage: fotos de socios, fotos de marcación (privadas), constancias de pago (privadas), fotos de avisos (públicas).
- Realtime: el panel de Hoy se actualiza solo.
- Seed con todos los datos de ejemplo y la carta real. Pruebas de las RLS y de cada RPC (casos que deben pasar y casos que deben fallar) y córrelas.

====================================================================
PASO 4 · PANEL DE ADMINISTRACIÓN (/app/admin): Julita, Payo, Lalo, Sebastián
====================================================================
Diseñado primero para el celular de Payo y luego para la computadora de Julita. Cada pantalla tiene una línea que explica para qué sirve.
Navegación: barra lateral en pill (escritorio) / 5 pestañas abajo (celular: Hoy · Socios · Barra · Alertas · Más). Buscador global siempre visible (socio por nombre, n° o DNI).
1. Hoy: saludo y frase del día ("Hoy entraron 84 personas y la barra vendió S/ 640"); contadores animados (ventas por barra, caja de oficina, personas dentro, invitados, personal presente y tardanzas, reservas de tenis, pagos por validar); "Requiere tu atención" (faltantes de barra, pagos por validar, socios morosos que ingresaron, alquileres por confirmar).
2. Socios: lista con pill de estado y filtros (al día, por vencer, con deuda); ficha con foto, familia, carnet, cuotas mes a mes en pills de colores (como su Excel, pero claro), cuenta del socio, ingresos y reservas, notas. Acciones: registrar pago, validar constancia, reenviar PIN, desactivar. Importador del padrón desde Excel con vista previa y validación.
3. Cobranza: morosos por meses de deuda, total por cobrar, recordatorio por notificación.
4. Barra: carta (precio normal y de evento, activar "modo evento"), insumos y recetas, compras por proveedor, kardex por insumo (inicio + compras − ventas − cortesías = saldo teórico; conteo físico → diferencia en botellas y onzas), cierres diarios por barra, cortesías con autorizador.
5. Caja de oficina: movimientos con comprobante y categoría, saldo en vivo, cierre cada dos días, exportar a Excel.
6. Portería: registro de ingresos por día y hora, invitados y su contador mensual, cobros.
7. Personal: fichas, turnos por área, asistencia del día, tardanzas, faltas y horas trabajadas, reporte mensual para pago (planilla y recibo separados), foto de cada marcación.
8. Tenis: grilla de las 2 canchas por día, reservar por un socio, bloquear horarios (torneos, mantenimiento).
9. Ambientes: calendario por ambiente, alquileres con tarifa automática según tipo de cliente, garantía, IGV y día de decoración.
10. Avisos: publicar noticias del club con foto (se ven en la app del socio y llegan como notificación).
11. Reportes: ventas, márgenes por trago, productos más vendidos, ingresos de portería, morosidad, asistencia; por día, semana, mes y temporada; exportar a Excel.
12. Registro: toda la auditoría y los accesos con filtros (quién, qué, cuándo).
13. Configuración: reglas del club, usuarios y roles, tablets registradas, horarios, tarifas, hora del reporte diario.

====================================================================
PASO 5 · TABLET DE BARRA (/app/barra): El Astillero
====================================================================
Pensada para una tablet en la barra, de pie, con prisa y poca luz. Cuatro toques máximo para cobrar.
- Inicio de turno: elegir barra y mesero.
- Venta: productos en pills grandes por categoría (Tragos de autor, Preparados, Botellas, Cervezas, Gaseosas y agua, Otros); comanda con mesa, cliente (externo o socio: buscar o escanear su QR); cortesía con motivo y autorización del encargado.
- Cobro: efectivo (con vuelto), Yape, tarjeta o a cuenta del socio. Ticket en pantalla.
- Conteo de inventario rápido (botellas y onzas) al cerrar.
- Cierre del día: esperado vs contado por medio de pago, con la diferencia resaltada.

====================================================================
PASO 6 · TABLET DE PORTERÍA (/app/porteria) + ASISTENCIA
====================================================================
- Pantalla principal con dos botones enormes: "Escanear carnet" y "Buscar socio".
- Al escanear (QR rotativo firmado que vence cada 30 segundos, para que no sirva una captura de pantalla) o buscar: tarjeta grande con foto, nombre, tipo de miembro, pill de estado (al día / deuda) y familia. Botón "Registrar ingreso".
- "+ Invitado": DNI y nombre, tipo de ingreso (club S/ 10 · piscina S/ 20 · comedor libre), cobro. El sistema bloquea solo si el socio ya llevó 5 invitados hoy o si el invitado ya vino 3 veces este mes, con un mensaje claro.
- Lista "Dentro del club hoy" y ticket digital en lugar del talonario.
- Si el socio tiene deuda: se muestra con claridad y se avisa a administración; NO se bloquea el ingreso (la regla de morosos queda en config para que el club decida).
- Modo asistencia (pestaña aparte, tipo kiosco): el trabajador escribe su DNI o PIN en un teclado numérico grande, la tablet toma una foto automática y registra entrada, salida o refrigerio, con saludo y la hora. Muestra "Llegaste 12 min tarde" si corresponde.

====================================================================
PASO 7 · APP DEL SOCIO (/app/socio)
====================================================================
Diseñada primero para el celular de un socio de 60 años: letras grandes, una acción por pantalla, nada escondido.
Pestañas abajo: Inicio · Carnet · Mi cuenta · Reservas · Avisos.
1. Inicio: saludo, pill de estado de cuenta, próxima reserva, último aviso.
2. Carnet: el momento firma (ver dirección visual), con el carnet de cada miembro de la familia.
3. Mi cuenta: deuda total grande, cuotas mes a mes (pagado / pendiente / vencido), próximo vencimiento, consumos a cuenta en la barra con detalle, historial de pagos. "Pagar": muestra el QR de Yape del club (dato pendiente: usa una imagen de ejemplo), sube la constancia y queda "por validar" hasta que Julita la valide.
4. Reservas: tenis (elige día y horario libre en pills; aplica las reglas y explica por qué no puede si no corresponde) · invitados (registrarlos antes de llegar, ver cuántos le quedan hoy y cuántas visitas le quedan al invitado este mes) · ambientes (ver disponibilidad y tarifas, y solicitar alquiler).
5. Avisos: noticias del club con foto.
6. Perfil: familia, cambiar PIN, activar notificaciones.
Primer ingreso guiado de 3 pantallas (demo-comprensible-kontrola): cómo entrar, cómo mostrar el carnet, cómo reservar.

====================================================================
PASO 7B · WEB PÚBLICA, VERSIÓN BASE (web/)
====================================================================
Esta es la versión base: estructura completa, contenido real y el sistema de diseño aplicado con buen nivel. El diseño "wow" de la web (momento firma, fotografía, SEO avanzado) se hace después con un prompt dedicado, así que deja el código ordenado por secciones para poder rediseñarlas una por una.
- Header en pill: wordmark · El club · Instalaciones · Tenis · Ambientes · Avisos · Contacto · botón "Soy socio" (lleva a /app/ingresar). En celular, menú en hoja inferior.
- Inicio: hero "Tu club frente al mar de Pimentel" con imagen de ejemplo del malecón (marcada "Foto de ejemplo", sin fotos de banco con personas presentadas como socios), bajada corta, pills "Soy socio" y "Alquila un ambiente". Bloques: qué ofrece el club (piscina, tenis, básquet, El Astillero, ambientes para eventos), último aviso, cómo llegar.
- El club: historia breve (dato confirmado: club social tradicional de Pimentel; lo demás como "[texto por confirmar con el club]").
- Instalaciones: tarjetas por espacio con horario.
- Tenis: 2 canchas, horario y "Reserva desde la app del socio".
- Ambientes: salón principal, rincón parrillero, jardín, deck y piscina (temporada baja); capacidad "[por confirmar]"; botón "Consultar disponibilidad" que abre un formulario (nombre, celular, fecha, ambiente, tipo de cliente) que guarda en la tabla solicitudes_alquiler y notifica a administración. No muestres tarifas en la web: "Consulta tarifas para socios y no socios".
- Avisos: lee los avisos marcados como públicos desde Supabase (los mismos que publica Julita en el panel).
- Contacto: dirección, teléfonos, mapa (enlace a Google Maps), horario y WhatsApp del club "[número por confirmar]".
- Aclara con elegancia en el pie "Club social privado" (la gente en Google lo confunde con un casino de juego).
- SEO base: título y descripción por página, datos estructurados SportsClub/LocalBusiness, Open Graph, sitemap.xml y robots.txt.

====================================================================
PASO 8 · NOTIFICACIONES Y REPORTE DIARIO
====================================================================
- Notificaciones push en el celular (Web Push con VAPID, desde una Edge Function) para la app del socio y el panel. Al activar, explica en una línea que en iPhone primero hay que "Agregar a pantalla de inicio". Además, centro de notificaciones dentro de la app.
- Para Payo, Lalo, Sebastián y Julita: pago por validar, faltante en barra al cierre, cortesía fuera de lo normal, alquiler solicitado, socio con deuda que ingresó, tardanza o falta del personal, stock bajo y el reporte diario.
- Para socios: cuota por vencer y vencida, pago validado, reserva confirmada o cancelada, avisos del club.
- Reporte diario a la hora de config (por defecto 22:30, hora de Lima), por push y por Telegram: ventas por barra y medio de pago, caja de oficina, faltantes de kardex, ingresos e invitados, asistencia, reservas de mañana y morosos. Una Edge Function arma los números y, si existe ANTHROPIC_API_KEY en los secretos, Claude (modelo claude-haiku-5-5) lo redacta en 5 líneas simples y marca lo que requiere atención; si no existe, usa una plantilla fija. TELEGRAM_TOKEN y TELEGRAM_CHAT_ID en los secretos de Supabase, nunca en el código.
- WhatsApp NO se usa en esta versión. Si después se pide, será con la API oficial de WhatsApp Business: anótalo en PENDIENTES.md.

====================================================================
PASO 9 · PULIDO, PRUEBAS Y REVISIÓN FINAL
====================================================================
- Pasa find-animation-opportunities, review-animations, improve-animations y animation-performance por cada pantalla de los cuatro módulos y aplica lo que encuentres.
- break-ui en la lista de socios, la ficha, la comanda, el kardex, la grilla de tenis y el carnet (nombres larguísimos, 0 y 500 registros, deudas de 5 cifras, 40 ingresos en una hora).
- Accesibilidad con el checklist de ui-ux-pro-max: contraste AA, foco visible, etiquetas, áreas táctiles de 48 px, prefers-reduced-motion, zoom del navegador al 200 % sin romper.
- Prueba de punta a punta con el navegador, con cada rol:
  - Socio: entra con DNI y PIN, ve su deuda, sube una constancia, reserva tenis (y falla la 4.ª reserva de la semana), registra invitados y muestra el carnet.
  - Portería: escanea ese carnet desde otra pestaña, registra el ingreso y un invitado (y falla el 6.º), y marca la asistencia de un trabajador.
  - Barra: vende un Pisco Sour a cuenta del socio, una cerveza en efectivo y una cortesía, hace el conteo y cierra el día con una diferencia.
  - Admin: valida el pago, ve el faltante en el kardex, publica un aviso, revisa el Registro y dispara el reporte diario a mano.
  - Web: el aviso público aparece en la web, una solicitud de alquiler desde la web llega al panel con notificación, y "Soy socio" lleva al login de la app.
- Lighthouse en móvil: 95+ en rendimiento, accesibilidad y buenas prácticas.
- Revisión final con impeccable en modo auditoría, con capturas en celular, tablet y escritorio de cada pantalla, y una última ronda de correcciones.

====================================================================
PASO 10 · PUBLICACIÓN Y ENTREGA
====================================================================
- Publica en Netlify en el sitio nuevo "casino-pimentel" y dame los enlaces de la web (/) y de la app (/app).
- Usuarios de prueba (escríbelos en RESUMEN.md): payo, lalo, sebastian, julita (admin), barra1, porteria1 y dos socios de ejemplo (uno al día y otro con deuda), con sus claves y PIN.
- Sube el código a un repositorio PRIVADO de GitHub "casino-pimentel", sin ningún secreto (revísalo antes de subir), con un README que incluya "Cómo agregar un club nuevo" y "Trabajar desde otra PC".
- RESUMEN.md: qué se construyó, capturas clave por módulo, cómo probar cada rol, resultado de las pruebas y de Lighthouse, y PENDIENTES.md actualizado (logo oficial, QR de Yape, padrón real, costos de insumos, recetas, personal y turnos, precios por confirmar, claves de Telegram y de Claude, crédito del desarrollador en el pie, fotos reales del club, dominio propio, rediseño completo de la web con su prompt dedicado).
- Deja corriendo el servidor local y dime la URL para revisarlo al volver.

====================================================================
DOCUMENTACIÓN DEL CASO DE ÉXITO (durante TODO el trabajo, no al final)
====================================================================
En ./caso-de-exito ya están el documento del caso (caso-de-exito-casino-pimentel.md) y las fotos del "antes" (carpeta antes/). Este proyecto se publicará como caso de éxito en LinkedIn, así que registra todo mientras trabajas:
- bitacora-construccion.md: una entrada por paso con fecha y hora, qué se construyó, decisiones tomadas, problemas encontrados y cómo se resolvieron, y cifras (tablas creadas, pantallas, reglas automáticas, pruebas superadas).
- despues/: capturas en alta calidad de cada pantalla terminada, en celular (390 px), tablet (820 px) y escritorio (1440 px), con nombres claros (por ejemplo 12-porteria-escaneo-carnet-celular.png).
- despues/videos/: graba con Playwright los flujos clave en celular: cobrar en barra, escanear el carnet en portería, registrar un invitado bloqueado por la regla, reservar tenis, marcar asistencia, cierre del día de barra y el carnet del socio volteándose.
- antes-despues/: composiciones lado a lado (1080 x 1350 px, fondo claro) de: talonario de portería vs. escaneo del carnet; comanda en papel vs. tablet de barra; kardex manual vs. kardex automático; padrón en Excel vs. ficha del socio. Nunca muestres nombres reales de socios ni montos reales de caja: los archivos marcados PRIVADO no se usan en composiciones públicas.
- Al final, completa la sección 3 "El después" del documento del caso con lo construido y los enlaces a las capturas.

====================================================================
CLAVES (si te las paso en el mensaje)
====================================================================
Si en mi mensaje vienen TELEGRAM_TOKEN, ANTHROPIC_API_KEY o el aviso de que agregué el bot a un grupo de Telegram: guárdalas SOLO como secretos de Supabase (supabase secrets set), nunca en archivos ni en el repositorio. Obtén TELEGRAM_CHAT_ID con getUpdates del bot después de que exista un mensaje en el grupo, y prueba el envío del reporte diario. Si no vienen, deja todo listo en modo plantilla y anótalo en PENDIENTES.md.
