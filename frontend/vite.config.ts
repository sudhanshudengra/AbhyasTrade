import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'AbhyasTrade - Virtual Trading PWA',
        short_name: 'AbhyasTrade',
        description: 'Real-Time Virtual Trading Platform for Indian Equity Market (NSE)',
        theme_color: '#0b0e14',
        background_color: '#0b0e14',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (err?.code === 'ECONNRESET' || err?.code === 'ECONNABORTED' || err?.code === 'ECONNREFUSED') {
              return;
            }
            console.warn('[vite proxy error]:', err?.message || err);
          });
        }
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (err?.code === 'ECONNRESET' || err?.code === 'ECONNABORTED' || err?.code === 'EPIPE') {
              return;
            }
            console.warn('[vite ws proxy error]:', err?.message || err);
          });
          proxy.on('proxyReqWs', (proxyReq, _req, socket) => {
            socket.on('error', (err: any) => {
              if (err?.code === 'ECONNRESET' || err?.code === 'ECONNABORTED') {
                return;
              }
            });
          });
        }
      }
    }
  }
});
