// Servidor local: corre el mismo código de Apps Script en Node, con una hoja de cálculo simulada.
// Sirve para ver y probar el sistema en http://localhost:3000 antes de publicarlo en Google.
// Los datos se guardan en dev/datos-locales.json (bórralo para empezar de cero).
import http from 'node:http'
import vm from 'node:vm'
import crypto from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const src = join(aqui, '..', 'src')
const archivoDatos = join(aqui, 'datos-locales.json')
const PUERTO = Number(process.env.PUERTO || 3000)
const ORDEN = ['Datos.js', 'Sesion.js', 'Api.js', 'Instalar.js', 'Codigo.js']

// ---------- Estado persistente (hojas y propiedades) ----------
let estado = existsSync(archivoDatos) ? JSON.parse(readFileSync(archivoDatos, 'utf8')) : { hojas: {}, orden: [], props: {} }
const guardar = () => writeFileSync(archivoDatos, JSON.stringify(estado))

function sinOperacion(objeto) {
  const p = new Proxy(objeto, { get: (t, k) => (k in t ? t[k] : () => p) })
  return p
}

function rango(h, fila, col, nf = 1, nc = 1) {
  const r = {
    getValues() {
      const out = []
      for (let i = 0; i < nf; i++) {
        const f = h.datos[fila - 1 + i] || []
        const o = []
        for (let j = 0; j < nc; j++) o.push(f[col - 1 + j] ?? '')
        out.push(o)
      }
      return out
    },
    setValues(v) {
      if (v.length !== nf || v[0].length !== nc) throw new Error(`setValues: ${v.length}x${v[0].length} no coincide con ${nf}x${nc}`)
      for (let i = 0; i < nf; i++) {
        const idx = fila - 1 + i
        if (idx >= h.max) throw new Error('Las coordenadas están fuera de la hoja')
        h.datos[idx] = h.datos[idx] || []
        for (let j = 0; j < nc; j++) h.datos[idx][col - 1 + j] = v[i][j] == null ? '' : String(v[i][j])
      }
      return p
    },
    setValue(v) { return r.setValues([[v]]) },
    clearContent() {
      for (let i = 0; i < nf; i++) { const f = h.datos[fila - 1 + i]; if (f) for (let j = 0; j < nc; j++) f[col - 1 + j] = '' }
      return p
    },
  }
  const p = sinOperacion(r)
  return p
}

function hojaFalsa(nombre) {
  const h = estado.hojas[nombre]
  return sinOperacion({
    getName: () => nombre,
    getMaxRows: () => h.max,
    getLastRow() {
      for (let i = h.datos.length - 1; i >= 0; i--) if (h.datos[i] && h.datos[i].some((c) => c !== '')) return i + 1
      return 0
    },
    getRange: (f, c, nf, nc) => rango(h, f, c, nf ?? 1, nc ?? 1),
    insertRowsAfter: (r, n) => { h.max += n },
  })
}

const libro = sinOperacion({
  getId: () => 'local',
  getUrl: () => `http://localhost:${PUERTO}/hoja`,
  getSheetByName: (n) => (estado.hojas[n] ? hojaFalsa(n) : null),
  insertSheet(n) { estado.hojas[n] = { datos: [], max: 1000 }; estado.orden.push(n); return hojaFalsa(n) },
  getSheets: () => estado.orden.map(hojaFalsa),
  deleteSheet(h) { const n = h.getName(); delete estado.hojas[n]; estado.orden = estado.orden.filter((x) => x !== n) },
})

const cache = new Map()
function formatoFecha(fecha, zona, patron) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(fecha).map((x) => [x.type, x.value]))
  return patron.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute).replace('ss', p.second)
}

const entorno = {
  console,
  SpreadsheetApp: { openById: () => libro, getActiveSpreadsheet: () => null, create: () => libro, flush() {} },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k) => estado.props[k] ?? null,
      setProperty: (k, v) => { estado.props[k] = String(v) },
      deleteProperty: (k) => { delete estado.props[k] },
    }),
  },
  CacheService: {
    getScriptCache: () => ({
      get(k) { const e = cache.get(k); if (!e || e.vence < Date.now()) return null; return e.valor },
      put(k, v, s = 600) { cache.set(k, { valor: String(v), vence: Date.now() + s * 1000 }) },
      remove(k) { cache.delete(k) },
    }),
  },
  LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' },
    Charset: { UTF_8: 'utf8' },
    computeDigest: (alg, texto) => Array.from(crypto.createHash('sha256').update(String(texto), 'utf8').digest(), (b) => (b > 127 ? b - 256 : b)),
    getUuid: () => crypto.randomUUID(),
    formatDate: formatoFecha,
    sleep() {},
  },
  HtmlService: {},
  Session: { getScriptTimeZone: () => 'America/Lima' },
}

