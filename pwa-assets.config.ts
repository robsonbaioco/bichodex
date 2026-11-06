import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Gera os ícones PNG do app em public/ a partir de public/icon.svg: `npm run icons`.
// Configuração do @vite-pwa/assets-generator (comando pwa-assets-generator), rodado à mão só quando
// o ícone muda; não faz parte do `npm run build`. Os PNGs gerados (pwa-*.png, maskable-icon-*.png,
// apple-touch-icon-*.png, favicon.ico) são citados à mão em public/manifest.webmanifest e no index.html:
// se mudar o preset e os nomes mudarem, atualize os dois.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Ícones "maskable" (Android) e da Apple não aceitam transparência: o fundo é a cor da marca.
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0f7a4d' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0f7a4d' } },
  },
  images: ['public/icon.svg'],
})
