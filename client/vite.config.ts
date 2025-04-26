import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wav', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
  server: {
    host: '0.0.0.0',  // Listen on all network interfaces
    port: 3000,
    strictPort: true,
    allowedHosts: ['jasinali.com', 'localhost', 'preproductionenvironment.com'],
    hmr: {
      protocol: 'ws',
      host: '0.0.0.0',
      port: 3000
    },
    watch: {
      usePolling: true
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
        assetFileNames: (assetInfo) => {
          // Keep the original directory structure for assets
          if (assetInfo.name) {
            const ext = assetInfo.name.split('.').pop()
            if (/png|jpe?g|gif|svg|wav/i.test(ext || '')) {
              return `assets/[name]-[hash][extname]`
            }
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
    assetsDir: 'assets',
    // Ensure assets are copied to the correct location
    copyPublicDir: true,
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_DEBUG': false
  }
})
