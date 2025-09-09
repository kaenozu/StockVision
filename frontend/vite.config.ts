/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // バンドル分析用のビジュアライザー
    visualizer({
      filename: 'bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ],
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
        manualChunks: (id) => {
          // React系ライブラリ
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
          // チャート系ライブラリ
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) {
            return 'chart-vendor'
          }
          // ルーティング系
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor'
          }
          // アイコン系（大きなライブラリなので分離）
          if (id.includes('node_modules/react-icons')) {
            return 'icons-vendor'
          }
          // 国際化系
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'i18n-vendor'
          }
          // その他のライブラリ
          if (id.includes('node_modules/axios') || id.includes('node_modules/marked') || id.includes('node_modules/highlight.js')) {
            return 'utils-vendor'
          }
          // Sentry等の監視ツール
          if (id.includes('node_modules/@sentry')) {
            return 'monitoring-vendor'
          }
          // その他のnode_modules
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 500, // より厳しい警告レベル
    assetsInlineLimit: 2048 // 小さなファイルのインライン化
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'chart.js', 'react-chartjs-2', 'react-router-dom', 'axios']
  }
})
