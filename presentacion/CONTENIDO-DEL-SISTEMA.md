# Nuevo sistema del Casino de Pimentel
## Compilado de todo lo que tiene el sistema, cómo se usa y cómo se hizo

> Todos los socios, trabajadores, ventas, ingresos y montos que aparecen en las capturas son **datos de ejemplo** (ficticios). Lo que sí es real del club: el logo, la carta de la barra con sus precios, los ambientes con sus tarifas de alquiler y el adicional de cocina, y las reglas del formulario del club (una cancha de tenis, máximo 3 reservas por semana, invitados al comedor sin costo, consumos de la barra a la cuenta del socio).
>
> **Por confirmar con el club:** el monto de la cuota mensual (hoy S/ 80) y su día de vencimiento (hoy el día 10). Son valores de prueba que se cambian en Ajustes sin tocar el sistema.

---

## 1. En una frase

Un solo sistema para todo el club, con un solo ingreso: portería, socios y cuotas, barra, caja, personal, tenis, alquileres, avisos y una app para el socio en su celular. Funciona en celular, tablet y computadora, y hoy cuesta **S/ 0** porque corre sobre Google.

## 2. Para quién es (roles)

| Rol | Quién | Qué ve |
|---|---|---|
| Administración | Administración del club | Todo el sistema y los ajustes |
| Directiva | Presidente y directivos | Todo, solo para revisar (no registra pagos ni ventas) |
| Portería | Porteros, en una tablet en la entrada | Ingresos, invitados, asistencia del personal y tenis |
| Barra | Bartenders y meseros, en una tablet | Vender (también a la cuenta del socio), ventas del día y stock |
| Socio | Cada socio, en su celular | Su cuenta, sus consumos a cuenta, su carnet con QR, reservas de tenis y avisos |

Cada persona entra con lo suyo:
- **Personal**: usuario y clave.
- **Socio**: su DNI y un PIN de 6 números. La primera vez entra con los últimos 6 números de su DNI y el sistema le pide crear su propio PIN.

## 3. Dónde se entra

- Dirección principal: **https://casino-pimentel.vercel.app** (también se puede "Agregar a pantalla de inicio" en el celular y queda como app con el ícono del sol).
- Enlace directo de Google (respaldo).
- Código QR en `marca/qr-casino-pimentel-vercel.png`.

---

## 4. Los módulos, uno por uno

Cada sección tiene arriba un encabezado azul con el nombre, una explicación corta y un botón **"Cómo funciona"** que muestra los pasos.

### Inicio (administración y directiva)
**Para qué sirve:** ver de un vistazo cómo va el club hoy.
- **¿Qué quieres hacer?**: cuatro accesos directos (registrar un ingreso, hacer una venta, cobrar una cuota, reservar tenis).
- **Así va el club hoy**: personas dentro del club, ventas de la barra, dinero en caja y socios al día, explicados en palabras simples.
- **Para revisar hoy**: avisos que llevan directo a resolver (trabajadores que no marcaron, productos que se acaban, socios con 2 cuotas o más, consumos a cuenta por cobrar, alquileres sin adelanto).
- Gráfico de ventas de la barra de los últimos 7 días, próximos alquileres y últimos movimientos de caja.
Capturas: `computadora/03-inicio`, `04-inicio-completo`, `05-inicio-como-funciona`.

### Portería
**Para qué sirve:** registrar quién entra al club y controlar invitados.
Paso a paso:
1. El portero escribe el **DNI, el nombre o el código del carnet** (un lector de códigos también sirve).
2. Ve el estado del socio: **verde = al día**, **amarillo = debe cuotas** (por regla del club puede entrar y se le avisa; se puede cambiar para que no entre).
3. Toca **Registrar ingreso**. Para la familia del socio, toca el nombre de cada familiar.
4. **Invitado**: nombre, DNI, si entra al club (S/ 10), a la piscina (S/ 20) o al comedor (sin costo) y cómo paga. El sistema respeta los límites (5 invitados por socio al día, 3 visitas al mes por invitado), el cobro entra solo a la caja y se **imprime el ticket del invitado**.
5. Lista de quién está dentro y botón **Salida**.
Capturas: `computadora/06` a `09`, `36-porteria-invitado-comedor`, `tablet/01-porteria-busqueda`, `celular/10-porteria-busqueda`.

