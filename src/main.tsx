// Ponto de entrada: carrega fontes e CSS, aplica o tema salvo, monta o App com os avisos de instalação e
// de atualização e, em produção, registra o service worker (public/sw.js) para o app abrir offline.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { InstallPrompt } from './components/InstallPrompt'
import { UpdatePrompt } from './components/UpdatePrompt'
import { applyTheme, loadIntensity, loadTheme } from './themes'
// fontes dos temas (themes.ts), empacotadas no build em vez de vir do Google Fonts
import '@fontsource/permanent-marker/latin-400.css'
import '@fontsource/cinzel/latin-700.css'
import '@fontsource/press-start-2p/latin-400.css'
import '@fontsource/rubik-wet-paint/latin-400.css'
import '@fontsource/alfa-slab-one/latin-400.css'
import '@fontsource/caveat/latin-700.css'
import '@fontsource/vt323/latin-400.css'
import '@fontsource/orbitron/latin-800.css'
import '@fontsource/bangers/latin-400.css'
import '@fontsource/bebas-neue/latin-400.css'
import './styles.css'
import './themes.css'
import './themes-ousados.css'
import './views.css'

// antes da primeira pintura, para o app não piscar no tema original
applyTheme(loadTheme(), loadIntensity())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <InstallPrompt />
    <UpdatePrompt />
  </StrictMode>,
)

// Só em produção: no `npm run dev` o cache do service worker atrapalharia o recarregamento do Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
