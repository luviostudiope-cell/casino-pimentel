// Capturas del "después" en celular (390), tablet (820) y escritorio (1440) para el caso de éxito.
// Uso: node scripts/capturas.mjs <archivo-de-tomas.json> [baseURL]
// Cada toma: { "nombre": "01-web-inicio", "ruta": "/", "completa": true, "login": { "tipo": "staff"|"socio", ... }, "pasos": [...] }
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'

const [, , archivo, base = 'http://localhost:8888'] = process.argv
const tomas = JSON.parse(readFileSync(archivo, 'utf8'))
const DISPOSITIVOS = [
  { sufijo: 'celular', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { sufijo: 'tablet', viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { sufijo: 'escritorio', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
]
const salida = 'caso-de-exito/despues'
mkdirSync(salida, { recursive: true })

const navegador = await chromium.launch({ channel: 'chrome' })
for (const d of DISPOSITIVOS) {
  const ctx = await navegador.newContext({ ...d, locale: 'es-PE', timezoneId: 'America/Lima', colorScheme: 'light', reducedMotion: 'reduce' })
  const pagina = await ctx.newPage()
  for (const t of tomas) {
    if (t.solo && !t.solo.includes(d.sufijo)) continue
    try {
      await pagina.goto(base + t.ruta, { waitUntil: 'networkidle' })
      for (const p of t.pasos ?? []) {
        if (p.click) await pagina.locator(p.click).first().click()
        if (p.llenar) await pagina.locator(p.llenar[0]).first().fill(p.llenar[1])
        if (p.teclas) await pagina.keyboard.type(p.teclas, { delay: 40 })
        if (p.esperar) await pagina.waitForTimeout(p.esperar)
        if (p.ver) await pagina.locator(p.ver).first().waitFor({ timeout: 15000 })
      }
      await pagina.waitForTimeout(t.espera ?? 600)
      await pagina.screenshot({ path: `${salida}/${t.nombre}-${d.sufijo}.png`, fullPage: Boolean(t.completa) })
      console.log('✓', `${t.nombre}-${d.sufijo}.png`)
    } catch (e) {
      console.log('✗', t.nombre, d.sufijo, e.message.split('\n')[0])
    }
  }
  await ctx.close()
}
await navegador.close()
