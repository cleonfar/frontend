import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        // use 127.0.0.1 to avoid IPv6/localhost resolution issues on some Windows setups
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          // Add verbose proxy logging to diagnose failed fetches
          proxy.on('error', (err, req, _res) => {
            console.error('[vite-proxy] error:', err?.message || err, req?.method, req?.url)
          })
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('[vite-proxy] ->', req?.method, req?.url)
          })
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[vite-proxy] <-', proxyRes.statusCode, req?.method, req?.url)
          })
        }
        // do not rewrite the path: we want /api/AnimalIdentity/... forwarded to the backend unchanged
      }
    }
  }
})
