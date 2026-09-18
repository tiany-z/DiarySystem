import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: /^@fluentui\/react-icons\/lib\/providers$/, replacement: fileURLToPath(new URL('./node_modules/@fluentui/react-icons/lib-cjs/providers.cjs', import.meta.url)) },
      { find: /^@fluentui\/react-icons$/, replacement: fileURLToPath(new URL('./node_modules/@fluentui/react-icons/lib-cjs/index.cjs', import.meta.url)) },
    ],
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // 等同于 host: true
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
