// Genera src/Recursos.html: íconos (Lucide, ISC) y logo del club como datos embebidos.
// Apps Script no sirve archivos estáticos, por eso todo va dentro del HTML.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const raiz = join(aqui, '..')
const lucide = join(raiz, '..', 'web', 'node_modules', 'lucide-static', 'icons')

const ICONOS = {
  inicio: 'house', porteria: 'door-open', socios: 'users', barra: 'martini', caja: 'wallet', personal: 'clock',
  reservas: 'calendar-days', alquileres: 'party-popper', avisos: 'megaphone', ajustes: 'settings', salir: 'log-out',
  buscar: 'search', mas: 'plus', menos: 'minus', check: 'check', cerrar: 'x', derecha: 'chevron-right', izquierda: 'chevron-left',
  usuario: 'user', qr: 'qr-code', atras: 'arrow-left', alerta: 'triangle-alert', borrar: 'trash-2', paquete: 'package',
  carnet: 'id-card', ok: 'circle-check', recargar: 'refresh-cw', hoja: 'file-spreadsheet', llave: 'key-round',
  dinero: 'banknote', retroceso: 'delete', editar: 'pencil', imprimir: 'printer', menu: 'menu', grafico: 'chart-column',
  nuevoSocio: 'user-plus', anular: 'circle-x', info: 'info',
}

const iconos = {}
for (const [nombre, archivo] of Object.entries(ICONOS)) {
  const svg = readFileSync(join(lucide, archivo + '.svg'), 'utf8')
  iconos[nombre] = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>')).replace(/\s+/g, ' ').trim()
}

const datos = (archivo) => 'data:image/png;base64,' + readFileSync(join(raiz, 'recursos', archivo)).toString('base64')

const salida = `<script>
/* Generado por dev/generar-recursos.mjs. No editar a mano. Íconos: Lucide (ISC). */
window.ICONOS = ${JSON.stringify(iconos)};
window.LOGO_CLUB = '${datos('logo.png')}';
window.SOL_CLUB = '${datos('sol.png')}';
</script>
`
writeFileSync(join(raiz, 'src', 'Recursos.html'), salida)
console.log('Recursos.html listo:', Object.keys(iconos).length, 'íconos,', Math.round(salida.length / 1024), 'KB')
