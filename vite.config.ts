import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Fixed port (ExpenseApp uses 5173): IndexedDB data belongs to the exact origin, so a
  // different port would look like an empty app. Fail instead of silently switching.
  server: { port: 5174, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Trip Hisab',
        short_name: 'Trip Hisab',
        description: 'Dosto ki trip ka kharcha, Group Fund aur hisab (PKR)',
        theme_color: '#0f6e56',
        background_color: '#f3f7f5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache fonts and icons too (default is js/css/html only), so the app looks right offline.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        // SPA: serve index.html for client-side routes when offline.
        navigateFallback: '/index.html',
      },
    }),
  ],
})
