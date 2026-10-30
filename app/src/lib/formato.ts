// Formatos de moneda, fecha y hora en es-PE y hora de Lima.
export const ZONA = 'America/Lima'

const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const solesCortos = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0, maximumFractionDigits: 2 })
const entero = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 })

/** S/ 1,234.50 */
export function moneda(n: number | null | undefined): string {
  return soles.format(Number(n ?? 0)).replace(/ /g, ' ')
}
/** S/ 80 · S/ 12.50 (sin decimales cuando son cero) */
export function monedaCorta(n: number | null | undefined): string {
  return solesCortos.format(Number(n ?? 0)).replace(/ /g, ' ')
}
export function numero(n: number | null | undefined, decimales = false): string {
  return (decimales ? decimal : entero).format(Number(n ?? 0))
}

function aFecha(d: Date | string): Date {
  return typeof d === 'string' ? new Date(d.length === 10 ? d + 'T12:00:00-05:00' : d) : d
}

/** jueves 30 de octubre */
export function fechaLarga(d: Date | string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' }).format(aFecha(d))
}
/** 30 oct 2026 */
export function fechaCorta(d: Date | string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric' }).format(aFecha(d)).replace('.', '')
}
/** 30/10 */
export function diaMes(d: Date | string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, day: '2-digit', month: '2-digit' }).format(aFecha(d))
}
/** 9:05 p. m. → 21:05 (24 h, más claro en tablets) */
export function hora(d: Date | string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }).format(aFecha(d))
}
export function fechaHora(d: Date | string): string {
  return `${fechaCorta(d)} · ${hora(d)}`
}
/** octubre 2026 */
export function mesAnio(d: Date | string): string {
  const t = new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, month: 'long', year: 'numeric' }).format(aFecha(d))
  return t.replace(' de ', ' ')
}
export function mesCorto(d: Date | string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, month: 'short' }).format(aFecha(d)).replace('.', '')
}

/** Fecha de hoy en Lima como YYYY-MM-DD */
export function hoyLima(desplazarDias = 0): string {
  const d = new Date(Date.now() + desplazarDias * 86400000)
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d)
  const v = (t: string) => p.find((x) => x.type === t)?.value
  return `${v('year')}-${v('month')}-${v('day')}`
}
export function horaLimaAhora(): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', hour12: false }).format(new Date()))
}

export function saludo(): string {
  const h = horaLimaAhora()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
}

/** "Pérez García, Juan Carlos" → "Juan Carlos Pérez" */
export function nombreCorto(nombres: string, apellidos?: string | null): string {
  const ap = (apellidos ?? '').trim().split(/\s+/)[0] ?? ''
  return `${nombres.trim().split(/\s+/)[0]} ${ap}`.trim()
}

export function plural(n: number, uno: string, varios: string): string {
  return `${numero(n)} ${n === 1 ? uno : varios}`
}

/** Botellas y onzas a partir de onzas totales: 2 bot + 7.4 oz */
export function botellasOnzas(oz: number, ozPorBotella: number | null | undefined): { botellas: number; onzas: number } {
  if (!ozPorBotella || ozPorBotella <= 0) return { botellas: 0, onzas: Math.round(oz * 10) / 10 }
  const signo = oz < 0 ? -1 : 1
  const abs = Math.abs(oz)
  const botellas = Math.floor(abs / ozPorBotella + 1e-9)
  const onzas = Math.round((abs - botellas * ozPorBotella) * 10) / 10
  return { botellas: botellas * signo, onzas: onzas * signo }
}
