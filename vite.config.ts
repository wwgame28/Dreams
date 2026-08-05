import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html'
      },
      manifest: {
        id: 'tracezero-v2',
        name: 'TraceZero v2',
        short_name: 'TraceZero',
        description: 'Самоаудит и удаление собственного цифрового следа',
        theme_color: '#07110d',
        background_color: '#07110d',
        display: 'standalone',
        start_url: '/?v=2',
        scope: '/'
      }
    })
  ]
});
