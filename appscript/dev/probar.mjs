// Prueba de punta a punta en el servidor local: entra con cada rol, recorre las pantallas y hace las acciones principales.
// Uso: node appscript/dev/probar.mjs [carpeta-capturas]
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require('../../node_modules/@playwright/test')

const URL = process.env.URL || 'http://localhost:3000'
const salida = process.argv[2] || 'capturas'
mkdirSync(salida, { recursive: true })
const errores = []
let paso = 0
let ultimoAviso = ''

const navegador = await chromium.launch({ channel: 'chrome' })

async function nuevaPagina(ancho = 1440, alto = 960) {
  const p = await navegador.newPage({ viewport: { width: ancho, height: alto } })
  p.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errores.push('consola: ' + m.text()) })
  p.on('pageerror', (e) => errores.push('página: ' + e.message))
  return p
}
async function foto(p, nombre) {
  paso++
  await p.waitForTimeout(250)
  await p.screenshot({ path: `${salida}/${String(paso).padStart(2, '0')}-${nombre}.png`, fullPage: false })
}
async function esperarVista(p) {
  await p.waitForFunction(() => !document.querySelector('#vista .cargando, .acceso .cargando'), null, { timeout: 15000 })
  const fallo = await p.locator('#vista .vacio button[data-a=recargar]').count()
  if (fallo) errores.push('error en vista: ' + (await p.locator('#vista .vacio p').first().innerText()))
}
async function ir(p, vista) {
  await p.locator(`.riel [data-nav=${vista}]`).click()
  await esperarVista(p)
}
async function toast(p) {
  await p.waitForFunction((antes) => { const a = document.querySelector('#aviso'); return a.classList.contains('visible') && a.innerText !== antes; }, ultimoAviso, { timeout: 10000 })
  const t = await p.locator('#aviso').innerText()
  const clase = await p.locator('#aviso').getAttribute('class')
  if (/error/.test(clase)) errores.push('aviso de error: ' + t)
  ultimoAviso = t
  return t
}
async function entrarPersonal(p, usuario, clave) {
  await p.goto(URL)
  await p.evaluate(() => localStorage.clear())
  await p.goto(URL)
  await p.getByRole('tab', { name: 'Personal del club' }).click()
  await p.locator('[name=usuario]').fill(usuario)
  await p.locator('[name=clave]').fill(clave)
  await p.getByRole('button', { name: 'Ingresar' }).click()
  await p.waitForSelector('#vista', { timeout: 15000 })
  await esperarVista(p)
}
async function salir(p) {
  await p.locator('.riel [data-a=salir]').click()
  await p.locator('#btnSi').click()
  await p.waitForSelector('.acceso')
}

// ---------- Administración ----------
const p = await nuevaPagina()
await p.goto(URL)
await p.waitForSelector('.acceso')
await foto(p, 'ingreso')
await entrarPersonal(p, 'admin', 'Admin2026')
await foto(p, 'admin-inicio')

await ir(p, 'porteria')
await foto(p, 'porteria')
await p.locator('#buscarSocio').fill('Peralta')
await p.waitForSelector('#resultados article')
await foto(p, 'porteria-busqueda')
const btnIngreso = p.locator('#resultados article').first().getByRole('button', { name: 'Registrar ingreso' })
if (await btnIngreso.isEnabled()) { await btnIngreso.click(); console.log('ingreso:', await toast(p)) }
await p.locator('#buscarSocio').fill('99115838')
await p.waitForSelector('#resultados article')
await p.locator('#resultados article').first().getByRole('button', { name: 'Invitado' }).click()
await p.locator('.modal [name=nombre]').fill('Carlos Prueba Ejemplo')
await p.locator('.modal [name=dni]').fill('70112233')
await foto(p, 'porteria-invitado')
await p.locator('.modal [type=submit]').click()
console.log('invitado:', await toast(p))
await p.waitForSelector('.modal .ticket-papel')
await foto(p, 'porteria-ticket-invitado')
await p.locator('.modal [data-a=cerrarModal]').first().click()
await p.getByRole('tab', { name: 'Asistencia del personal' }).click()
await esperarVista(p)
await p.waitForSelector('#listaAsis .fila')
for (const d of '2468') await p.locator(`.teclado [data-d="${d}"]`).click()
await p.waitForFunction(() => /registrada|ya marcaste|no reconocido/i.test(document.querySelector('#msgAsis').textContent), null, { timeout: 10000 })
console.log('asistencia:', await p.locator('#msgAsis').innerText())
await foto(p, 'porteria-asistencia')

