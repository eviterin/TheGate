import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.wav'],
  server: {
    host: '0.0.0.0',
    port: 3000
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
    'process.env.NODE_DEBUG': false,
    'global.crypto': `{
      randomUUID: () => {
        const getRandomValues = (arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        };
        const uuid = new Array(36);
        const hexDigits = "0123456789abcdef";
        for (let i = 0; i < 36; i++) {
          if (i === 8 || i === 13 || i === 18 || i === 23) {
            uuid[i] = "-";
          } else if (i === 14) {
            uuid[i] = "4";
          } else {
            const r = getRandomValues(new Uint8Array(1))[0];
            uuid[i] = hexDigits[(i === 19) ? (r & 0x3) | 0x8 : r & 0xf];
          }
        }
        return uuid.join("");
      }
    }`
  }
})