// ---------- Carga del código de Apps Script (se recarga si cambia) ----------
let contexto = null
let firma = ''
function firmaArchivos() { return readdirSync(src).map((f) => f + statSync(join(src, f)).mtimeMs).join('|') }
function cargarCodigo() {
  const f = firmaArchivos()
  if (contexto && f === firma) return
  firma = f
  contexto = vm.createContext({ ...entorno })
  const codigo = ORDEN.map((a) => `// ${a}\n` + readFileSync(join(src, a), 'utf8')).join('\n')
  vm.runInContext(codigo, contexto, { filename: 'apps-script.js' })
  console.log('Código de Apps Script cargado')
}

function pagina() {
  const incluir = (n) => readFileSync(join(src, n + '.html'), 'utf8')
  const simulador = `<script>
  // Simula google.script.run del navegador de Apps Script
  window.google = { script: { run: (function crear(ok, mal) {
    return new Proxy({}, { get: function (_, k) {
      if (k === 'withSuccessHandler') return function (f) { return crear(f, mal); };
      if (k === 'withFailureHandler') return function (f) { return crear(ok, f); };
      return function () {
        var args = Array.prototype.slice.call(arguments);
        fetch('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fn: k, args: args }) })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (j.error) { if (mal) mal(new Error(j.error)); } else if (ok) ok(j.resultado); })
          .catch(function (e) { if (mal) mal(e); });
      };
    } });
  })() } };
  </script>`
  return incluir('Index')
    .replace(/<\?!=\s*incluir\('([^']+)'\);?\s*\?>/g, (_, n) => incluir(n))
    .replace('<head>', '<head>\n' + simulador)
}

function verHoja() {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const pestanas = estado.orden.map((n) => {
    const d = estado.hojas[n].datos.filter((f) => f && f.some((c) => c !== ''))
    const filas = d.slice(0, 400).map((f, i) => `<tr>${f.map((c) => (i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(String(c).slice(0, 80))}</td>`)).join('')}</tr>`).join('')
    return `<details${n === 'Socios' ? ' open' : ''}><summary>${esc(n)} · ${Math.max(0, d.length - 1)} filas</summary><div class="t"><table>${filas}</table></div></details>`
  }).join('')
  return `<!doctype html><meta charset="utf-8"><title>Base de datos (simulada)</title><style>body{font:14px system-ui;margin:24px;color:#111}summary{font-weight:600;padding:10px 0;cursor:pointer}.t{overflow:auto;max-height:60vh;border:1px solid #eee;border-radius:12px}table{border-collapse:collapse}th,td{padding:6px 10px;border-bottom:1px solid #eee;white-space:nowrap;text-align:left}th{background:#EAF4FB;position:sticky;top:0}</style><h1>Base de datos local</h1><p>Así se verán las hojas en Google Sheets.</p>${pestanas}`
}

http.createServer((req, res) => {
  try {
    cargarCodigo()
    if (req.method === 'POST' && req.url === '/api') {
      let cuerpo = ''
      req.on('data', (c) => { cuerpo += c })
      req.on('end', () => {
        try {
          const { fn, args } = JSON.parse(cuerpo || '{}')
          if (fn !== 'api') throw new Error('Función no permitida: ' + fn)
          const resultado = contexto.api(...args)
          guardar()
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ resultado }))
        } catch (e) {
          console.error(e)
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: String(e.message || e) }))
        }
      })
      return
    }
    if (req.url === '/favicon.ico') {
      res.writeHead(200, { 'Content-Type': 'image/png' })
      return res.end(readFileSync(join(aqui, '..', 'recursos', 'sol.png')))
    }
    if (req.url === '/hoja') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(verHoja())
    }
    if (req.url === '/' || req.url.startsWith('/?')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      return res.end(pagina())
    }
    res.writeHead(404); res.end('No encontrado')
  } catch (e) {
    console.error(e)
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(String(e.stack || e))
  }
}).listen(PUERTO, () => console.log(`Casino de Pimentel (local) en http://localhost:${PUERTO}`))
