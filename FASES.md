# El sistema por fases

Un solo sistema para todo el club, con un solo ingreso. Hoy funciona en **Google Apps Script con Google Sheets** (gratis). Más adelante se pasa a Supabase sin cambiar la forma de trabajar.

| Fase | Módulo | Estado |
|---|---|---|
| 1 | Portería | Lista |
| 2 | Socios y cuotas | Lista |
| 3 | Barra | Lista |
| 4 | Caja | Lista |
| 5 | Personal y asistencia | Lista |
| 6 | Tenis y alquileres | Lista |
| 7 | Cuenta del socio | Lista |
| 8 | Reportes y avisos automáticos | Siguiente |
| 9 | Página web | Después |
| 10 | Paso a Supabase | Después |

---

## Fase 1 · Portería

**Quién la usa:** el portero, en una tablet o celular en la entrada.

- Busca al socio por **DNI, nombre o código del carnet**. Un lector de códigos USB también funciona: escribe el código solo.
- Muestra si está **al día** o **cuánto debe**. Por regla del club puede entrar igual y se le avisa (se cambia en Ajustes).
- **Registra el ingreso** del socio y de su **familia** con un toque.
- **Invitados:** nombre, DNI, si va al club (S/ 10) o a la piscina (S/ 20) y cómo pagó. Respeta los límites: 5 invitados por socio al día y 3 visitas al mes por invitado. El cobro entra solo a la caja.
- Lista de **quién está dentro** y botón de **salida**.
- **Asistencia del personal:** cada trabajador marca entrada y salida con su PIN de 4 números; el sistema calcula la tardanza.

**Falta para después:** leer el QR con la cámara del celular y la foto del socio.

## Fase 2 · Socios y cuotas

**Quién la usa:** administración.

- Padrón con búsqueda y filtros: todos, al día, con deuda y suspendidos.
- Ficha de cada socio: datos, familia, cuotas del año en colores (pagada, vencida, por pagar), pagos e ingresos al club.
- **Registrar pago** de una o varias cuotas con efectivo, Yape, Plin, tarjeta o transferencia. Entra solo a la caja.
- **Generar las cuotas del mes** con un botón (S/ 80, vence el día 10 del mes siguiente).
- Socio nuevo, editar, suspender o activar, y reiniciar el PIN.

**Falta para después:** cargar el padrón real desde Excel y enviar recordatorios de pago.

## Fase 3 · Barra

**Quién la usa:** el bartender, en tablet o celular.

- **Vender** con la carta real (55 productos, precios en soles): toca los productos, elige cómo paga y cobra.
- **Ventas de hoy** con el total por Yape, Plin, efectivo y tarjeta. Administración puede **anular** con motivo.
- **Stock** de botellas, cervezas y gaseosas: avisa cuando queda poco y se registra la mercadería que llega.

**Falta para después:** recetas por onzas, cierre de barra por turno y cortesías.

## Fase 4 · Caja

**Quién la usa:** administración y directiva.

- Caja de cada día: cuánto entró, cuánto salió, el saldo y **cuánto efectivo debería haber**.
- Separado por concepto (cuotas, barra, invitados, alquileres, otros) y por medio de pago.
- Registrar gastos y **cerrar la caja** contando el efectivo: muestra si cuadra o la diferencia.

## Fase 5 · Personal y asistencia

**Quién la usa:** administración.

- Quién está trabajando ahora, quién salió y **quién no marcó**.
- Equipo con cargo, área, horario, días trabajados y tardanzas de la semana.
- Alta de trabajadores y cambio de PIN.

**Falta para después:** horarios distintos por día y cálculo de planilla.

## Fase 6 · Tenis y alquileres

- **Tenis:** Tenis 1 y Tenis 2, de 6:00 a 22:00, turnos de una hora. El socio reserva desde su celular; portería o administración reservan a nombre de un socio.
- **Alquileres:** salón principal (completo, 1/2 y 1/3), rincón parrillero, piscina y deck con las **tarifas reales** para socio, no socio e institución. Controla que no se cruce el mismo ambiente el mismo día, el adelanto y el saldo.

## Fase 7 · Cuenta del socio

**Quién la usa:** cada socio desde su celular, con su DNI y su PIN.

- Si está al día, sus cuotas y sus pagos.
- **Carnet digital con código QR** para mostrar en portería.
- Reservar tenis y ver los avisos del club.

## Fase 8 · Reportes y avisos automáticos (siguiente)

- Reporte diario a las 22:30 al grupo de Telegram del club: ingresos, ventas, caja y alertas.
- Reporte mensual para la directiva.
- Los datos ya se pueden abrir y descargar desde Google Sheets.

## Fase 9 · Página web (después)

La web pública del club. Se trabaja cuando me pases el contenido y el diseño.

## Fase 10 · Paso a Supabase (después)

Cuando el club lo decida: más velocidad, más usuarios a la vez y copias de seguridad automáticas. Las pantallas se mantienen.
