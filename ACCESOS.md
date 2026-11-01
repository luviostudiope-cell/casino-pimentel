# Accesos del sistema (datos de ejemplo)

Estos accesos son **de prueba** para la presentación. Antes de usar el sistema con socios reales, cambia las claves en **Ajustes → Usuarios del personal**.

## Dónde entrar

- **En esta PC:** http://localhost:3000
- Para encenderlo, abre una terminal en la carpeta del proyecto y escribe `node appscript/dev/servidor.mjs`
- **Ver la base de datos** (las hojas que se crean en Google Sheets): http://localhost:3000/hoja

## Personal del club

En la pantalla de ingreso toca **"Personal del club"**.

| Usuario | Clave | Qué ve |
|---|---|---|
| `admin` | `Admin2026` | Todo: inicio, portería, socios, barra, caja, personal, tenis, alquileres, avisos y ajustes |
| `directiva` | `Directiva2026` | Todo, pero solo para mirar (no registra pagos ni ventas) |
| `porteria` | `Porteria2026` | Portería (ingresos, invitados, asistencia del personal) y tenis |
| `barra` | `Barra2026` | Barra (vender, ventas del día, stock) |

## Socios (ficticios)

En la pantalla de ingreso deja **"Soy socio"**, escribe el DNI y después el PIN en el teclado.

| DNI | PIN | Para mostrar |
|---|---|---|
| `99107919` | `246810` | Gonzalo Peralta Ugaz: al día, con una reserva de tenis |
| `99115838` | `135790` | Mariela Chirinos Vera: tiene cuotas vencidas |
| `99123757` | `123757` | Pablo: entra por primera vez y crea su propio PIN |

Cualquier otro socio entra la primera vez con los **últimos 6 números de su DNI** y el sistema le pide crear su PIN.

## PIN del personal para marcar asistencia

En **Portería → Asistencia del personal** cada trabajador escribe su PIN de 4 números: la primera vez del día marca la entrada y la segunda, la salida.

| Trabajador | Cargo | PIN |
|---|---|---|
| Rosa Quispe | Bartender | `2468` |
| Luis Vílchez | Bartender | `1357` |
| Marco Antonio Neyra | Encargado de barra | `4321` |
| Segundo Carrasco | Portero | `1010` |
| Wilmer Guevara | Portero | `2020` |
| Milagros Ortiz | Asistente administrativa | `3030` |
| Pedro Llontop | Mantenimiento | `4040` |

## Antes de la presentación

En **Ajustes → Reiniciar datos de ejemplo** el sistema borra lo que hayas probado y vuelve a cargar los datos de ejemplo con la fecha del día.
