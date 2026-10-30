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
  vite: {
    resolve: { alias: { '@design': design } },
    server: { fs: { allow: ['..'] } },
  },
})