### Asistencia del personal (dentro de Portería)
1. Cada trabajador tiene un **PIN de 4 números**.
2. La primera vez del día marca su **entrada**; la segunda, su **salida**.
3. Si llega más de 10 minutos tarde, el sistema anota la tardanza solo.
Capturas: `computadora/10-porteria-asistencia`, `tablet/02-porteria-asistencia`.

### Socios y cuotas
**Para qué sirve:** el padrón del club y el cobro de cuotas.
1. Buscar por nombre, DNI o código, o filtrar: **todos, al día, con deuda, suspendidos** (los filtros se deslizan con animación).
2. **Ficha del socio**: datos, familia, sus cuotas del año en colores (pagada, vencida, por pagar), pagos e ingresos al club.
3. **Registrar pago**: se marcan las cuotas que paga y cómo pagó (efectivo, Yape, Plin, tarjeta o transferencia). Se **imprime un recibo** y el dinero entra solo a la caja.
4. **Generar las cuotas del mes** con un botón. Hoy está configurado en S/ 80 por socio, con vencimiento el día 10 del mes siguiente: **monto y día están por confirmar con el club** y se cambian en Ajustes.
5. **Consumos a cuenta**: la ficha muestra lo que el socio cargó a su cuenta en la barra. Administración toca **Cobrar consumos**, se imprime el recibo y el dinero entra a la caja.
6. Socio nuevo (con calendario propio para la fecha de nacimiento), editar, suspender o activar, reiniciar PIN.
Capturas: `computadora/11` a `16`, `35-socio-consumos-a-cuenta`.

### Barra
**Para qué sirve:** vender rápido con la carta real y llevar el stock.
1. Tocar los productos para armar el pedido (con + y − se cambia la cantidad). La carta real tiene 55 productos en 6 categorías.
2. Elegir cómo paga (efectivo, Yape, Plin o tarjeta) y tocar **Cobrar**. Si el socio prefiere pagar después, se elige **A la cuenta**, se busca al socio y se toca **Cargar a la cuenta**: el ticket sale con su nombre y una línea para su firma.
3. **Imprimir el ticket de venta** y entregarlo en la barra para que preparen el pedido. No es boleta ni factura.
4. **Ventas de hoy**: total por medio de pago, reimprimir tickets, y administración puede anular con motivo.
5. **Stock**: botellas, cervezas y gaseosas; avisa cuando queda poco y se registra la mercadería que llega.
Capturas: `computadora/17` a `21`, `33-barra-a-la-cuenta`, `34-barra-ticket-a-cuenta`, `tablet/03-barra-vender`, `celular/09-admin-barra`.

### Caja
**Para qué sirve:** saber cuánto entró, cuánto salió y cuánto efectivo debería haber.
1. Todo lo que se cobra en portería, barra, cuotas y alquileres **entra solo**. Los consumos a la cuenta del socio entran cuando administración los cobra.
2. Separado por concepto (cuotas, barra, invitados, alquileres, otros) y por medio de pago.
3. Los gastos (hielo, gas, limpieza) se registran con **Nuevo movimiento**.
4. **Cerrar caja**: se cuenta el efectivo y el sistema dice si cuadra o la diferencia.
5. Se puede revisar cualquier día anterior.
Capturas: `computadora/22` a `24`.

### Personal
1. Quién está trabajando, quién salió y quién no marcó.
2. **Equipo y semana**: cargo, área, horario, días trabajados y tardanzas de los últimos 7 días.
3. Alta de trabajadores con horario elegido en un selector propio (mañana, tarde, noche) y PIN.
Capturas: `computadora/25` a `27`.

