// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import { fileURLToPath } from 'node:url'

const design = fileURLToPath(new URL('../design', import.meta.url))

export default defineConfig({
  site: process.env.SITIO_URL ?? 'https://casino-pimentel.netlify.app',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [sitemap({ filter: (p) => !p.includes('/app') })],
  devToolbar: { enabled: false },
  vite: {
    resolve: { alias: { '@design': design } },
    // En local, /app se sirve desde el servidor de la app (puerto 5173), igual que en producción es un solo sitio
    server: { fs: { allow: ['..'] }, proxy: { '/app': { target: 'http://localhost:5173', changeOrigin: true, ws: true } } },
  },
})
