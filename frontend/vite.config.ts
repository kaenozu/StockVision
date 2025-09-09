/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  server: {
    port: 3002,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[vite] proxy error:', err)
          })
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[vite] Proxying request:', req.method, req.url, '-> http://localhost:8000' + req.url)
          })
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[vite] Received response:', proxyRes.statusCode, 'for', req.url)
          })
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // 本番環境ではソースマップを無効化
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'router-vendor': ['react-router-dom'],
          'utils': ['axios']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'chart.js', 'react-chartjs-2', 'react-router-dom', 'axios']
  }
})
