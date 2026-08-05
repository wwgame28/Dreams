import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TraceZero',
        short_name: 'TraceZero',
        description: 'Центр управления цифровым следом',
        theme_color: '#07110d',
        background_color: '#07110d',
        display: 'standalone',
        start_url: './'
      }
    })
  ]
});
