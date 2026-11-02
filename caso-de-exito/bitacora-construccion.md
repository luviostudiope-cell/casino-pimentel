# Bitácora de construcción · Casino de Pimentel

Registro paso a paso de la construcción del sistema, para el caso de éxito. Horas en hora de Lima.

---

## PASO 0 · Cuentas — 30-oct-2026, 08:10

**Qué se hizo**
- Se verificaron las claves recibidas antes de usarlas: la clave de Claude respondió con el modelo `claude-haiku-5-5` y el bot de Telegram (`@Casinodepimentelbot`) ve el grupo "CASINO PIMENTEL | REPORTES".
- Netlify: se creó el sitio **casino-pimentel** en el equipo KONTROLA (casino-pimentel.netlify.app).
- Supabase: se identificó la organización de pago (Kontrola, plan Pro, 6 proyectos).

**Problema**
- La herramienta de Supabase pide una confirmación de costo para crear el proyecto nuevo y este cliente no la tiene. Se dejó anotado en `PENDIENTES.md` y se siguió construyendo todo lo que no depende de la base (estructura, diseño, migraciones, pantallas).

---

## PASO 1 y 2 · Estructura y sistema de diseño — 30-oct-2026, 08:20 a 09:00

**Qué se construyó**
- Un solo repositorio con tres partes: `web/` (Astro, web pública), `app/` (React + Vite + TypeScript, PWA en `/app`) y `design/` (tokens y fuentes compartidas). Un `netlify.toml` construye ambas y las publica juntas.
- Tokens del sistema "Malecón de Pimentel": colores aprobados, escala tipográfica para socios mayores (17 px base, cifras de 44-56 px), espaciado en múltiplos de 4/8, radios (pill 999 px, tarjetas 28 px, inputs 18 px), sombras con tinte azul y curvas de movimiento.
- Fuentes Outfit y Figtree autoalojadas en woff2.
- 20 componentes compartidos y la vitrina `/app/sistema` para revisarlos.

