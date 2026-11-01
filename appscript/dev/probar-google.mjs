// Prueba el sistema ya publicado en Google Apps Script (la pantalla corre dentro de dos iframes de Google).
// Uso: node appscript/dev/probar-google.mjs <url-de-la-web-app> [carpeta-capturas]
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require('../../node_modules/@playwright/test')

const URL = process.argv[2]
const salida = process.argv[3] || 'capturas-google'
if (!URL) throw new Error('Falta la URL de la web app')
mkdirSync(salida, { recursive: true })
const errores = []
let paso = 0

const navegador = await chromium.launch({ channel: 'chrome' })

async function abrir(ancho = 1440, alto = 960) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto } })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errores.push('página: ' + e.message))
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 })
  const f = p.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame')
  await f.locator('.acceso, .marco').first().waitFor({ timeout: 90000 })
  return { p, f }
}
async function foto(p, nombre) {
  paso++
  await p.waitForTimeout(400)
  await p.screenshot({ path: `${salida}/${String(paso).padStart(2, '0')}-${nombre}.png` })
}
async function esperarVista(f) {
  await f.locator('#vista').waitFor({ timeout: 60000 })
  await f.locator('#vista .cargando').waitFor({ state: 'detached', timeout: 60000 }).catch(() => {})
  if (await f.locator('#vista .vacio button[data-a=recargar]').count()) errores.push('error en vista: ' + (await f.locator('#vista .vacio p').first().innerText()))
}
async function ir(f, vista) {
  await f.locator(`.riel [data-nav=${vista}]`).click()
  await esperarVista(f)
}
async function tiempo(nombre, fn) {
  const t = Date.now()
  await fn()
  console.log(`${nombre}: ${((Date.now() - t) / 1000).toFixed(1)} s`)
}

// Administración
const { p, f } = await abrir()
await foto(p, 'google-ingreso')
await tiempo('ingreso admin (instala la base si es la primera vez)', async () => {
  await f.getByRole('tab', { name: 'Personal del club' }).click()
  await f.locator('[name=usuario]').fill('admin')
  await f.locator('[name=clave]').fill('Admin2026')
  await f.getByRole('button', { name: 'Ingresar' }).click()
  await esperarVista(f)
})
await foto(p, 'google-admin-inicio')
await tiempo('portería', async () => { await ir(f, 'porteria') })
await f.locator('#buscarSocio').fill('Peralta')
await tiempo('búsqueda de socio', async () => { await f.locator('#resultados article').first().waitFor({ timeout: 60000 }) })
await foto(p, 'google-porteria')
await tiempo('socios', async () => { await ir(f, 'socios') })
await foto(p, 'google-socios')
await tiempo('barra', async () => { await ir(f, 'barra') })
await foto(p, 'google-barra')
await tiempo('caja', async () => { await ir(f, 'caja') })
await foto(p, 'google-caja')

// Socio en celular
const s = await abrir(390, 844)
await s.f.locator('[name=dni]').fill('99107919')
await s.f.getByRole('button', { name: 'Continuar' }).click()
await tiempo('ingreso socio', async () => {
  for (const d of '246810') await s.f.locator(`.teclado [data-d="${d}"]`).click()
  await esperarVista(s.f)
})
await foto(s.p, 'google-socio-cuenta')
await s.f.locator('.tabbar [data-nav=carnet]').click()
await esperarVista(s.f)
await foto(s.p, 'google-socio-carnet')

await navegador.close()
console.log(errores.length ? 'ERRORES:\n' + errores.join('\n') : 'Sin errores')
