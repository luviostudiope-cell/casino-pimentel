// Lectura en el navegador de los avisos públicos (los mismos que publica administración en el panel)
// y envío de solicitudes de alquiler a la tabla solicitudes_alquiler.
import type { AvisoPublico } from './datos'

const URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined
const KEY = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined

export async function traerAvisos(): Promise<AvisoPublico[] | null> {
  if (!URL || !KEY) return null
  try {
    const r = await fetch(`${URL}/rest/v1/rpc/web_publica`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_club_slug: 'casino-pimentel' }) })
    if (!r.ok) return null
    return (await r.json()).avisos ?? []
  } catch { return null }
}

const ENT: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ENT[c])
const fecha = (iso: string) => new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' }).format(new Date(iso))

export function pintarAviso(a: AvisoPublico): string {
  const foto = a.foto_path ? `<img src="${URL}/storage/v1/object/public/avisos/${esc(a.foto_path)}" alt="" loading="lazy" />` : ''
  return `${foto}<span class="pill">${a.fijado ? 'Fijado · ' : ''}${fecha(a.publicado_en)}</span><h3>${esc(a.titulo)}</h3><p style="white-space:pre-line">${esc(a.texto)}</p>`
}

export async function solicitarAlquiler(d: Record<string, string>): Promise<{ ok: boolean; mensaje: string; campo?: string }> {
  if (!URL || !KEY) return { ok: false, mensaje: 'El formulario aún no está conectado. Llámanos al 074-425244.' }
  try {
    const r = await fetch(`${URL}/rest/v1/rpc/solicitar_alquiler`, {
      method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_club_slug: 'casino-pimentel', p_nombre: d.nombre, p_celular: d.celular, p_fecha: d.fecha, p_ambiente_id: d.ambiente || null, p_tipo_cliente: d.tipo, p_mensaje: d.mensaje || null }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return { ok: false, mensaje: j.message ?? 'No pudimos enviar la solicitud. Llámanos al 074-425244.' }
    return j
  } catch {
    return { ok: false, mensaje: 'No hay conexión. Revisa tu internet o llámanos al 074-425244.' }
  }
}
