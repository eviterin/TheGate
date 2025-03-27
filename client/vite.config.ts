import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wav'],
  server: {
    host: '0.0.0.0',  // Listen on all network interfaces
    port: 3000,
    strictPort: true,
    allowedHosts: ['jasinali.com', 'localhost', 'preproductionenvironment.com']
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
  }
})
