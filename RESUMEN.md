# Resumen de entrega · Casino de Pimentel

**Estado al 30-oct-2026, 15:30 (Lima):** todo el sistema está construido y probado en local; la web está publicada. **Falta crear el proyecto de Supabase** (requiere confirmar el costo en el panel de Supabase, ver `PENDIENTES.md`). Apenas exista, se conecta la app, se cargan los datos y se completan las pruebas de punta a punta, los videos y las composiciones antes/después.

## Enlaces

| Qué | Dónde |
|---|---|
| Web pública | https://casino-pimentel.netlify.app |
| App (ingreso único) | https://casino-pimentel.netlify.app/app (hoy muestra "Falta conectar la base de datos") |
| Sistema de diseño | https://casino-pimentel.netlify.app/app/sistema |
| Repositorio privado | https://github.com/luviostudiope-cell/casino-pimentel |
| Servidores locales | web `http://localhost:4321/` · app `http://localhost:5173/app/sistema` · todo junto `http://localhost:8888/` |

## Qué se construyó

- **Un solo sistema**: web pública (Astro) + app PWA (React) con un solo ingreso que lleva a cada quien a su módulo según su rol, sobre una sola base de datos.
- **Sistema de diseño "Malecón de Pimentel"** (`design/`, `DESIGN.md`, `/app/sistema`): tokens únicos para web y app, contraste AA verificado con cálculo, 20 componentes, movimiento con curvas de Emil Kowalski y springs estilo Apple, fuentes autoalojadas.
- **Base de datos** (`supabase/migrations`): 46 tablas con `club_id`, reglas del club en `config`, RLS en todas las tablas, nadie borra (borrado lógico), auditoría por trigger en todas las tablas, 38 funciones RPC con la lógica crítica, 4 tareas programadas, Storage y Realtime.
- **App del socio**: carnet digital con QR firmado que se renueva cada 30 s, cuenta y cuotas mes a mes, pago por Yape con constancia, reservas de tenis con reglas, invitados, ambientes, avisos, notificaciones y bienvenida de 3 pasos.
- **Portería**: escanear carnet o buscar socio, ticket digital, invitados con reglas (5 por día y 3 visitas al mes), "dentro hoy" y modo asistencia con foto.
- **Barra El Astillero**: venta en 4 toques, cortesías con PIN del encargado, cobro con vuelto, comandas y cierre del día con conteo de botellas y onzas.
- **Panel**: Hoy, socios e importador del padrón, cobranza, barra (kardex, cierres, carta, recetas, compras, cortesías), caja de oficina, portería, personal, tenis, ambientes, avisos, reportes, registro y configuración.
- **Notificaciones y reporte diario**: Web Push (VAPID) y centro de notificaciones; reporte diario a la hora de config (22:30) redactado por Claude (`claude-haiku-5-5`) o con plantilla, por Telegram y push.

## Usuarios de prueba

Se crean con el seed (`supabase/seed/03_usuarios.sql`) al conectar la base. **Son claves de prueba: cambiarlas antes de usar datos reales.**

| Usuario | Rol | Ingreso | Clave / PIN |
|---|---|---|---|
| Payo | Presidente | payo@casinopimentel.test | `Payo.Malecon26` |
| Lalo | Directivo | lalo@casinopimentel.test | `Lalo.Malecon26` |
| Sebastián | Administración (sistemas) | sebastian@casinopimentel.test | `Sebastian.Malecon26` |
| Julita | Administración | julita@casinopimentel.test | `Julita.Malecon26` |
| Tablet barra | Barra | barra1@casinopimentel.test | `Barra1.Astillero26` |
| Tablet portería | Portería | porteria1@casinopimentel.test | `Porteria1.Puerta26` |
| Socio al día (ejemplo) | Socio | DNI `99107919` | PIN `246810` |
| Socio con deuda (ejemplo) | Socio | DNI `99115838` | PIN `135790` |

PIN de asistencia del personal de ejemplo (portería → Asistencia): Rosa 2468, Luis 1357, Jhonatan 8080, Marco Antonio (encargado de barra, autoriza cortesías) 4321, Segundo 1010, Kevin 9090. Los demás socios de ejemplo entran con su DNI y los últimos 6 dígitos del DNI como PIN temporal (deben cambiarlo).

## Cómo probar cada rol (cuando la base esté conectada)

1. **Socio**: `/app/ingresar` → "Soy socio" → DNI y PIN → ver deuda en "Mi cuenta" → "Pagar con Yape" y subir una captura → "Reservas" → tenis (la 4.ª reserva de la semana se bloquea con mensaje) → invitados → "Carnet" → tocar la tarjeta.
2. **Portería**: entrar como portería → "Escanear carnet" (o "Escribir el código" que aparece bajo el QR) → "Registrar ingreso" → "Invitado" (el 6.º del día se bloquea) → pestaña "Asistencia" → PIN 9090.
3. **Barra**: entrar como barra → elegir barra y mesero → Pisco Sour a cuenta del socio, una cerveza en efectivo, una cortesía con PIN 4321 → "Cierre del día" con conteo y dinero contado.
4. **Admin**: Julita → Cobranza o ficha del socio → validar la constancia → Barra → Kardex (faltante) → Avisos → publicar → Registro → Hoy → "Enviar reporte del día".
5. **Web**: el aviso público aparece en "Avisos"; "Consultar disponibilidad" en Ambientes llega al panel con notificación; "Soy socio" lleva a `/app/ingresar`.

## Resultados de pruebas

| Prueba | Resultado |
|---|---|
| Migraciones + seed en Postgres local (PGlite) | ✅ todas cargan |
| Pruebas de RLS y reglas (`supabase/tests/pruebas.sql`) | ✅ **38 de 38** en local · ⏳ falta correrlas en Supabase |
| Tipos (TypeScript) y build de producción | ✅ sin errores |
| Lighthouse móvil · web inicio | rendimiento 100 · accesibilidad 100 · buenas prácticas 100 · SEO 100 (la accesibilidad empezó en 92: se corrigió una lista de definiciones mal anidada) |
| Lighthouse móvil · web ambientes | 99 · 100 · 100 · 100 |
| Clave de Claude / bot de Telegram | ✅ verificados (falta el envío de prueba del reporte, necesita la base) |
| Prueba de punta a punta por rol, videos, Lighthouse de la app | ⏳ requieren la base de datos |

## Capturas

`caso-de-exito/despues/`: web (inicio, instalaciones, tenis, ambientes, contacto) y sistema de diseño en celular (390 px), tablet (820 px) y escritorio (1440 px). Las capturas de cada módulo de la app, los videos y las composiciones antes/después se generan al conectar la base.

## Pendientes

Ver `PENDIENTES.md` (logo oficial, QR de Yape, padrón real, costos de insumos, recetas, personal y turnos, precios por confirmar, crédito del desarrollador, fotos reales, dominio propio, rediseño de la web con su prompt dedicado).
