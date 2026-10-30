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
- 10 migraciones versionadas en `supabase/migrations`: 47 tablas, todas con `club_id` (el sistema sirve para varios clubes) y con las reglas del club en `config.reglas` (JSON validado por una función: invitados, tenis, cuotas, tolerancia de tardanza, hora del reporte, regla de morosos, vigencia del QR, IGV de alquileres).
- Seguridad en todas las tablas (RLS): el socio solo ve lo suyo y lo de su familia; barra y portería solo lo que operan; la directiva ve todo; solo administración edita la configuración. **Nadie borra**: no existe ninguna política de borrado y se quitó el permiso; todo es borrado lógico con motivo.
- Registro total: un trigger genérico guarda en `auditoria` cada alta y cambio de todas las tablas (antes, después, qué campos cambiaron, quién y cuándo), y `accesos` guarda inicios y cierres de sesión.
- 34 funciones con la lógica crítica: carnet con QR firmado (HMAC-SHA256) que vence a los 30 segundos, validar e ingresar en portería, invitados (5 por día y 3 visitas al mes por DNI), tenis (1 por día, 3 por semana, hijos menores de 25, sin doble reserva), comandas y cobro con descuento de stock por receta en onzas, cortesías con PIN del encargado, cierre de barra (esperado vs contado y conteo físico), kardex, cuotas, validación de pagos aplicada a la cuota más antigua, asistencia con tardanzas, alquileres con tarifa automática, IGV y día de decoración, panel "Hoy", reporte diario, importador del padrón y la web pública.
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
- 47 tablas · 34 funciones · 4 tareas programadas · **38 de 38 pruebas de seguridad y reglas superadas** (casos que deben pasar y que deben fallar).
