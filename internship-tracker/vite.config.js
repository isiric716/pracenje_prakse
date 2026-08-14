import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/login': 'http://localhost:3001',
      '/register': 'http://localhost:3001',
      '/users': 'http://localhost:3001',
      '/internships': 'http://localhost:3001',
      '/entries': 'http://localhost:3001',
      '/documents': 'http://localhost:3001',
      '/mentor': 'http://localhost:3001',
    },
  },
})