### Tenis
1. Una cancha de tenis, de 6:00 a 22:00, turnos de una hora.
2. Se elige el día y se toca un horario libre.
3. Portería o administración reservan a nombre de un socio; el socio también reserva desde su celular.
4. Cada socio reserva una vez por día y **hasta 3 veces por semana** (de lunes a domingo), con 7 días de anticipación.
5. La cancha de básquet es de uso libre y no se reserva.
Capturas: `computadora/28-tenis`, `celular/06-socio-tenis`.

### Alquileres de ambientes
1. **Nuevo alquiler**: se elige el ambiente y el tipo de cliente (socio, no socio, institución) y **el precio se pone solo** con las tarifas reales. Al rincón parrillero se le puede sumar el **uso de cocina (S/ 400)**.
2. Si deja adelanto queda confirmado y el dinero entra a la caja.
3. Desde cada alquiler se cobra el saldo, se marca como realizado o se cancela.
4. El sistema no deja alquilar el mismo ambiente dos veces el mismo día.
Ambientes: salón principal (completo, 1/2 y 1/3), rincón parrillero, rincón parrillero + jardín, piscina (temporada baja) y deck.
Capturas: `computadora/29-alquileres`, `30-alquiler-nuevo`, `37-alquiler-con-cocina`.

### Avisos
1. Se escribe un título y el mensaje.
2. Al publicar, los socios lo ven en su celular.
3. Se puede ocultar cuando ya no sirve.
Captura: `computadora/31-avisos`.

### Ajustes (solo administración)
- Reglas del club: cuota, día de vencimiento, tarifas de invitados (club, piscina y comedor), límites, tolerancia de tardanza, horarios y topes de tenis (por día y por semana) y si un socio con deuda puede entrar.
- Claves del personal.
- Botón para abrir la base de datos en Google Sheets.
- Botón para reiniciar los datos de ejemplo antes de una demostración.
Captura: `computadora/32-ajustes`.

### App del socio (celular)
1. Entra con su DNI y su PIN (teclado grande y claro). La primera vez crea su propio PIN.
2. **Mi cuenta**: saludo con su nombre, si está al día y cuándo vence su próxima cuota, sus cuotas del año, **sus consumos a cuenta**, pagos, reservas y su familia.
3. **Mi carnet**: carnet digital con código QR para mostrar en portería.
4. **Tenis**: reserva la cancha y ve cuántas reservas le quedan en la semana.
5. **Avisos del club**.
Capturas: `celular/01` a `07`, `11-socio-consumos`. Escena lista: `mockups/escena-app-del-socio.png`.

---

## 5. Tickets que se imprimen (no son boleta ni factura)

- **Ticket de venta** (barra): productos, mesa, quién atendió, total y cómo pagó. "Entregar este ticket en la barra". Si es a la cuenta del socio, sale con su nombre y una línea para su firma.
- **Recibo de consumos** (socios): los consumos a cuenta que el socio pagó en administración.
- **Recibo de cuotas** (socios): socio, meses pagados, total y medio de pago.
- **Ticket de invitado** (portería): invitado, DNI, quién lo invitó, entrada (club, piscina o comedor) y monto.
- Pensados para impresora térmica de 80 mm. Capturas: `computadora/09`, `15`, `19`, `34`.

## 6. Qué hace solo el sistema

- El cobro de invitados, ventas, cuotas, consumos a cuenta y adelantos de alquiler **entra solo a la caja**.
- Suma los **consumos a la cuenta** de cada socio hasta que los paga.
- Cada venta **descuenta el stock**.
- Calcula **si el socio está al día** con la fecha de vencimiento.
- Calcula la **tardanza** del personal.
- Arma la lista **"Para revisar hoy"**.
- Aplica las **reglas del club** (límites de invitados, una reserva de tenis por día y 3 por semana, no cruzar alquileres).
- Calcula el **efectivo que debería haber** en caja y la diferencia al cerrar.
- Guarda **quién hizo qué y a qué hora** (bitácora).

