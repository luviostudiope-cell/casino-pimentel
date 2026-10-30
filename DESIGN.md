# DESIGN.md · Sistema "Malecón de Pimentel"

Cielo claro, mar azul y arena del muelle. Luminoso, amable y muy fácil de leer. Sin fondos oscuros, sin rosados ni salmón.

- Tokens: `design/tokens.css` (única fuente de verdad para `web/` y `app/`).
- Base compartida: `design/base.css` (reset, selección de texto, cursor, barras de desplazamiento, foco visible).
- Componentes de la app: `app/src/ui/` y `app/src/styles/ui.css`.
- Vitrina para revisarlo todo: **`/app/sistema`**.

---

## 1. Para quién es cada pantalla

Fichas escritas con la skill *definicion-publico-kontrola*. Mandan sobre cualquier gusto personal.

### App del socio (`/app/socio`)
```
Entregable: app del socio (carnet, cuenta, reservas, invitados, avisos)
Decisor: la directiva del club (Payo)
Usuario: socio titular y su familia; el caso de diseño es un socio de 60 años
Segmento socioeconómico: A/B regional (club social tradicional de Pimentel)
Edad / etapa: adulto y adulto mayor; también hijos jóvenes
Alfabetización digital: media; usa WhatsApp y Yape a diario, poco más
Canal: su celular, de pie en la puerta del club o en casa
Qué debe pasar en su cabeza: "Muestro mi carnet, sé cuánto debo y reservo tenis sin llamar a nadie."
```
Consecuencias: texto base de 17 px, una acción por pantalla, nada escondido en menús, botones de 52 px o más, estados con texto (nunca solo color), primer ingreso guiado de 3 pantallas.

### Tablet de portería (`/app/porteria`)
```
Entregable: tablet de portería + modo asistencia
Decisor: administración (Julita) y directiva
Usuario: portero de turno (no eligió el sistema) y todo el personal al marcar asistencia
Segmento: personal operativo
Edad / etapa: adulto
Alfabetización digital: media o baja
Canal: tablet fija en la única puerta, a la intemperie del malecón, con sol
Qué debe pasar en su cabeza: "Escaneo y listo: es más rápido que el talonario."
```
Consecuencias: dos botones enormes en la pantalla principal, respuesta grande y clara (verde / rojo con texto), el sistema aplica las reglas por él. Riesgo de sabotaje pasivo: la primera pantalla le ahorra trabajo (no reporta al jefe).

### Tablet de barra El Astillero (`/app/barra`)
```
Entregable: punto de venta de barra
Decisor: directiva
Usuario: bartender / mesero, de pie, con prisa y poca luz
Segmento: personal operativo
Alfabetización digital: media
Canal: tablet en la barra
Qué debe pasar en su cabeza: "Cobro en cuatro toques y al cierre no tengo que sumar nada."
```
Consecuencias: pills grandes por categoría, tipografía grande sobre arena clara (no oscuro aunque haya poca luz: el contraste alto se logra con tinta sobre arena), cobro en 4 toques máximo, vuelto calculado.

### Panel de administración (`/app/admin`)
```
Entregable: panel de gestión
Decisor y usuario: Payo (presidente, celular), Lalo (vicepresidente), Sebastián (sistemas), Julita (administración, computadora)
Alfabetización digital: alta en Julita y Sebastián; media en Payo y Lalo
Canal: celular de Payo primero; computadora de Julita para el trabajo diario
Qué debe pasar en su cabeza: "En 10 segundos sé cómo va el club hoy y qué requiere mi atención."
```
Consecuencias: "Hoy" con una frase resumen y contadores; "Requiere tu atención" arriba; en computadora, densidad alta (tablas, filtros, exportar a Excel). Cada pantalla tiene una línea que explica para qué sirve.

### Web pública (`/`)
```
Decisor: socio potencial, familia que busca un local para un evento, empresa
Usuario: cualquiera que busca "Casino de Pimentel" en Google
Canal: celular desde Google Maps / búsqueda
Qué debe pasar en su cabeza: "Es un club social frente al mar (no un casino de juego), y puedo pedir un ambiente."
```

---

## 2. Color

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `--cielo` | #F6FAFD | Fondo general | — |
| `--blanco` | #FFFFFF | Superficie | — |
| `--celeste` | #E8F2FA | Tarjetas secundarias, inputs, filas alternas | — |
| `--azul` | #1B4F8F | Primario: header, botones principales, títulos | 8.2:1 sobre blanco |
| `--azul-activo` | #2A6BC0 | Hover, seleccionado, enlaces | 5.3:1 |
| `--tinta` | #0E2236 | Texto principal | 15.4:1 |
| `--tinta-2` | #4A5B6E | Texto secundario | 6.6:1 |
| `--arena` / `--arena-suave` | #EADFCB / #F6F0E6 | Solo El Astillero y detalles cálidos | — |
| `--arena-oscura` | #8C6D45 | Íconos y texto grande sobre arena | 3.6:1 (solo grande) |
| `--arena-tinta` | #6E5232 | Texto normal sobre arena | 5.5:1 |
| `--sol` | #F4B53F | Solo destellos ("nuevo", pendientes) con texto tinta | 8.9:1 |

**Estados (siempre con texto además del color).** El tono aprobado va en rellenos, puntos e íconos; el texto usa la variante `-tinta`, porque el tono base no llega a 4.5:1:

