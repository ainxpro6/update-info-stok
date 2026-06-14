import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ADD THIS LINE (replace with your actual github repo name)
  base: '/update-info-stok/', 
})