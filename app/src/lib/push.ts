import { rpc } from './supabase'

const VAPID_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {})
  })
}

export const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const esStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

export type EstadoPush = 'no-soportado' | 'ios-instalar' | 'bloqueado' | 'activo' | 'inactivo' | 'sin-clave'

export async function estadoPush(): Promise<EstadoPush> {
  if (!VAPID_PUBLICA) return 'sin-clave'
  if (esIOS() && !esStandalone()) return 'ios-instalar'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'no-soportado'
  if (Notification.permission === 'denied') return 'bloqueado'
  const reg = await navigator.serviceWorker.getRegistration('/app/')
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'activo' : 'inactivo'
}

function base64AUint8(b64: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (b64.length % 4)) % 4)
  const s = atob((b64 + relleno).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(s.length))
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

export async function activarPush(): Promise<void> {
  if (!VAPID_PUBLICA) throw new Error('Las notificaciones aún no están configuradas en el servidor.')
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') throw new Error('No diste permiso para notificaciones. Puedes activarlo en la configuración del navegador.')
  const reg = (await navigator.serviceWorker.getRegistration('/app/')) ?? (await navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }))
  await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64AUint8(VAPID_PUBLICA) })
  const j = sub.toJSON()
  await rpc('guardar_suscripcion_push', { p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth, p_dispositivo: navigator.userAgent.slice(0, 160) })
}

export async function desactivarPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration('/app/')
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await rpc('borrar_suscripcion_push', { p_endpoint: sub.endpoint }).catch(() => {})
    await sub.unsubscribe()
  }
}