await ir(p, 'socios')
await foto(p, 'socios')
await p.getByRole('button', { name: 'Con deuda' }).click()
await p.locator('#filtroSocios').fill('chirinos')
await p.locator('#listaSocios .fila').first().click()
await esperarVista(p)
await foto(p, 'socio-ficha')
await p.getByRole('button', { name: 'Registrar pago' }).click()
await foto(p, 'socio-pago')
await p.locator('.modal [type=submit]').click()
console.log('pago:', await toast(p))
await p.waitForSelector('.modal .ticket-papel')
await foto(p, 'socio-recibo')
await p.locator('.modal [data-a=cerrarModal]').first().click()
await esperarVista(p)
await p.locator('.volver').click()
await esperarVista(p)
await p.getByRole('button', { name: 'Nuevo socio' }).click()
await p.locator('.modal [name=nombres]').fill('Lucía')
await p.locator('.modal [name=apellidos]').fill('Prueba Ejemplo')
await p.locator('.modal [name=dni]').fill('99887766')
await p.locator('.modal [name=celular]').fill('987654321')
await p.locator('.modal [name=familiares]').fill('Mateo Prueba, hijo')
await p.locator('.modal [data-a=abrirFecha]').click()
await p.locator('.modal [data-a=calAnio]').nth(4).click()
await p.locator('.modal [data-a=calMes]').nth(3).click()
await foto(p, 'socio-calendario')
await p.locator('.modal [data-a=calDia]').nth(11).click()
console.log('fecha de nacimiento elegida:', await p.locator('.modal [data-a=abrirFecha] span').innerText())
await p.locator('.modal [type=submit]').click()
await p.waitForSelector('.modal .exito, #aviso.error.visible')
if (await p.locator('#aviso.error.visible').count()) console.log('nuevo socio: ' + await p.locator('#aviso').innerText())
else console.log('nuevo socio:', (await p.locator('.modal .nota').innerText()).slice(0, 60))
await foto(p, 'socio-nuevo')
await p.locator('.modal [data-a=cerrarModal]').first().click()

await ir(p, 'barra')
await foto(p, 'barra')
const prods = p.locator('#productos .producto:not([disabled])')
await prods.nth(0).click(); await prods.nth(0).click(); await prods.nth(4).click()
await foto(p, 'barra-pedido')
await p.locator('#ticket [data-a=cobrar]').click()
console.log('venta:', await toast(p))
await p.waitForSelector('.modal .ticket-papel')
await foto(p, 'barra-ticket')
await p.locator('.modal [data-a=imprimirTicket]').click()
await p.waitForTimeout(300)
await p.emulateMedia({ media: 'print' })
await p.screenshot({ path: salida + '/ticket-impreso.png' })
await p.emulateMedia({ media: 'screen' })
await p.locator('.modal [data-a=cerrarModal]').first().click()
await p.getByRole('tab', { name: 'Ventas de hoy' }).click()
await esperarVista(p)
await foto(p, 'barra-ventas')
await p.getByRole('tab', { name: 'Stock' }).click()
await esperarVista(p)
await foto(p, 'barra-stock')

await ir(p, 'caja')
await foto(p, 'caja')
await p.getByRole('button', { name: 'Nuevo movimiento' }).click()
await p.locator('.modal [name=concepto]').fill('Compra de hielo (prueba)')
await p.locator('.modal [name=monto]').fill('25')
await p.locator('.modal [type=submit]').click()
console.log('movimiento:', await toast(p))

await ir(p, 'personal')
await foto(p, 'personal')
await p.getByRole('tab', { name: 'Equipo y semana' }).click()
await esperarVista(p)
await foto(p, 'personal-equipo')

