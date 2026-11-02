# Caso de éxito · Casino de Pimentel

Documento vivo. Registra el antes, la construcción y el después del sistema del club, para publicarlo luego en LinkedIn como caso de éxito.

**Antes de publicar:**
- Pedir permiso al club (Payo) para usar su nombre. Si no lo da, se publica como "un club social de playa del norte del Perú".
- Las imágenes marcadas PRIVADO tienen nombres reales de socios y montos de caja: no se publican, o solo se publican desenfocadas.

---

## 1. El punto de partida (el antes)

### Quién es el cliente
- Club social privado frente al malecón de Pimentel, con actividad tributaria desde 1984 (asociación).
- 265 socios titulares con sus familias.
- Instalaciones: piscina, 1 cancha de tenis, 1 de básquet, el bar El Astillero (2 barras), salón principal, comedor, rincón parrillero, jardín y deck. (La investigación inicial decía 2 canchas de tenis; el formulario del club lo corrigió el 2-nov-2026.)
- Personal: unos 10-11 en planilla y de 10 a 30 por recibo por honorarios, más en verano.

### Cómo funcionaba (evidencia en `antes/`)
| Área | Cómo se hacía | Evidencia |
|---|---|---|
| Barra | Comanda en papel. Kardex manual en botellas y onzas. El cierre de barra se hacía **una vez al mes**: un faltante se descubría hasta 30 días después. | 04, 05, 06 |
| Precios | Carta impresa y lista interna con precios distintos para el mismo trago (Margarita y Negroni: S/ 20 en la carta y S/ 18 en la lista). | 01, 02, 03 |
| Portería | Talonario numerado a mano: nombre, DNI y hora. La regla de máximo 3 visitas al mes por invitado no se podía controlar en papel. | 07 |
| Socios y cuotas | Padrón en Excel con celdas de color por mes pagado. | 09 (PRIVADO) |
| Caja de oficina | Excel de caja chica, cierre cada dos días. | 08 (PRIVADO) |
| Tenis | Sin reserva en línea. Reglas (1 por día, 3 por semana, hijos menores de 25) controladas a mano. | — |
| Ambientes | Tarifas en Excel, alquiler coordinado a mano. | 10 |
| Facturación | Comprobante por comprobante en el portal gratuito de SUNAT. | SUNAT (datos públicos) |
| Sistema anterior | Contrataron un sistema económico y genérico. Después de unos 8 meses seguía sin terminar y el club decidió abandonarlo y asumir la pérdida. | Audio del presidente, 27-oct-2026 |
| Presencia digital | Sin web propia. Google: 4.2 de 5 con 230 reseñas; la gente lo confunde con un casino de juego y comenta que "suele estar cerrado". | Investigación, 27-oct-2026 |

### Frases del cliente (para el post; citar sin nombre salvo que den permiso)
- "Pagamos muy poco la vez pasada y nos salió mal porque fue un sistema súper genérico." (idea expresada por el club)
- "No podemos estar 8 meses esperando que terminen el sistema, tenemos que avanzar." (presidente, audio del 27-oct)
- Quieren "un solo sistema", no "un sistema para entrar, otro para otra cosa". (presidente, audio del 28-oct)

### Línea base por medir antes de instalar (preguntar a Julita)
Sin estas cifras, el "después" no tiene contra qué compararse.
1. ¿Cuántas horas toma hoy el cierre mensual de la barra?
2. ¿Cuánto tarda registrar un ingreso en portería, de socio y de invitado?
3. ¿Cuánto faltante o merma de licor encuentran al mes, aproximadamente?
4. ¿Cuántas horas a la semana se van en cuadrar la caja y el padrón de cuotas?
5. ¿Cuántos socios están hoy con alguna cuota vencida?

---

