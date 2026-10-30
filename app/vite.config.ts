import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

const design = fileURLToPath(new URL('../design', import.meta.url))

export default defineConfig({
  base: '/app/',
  resolve: { alias: { '@design': design } },
  server: { port: 5173, fs: { allow: ['..'] } },
  build: { outDir: 'dist', chunkSizeWarningLimit: 900 },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      scope: '/app/',
      injectManifest: { globPatterns: ['**/*.{js,css,html,woff2,svg,png}'], maximumFileSizeToCacheInBytes: 3_000_000 },
      manifest: {
        name: 'Casino de Pimentel',
        short_name: 'Casino Pimentel',
        description: 'Tu club frente al mar de Pimentel: carnet, cuenta, reservas y avisos.',
        lang: 'es-PE',
        start_url: '/app/',
        scope: '/app/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F6FAFD',
        theme_color: '#1B4F8F',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
