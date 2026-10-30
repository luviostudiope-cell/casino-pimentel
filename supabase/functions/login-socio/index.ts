// Ingreso del socio con DNI + PIN de 6 dígitos. Bloquea 15 minutos tras 5 intentos fallidos.
// verify_jwt = false (el socio aún no tiene sesión). Registra cada intento en "accesos".
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const URL = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAX_INTENTOS = 5
const BLOQUEO_MIN = 15
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  let body: { dni?: string; pin?: string; club?: string; dispositivo?: string }
  try { body = await req.json() } catch { return json({ error: 'Solicitud inválida' }, 400) }
  const dni = String(body.dni ?? '').replace(/\D/g, '')
  const pin = String(body.pin ?? '')
  const slug = String(body.club ?? 'casino-pimentel')
  const dispositivo = String(body.dispositivo ?? '').slice(0, 160)
  if (dni.length !== 8 || !/^\d{6}$/.test(pin)) return json({ error: 'Escribe tu DNI (8 números) y tu PIN (6 números).' }, 400)

  const admin = createClient(URL, SERVICIO, { auth: { persistSession: false } })
  const { data: club } = await admin.from('clubes').select('id').eq('slug', slug).maybeSingle()
  if (!club) return json({ error: 'Club no encontrado.' }, 404)
  const registrar = (evento: string, exito: boolean, user_id: string | null, detalle?: string) =>
    admin.from('accesos').insert({ club_id: club.id, user_id, identificador: 'DNI ' + dni, evento, exito, dispositivo, detalle })

  const { data: cred } = await admin.from('credenciales_socio')
    .select('user_id, intentos_fallidos, bloqueado_hasta').eq('club_id', club.id).eq('dni', dni).maybeSingle()
  if (!cred) {
    await registrar('fallido', false, null, 'DNI sin cuenta')
    return json({ error: 'El DNI o el PIN no coinciden. Revisa e intenta otra vez.' }, 401)
  }
  if (cred.bloqueado_hasta && new Date(cred.bloqueado_hasta) > new Date()) {
    const min = Math.ceil((new Date(cred.bloqueado_hasta).getTime() - Date.now()) / 60000)
    await registrar('bloqueado', false, cred.user_id)
    return json({ error: `Por seguridad, tu ingreso está pausado. Intenta en ${min} min o llama a administración (074-425244).`, bloqueado: true }, 423)
  }
  const { data: usuario } = await admin.auth.admin.getUserById(cred.user_id)
  const correo = usuario?.user?.email
  if (!correo) return json({ error: 'Tu cuenta necesita revisión. Llama a administración.' }, 409)

  const publico = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data, error } = await publico.auth.signInWithPassword({ email: correo, password: pin })
  if (error || !data.session) {
    const intentos = (cred.intentos_fallidos ?? 0) + 1
    const bloquear = intentos >= MAX_INTENTOS
    await admin.from('credenciales_socio').update({
      intentos_fallidos: bloquear ? 0 : intentos,
      bloqueado_hasta: bloquear ? new Date(Date.now() + BLOQUEO_MIN * 60000).toISOString() : null,
    }).eq('user_id', cred.user_id)
    await registrar(bloquear ? 'bloqueado' : 'fallido', false, cred.user_id)
    if (bloquear) {
      return json({ error: `Te equivocaste ${MAX_INTENTOS} veces. Por seguridad, espera ${BLOQUEO_MIN} minutos o llama a administración (074-425244).`, bloqueado: true }, 423)
    }
    const quedan = MAX_INTENTOS - intentos
    return json({ error: `El DNI o el PIN no coinciden. Te ${quedan === 1 ? 'queda 1 intento' : `quedan ${quedan} intentos`}.`, intentos_restantes: quedan }, 401)
  }
  await admin.from('credenciales_socio')
    .update({ intentos_fallidos: 0, bloqueado_hasta: null, ultimo_ingreso: new Date().toISOString() }).eq('user_id', cred.user_id)
  await registrar('login', true, cred.user_id)
  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
})
