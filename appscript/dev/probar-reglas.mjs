// Prueba las reglas del club directamente contra el servidor local (sin pantalla).
// Uso: node appscript/dev/probar-reglas.mjs   (con el servidor local encendido y datos de ejemplo)
const URL = process.env.URL || 'http://localhost:3000'
let fallas = 0
const ok = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLA') + ' · ' + texto); if (!cond) fallas++ }

async function api(accion, token, datos) {
  const r = await fetch(URL + '/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: 'api', args: [accion, token, datos || {}] }) })
  return (await r.json()).resultado
}
const entrar = async (usuario, clave) => (await api('ingresar', null, { modo: 'personal', usuario, clave })).datos.token
const sumarDias = (iso, n) => { const [a, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(a, m - 1, d + n, 12)).toISOString().slice(0, 10) }

const admin = await entrar('admin', 'Admin2026')
const barra = await entrar('barra', 'Barra2026')
const gonzalo = (await api('buscarSocios', admin, { q: '99107919' })).datos[0]

// Tenis: una sola cancha y máximo 3 reservas por semana
const dia = await api('reservasDia', admin, {})
ok(dia.datos.canchas.length === 1 && dia.datos.canchas[0] === 'Tenis', 'Hay una sola cancha de tenis')
ok(dia.datos.maxSemana === 3, 'El tope semanal es 3')
const hoy = dia.datos.hoy
// Semana de prueba dentro de los 7 días de anticipación: la actual si le quedan 4 días o más, si no la siguiente
const diaSemana = (new Date(hoy + 'T12:00:00Z').getUTCDay() + 6) % 7
const lunes = sumarDias(hoy, -diaSemana)
const semana = 6 - diaSemana >= 4 ? lunes : sumarDias(lunes, 7)
const dias = [0, 1, 2, 3, 4, 5, 6].map((i) => sumarDias(semana, i)).filter((f) => f > hoy && f <= sumarDias(hoy, 7))
const rechazos = []
for (const f of dias) {
  for (const hora of ['21:00', '20:00', '19:00']) {
    const r = await api('reservar', admin, { fecha: f, hora, cancha: 'Tenis', socio_id: gonzalo.id })
    if (r.ok || !/ya fue tomado/.test(r.error)) { if (!r.ok) rechazos.push(r.error); break }
  }
}
const enSemana = (await Promise.all([0, 1, 2, 3, 4, 5, 6].map((i) => api('reservasDia', admin, { fecha: sumarDias(semana, i) }))))
  .reduce((n, r) => n + r.datos.reservas.filter((x) => x.socio.includes('Gonzalo')).length, 0)
const semanal = rechazos.find((e) => /3 reservas/.test(e))
ok(enSemana === 3, 'Gonzalo llega a 3 reservas en la semana y no pasa de ahí (tiene ' + enSemana + ')')
ok(Boolean(semanal), 'La reserva de más se rechaza con un mensaje claro: ' + semanal)
ok(!(await api('reservar', admin, { fecha: sumarDias(hoy, 1), hora: '07:00', cancha: 'Tenis 2', socio_id: gonzalo.id })).ok, 'No existe la cancha "Tenis 2"')

// Invitados: comedor sin costo, no entra a caja
const cajaAntes = (await api('cajaDia', admin, {})).datos
const inv = await api('registrarInvitado', admin, { socio_id: gonzalo.id, nombre: 'Ana Prueba Comedor', dni: '70990011', tarifa: 'comedor' })
ok(inv.ok && inv.datos.monto === 0 && inv.datos.entrada === 'comedor', 'El invitado al comedor se registra sin costo')
const cajaDespues = (await api('cajaDia', admin, {})).datos
ok(cajaDespues.movimientos.length === cajaAntes.movimientos.length, 'El invitado al comedor no crea movimiento de caja')
const invClub = await api('registrarInvitado', admin, { socio_id: gonzalo.id, nombre: 'Luis Prueba Club', dni: '70990012', tarifa: 'club', medio: 'yape' })
ok(invClub.ok && invClub.datos.monto === 10, 'El invitado al club sigue pagando S/ 10')

// Alquileres: uso de cocina solo con el rincón parrillero
const conCocina = await api('guardarAlquiler', admin, { ambiente: 'Rincón parrillero', tipo: 'socio', fecha: sumarDias(hoy, 30), cliente: 'Prueba Cocina', monto: 800, adelanto: 0, cocina: 'si' })
const alq = (await api('listarAlquileres', admin, {})).datos
ok(conCocina.ok && alq.alquileres.some((a) => a.cliente === 'Prueba Cocina' && /Incluye uso de cocina/.test(a.nota)), 'El alquiler del rincón parrillero guarda el uso de cocina')
ok(alq.cocina && alq.cocina.precio === 400, 'El adicional de cocina cuesta S/ 400')
const salonCocina = await api('guardarAlquiler', admin, { ambiente: 'Salón principal 1/3', tipo: 'socio', fecha: sumarDias(hoy, 31), cliente: 'Prueba Salón', monto: 350, adelanto: 0, cocina: 'si' })
ok(!salonCocina.ok, 'No se puede sumar cocina al salón: ' + salonCocina.error)

// Barra: consumo a la cuenta del socio
const productos = (await api('barraHoy', barra, {})).datos.productos.filter((p) => p.activo && (!p.controla || p.stock > 2))
const cajaBarraAntes = (await api('cajaDia', admin, {})).datos.movimientos.length
const venta = await api('registrarVenta', barra, { items: [{ id: productos[0].id, cant: 2 }], medio: 'cuenta', socio_id: gonzalo.id, mesa: '3' })
ok(venta.ok && venta.datos.socio.includes('Gonzalo'), 'La barra carga un consumo a la cuenta de Gonzalo')
ok((await api('cajaDia', admin, {})).datos.movimientos.length === cajaBarraAntes, 'El consumo a cuenta no entra a caja todavía')
const sinSocio = await api('registrarVenta', barra, { items: [{ id: productos[0].id, cant: 1 }], medio: 'cuenta' })
ok(!sinSocio.ok, 'Sin elegir socio no se puede cargar a la cuenta')
const ficha = (await api('verSocio', admin, { id: gonzalo.id })).datos
ok(ficha.consumos.length >= 2 && ficha.consumosTotal > 0, 'La ficha de Gonzalo muestra ' + ficha.consumos.length + ' consumos por ' + ficha.consumosTotal)
const cuotaConCuenta = await api('registrarPago', admin, { socio_id: gonzalo.id, cuotas: ficha.cuotas.filter((c) => c.estado !== 'pagada').map((c) => c.id), medio: 'cuenta' })
ok(!cuotaConCuenta.ok, 'Las cuotas no se pueden pagar "a la cuenta"')
const cobro = await api('cobrarConsumos', admin, { socio_id: gonzalo.id, medio: 'efectivo' })
ok(cobro.ok && cobro.datos.total === ficha.consumosTotal, 'Administración cobra los consumos: ' + (cobro.datos && cobro.datos.total))
const cajaFinal = (await api('cajaDia', admin, {})).datos
ok(cajaFinal.movimientos.some((m) => /Consumos a cuenta de Gonzalo/.test(m.concepto)), 'El cobro de consumos entra a caja')
ok((await api('verSocio', admin, { id: gonzalo.id })).datos.consumos.length === 0, 'Después del cobro ya no quedan consumos pendientes')
const pocoCuenta = await api('cobrarConsumos', barra, { socio_id: gonzalo.id, medio: 'efectivo' })
ok(!pocoCuenta.ok, 'La barra no puede cobrar consumos (solo administración)')

console.log(fallas ? fallas + ' falla(s)' : 'Todas las reglas funcionan')
process.exit(fallas ? 1 : 0)