## 2. La construcción (bitácora)
| Fecha | Hito |
|---|---|
| 27-oct-2026 | Primer contacto en el grupo del club. El presidente da inicio a la etapa de levantamiento de información. |
| 27-oct-2026 | Investigación completa de la presencia digital y los datos públicos del club. |
| 27-oct-2026 | Lista de información enviada a administración. |
| 28-oct-2026 | El presidente confirma el interés y pide un sistema integrado. |
| 29-oct-2026 | Llega la información del club: carta, insumos, formatos, tarifas, reglas de socios, invitados y tenis. |
| 29-oct-2026 | Brief del sistema y prompt de construcción: una sola plataforma con web pública, panel, barra, portería con asistencia, app del socio, notificaciones y reporte diario. |
| 30-oct-2026 | Primera plataforma: web pública en Astro (publicada), app en React y base de datos en Supabase con 38 pruebas superadas en local. La base no se llegó a conectar (el proyecto de Supabase tenía costo), así que **nadie podía entrar**. |
| 1-nov-2026, 14:30 | Cambio de rumbo pedido por el cliente: el sistema se rehace en **Google Apps Script + Google Sheets**, funcional y a costo S/ 0. A las 16:20 queda publicado en Google. |
| 1-nov-2026, 23:10 | **Rediseño** con el logo y los colores reales del club, a partir de los comentarios del cliente: fondos azules, títulos grandes, ayuda "Cómo funciona" en cada sección, calendario y horas propios, tickets imprimibles y una app del socio personalizada. |
| 1-nov-2026, 23:40 | Publicación con dirección corta en Vercel (casino-pimentel.vercel.app) y código en GitHub. |
| 2-nov-2026, 00:10 | Kit de presentación: capturas, mockups en laptop, tablet y celular, marca y prompt para armar las diapositivas. |
| 2-nov-2026, 13:00 | **Correcciones con el formulario del club**: 1 cancha de tenis (no 2), máximo 3 reservas por semana, invitados al comedor sin costo, adicional de cocina de S/ 400 y consumos de la barra a la cuenta del socio. Publicado como versión 7. |
| 2-nov-2026 | Presentación de la propuesta al club. |
| (pendiente) | Puesta en marcha con datos reales. |

## 3. El después

### Material
Todo está en `entregables/proceso-antes-despues/` (carpeta local, no se sube a GitHub por su peso: 85 MB):

| Carpeta | Qué muestra |
|---|---|
| `01-antes-papel-y-excel` | Comanda, kardex, talonario de portería, cartas y tarifas del club (sin los archivos PRIVADO) |
| `02-primera-plataforma-sin-base` | Sistema de diseño, web pública y el ingreso que no dejaba entrar |
| `03-primer-sistema-en-google` | Las 31 pantallas de la primera versión funcional, antes del rediseño |
| `04-rediseno-estetica-del-club` | Las 45 pantallas del rediseño, tal como se presentaron (con las reglas antes de corregir) |
| `05-publicacion` | Vercel, el sistema publicado en Google y la marca |
| `06-kit-de-presentacion` | Mockups del kit |
| `07-correcciones-del-club` | Tenis antes y después, y las funciones nuevas |
| `08-sistema-final` | Las 51 pantallas del sistema publicado hoy |
| `antes-despues` | 10 composiciones listas para publicar (1920 × 1080) y su PDF |

Las composiciones se rehacen con `node appscript/dev/antes-despues.mjs entregables/proceso-antes-despues`.

### Lo que el club tiene hoy
- Un solo sistema con un solo ingreso para administración, directiva, portería, barra y socios, en celular, tablet y computadora.
- 8 módulos: portería con asistencia del personal, socios y cuotas, barra con stock, caja con cierre, personal, tenis, alquileres de ambientes y avisos, más la app del socio con carnet QR.
- La carta real de 55 productos, las tarifas reales de los ambientes y las reglas del formulario del club.
- 4 documentos impresos en 80 mm: ticket de venta, recibo de cuotas, recibo de consumos y ticket de invitado.
- Costo de funcionamiento hoy: S/ 0 (Google, Vercel y GitHub en planes gratuitos).
- Pruebas: recorrido completo por todas las pantallas sin errores y 20 de 20 reglas del club verificadas.

### Por medir
- Videos de los flujos clave: cobrar en barra, portería, reservar tenis, cierre de caja.
- Comparación con la línea base, después de 30 días de uso.

## Lo que aprendimos en el proceso
1. **Una demo en la que no se puede entrar no convence.** La primera plataforma era completa, pero sin base de datos conectada el cliente no podía probar nada. Pasar a Google permitió tener el sistema funcionando y gratis el mismo día.
2. **La identidad del cliente cambia la percepción.** La primera versión funcional se veía genérica; con el logo, los colores y la ayuda en cada sección se sintió como "el sistema del club".
3. **Los datos se validan con el cliente, no solo con investigación.** Las 2 canchas de tenis venían de la investigación pública; el formulario del club dijo 1. Desde ahí, lo que no está confirmado se marca "por confirmar" (cuota, día de vencimiento, cancha de fútbol, básquet).

## 4. Ideas para el post de LinkedIn (borrador de enfoque)
- Gancho: un club que ya había pagado por un sistema que nunca terminó.
- Antes y después lado a lado: talonario contra carnet con QR; kardex en papel contra cierre diario automático.
- Una cifra fuerte de la línea base contra el después (por ejemplo, el cierre de barra pasa de mensual a diario).
- Cierre: lo que se puede construir hoy para un negocio de la región.
