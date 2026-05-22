import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const host = process.env.TAURI_DEV_HOST
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],

    // Define environment variables for client-side
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(
        env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY,
      ),
    },

    // Resolve aliases
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 3. tell Vite to ignore watching `src-tauri`
        ignored: ['**/src-tauri/**'],
      },
      proxy: {
        '/gemini-proxy': {
          target: 'https://api.geminigen.ai',
          changeOrigin: true,
          secure: false, // Ignore self-signed certs issues
          rewrite: (path) => path.replace(/^\/gemini-proxy/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err)
            })
          },
        },
        '/gemini-storage-proxy': {
          target:
            'https://87c129bea46e5e69d2d92f9b9ef83ca8.r2.cloudflarestorage.com',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/gemini-storage-proxy/, ''),
        },
      },
    },
  }
})