await ir(p, 'reservas')
await foto(p, 'reservas')
await p.locator('.chip[data-a=diaTenis]').nth(1).click()
await esperarVista(p)
await p.locator('.turno[data-a=nuevaReserva]').first().click()
await p.locator('#buscarReserva').fill('Peralta')
await p.waitForSelector('#resReserva .fila')
await p.locator('#resReserva .fila').first().click()
console.log('reserva:', await toast(p))

await ir(p, 'alquileres')
await foto(p, 'alquileres')
await p.getByRole('button', { name: 'Nuevo alquiler' }).click()
await p.locator('.modal [name=cliente]').fill('Cliente de prueba')
await p.locator('.modal [data-a=abrirFecha]').click()
await p.locator('.modal [data-a=calMover][data-paso="1"]').click()
await p.locator('.modal [data-a=calDia]').nth(18).click()
await foto(p, 'alquiler-nuevo')
await p.locator('.modal [type=submit]').click()
console.log('alquiler:', await toast(p))

await ir(p, 'avisos')
await foto(p, 'avisos')
await p.locator('.riel [data-nav=ajustes]').click()
await esperarVista(p)
await foto(p, 'ajustes')
await ir(p, 'inicio')
await foto(p, 'admin-inicio-despues')
await salir(p)

// ---------- Portería y barra ----------
await entrarPersonal(p, 'porteria', 'Porteria2026')
await foto(p, 'porteria-rol')
const menuPorteria = await p.locator('.riel nav [data-nav]').evaluateAll((els) => els.map((e) => e.dataset.nav))
console.log('menú portería:', menuPorteria.join(', '))
await salir(p)
await entrarPersonal(p, 'barra', 'Barra2026')
await foto(p, 'barra-rol')
console.log('menú barra:', (await p.locator('.riel nav [data-nav]').evaluateAll((els) => els.map((e) => e.dataset.nav))).join(', '))
await salir(p)

// ---------- Socio en celular ----------
const m = await nuevaPagina(390, 844)
await m.goto(URL)
await m.evaluate(() => localStorage.clear())
await m.goto(URL)
await m.locator('[name=dni]').fill('99107919')
await m.getByRole('button', { name: 'Continuar' }).click()
for (const d of '246810') await m.locator(`.teclado [data-d="${d}"]`).click()
await m.waitForSelector('#vista', { timeout: 15000 })
await esperarVista(m)
await foto(m, 'socio-movil-cuenta')
await m.locator('.tabbar [data-nav=carnet]').click()
await esperarVista(m)
await foto(m, 'socio-movil-carnet')
await m.locator('.tabbar [data-nav=reservas]').click()
await esperarVista(m)
await foto(m, 'socio-movil-tenis')

// Socio que entra por primera vez (PIN temporal = últimos 6 del DNI) y crea su PIN
await m.locator('.barra-sup [data-a=salir]').click()
await m.locator('#btnSi').click()
await m.waitForSelector('.acceso')
await m.locator('[name=dni]').fill('99123757')
await m.getByRole('button', { name: 'Continuar' }).click()
for (const d of '123757') await m.locator(`.teclado [data-d="${d}"]`).click()
await m.waitForFunction(() => /Crea tu PIN|DNI o el PIN/.test(document.body.innerText), null, { timeout: 10000 })
await foto(m, 'socio-movil-crear-pin')
if (await m.getByText('Crea tu PIN personal').count()) {
  for (const d of '583920') await m.locator(`.teclado [data-d="${d}"]`).click()
  await m.waitForSelector('text=Repite tu nuevo PIN')
  for (const d of '583920') await m.locator(`.teclado [data-d="${d}"]`).click()
  await m.waitForSelector('#vista', { timeout: 15000 })
  await esperarVista(m)
  console.log('socio nuevo PIN: entró a', await m.locator('.hero h1').innerText())
}

// Administración en celular
const a = await nuevaPagina(390, 844)
await entrarPersonal(a, 'admin', 'Admin2026')
await foto(a, 'admin-movil-inicio')
await a.locator('.tabbar [data-nav=barra]').click()
await esperarVista(a)
await a.locator('#productos .producto:not([disabled])').first().click()
await foto(a, 'admin-movil-barra')

await navegador.close()
console.log(errores.length ? 'ERRORES:\n' + errores.join('\n') : 'Sin errores')
