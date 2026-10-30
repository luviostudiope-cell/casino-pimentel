// El socio cambia su PIN: obligatorio en el primer ingreso; desde el perfil pide el PIN actual.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const URL = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const facil = (p: string) => /^(\d)\1{5}$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const jwt = req.headers.get('Authorization') ?? ''
  const usuario = createClient(URL, ANON, { global: { headers: { Authorization: jwt } }, auth: { persistSession: false } })
  const { data: u } = await usuario.auth.getUser()
  if (!u?.user) return json({ error: 'Tu sesión venció. Vuelve a ingresar.' }, 401)
  const { pin, pin_actual } = (await req.json().catch(() => ({}))) as { pin?: string; pin_actual?: string }
  const nuevo = String(pin ?? '')
  if (!/^\d{6}$/.test(nuevo)) return json({ error: 'El PIN debe tener 6 números.' }, 400)
  if (facil(nuevo)) return json({ error: 'Ese PIN es muy fácil de adivinar. Elige otro.' }, 400)

  const admin = createClient(URL, SERVICIO, { auth: { persistSession: false } })
  const { data: cred } = await admin.from('credenciales_socio')
    .select('user_id, club_id, dni, debe_cambiar_pin').eq('user_id', u.user.id).maybeSingle()
  if (!cred) return json({ error: 'Solo los socios usan PIN.' }, 403)
  if (nuevo === cred.dni.slice(-6)) return json({ error: 'No uses los últimos números de tu DNI. Elige otro PIN.' }, 400)
  if (!cred.debe_cambiar_pin) {
    if (!/^\d{6}$/.test(String(pin_actual ?? ''))) return json({ error: 'Escribe tu PIN actual.' }, 400)
    const prueba = createClient(URL, ANON, { auth: { persistSession: false } })
    const { error } = await prueba.auth.signInWithPassword({ email: u.user.email!, password: String(pin_actual) })
    if (error) return json({ error: 'Tu PIN actual no coincide.' }, 401)
  }
  const { error } = await admin.auth.admin.updateUserById(u.user.id, { password: nuevo })
  if (error) return json({ error: 'No pudimos guardar tu PIN. Intenta de nuevo.' }, 500)
  await admin.from('credenciales_socio').update({ debe_cambiar_pin: false, intentos_fallidos: 0 }).eq('user_id', u.user.id)
  await admin.from('accesos').insert({ club_id: cred.club_id, user_id: u.user.id, identificador: 'DNI ' + cred.dni, evento: 'cambio_pin', exito: true })
  return json({ ok: true })
})
