// Reporte diario del club: arma los números (RPC datos_reporte_diario), los redacta con Claude
// (claude-haiku-5-5) si existe ANTHROPIC_API_KEY, o con una plantilla fija si no; lo envía por
// Telegram y como notificación push a la directiva, y lo guarda en reportes_diarios.
// Lo dispara pg_cron (con x-cron-secret) a la hora de config, o un directivo a mano desde el panel.
// Secretos: ANTHROPIC_API_KEY, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID (Edge Function secrets o Supabase Vault).
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'

const URL = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(URL, SERVICIO, { auth: { persistSession: false } })
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function secreto(nombre: string): Promise<string | null> {
  const env = Deno.env.get(nombre.toUpperCase())
  if (env) return env
  const { data } = await admin.rpc('leer_secreto', { p_nombre: nombre.toLowerCase() })
  return (data as string | null) ?? null
}

const soles = (n: number) => 'S/ ' + Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const medio: Record<string, string> = { efectivo: 'efectivo', yape: 'Yape', tarjeta: 'tarjeta', cuenta_socio: 'a cuenta' }

// deno-lint-ignore no-explicit-any
type Datos = any

function plantilla(d: Datos): string {
  const fecha = new Date(d.fecha + 'T12:00:00-05:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima' })
  const totalBarras = (d.barras as Datos[]).reduce((s, b) => s + Number(b.ventas), 0)
  const medios: Record<string, number> = {}
  for (const b of d.barras as Datos[]) for (const [k, v] of Object.entries(b.por_medio ?? {})) medios[k] = (medios[k] ?? 0) + Number(v)
  const linea1 = `${d.club} · reporte del ${fecha}`
  const linea2 = `Barras: ${soles(totalBarras)} (${(d.barras as Datos[]).map((b) => `${b.barra} ${soles(b.ventas)}`).join(' · ')}). ` +
    (Object.keys(medios).length ? Object.entries(medios).map(([k, v]) => `${medio[k] ?? k} ${soles(v)}`).join(', ') + '.' : 'Sin cobros.')
  const linea3 = `Portería: ${d.porteria.ingresos} ingresos, ${d.porteria.invitados} invitados, ${soles(d.porteria.cobrado)} cobrados. Caja de oficina: saldo ${soles(d.caja_oficina.saldo)}.`
  const linea4 = `Personal: ${d.asistencia.presentes} de ${d.asistencia.programados} presentes, ${d.asistencia.tardanzas.length} tardanzas, ${d.asistencia.faltas.length} faltas. ` +
    `Mañana: ${d.reservas_manana.length} reservas de tenis${d.alquileres_manana.length ? ` y ${d.alquileres_manana.length} alquiler(es)` : ''}.`
  const atencion: string[] = []
  for (const b of d.barras as Datos[]) {
    if (b.cierre && Number(b.cierre.diferencia_caja) < 0) atencion.push(`faltante de caja en ${b.barra} (${soles(-b.cierre.diferencia_caja)})`)
    if (b.cierre && Number(b.cierre.faltante_licor) > 0) atencion.push(`faltante de licor en ${b.barra} (${soles(b.cierre.faltante_licor)})`)
    if (!b.cierre && Number(b.ventas) > 0) atencion.push(`${b.barra} sin cierre`)
  }
  if (d.pagos_por_validar > 0) atencion.push(`${d.pagos_por_validar} pagos por validar`)
  if (d.asistencia.faltas.length) atencion.push(`faltas: ${d.asistencia.faltas.join(', ')}`)
  if (d.porteria.con_deuda > 0) atencion.push(`${d.porteria.con_deuda} socios con deuda ingresaron`)
  atencion.push(`${d.morosos.socios} socios con deuda (${soles(d.morosos.deuda_total)})`)
  return [linea1, linea2, linea3, linea4, 'Atención: ' + atencion.join('; ') + '.'].join('\n')
}

