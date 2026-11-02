// Arma mockups (laptop, tablet y celular) con las capturas del kit, con fondo transparente,
// y una portada con los tres dispositivos sobre el fondo del club.
// Uso: node appscript/dev/mockups-kit.mjs <carpeta-kit>   (usa <kit>/capturas y escribe en <kit>/mockups)
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require('../../node_modules/@playwright/test')

const kit = process.argv[2]
const salida = `${kit}/mockups`
mkdirSync(salida, { recursive: true })
const img = (ruta) => 'data:image/png;base64,' + readFileSync(`${kit}/capturas/${ruta}`).toString('base64')

const CSS = `
* { box-sizing: border-box; margin: 0; }
body { background: transparent; }
.lienzo { display: inline-block; padding: 70px 80px 90px; }
.laptop { width: 1500px; }
.laptop .tapa { position: relative; background: #0D1117; border-radius: 34px 34px 12px 12px; padding: 24px 24px 30px; box-shadow: inset 0 0 0 2px #2B323C, 0 50px 80px -40px rgba(12, 40, 72, .55); }
.laptop .tapa img { display: block; width: 100%; border-radius: 6px; }
.laptop .camara { position: absolute; top: 9px; left: 50%; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: #3A4350; }
.laptop .base { position: relative; width: 1660px; margin-left: -80px; height: 30px; border-radius: 4px 4px 26px 26px; background: linear-gradient(180deg, #E8ECF1 0%, #C3CBD4 70%, #A9B3BE 100%); box-shadow: 0 30px 50px -24px rgba(12, 40, 72, .5); }
.laptop .muesca { position: absolute; top: 0; left: 50%; width: 220px; margin-left: -110px; height: 11px; border-radius: 0 0 12px 12px; background: #A3ADB8; }
.celular { position: relative; width: 418px; padding: 14px; border-radius: 64px; background: #0D1117; box-shadow: inset 0 0 0 2px #2B323C, inset 0 0 0 5px #11161D, 0 50px 80px -36px rgba(12, 40, 72, .6); }
.celular .pantalla { position: relative; border-radius: 50px; overflow: hidden; }
.celular .pantalla img { display: block; width: 390px; }
.celular .estado { height: 50px; display: flex; align-items: center; justify-content: space-between; padding: 6px 30px 0 34px; color: #fff; font: 600 16px/1 -apple-system, 'Segoe UI', sans-serif; }
.celular .estado.azul { background: #1658A4; }
.celular .estado .iconos { display: flex; gap: 6px; align-items: center; }
.celular .isla { position: absolute; top: 11px; left: 50%; width: 116px; margin-left: -58px; height: 33px; border-radius: 20px; background: #000; }
.celular .boton { position: absolute; width: 4px; border-radius: 3px; background: #1E242C; }
.tablet { position: relative; width: 668px; padding: 24px; border-radius: 54px; background: #0D1117; box-shadow: inset 0 0 0 2px #2B323C, 0 50px 80px -36px rgba(12, 40, 72, .6); }
.tablet .pantalla { border-radius: 30px; overflow: hidden; }
.tablet .pantalla img { display: block; width: 620px; }
.tablet .camara { position: absolute; top: 9px; left: 50%; width: 7px; height: 7px; margin-left: -3px; border-radius: 50%; background: #3A4350; }
.portada { position: relative; width: 1920px; height: 1080px; overflow: hidden;
  background: radial-gradient(70% 70% at 85% 5%, rgba(71, 159, 213, .75), rgba(71, 159, 213, 0) 60%), #1658A4; }
.portada .sol { position: absolute; width: 420px; height: 420px; border-radius: 50%; right: -120px; top: -160px; background: linear-gradient(180deg, #DF8234, #EDB948); }
.portada .olas { position: absolute; left: -80px; bottom: -40px; width: 1300px; opacity: .9; }
.portada .escena { position: absolute; inset: 0; }
`
const laptop = (src) => `<div class="laptop"><div class="tapa"><span class="camara"></span><img src="${src}"></div><div class="base"><span class="muesca"></span></div></div>`
const ICONOS_ESTADO = '<span class="iconos"><svg width="18" height="12" viewBox="0 0 18 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M1.5 4.5a9.5 9.5 0 0 1 13 0"/><path d="M4.5 7.5a5.5 5.5 0 0 1 7 0"/><circle cx="8" cy="10.3" r="1" fill="#fff" stroke="none"/></svg><svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="#fff" opacity=".5"/><rect x="2" y="2" width="17" height="9" rx="2" fill="#fff"/><rect x="25" y="4" width="2" height="5" rx="1" fill="#fff" opacity=".5"/></svg></span>'
const celular = (src) => `<div class="celular"><span class="boton" style="left:-3px;top:150px;height:34px"></span><span class="boton" style="left:-3px;top:210px;height:62px"></span><span class="boton" style="right:-3px;top:230px;height:96px"></span><div class="pantalla"><div class="estado azul"><span>18:30</span>${ICONOS_ESTADO}</div><img src="${src}"><span class="isla"></span></div></div>`
const tablet = (src) => `<div class="tablet"><span class="camara"></span><div class="pantalla"><img src="${src}"></div></div>`
const olas = `<svg class="olas" viewBox="0 0 520 220" fill="none" stroke="white" stroke-linecap="round"><path d="M0 150c60-28 120-28 180 0s120 28 180 0 120-28 160 0" stroke-width="2.4" opacity=".22"/><path d="M0 172c60-28 120-28 180 0s120 28 180 0 120-28 160 0" stroke-width="2.4" opacity=".15"/><path d="M0 194c60-28 120-28 180 0s120 28 180 0 120-28 160 0" stroke-width="2.4" opacity=".1"/></svg>`

