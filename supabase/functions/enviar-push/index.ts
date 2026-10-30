// Envía notificaciones Web Push (VAPID). La llama la base de datos (trigger) con el secreto del cron.
// Claves: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT como secretos de Edge Functions,
// o en Supabase Vault (vapid_public_key, vapid_private_key, vapid_subject).
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import webpush from 'npm:web-push@3.6.7'

const URL = Deno.env.get('SUPABASE_URL')!
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(URL, SERVICIO, { auth: { persistSession: false } })

async function secreto(nombre: string): Promise<string | null> {
  const env = Deno.env.get(nombre.toUpperCase())
  if (env) return env
  const { data } = await admin.rpc('leer_secreto', { p_nombre: nombre })
  return (data as string | null) ?? null
}

Deno.serve(async (req) => {
  if ((req.headers.get('x-cron-secret') ?? '') !== (await secreto('cron_secret'))) return new Response('No autorizado', { status: 401 })
  const { ids } = (await req.json().catch(() => ({ ids: [] }))) as { ids: string[] }
  if (!ids?.length) return Response.json({ enviados: 0 })
  const [pub, priv, subj] = await Promise.all([secreto('vapid_public_key'), secreto('vapid_private_key'), secreto('vapid_subject')])
  if (!pub || !priv) return Response.json({ enviados: 0, aviso: 'VAPID sin configurar' })
  webpush.setVapidDetails(subj ?? 'mailto:sistemas@casinopimentel.test', pub, priv)

  const { data: notifs } = await admin.from('notificaciones').select('id, user_id, titulo, cuerpo, url, tipo').in('id', ids.slice(0, 500))
  let enviados = 0
  for (const n of notifs ?? []) {
    const { data: subs } = await admin.from('suscripciones_push').select('id, endpoint, p256dh, auth').eq('user_id', n.user_id)
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ titulo: n.titulo, cuerpo: n.cuerpo, url: n.url ?? '/app/', etiqueta: n.tipo }), { TTL: 3600 })
        enviados++
      } catch (e) {
        const codigo = (e as { statusCode?: number }).statusCode
        if (codigo === 404 || codigo === 410) await admin.from('suscripciones_push').delete().eq('id', s.id) // suscripción vencida del navegador
        else await admin.from('suscripciones_push').update({ ultimo_error: String((e as Error).message).slice(0, 200) }).eq('id', s.id)
      }
    }
    await admin.from('notificaciones').update({ push_enviado: true }).eq('id', n.id)
  }
  return Response.json({ enviados })
})