async function redactarConClaude(d: Datos, apiKey: string): Promise<string | null> {
  const client = new Anthropic({ apiKey })
  const r = await client.messages.create({
    model: 'claude-haiku-5-5',
    max_tokens: 2000,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low' },
    system: 'Eres el asistente de administración del Casino de Pimentel, un club social de playa en Pimentel (Perú). ' +
      'Redacta el reporte diario para la directiva en exactamente 5 líneas cortas, en español peruano sencillo, sin markdown, sin emojis y sin viñetas. ' +
      'Línea 1: título con la fecha. Línea 2: ventas de las barras y medios de pago. Línea 3: portería, invitados y caja de oficina. ' +
      'Línea 4: asistencia del personal y lo que hay mañana (reservas de tenis y alquileres). ' +
      'Línea 5: empieza con "Atención:" y nombra solo lo que requiere acción (faltantes de caja o de licor, barras sin cierre, pagos por validar, faltas, socios con deuda que ingresaron, morosidad). ' +
      'Montos con "S/ " y dos decimales. Usa solo los datos del JSON: no inventes ni supongas cifras.',
    messages: [{ role: 'user', content: 'Datos del día en JSON:\n' + JSON.stringify(d) }],
  } as Anthropic.MessageCreateParamsNonStreaming)
  if (r.stop_reason === 'refusal') return null
  const texto = r.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim()
  return texto.length > 20 ? texto : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const cuerpo = (await req.json().catch(() => ({}))) as { club_id?: string; fecha?: string; origen?: string }
  let clubId = cuerpo.club_id ?? null
  let disparadoPor: 'cron' | 'manual' = 'cron'

  const cron = req.headers.get('x-cron-secret')
  if (cron) {
    if (cron !== (await secreto('cron_secret'))) return json({ error: 'No autorizado' }, 401)
  } else {
    const usuario = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } })
    const { data: perfil } = await usuario.rpc('mi_perfil')
    if (!perfil || !['presidente', 'directivo', 'admin'].includes(perfil.rol)) return json({ error: 'Solo la directiva dispara el reporte.' }, 403)
    clubId = perfil.club_id
    disparadoPor = 'manual'
  }
  if (!clubId) return json({ error: 'Falta el club.' }, 400)

  const { data: datos, error } = await admin.rpc('datos_reporte_diario', { p_club: clubId, p_fecha: cuerpo.fecha ?? null })
  if (error || !datos) return json({ error: 'No se pudieron leer los datos: ' + (error?.message ?? '') }, 500)

  let texto: string | null = null
  let generadoCon: 'claude' | 'plantilla' = 'plantilla'
  let errores: string[] = []
  const claveClaude = await secreto('anthropic_api_key')
  if (claveClaude) {
    try { texto = await redactarConClaude(datos, claveClaude); if (texto) generadoCon = 'claude' }
    catch (e) { errores.push('Claude: ' + (e as Error).message.slice(0, 160)) }
  }
  if (!texto) texto = plantilla(datos)

  let enviadoTelegram = false
  const [token, chat] = await Promise.all([secreto('telegram_token'), secreto('telegram_chat_id')])
  if (token && chat) {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: texto, disable_web_page_preview: true }),
    })
    enviadoTelegram = r.ok
    if (!r.ok) errores.push('Telegram: ' + (await r.text()).slice(0, 160))
  } else errores.push('Telegram sin configurar')

  const { data: directiva } = await admin.from('usuarios_staff').select('id').eq('club_id', clubId).eq('activo', true).in('rol', ['presidente', 'directivo', 'admin'])
  if (directiva?.length) {
    await admin.from('notificaciones').insert(directiva.map((u) => ({
      club_id: clubId, user_id: u.id, tipo: 'reporte', titulo: 'Reporte del día', cuerpo: texto!.split('\n').slice(1, 3).join(' ').slice(0, 220), url: '/app/admin/reportes',
    })))
  }
  await admin.from('reportes_diarios').insert({
    club_id: clubId, fecha: datos.fecha, datos, texto, generado_con: generadoCon, enviado_telegram: enviadoTelegram,
    enviado_push: Boolean(directiva?.length), error: errores.length ? errores.join(' | ') : null, disparado_por: disparadoPor,
  })
  errores = errores.filter((e) => !e.startsWith('Telegram sin'))
  return json({ ok: true, texto, generado_con: generadoCon, enviado_telegram: enviadoTelegram, avisos: errores })
})