const navegador = await chromium.launch({ channel: 'chrome' })
const p = await navegador.newPage({ viewport: { width: 2000, height: 1400 }, deviceScaleFactor: 2 })
let hechos = 0
async function componer(html, nombre, fondo = false) {
  await p.setContent(`<!doctype html><html><head><style>${CSS}</style></head><body>${html}</body></html>`)
  await p.waitForFunction(() => Array.from(document.images).every((i) => i.complete))
  const el = p.locator(fondo ? '.portada' : '.lienzo')
  await el.screenshot({ path: `${salida}/${nombre}.png`, omitBackground: !fondo })
  hechos++
}

const enLaptop = [['03-inicio', 'inicio'], ['05-inicio-como-funciona', 'como-funciona'], ['07-porteria-busqueda', 'porteria'], ['13-socio-ficha', 'socio-ficha'],
  ['15-socio-recibo', 'recibo-cuotas'], ['18-barra-pedido', 'barra-pedido'], ['19-barra-ticket', 'barra-ticket'], ['22-caja', 'caja'], ['25-personal-hoy', 'personal'],
  ['28-tenis', 'tenis'], ['29-alquileres', 'alquileres'], ['31-avisos', 'avisos'], ['16-nuevo-socio-calendario', 'calendario'], ['02-ingreso-personal', 'ingreso'],
  ['33-barra-a-la-cuenta', 'barra-a-la-cuenta'], ['35-socio-consumos-a-cuenta', 'consumos-a-cuenta'], ['37-alquiler-con-cocina', 'alquiler-cocina']]
for (const [archivo, nombre] of enLaptop) await componer(`<div class="lienzo">${laptop(img(`computadora/${archivo}.png`))}</div>`, `laptop-${nombre}`)

const enCelular = [['01-ingreso', 'ingreso'], ['02-pin', 'pin'], ['03-socio-mi-cuenta', 'socio-mi-cuenta'], ['04-socio-mis-cuotas', 'socio-cuotas'], ['05-socio-carnet', 'socio-carnet'],
  ['06-socio-tenis', 'socio-tenis'], ['07-socio-crear-pin', 'socio-crear-pin'], ['08-admin-inicio', 'admin-inicio'], ['09-admin-barra', 'admin-barra'], ['10-porteria-busqueda', 'porteria'], ['11-socio-consumos', 'socio-consumos']]
for (const [archivo, nombre] of enCelular) await componer(`<div class="lienzo">${celular(img(`celular/${archivo}.png`))}</div>`, `celular-${nombre}`)

const enTablet = [['01-porteria-busqueda', 'porteria'], ['02-porteria-asistencia', 'asistencia'], ['03-barra-vender', 'barra']]
for (const [archivo, nombre] of enTablet) await componer(`<div class="lienzo">${tablet(img(`tablet/${archivo}.png`))}</div>`, `tablet-${nombre}`)

// Portada: laptop con el inicio, tablet con la barra y celular con la cuenta del socio
await componer(`<div class="portada"><span class="sol"></span>${olas}<div class="escena">
  <div style="position:absolute;left:150px;top:150px;transform:scale(.74);transform-origin:top left">${laptop(img('computadora/03-inicio.png'))}</div>
  <div style="position:absolute;left:1240px;top:250px;transform:scale(.78);transform-origin:top left">${tablet(img('tablet/03-barra-vender.png'))}</div>
  <div style="position:absolute;left:1080px;top:420px;transform:scale(.86);transform-origin:top left">${celular(img('celular/03-socio-mi-cuenta.png'))}</div>
</div></div>`, 'portada-tres-dispositivos', true)

// Escena para la app del socio: tres celulares
await componer(`<div class="portada"><span class="sol"></span>${olas}<div class="escena">
  <div style="position:absolute;left:330px;top:120px;transform:scale(.92);transform-origin:top left">${celular(img('celular/03-socio-mi-cuenta.png'))}</div>
  <div style="position:absolute;left:760px;top:70px;transform:scale(1);transform-origin:top left">${celular(img('celular/05-socio-carnet.png'))}</div>
  <div style="position:absolute;left:1210px;top:120px;transform:scale(.92);transform-origin:top left">${celular(img('celular/06-socio-tenis.png'))}</div>
</div></div>`, 'escena-app-del-socio', true)

await navegador.close()
console.log(hechos + ' mockups listos en ' + salida)
