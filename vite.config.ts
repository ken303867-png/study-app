import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const APP_BASE = '/study-app/';

export default defineConfig({
  base: APP_BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'app-icon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png'
      ],
      manifest: {
        id: APP_BASE,
        name: 'Study App',
        short_name: 'StudyApp',
        description: 'Offline-first study and review application',
        lang: 'ja',
        categories: ['education'],
        theme_color: '#17324d',
        background_color: '#f6f8fb',
        display: 'standalone',
        start_url: APP_BASE,
        scope: APP_BASE,
        icons: [
          {
            src: `${APP_BASE}icons/icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${APP_BASE}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${APP_BASE}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: `${APP_BASE}index.html`
      }
    })
  ]
});
