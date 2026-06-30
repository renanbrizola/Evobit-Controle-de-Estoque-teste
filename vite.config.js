import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Ensure assets are loaded relatively for Electron/Capacitor
  resolve: {
    alias: {
      'html5-qrcode': 'html5-qrcode/html5-qrcode.min.js',
    },
  },
  optimizeDeps: {
    include: ['lucide-react'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      devOptions: {
        enabled: false // Disable PWA in dev to avoid caching hell
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000 // Aumentado para 5MB para suportar o bundle RxDB
      },
      manifest: {
        name: 'Evobit App',
        short_name: 'Evobit',
        description: 'Sistema de Controle de Estoque e Vendas',
        theme_color: '#880E4F',
        icons: [
          {
            src: 'vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    // Escopar a descoberta de testes ao src do projeto. Sem isso o vitest
    // recursa para .claude/worktrees/** e roda os testes de outros worktrees.
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist_electron/**', '**/.claude/**', '**/android/**', '**/ios/**'],
  },
})
