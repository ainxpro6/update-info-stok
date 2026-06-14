import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 👈 1. Tambahkan import ini

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 👈 2. Tambahkan ini di dalam kurung siku plugins
  ],
  base: '/update-info-stok/',
})
