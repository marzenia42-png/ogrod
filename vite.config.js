import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves from /<repo>/. Override with VITE_BASE=/ when serving from root.
const base = process.env.VITE_BASE ?? '/ogrod/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Ogród Marzeń',
        short_name: 'Ogród Marzeń',
        description: 'Twój ogrodniczy kalendarz: opryski, cięcie, nawożenie, sadzenie, profilaktyka. Pogoda Myślenice live + asystent FLORA.',
        lang: 'pl',
        start_url: `${base}`,
        scope: base,
        display: 'standalone',
        background_color: '#0d0c0a',
        theme_color: '#0d0c0a',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Open-Meteo: cache responses for a short window so the app feels alive offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
