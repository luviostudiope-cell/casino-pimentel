// Arma las composiciones "antes y después" del caso de éxito (1920 × 1080, al doble de resolución).
// Uso: node appscript/dev/antes-despues.mjs <carpeta-proceso>
//   <carpeta-proceso> es la carpeta con las etapas (01-antes-papel-y-excel … 08-sistema-final); escribe en <carpeta-proceso>/antes-despues
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync } from 'node:fs'
import { extname } from 'node:path'
const require = createRequire(import.meta.url)
const { chromium } = require('../../node_modules/@playwright/test')

const base = process.argv[2]
if (!base) throw new Error('Falta la carpeta del proceso')
const salida = `${base}/antes-despues`
mkdirSync(salida, { recursive: true })
const raiz = new URL('../../', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
const img = (ruta) => `data:image/${extname(ruta) === '.png' ? 'png' : 'jpeg'};base64,` + readFileSync(ruta).toString('base64')
const de = (ruta) => img(`${base}/${ruta}`)
const logo = img(`${raiz}presentacion/marca/logo-casino-pimentel-blanco.png`)

const CSS = `
* { box-sizing: border-box; margin: 0; }
body { width: 1920px; height: 1080px; overflow: hidden; font-family: 'Plus Jakarta Sans', sans-serif; color: #fff;
  background: radial-gradient(900px 600px at 88% 0%, rgba(71, 159, 213, .55), transparent 70%), linear-gradient(160deg, #1A63B5 0%, #1658A4 45%, #0C3F7C 100%); position: relative; }
.sol { position: absolute; right: -150px; top: -190px; width: 440px; height: 440px; border-radius: 50%; background: linear-gradient(180deg, #DF8234, #EDB948); opacity: .92; }
.olas { position: absolute; left: 0; bottom: -10px; width: 100%; height: 260px; }
.marco { position: relative; height: 100%; padding: 64px 96px 0; display: flex; flex-direction: column; }
.arriba { display: flex; align-items: center; gap: 22px; }
.arriba img { height: 52px; }
.etiqueta { font: 600 20px/1 'Plus Jakarta Sans'; padding: 12px 22px; border-radius: 999px; background: rgba(255, 255, 255, .14); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .22); }
h1 { font: 700 64px/1.05 Outfit; letter-spacing: -.02em; margin-top: 38px; }
.bajada { font: 500 26px/1.4 'Plus Jakarta Sans'; color: rgba(255, 255, 255, .82); margin-top: 12px; max-width: 1300px; }
.lados { flex: 1; display: grid; grid-template-columns: 1fr 96px 1fr; align-items: center; margin-top: 30px; padding-bottom: 70px; }
.lado { display: flex; flex-direction: column; align-items: center; gap: 22px; }
.pill { font: 700 19px/1 Outfit; letter-spacing: .08em; text-transform: uppercase; padding: 12px 24px; border-radius: 999px; }
.pill.antes { background: rgba(255, 255, 255, .16); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .3); }
.pill.despues { background: linear-gradient(180deg, #EDB948, #DF8234); color: #0E2A47; }
.cuadro { display: flex; align-items: center; justify-content: center; height: 560px; width: 100%; }
.tarjeta { background: #fff; border-radius: 28px; overflow: hidden; box-shadow: 0 50px 90px -40px rgba(4, 18, 44, .75), 0 0 0 1px rgba(255, 255, 255, .2); line-height: 0; }
.tarjeta.foto { padding: 18px; }
.tarjeta.foto img { border-radius: 14px; }
.tarjeta.celular { border-radius: 40px; border: 10px solid #0D1117; }
.tarjeta img { display: block; max-width: 100%; }
.mockup img { display: block; margin: -56px 0 -64px; filter: drop-shadow(0 40px 60px rgba(4, 18, 44, .45)); }
.texto { font: 500 22px/1.45 'Plus Jakarta Sans'; color: rgba(255, 255, 255, .9); text-align: center; max-width: 720px; min-height: 64px; }
.flecha { width: 72px; height: 72px; border-radius: 50%; background: #fff; color: #1658A4; display: grid; place-items: center; justify-self: center; box-shadow: 0 20px 40px -16px rgba(4, 18, 44, .6); }
.pie { position: absolute; left: 96px; bottom: 34px; font: 500 17px/1 'Plus Jakarta Sans'; color: rgba(255, 255, 255, .6); }
/* Línea de tiempo */
.linea { position: relative; margin-top: 70px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 18px; }
.linea::before { content: ''; position: absolute; left: 40px; right: 40px; top: 31px; height: 3px; border-radius: 3px; background: rgba(255, 255, 255, .25); }
.hito { position: relative; display: flex; flex-direction: column; gap: 14px; }
.punto { width: 64px; height: 64px; border-radius: 50%; background: #fff; color: #1658A4; display: grid; place-items: center; font: 700 26px/1 Outfit; box-shadow: 0 16px 30px -14px rgba(4, 18, 44, .7); }
.hito:last-child .punto { background: linear-gradient(180deg, #EDB948, #DF8234); color: #0E2A47; }
.fecha { font: 700 24px/1 Outfit; margin-top: 10px; }
.hito p { font: 500 19px/1.45 'Plus Jakarta Sans'; color: rgba(255, 255, 255, .86); min-height: 84px; }
.mini { width: 100%; height: 300px; border-radius: 18px; overflow: hidden; background: #fff; margin-top: 8px; box-shadow: 0 30px 50px -30px rgba(4, 18, 44, .8), 0 0 0 1px rgba(255, 255, 255, .25); }
.mini img { width: 100%; height: 100%; object-fit: cover; object-position: top left; display: block; }
`
const olas = `<svg class="olas" viewBox="0 0 1920 260" preserveAspectRatio="none" fill="none" stroke="white" stroke-linecap="round"><path d="M0 170c240-70 480-70 720 0s480 70 720 0 360-50 480-20" stroke-width="3" opacity=".2"/><path d="M0 200c240-70 480-70 720 0s480 70 720 0 360-50 480-20" stroke-width="3" opacity=".13"/><path d="M0 230c240-70 480-70 720 0s480 70 720 0 360-50 480-20" stroke-width="3" opacity=".08"/></svg>`
const flecha = `<div class="flecha"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>`
const encabezado = (titulo, bajada) => `<div class="arriba"><img src="${logo}" alt=""><span class="etiqueta">Antes y después</span></div><h1>${titulo}</h1><p class="bajada">${bajada}</p>`

// Cada lado: { src, tipo: 'foto' | 'pantalla' | 'celular' | 'mockup', alto, texto }
function lado(clase, rotulo, l) {
  const alto = l.alto || 520
  const estilo = l.tipo === 'mockup' ? `max-height:${alto + 120}px;max-width:860px` : `max-height:${alto}px;max-width:${l.tipo === 'celular' ? 340 : 780}px`
  const imagen = l.tipo === 'mockup' ? `<div class="mockup"><img src="${l.src}" style="${estilo}" alt=""></div>` : `<div class="tarjeta ${l.tipo}"><img src="${l.src}" style="${estilo}" alt=""></div>`
  return `<div class="lado"><span class="pill ${clase}">${rotulo}</span><div class="cuadro">${imagen}</div><p class="texto">${l.texto}</p></div>`
}
const comparar = (titulo, bajada, antes, despues, pie = 'Casino de Pimentel · Las pantallas muestran datos de ejemplo') =>
  `<span class="sol"></span>${olas}<div class="marco">${encabezado(titulo, bajada)}<div class="lados">${lado('antes', 'Antes', antes)}${flecha}${lado('despues', 'Después', despues)}</div></div><p class="pie">${pie}</p>`

const fotos = '01-antes-papel-y-excel'
const v1 = '02-primera-plataforma-sin-base'
const v2 = '03-primer-sistema-en-google'
const v3 = '04-rediseno-estetica-del-club'
const fin = '08-sistema-final'
const mock = (n) => img(`${raiz}presentacion/mockups/${n}.png`)

const piezas = [
  ['01-linea-de-tiempo', `<span class="sol"></span>${olas}<div class="marco">${encabezado('Del papel a un sistema propio', 'Casino de Pimentel · del 27 de octubre al 2 de noviembre de 2026')}
    <div class="linea">${[
      ['27 oct', 'Primer contacto con el club y levantamiento de información', `${fotos}/04-comanda-en-papel.jpg`],
      ['29 oct', 'Llega la información del club: carta, insumos, tarifas y reglas', `${fotos}/10-tarifas-alquiler-ambientes.jpg`],
      ['30 oct', 'Primera plataforma: web, app y base de datos, aún sin conectar', `${v1}/01-sistema-de-diseno-escritorio.png`],
      ['1 nov', 'Cambio a Google: el sistema funciona y cuesta S/ 0', `${v2}/02-admin-inicio.png`],
      ['1 nov', 'Rediseño con el logo, los colores y la ayuda en cada sección', `${v3}/computadora/03-inicio.png`],
      ['2 nov', 'Publicación en Google y Vercel, y kit de presentación', '06-kit-de-presentacion/portada-tres-dispositivos.png'],
      ['2 nov', 'Correcciones con el formulario del club', `${fin}/computadora/33-barra-a-la-cuenta.png`],
    ].map(([f, t, m], i) => `<div class="hito"><span class="punto">${i + 1}</span><span class="fecha">${f}</span><p>${t}</p><div class="mini"><img src="${de(m)}" alt=""></div></div>`).join('')}</div></div>
    <p class="pie">Casino de Pimentel · Fechas tomadas del historial del proyecto</p>`],
  ['02-porteria', comparar('Portería', 'El ingreso al club y el control de invitados.',
    { src: de(`${fotos}/07-talonario-ingreso-porteria.jpg`), tipo: 'foto', alto: 470, texto: 'Talonario numerado a mano: nombre, DNI y fecha de cada persona.' },
    { src: mock('tablet-porteria'), tipo: 'mockup', alto: 520, texto: 'Se busca al socio por DNI, nombre o carnet. El invitado se cobra y sale con su ticket.' })],
  ['03-barra', comparar('Barra', 'Del pedido a la caja.',
    { src: de(`${fotos}/04-comanda-en-papel.jpg`), tipo: 'foto', alto: 520, texto: 'Comanda en papel, llenada a mano en cada mesa.' },
    { src: mock('tablet-barra'), tipo: 'mockup', alto: 520, texto: 'Pedido en la tablet con la carta real, cobro por Yape, Plin, efectivo, tarjeta o a la cuenta del socio.' })],
  ['04-stock', comparar('Stock de licores', 'Control de botellas y onzas.',
    { src: de(`${fotos}/05-kardex-licores-manual.jpg`), tipo: 'foto', alto: 470, texto: 'Kardex manual en botellas y onzas; el cierre de barra se hacía una vez al mes.' },
    { src: de(`${fin}/computadora/21-barra-stock.png`), tipo: 'pantalla', alto: 470, texto: 'Cada venta descuenta el stock y el sistema avisa cuando un producto se acaba.' })],
  ['05-precios', comparar('Precios de la carta', 'Una sola lista para todo el club.',
    { src: de(`${fotos}/03-lista-precios-interna.jpg`), tipo: 'foto', alto: 520, texto: 'Carta impresa y lista interna, con precios distintos para el mismo trago.' },
    { src: de(`${fin}/computadora/17-barra.png`), tipo: 'pantalla', alto: 470, texto: 'La carta real de 55 productos, con un solo precio por producto.' })],
  ['06-alquileres', comparar('Alquiler de ambientes', 'Salón, rincón parrillero, piscina y deck.',
    { src: de(`${fotos}/10-tarifas-alquiler-ambientes.jpg`), tipo: 'foto', alto: 440, texto: 'Tarifas en Excel y cada alquiler coordinado a mano.' },
    { src: de(`${fin}/computadora/37-alquiler-con-cocina.png`), tipo: 'pantalla', alto: 470, texto: 'El precio se pone solo según el ambiente y el cliente, con el adicional de cocina.' })],
  ['07-diseno', comparar('El diseño del sistema', 'De la primera versión funcional al rediseño con la identidad del club.',
    { src: de(`${v2}/02-admin-inicio.png`), tipo: 'pantalla', alto: 470, texto: 'Primera versión en Google: funcionaba, pero se veía genérica.' },
    { src: de(`${fin}/computadora/03-inicio.png`), tipo: 'pantalla', alto: 470, texto: 'Colores y logo del club, accesos rápidos, textos más grandes y ayuda "Cómo funciona".' })],
  ['08-app-del-socio', comparar('La app del socio', 'Lo que ve cada socio en su celular.',
    { src: de(`${v2}/26-socio-movil-cuenta.png`), tipo: 'celular', alto: 560, texto: 'Primera versión: correcta, pero básica.' },
    { src: de(`${fin}/celular/03-socio-mi-cuenta.png`), tipo: 'celular', alto: 560, texto: 'Saludo con su nombre, colores del club, cuotas, consumos, carnet con QR y tenis.' })],
  ['09-ingreso', comparar('Poder entrar', 'De una vista previa a un sistema en uso.',
    { src: de(`${v1}/02-app-ingreso-sin-base-de-datos.png`), tipo: 'pantalla', alto: 470, texto: 'Primera plataforma: completa, pero sin base de datos conectada. Nadie podía entrar.' },
    { src: de(`${fin}/computadora/01-ingreso-socio.png`), tipo: 'pantalla', alto: 470, texto: 'En Google: cada persona entra con lo suyo. El socio, con su DNI y su PIN.' })],
  ['10-reglas-del-club', comparar('Las reglas del club', 'Corregido con el formulario que llenó el club.',
    { src: de(`${v3}/computadora/28-tenis.png`), tipo: 'pantalla', alto: 470, texto: 'Se habían configurado 2 canchas de tenis, según la investigación inicial.' },
    { src: de(`${fin}/computadora/28-tenis.png`), tipo: 'pantalla', alto: 470, texto: 'Una cancha de tenis y máximo 3 reservas por socio a la semana.' })],
]

const navegador = await chromium.launch({ channel: 'chrome' })
const p = await navegador.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
for (const [nombre, html] of piezas) {
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>${CSS}</style></head><body>${html}</body></html>`, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: `${salida}/${nombre}.png` })
}
await navegador.close()
console.log(piezas.length + ' composiciones en ' + salida)
