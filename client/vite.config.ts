import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wav'],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['*'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_DEBUG': false
  },
  optimizeDeps: {
    include: ['./src/utils/uuid.ts'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
})
