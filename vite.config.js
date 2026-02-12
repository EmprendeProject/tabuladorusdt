import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/bcv': {
        target: 'https://bcv-api-seven.vercel.app/api/bcv',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bcv/, ''),
      },
    },
  },
})
