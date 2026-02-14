import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/bcv': {
        target: 'https://bcv-api-seven.vercel.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    proxy: {
      '/api/bcv': {
        target: 'https://bcv-api-seven.vercel.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
