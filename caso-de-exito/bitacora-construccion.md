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
