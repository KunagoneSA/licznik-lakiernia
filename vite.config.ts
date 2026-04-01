/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  server: {
    port: 5174,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    // PWA disabled temporarily to clear stale caches
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   workbox: { skipWaiting: true, clientsClaim: true },
    //   manifest: { name: 'Licznik Lakiernia', short_name: 'Lakiernia' },
    // }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