## 7. Cómo funciona por dentro (en simple)

1. **La pantalla**: lo que ve cada persona en su celular, tablet o computadora.
2. **Google Apps Script** (el motor): revisa quién es cada persona, aplica las reglas y hace los cálculos. Corre en los servidores de Google, sin pagar un servidor propio.
3. **Google Sheets** (la base de datos): una hoja de cálculo en el Drive del club con una pestaña por cada cosa (socios, cuotas, pagos, ingresos, ventas, caja, personal…). Se puede abrir, filtrar y descargar a Excel.
4. **Vercel**: da la dirección corta casino-pimentel.vercel.app.
5. **GitHub**: guarda el código y su historial de cambios.

Costo hoy: S/ 0 (Google, Vercel y GitHub en sus planes gratuitos).

## 8. Seguridad

- Cada rol ve solo lo suyo.
- Los PIN y claves se guardan cifrados, nunca como texto.
- 5 intentos fallidos bloquean el ingreso por 5 minutos.
- La sesión se cierra sola a las 6 horas.
- Todo queda registrado en la bitácora.

## 9. Diseño

- Hecho con el **logo real del club**: el sol naranja-amarillo, la ola celeste y el azul del contorno.
- Menú azul, encabezados azules con olas y el sol, fondo celeste suave.
- Todo redondeado; lo seleccionado se ve en celeste claro.
- Calendario, horas y opciones propios (nada de controles cuadrados del navegador).
- Títulos grandes y textos claros, con ayuda "Cómo funciona" en cada sección.
- Animaciones suaves al cambiar de pestaña y al entrar a cada pantalla.

## 10. Cómo lo hicimos (paso a paso)

1. **Entender el club**: qué pasa en portería, barra, caja y con los socios; la carta real, las tarifas reales de los ambientes y las reglas del club.
2. **Primera versión técnica** (base de datos profesional y web). Para tener algo funcionando ya y sin costo, se decidió **pasar el sistema a Google Apps Script con Google Sheets**.
3. **Base de datos y reglas**: una hoja por cada cosa y las reglas del club dentro del sistema.
4. **Pantallas por rol** con la estética del club: administración, directiva, portería, barra y socio.
5. **Pruebas automáticas** entrando con cada rol, en computadora y en celular: ingresos, invitados, asistencia, pagos, ventas, caja, reservas, alquileres y el socio que crea su PIN.
6. **Rediseño** para que se entienda mejor: textos más grandes, ayuda en cada sección, accesos rápidos, calendario propio, tickets imprimibles y una app del socio más personalizada.
7. **Publicación**: en Google, con la dirección corta en Vercel y el código en GitHub.

## 11. Fases

| Fase | Módulo | Estado |
|---|---|---|
| 1 | Portería | Lista |
| 2 | Socios y cuotas | Lista |
| 3 | Barra | Lista |
| 4 | Caja | Lista |
| 5 | Personal y asistencia | Lista |
| 6 | Tenis y alquileres | Lista |
| 7 | App del socio | Lista |
| 8 | Reporte diario automático a Telegram (redactado con IA) | Siguiente |
| 9 | Página web pública | Después |
| 10 | Paso a una base de datos más robusta (Supabase) | Después |

## 12. Lo que falta para usarlo con datos reales

1. Cargar el padrón real de socios (desde Excel).
2. Cambiar las claves de prueba del personal.
3. Una tablet para portería y otra para la barra (o celulares).
4. Una impresora térmica de 80 mm para los tickets.
5. Una capacitación corta con el personal (cada pantalla tiene su "Cómo funciona").
6. Confirmar los precios marcados "por confirmar" en la carta (Sunset Beach, Margarita, Negroni) y la tarifa del deck.
7. Confirmar con el club: el monto de la cuota y su día de vencimiento, si la cancha de fútbol se reserva, si el básquet se reserva y quién de la familia puede reservar tenis (hoy reserva el titular).
