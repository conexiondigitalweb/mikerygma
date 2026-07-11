import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Reemplaza %VITE_BUILD_TIME% en index.html por el timestamp real del build.
// No se usa el mecanismo de "HTML env replacement" de Vite (%VAR%) porque
// ese solo sustituye variables ya cargadas desde archivos .env — este valor
// es dinámico (se calcula en cada build), así que se inyecta a mano vía
// transformIndexHtml. Sirve para diagnosticar en consola/devtools qué
// versión del build está corriendo realmente un dispositivo — ver también
// UpdatePrompt.jsx, que depende de que cada build produzca un Service
// Worker distinto para poder detectar actualizaciones.
function buildTimeHtmlPlugin() {
  const buildTime = new Date().toISOString()
  return {
    name: 'mikerygma-build-time',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/%VITE_BUILD_TIME%/g, buildTime)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    buildTimeHtmlPlugin(),
    VitePWA({
      registerType: 'prompt', // el registro automático de vite-plugin-pwa NO debe recargar por su cuenta — todo el flujo de detección/aviso/recarga lo controla UpdatePrompt.jsx (ver src/components/UpdatePrompt.jsx)
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'MiKerygma',
        short_name: 'MiKerygma',
        description: 'Copiloto ministerial con IA para pastores y líderes cristianos hispanohablantes.',
        theme_color: '#B8860B',
        background_color: '#FFF8F0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
