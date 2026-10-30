/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/app/index.html'), { allowlist: [/^\/app\//] }))

self.addEventListener('message', (e) => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting() })

// Notificaciones push (Web Push con VAPID)
self.addEventListener('push', (event) => {
  let datos: { titulo?: string; cuerpo?: string; url?: string; etiqueta?: string } = {}
  try { datos = event.data?.json() ?? {} } catch { datos = { cuerpo: event.data?.text() } }
  const titulo = datos.titulo ?? 'Casino de Pimentel'
  event.waitUntil(self.registration.showNotification(titulo, {
    body: datos.cuerpo ?? '',
    icon: '/app/icons/icon-192.png',
    badge: '/app/icons/icon-192.png',
    tag: datos.etiqueta,
    data: { url: datos.url ?? '/app/' },
    lang: 'es-PE',
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data?.url as string) ?? '/app/'
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const v of ventanas) {
      if (v.url.includes('/app/') && 'focus' in v) { await v.navigate(url).catch(() => {}); return v.focus() }
    }
    return self.clients.openWindow(url)
  })())
})