| Estado | Relleno / ícono | Fondo suave | Texto | Contraste del texto |
|---|---|---|---|---|
| Al día · presente · pagado | `--ok` #1E9A68 | #E4F4EC | #0F6B47 | 5.7:1 |
| Por vencer · tardanza | `--alerta` #C98410 | #FBF0DA | #8A5A06 | 5.2:1 |
| Deuda · falta · faltante | `--peligro` #D14343 | #FBE6E6 | #A72E2E | 5.7:1 |

Regla: nunca un hex suelto en un componente; siempre un token.

## 3. Tipografía

- **Outfit 700/800** para títulos y cifras grandes; interlineado 1.08; tracking -0.02em.
- **Figtree 400-650** para texto e interfaz.
- Montos, horas y tablas con `font-variant-numeric: tabular-nums` (clase `.num`).
- Escala (pensada para socios mayores): 14 · 15 · **17 (base)** · 19 · 22 · 26 · **32 (título celular)** · **40 (título escritorio)** · **44-56 (cifras protagonistas)**. Nada por debajo de 14 px.
- Fuentes autoalojadas en `design/fonts/` (woff2 variables, latin + latin-ext).

## 4. Espaciado, formas y sombras

- Espaciado en múltiplos de 4/8: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80. Margen lateral 16 px en celular, 32 px en escritorio.
- **Todo en pill** (radio 999 px): botones, chips, filtros, pestañas, estados y turnos.
- Tarjetas: radio 28 px. Inputs: radio 18 px.
- Botones: alto mínimo 52 px (64 px en tablets). Áreas táctiles de 48 px mínimo.
- Sombras casi invisibles con tinte azul y desplazamiento (`--shadow-1/2/3`), nunca halos sin desplazamiento.
- Íconos de línea **Lucide** con etiqueta de texto; nunca emojis como íconos.

## 5. Movimiento

| Token | Valor | Para qué |
|---|---|---|
| `--ease-out` | cubic-bezier(0.23, 1, 0.32, 1) | Entradas, salidas, feedback |
| `--ease-in-out` | cubic-bezier(0.77, 0, 0.175, 1) | Movimiento en pantalla |
| `--ease-drawer` | cubic-bezier(0.32, 0.72, 0, 1) | Hojas y paneles |
| `--dur-press` | 140 ms | Presión de botón (scale 0.97) |
| `--dur-fast` / `--dur-base` / `--dur-slow` | 160 / 200 / 250 ms | Interfaz |
| Spring por defecto | `{ type: 'spring', bounce: 0, duration: 0.4 }` | Pestañas, chips, hojas |
| Spring con impulso | `bounce: 0.18, duration: 0.6` | Volteo del carnet |

Reglas: solo `transform` y `opacity` (y `clip-path` en indicadores); en Motion se usa el string completo de `transform`; nada de `transition: all`; nunca `scale(0)`; hover solo con `@media (hover: hover) and (pointer: fine)`; `prefers-reduced-motion` cambia desplazamientos por fundidos cortos.

## 6. Componentes compartidos (`app/src/ui`)

| Componente | Notas |
|---|---|
| `Boton` | principal, secundario, contorno, fantasma, peligro, ok, arena · tamaños sm/md/lg/xl · ícono + texto · estado cargando (`aria-busy`) |
| `BotonIcono` | ícono con etiqueta visible debajo (nunca ícono solo) |
| `PillEstado` | al día, por vencer, deuda, presente, tardanza, falta, por validar, pagado, vencido, nuevo… con ícono + texto |
| `Chips` | filtros con fondo que se desliza entre opciones (layout animation) |
| `Pestanas` | pestañas en pill con indicador deslizante |
| `Tarjeta`, `Indicador` + `Contador` | tarjeta de indicador con contador que sube al cargar |
| `Campo`, `Selector`, `AreaTexto`, `Interruptor` | etiqueta visible, ayuda, error junto al campo, deshabilitado, cargando |
| `TecladoNumerico`, `PuntosPin` | teclas de 76 px para PIN y montos; también funciona con teclado físico |
| `Buscador` | pill con ícono, para socio por nombre, N° o DNI |
| `ItemLista`, `Avatar` | listas con avatar (foto o iniciales) |
| `Hoja` | hoja inferior con arrastre para cerrar (celular) / panel lateral (escritorio) |
| `useConfirmar` | diálogo de confirmación (con variante de peligro) |
| `useToast` | toasts con feedback de cada acción |
| `Vacio` | estado vacío que enseña qué hacer |
| `Esqueleto`, `EsqueletoLista` | skeletons en vez de spinners en el contenido |
| `CalendarioTurnos` | grilla de turnos en pills (mañana, tarde, noche, libre) |
| `LectorQR` | cámara con BarcodeDetector nativo y respaldo jsQR; ingreso manual del código |
| `Carnet` | momento firma: degradado cielo-mar, foto, tipo, pill de estado; se voltea con spring y abre el QR a pantalla completa con anillo de segundos |
| `EjemploTag` | etiqueta discreta "Dato de ejemplo" |
| `Wordmark`, `Ola` | logo provisional (texto + ola) |

## 7. Superficies del navegador

Selección de texto en celeste, cursor de texto en azul activo, barras de desplazamiento finas en el tono del borde, foco visible con anillo azul de 3 px y separación de 3 px en todos los controles.
