import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Caminhos relativos: o mesmo build serve para web e para empacotar com Capacitor.
  base: './',
  plugins: [react()],
  server: { host: true },
})
