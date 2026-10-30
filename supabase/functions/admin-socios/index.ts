// Cuentas de socios (solo la directiva): reenviar PIN y crear cuentas a socios importados.
// El PIN temporal se muestra UNA vez al administrador para entregarlo al socio; el socio lo cambia al entrar.
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

function pinAleatorio(): string {
  const n = new Uint32Array(1)
  let p = ''
  do { crypto.getRandomValues(n); p = String(n[0] % 1000000).padStart(6, '0') }
  while (/^(\d)\1{5}$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p))
  return p
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const jwt = req.headers.get('Authorization') ?? ''
  const usuario = createClient(URL, ANON, { global: { headers: { Authorization: jwt } }, auth: { persistSession: false } })
  const { data: perfil } = await usuario.rpc('mi_perfil')
  if (!perfil || !['presidente', 'directivo', 'admin'].includes(perfil.rol)) return json({ error: 'Solo la directiva gestiona cuentas.' }, 403)
  const cuerpo = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const { accion, socio_id, socio_ids } = cuerpo as { accion?: string; socio_id?: string; socio_ids?: string[] }
  const admin = createClient(URL, SERVICIO, { auth: { persistSession: false } })
  const { data: club } = await admin.from('clubes').select('id, slug').eq('id', perfil.club_id).single()

  async function asegurarCuenta(id: string) {
    const { data: s } = await admin.from('socios').select('id, club_id, numero, nombres, apellidos, dni, estado').eq('id', id).eq('club_id', club!.id).maybeSingle()
    if (!s) return { error: 'Socio no encontrado.' }
    if (!s.dni || !/^\d{8}$/.test(s.dni)) return { error: `El socio N° ${s.numero} no tiene DNI válido en el padrón.` }
    const { data: titular } = await admin.from('miembros').select('id').eq('socio_id', s.id).eq('parentesco', 'titular').is('eliminado_en', null).single()
    const pin = pinAleatorio()
    const { data: cred } = await admin.from('credenciales_socio').select('user_id').eq('socio_id', s.id).eq('miembro_id', titular!.id).maybeSingle()
    if (cred) {
      const { error } = await admin.auth.admin.updateUserById(cred.user_id, { password: pin })
      if (error) return { error: 'No se pudo cambiar el PIN.' }
      await admin.from('credenciales_socio').update({ debe_cambiar_pin: true, intentos_fallidos: 0, bloqueado_hasta: null }).eq('user_id', cred.user_id)
    } else {
      const { data: nuevo, error } = await admin.auth.admin.createUser({ email: `${s.dni}.${club!.slug}@socios.example.com`, password: pin, email_confirm: true })
      if (error || !nuevo.user) return { error: 'No se pudo crear la cuenta: ' + (error?.message ?? '') }
      await admin.from('credenciales_socio').insert({ user_id: nuevo.user.id, club_id: s.club_id, socio_id: s.id, miembro_id: titular!.id, dni: s.dni, debe_cambiar_pin: true })
      await admin.from('socios').update({ user_id: nuevo.user.id }).eq('id', s.id)
    }
    await admin.from('accesos').insert({ club_id: s.club_id, user_id: perfil.user_id, identificador: 'Socio N° ' + s.numero, evento: 'cambio_pin', exito: true, detalle: 'PIN temporal generado por ' + perfil.nombre })
    return { numero: s.numero, nombre: `${s.nombres} ${s.apellidos}`, dni: s.dni, pin }
  }

  if (accion === 'reenviar_pin' && socio_id) {
    const r = await asegurarCuenta(socio_id)
    return 'error' in r ? json(r, 400) : json({ ok: true, ...r })
  }
  if (accion === 'crear_cuentas') {
    let ids = socio_ids ?? []
    if (!ids.length) {
      const { data: sin } = await admin.from('socios').select('id').eq('club_id', club!.id).is('user_id', null).is('eliminado_en', null).not('dni', 'is', null)
      ids = (sin ?? []).map((x) => x.id)
    }
    const resultados = []
    for (const id of ids.slice(0, 300)) resultados.push(await asegurarCuenta(id))
    return json({ ok: true, cuentas: resultados })
  }
  if (accion === 'crear_staff') {
    if (perfil.rol !== 'admin') return json({ error: 'Solo administración crea usuarios.' }, 403)
    const { correo, nombre, rol, clave } = cuerpo as { correo?: string; nombre?: string; rol?: string; clave?: string }
    if (!correo?.includes('@') || !nombre || !['presidente', 'directivo', 'admin', 'barra', 'porteria'].includes(rol ?? '') || (clave ?? '').length < 8) return json({ error: 'Completa correo, nombre, rol y una clave de al menos 8 caracteres.' }, 400)
    const { data: nuevo, error } = await admin.auth.admin.createUser({ email: correo.toLowerCase(), password: clave, email_confirm: true })
    if (error || !nuevo.user) return json({ error: 'No se pudo crear: ' + (error?.message ?? '') }, 400)
    await admin.from('usuarios_staff').insert({ id: nuevo.user.id, club_id: club!.id, nombre, correo: correo.toLowerCase(), rol })
    return json({ ok: true })
  }
  return json({ error: 'Acción no reconocida.' }, 400)
})