**Decisiones**
- **Contraste verificado con cálculo, no a ojo.** Los colores de estado aprobados (verde #1E9A68, ámbar #C98410, rojo #D14343) no llegan a 4.5:1 como texto sobre blanco (3.6, 3.1 y 4.6). Se conservan para íconos y rellenos, y para el texto se usa una variante más oscura del mismo color (5.2 a 5.7:1).
- **El carnet** pasó de un degradado diagonal a uno vertical "cielo arriba, mar abajo" para que el nombre en blanco pase AA (4.8:1).
- **Movimiento:** curvas de Emil Kowalski (`cubic-bezier(0.23, 1, 0.32, 1)` para entradas) y springs sin rebote estilo Apple para hojas y pestañas; solo `transform` y `opacity`.

**Problemas y soluciones**
- El QR a pantalla completa se salía del anillo de segundos: un cuadrado dentro de un círculo cabe hasta el 70 % del diámetro; se ajustó al 62 %.

**Cifras**
- 13 colores con su contraste medido · 20 componentes · 1 vitrina.

---

## PASO 3 · Base de datos — 30-oct-2026, 09:00 a 11:30

**Qué se construyó**
- 10 migraciones versionadas en `supabase/migrations`: 46 tablas (más 5 internas en un esquema privado), todas con `club_id` (el sistema sirve para varios clubes) y con las reglas del club en `config.reglas` (JSON validado por una función: invitados, tenis, cuotas, tolerancia de tardanza, hora del reporte, regla de morosos, vigencia del QR, IGV de alquileres).
- Seguridad en todas las tablas (RLS): el socio solo ve lo suyo y lo de su familia; barra y portería solo lo que operan; la directiva ve todo; solo administración edita la configuración. **Nadie borra**: no existe ninguna política de borrado y se quitó el permiso; todo es borrado lógico con motivo.
- Registro total: un trigger genérico guarda en `auditoria` cada alta y cambio de todas las tablas (antes, después, qué campos cambiaron, quién y cuándo), y `accesos` guarda inicios y cierres de sesión.
- 38 funciones (RPC) con la lógica crítica: carnet con QR firmado (HMAC-SHA256) que vence a los 30 segundos, validar e ingresar en portería, invitados (5 por día y 3 visitas al mes por DNI), tenis (1 por día, 3 por semana, hijos menores de 25, sin doble reserva), comandas y cobro con descuento de stock por receta en onzas, cortesías con PIN del encargado, cierre de barra (esperado vs contado y conteo físico), kardex, cuotas, validación de pagos aplicada a la cuota más antigua, asistencia con tardanzas, alquileres con tarifa automática, IGV y día de decoración, panel "Hoy", reporte diario, importador del padrón y la web pública.
- Tareas automáticas (pg_cron): cuotas el día 1, cuotas vencidas cada día, reporte diario a la hora de config (22:30 Lima por defecto) y aviso de faltas del personal.
- Seed: carta real de El Astillero (55 productos), los 75 insumos reales del Excel del club con su unidad, proveedores, tarifas de ambientes; y datos de ejemplo marcados: 60 socios ficticios con 190 miembros de familia, 15 trabajadores con turnos, 318 comandas y 1,200 ingresos de octubre.

**Decisiones**
- Las cuotas vencen el día 10 del mes siguiente (configurable): así el socio ve "por vencer" antes de caer en deuda. Queda por confirmar con el club.
- Los licores se controlan en onzas (750 ml = 25.4 oz; 700 ml = 23.67 oz) y se muestran como "botellas + onzas", igual que el kardex en papel.
- Los PIN del personal están en un esquema privado con bcrypt: ni administración puede leerlos.

**Problemas y soluciones**
- El proyecto de Supabase no se pudo crear desde aquí (falta confirmar el costo). Para no detenerse, se montó una réplica local de Supabase con PGlite (Postgres en WebAssembly) y se probaron ahí todas las migraciones, el seed y las reglas.
- En el seed, un sorteo aleatorio dentro de un `WHERE` se recalculaba por fila y dejaba comandas sin producto; se fijó el sorteo en una variable antes de la consulta.

**Cifras**
- 46 tablas · 38 funciones RPC · 101 políticas de seguridad · 50 triggers · 4 tareas programadas · **38 de 38 pruebas de seguridad y reglas superadas** (casos que deben pasar y que deben fallar).

---

## PASO 4 a 7 · Panel, barra, portería y app del socio — 30-oct-2026, 11:30 a 14:30

**Qué se construyó**
- **Ingreso único** (`/app/ingresar`): el socio entra con su DNI y un PIN de 6 números en un teclado grande; el personal, con correo y clave. Tras 5 intentos fallidos el ingreso se pausa 15 minutos. El primer ingreso obliga a crear un PIN propio.
- **App del socio**: inicio con su estado de cuenta, **carnet digital** (tarjeta cielo-mar que se voltea con un resorte y abre el QR a pantalla completa con un anillo que cuenta los 30 segundos hasta que el código se renueva), cuenta con cuotas mes a mes, consumos a cuenta en El Astillero con detalle y pago por Yape con constancia, reservas de tenis que explican por qué no se puede, invitados con cupos del día y del mes, ambientes, avisos, perfil y una bienvenida de 3 pasos.
- **Portería**: dos botones enormes (escanear carnet / buscar socio), tarjeta grande con foto, estado y familia, ticket digital en lugar del talonario, invitados con las reglas aplicadas por el sistema, lista "Dentro del club hoy" y **modo asistencia** tipo kiosco (DNI o PIN, foto automática, "Llegaste 12 min tarde").
- **Barra El Astillero**: inicio de turno, venta en pills grandes por categoría, cobro en 4 toques con vuelto, cortesías con motivo y PIN del encargado, mesas abiertas, comandas del día y **cierre del día** con conteo rápido de botellas y onzas y la diferencia resaltada.
- **Panel**: "Hoy" con frase del día y contadores, "Requiere tu atención", socios (ficha, familia, cuotas, cuenta, constancias, nuevo PIN), importador del padrón desde Excel, cobranza, barra (kardex, cierres, carta con modo evento, insumos y recetas, compras, cortesías), caja de oficina con cierre cada dos días, portería, personal (asistencia con foto, turnos, fichas, reporte mensual de planilla y recibo), tenis, ambientes con tarifa automática, avisos, reportes, registro y configuración.
- **Edge Functions**: ingreso del socio, cambio de PIN, cuentas de socios y del personal, envío de notificaciones push y **reporte diario** (redactado por Claude con el modelo claude-haiku-5-5 o con una plantilla, enviado por Telegram y como notificación).

**Decisiones**
- Cada pantalla abre con una línea que explica para qué sirve.
- El socio con deuda **entra igual** y se avisa a administración; la regla de bloquear queda en la configuración para que el club decida.
- La comanda nunca se borra: si se edita una mesa abierta, las líneas anteriores quedan "anuladas" y se registran las nuevas.

## PASO 7B · Web pública — 30-oct-2026, 14:30 a 15:00

- 8 páginas en Astro (inicio, el club, instalaciones, tenis, ambientes con formulario de consulta, avisos en vivo, contacto, 404), cada sección en su propio componente para rediseñarla después.
- Ilustración de ejemplo del malecón con el muelle y caballitos de totora, sin personas ni fotos de banco, marcada "Imagen de ejemplo".
- Pie con la aclaración "Club social privado: no es una casa de juegos de azar" (la gente lo confunde en Google).
- SEO base: título y descripción por página, datos estructurados SportsClub/LocalBusiness solo con datos confirmados, Open Graph, sitemap y robots.

**Problemas y soluciones**
- En celular, el botón "Menú" quedaba fuera de la pantalla: en anchos pequeños el botón "Soy socio" de la cabecera se oculta (sigue en el héroe y en el menú).
- En "Cómo llegar" las etiquetas se montaban sobre los datos: una regla de cuadrícula se aplicaba también al bloque interno; se limitó a los hijos directos.

## PASO 10 (parcial) · Publicación — 30-oct-2026, 15:00

- Código en el repositorio privado de GitHub `casino-pimentel` (revisado: sin claves ni archivos PRIVADO).
- Publicado en https://casino-pimentel.netlify.app (web completa; la app espera la conexión con la base).
- Problema: el despliegue del repositorio completo superaba el límite de subida de Netlify; se publicó la carpeta ya construida con el CLI.

**Cifras a esta hora**
- 4 módulos + web · 13 secciones del panel · 5 Edge Functions · 18 capturas del después (web y sistema de diseño en 3 tamaños).

---

## PASO 11 · El ingreso que no dejaba entrar — 30-oct-2026, 20:00

**Qué pasó**
- El cliente intentó entrar y el teclado del PIN no respondía: la base de datos no estaba conectada. Se corrigió para que avise en español ("la base de datos del club aún no está conectada") y no seleccione texto al tocar rápido.

**Lección**
- La plataforma estaba completa, pero para el cliente era "una demo": no podía entrar con ningún usuario.

Captura: `entregables/proceso-antes-despues/02-primera-plataforma-sin-base/02-app-ingreso-sin-base-de-datos.png`.

---

## PASO 12 · Cambio a Google Apps Script — 1-nov-2026 (publicado a las 16:20)

**Qué se hizo**
- A pedido del cliente, el sistema se rehízo en **Google Apps Script + Google Sheets**: gratis, funcional y con acceso inmediato. Supabase y la web quedaron para después.
- Fases por módulo, desde portería: portería con asistencia, socios y cuotas, barra con stock, caja con cierre, personal, tenis, alquileres, avisos y la cuenta del socio.
- Una hoja de cálculo como base de datos (una pestaña por tabla), claves y PIN cifrados con sal, sesiones de 6 horas y bloqueo tras 5 intentos.
- Un servidor local que imita Google para probar todo en `localhost:3000` y una prueba automática que recorre cada rol.

**Problemas y soluciones**
- El enlace publicado respondía "Necesitas acceso": faltaba que el dueño autorizara el proyecto. Se redujeron los permisos a solo Google Sheets y el cliente lo autorizó desde el editor.

Capturas: `03-primer-sistema-en-google/` (31 pantallas).

---

## PASO 13 · Rediseño con la estética del club — 1-nov-2026 (listo a las 23:10)

**Qué pidió el cliente** (con capturas del sistema y una referencia de diseño minimalista y redondeada)
- Fondos azules que impacten, colores del logo real, tipografía más legible y títulos más grandes.
- Nada cuadrado: calendario y horas propios, opciones en píldoras celestes con animación.
- Una explicación de cómo funciona cada sección.
- Tickets imprimibles (no boletas) y una app del socio más personal.

**Qué se hizo**
- Menú azul, encabezados azules con olas y el sol del logo, tipografías Outfit y Plus Jakarta Sans.
- Botón "Cómo funciona" con los pasos en cada sección y accesos rápidos en el inicio.
- Ticket de venta, recibo de cuotas y ticket de invitado para impresora térmica de 80 mm.
- App del socio con saludo, carnet con QR, cuotas y reservas.

Capturas: `04-rediseno-estetica-del-club/` (45 pantallas). Comparación: `antes-despues/07-diseno.png` y `08-app-del-socio.png`.

---

## PASO 14 · Publicación — 1-nov-2026, 23:20 a 23:40

- Código en GitHub (repositorio público por decisión del cliente) y dirección corta en Vercel: https://casino-pimentel.vercel.app.
- Problema: quien tenía varias cuentas de Google abiertas veía "No se pudo abrir el archivo". Se resolvió abriendo el sistema como visitante dentro de la página de Vercel.

Capturas: `05-publicacion/`.

---

## PASO 15 · Kit de presentación — 2-nov-2026, 00:00 a 00:15

- Capturas a doble resolución simulando el lunes 2 de noviembre a las 6:30 p. m., mockups en laptop, tablet y celular, marca, contenido del sistema y prompt para armar las diapositivas.

Capturas: `06-kit-de-presentacion/`.

---

## PASO 16 · Correcciones con el formulario del club — 2-nov-2026 (publicado a las 13:10)

**Qué se encontró**
- El socio del cliente avisó que no hay 2 canchas de tenis. Revisando el origen: el dato venía de la investigación inicial, no del formulario del club. El formulario dice 1 cancha de tenis y 1 de básquet.

**Qué se corrigió**
- Tenis: 1 cancha y máximo 3 reservas por socio a la semana (además de 1 por día).
- Invitados al comedor sin costo (no pasan por caja).
- Adicional de cocina de S/ 400 para el rincón parrillero.
- Barra: consumo "a la cuenta" del socio, con ticket firmado; administración lo cobra después y entra a la caja.
- La base publicada se actualiza sola al subir la versión (versión 7 en Google).

**Por confirmar con el club**
- Monto de la cuota (S/ 80 de prueba) y día de vencimiento (día 10), cancha de fútbol, si el básquet se reserva y quién de la familia reserva tenis.

**Cifras**
- 20 de 20 reglas verificadas · recorrido completo sin errores · 51 capturas del sistema final.

Capturas: `07-correcciones-del-club/` y `08-sistema-final/`. Comparación: `antes-despues/10-reglas-del-club.png`.
