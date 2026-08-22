import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Service worker + installable app manifest. This is what lets the POS
      // keep selling during an internet outage: the app shell (HTML/JS/CSS) is
      // precached, so a browser refresh or a full computer restart while offline
      // still loads the register instead of the browser's "no internet" page.
      // Firestore's own IndexedDB cache already handles the DATA offline; this
      // handles DELIVERY of the app itself.
      VitePWA({
        // 'prompt', not 'autoUpdate': a POS must never reload itself in the
        // middle of a sale. Staff get a dismissable "update ready" prompt and
        // apply it between customers (see PWAStatusToast).
        registerType: 'prompt',
        // No `includeAssets` — the workbox globPatterns below already pick up
        // everything in public/ (favicon.svg, apple-touch-icon.png, the PWA
        // icons), and listing them twice puts duplicate precache entries in sw.js.
        manifest: {
          name: 'HENZ Health Care — Medical POS',
          short_name: 'HENZ POS',
          description:
            'Point-of-sale, inventory and student pre-order system for HENZ Health Care Products Trading, Iloilo City. Works offline.',
          lang: 'en',
          theme_color: '#059669',
          background_color: '#f8fafc',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Precache the whole shell. Vite content-hashes these filenames, so a
          // new deploy produces new entries and cleanupOutdatedCaches drops the
          // old ones — no risk of staff being pinned to a stale build forever.
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
          cleanupOutdatedCaches: true,
          // The main bundle is ~1.4 MB today; leave headroom as it grows.
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // Any in-app route falls back to the cached shell when offline.
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          // NOTE: deliberately NO runtimeCaching for firestore.googleapis.com or
          // identitytoolkit.googleapis.com. Those requests are not navigations
          // and match no precache route, so they pass straight through to the
          // Firebase SDK, which owns its own offline queue and IndexedDB cache.
          // Caching them here would corrupt that.
        },
        // Keep the service worker out of `npm run dev` so HMR stays predictable.
        // Verify offline behaviour against `npm run build && npm run preview`.
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
