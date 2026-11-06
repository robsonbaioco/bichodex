import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração do Vite (dev, build e preview). Não há plugin de PWA: o manifesto e o service worker
// ficam prontos em public/ e são copiados como estão para dist/. Os jogos entram via public/jogos/,
// preenchido por scripts/copiar-jogos.mjs antes do dev e do build.
export default defineConfig({
  // Caminhos relativos: o mesmo build serve para web e para empacotar com Capacitor.
  // Também é o que permite servir no GitHub Pages em /bichodex/ sem configurar o caminho.
  base: './',
  plugins: [react()],
  // host: true expõe o servidor de dev na rede local, para abrir no celular pelo IP do PC.
  server: { host: true },
})
