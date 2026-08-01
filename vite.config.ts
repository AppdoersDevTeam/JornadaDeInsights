import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Jornada de Insights',
        short_name: 'Jornada de Insights',
        description:
          'Podcasts, vídeos e eBooks cristãos para fortalecer sua jornada espiritual.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#FEFAE0',
        theme_color: '#BC6C25',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Painel Admin',
            url: '/dashboard',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Minha Conta',
            url: '/user-dashboard',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // Exclude large source images from precache (they're runtime-cached below instead);
        // the main JS bundle is ~2.3MB so raise the default 2MiB precache ceiling to fit it.
        globPatterns: ['**/*.{js,css,html,svg,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Adds push/notificationclick handlers to the generated SW without
        // switching to injectManifest — see public/push-sw.js.
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            // Never cache API or Supabase responses — dashboards must always hit the network.
            urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
              (sameOrigin && url.pathname.startsWith('/api/')) ||
              url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ request }: { request: Request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});