# Bichodex

Catálogo dos seres vivos ao seu redor: informe sua localização e veja os animais, plantas, fungos e outros organismos já registrados na região, com ficha de cada espécie e cartão de conquista para compartilhar o que você avistou.

**Site:** https://robsonbaioco.github.io/bichodex/

## Como funciona

- Os dados e as fotos vêm da API pública do [iNaturalist](https://www.inaturalist.org) (registros de ciência cidadã). A lista mostra o que já foi observado na área, não tudo o que existe nela.
- A localização é arredondada (~1 km) e usada apenas para consultar as espécies; a busca por cidade usa a Open-Meteo e o nome do local vem da BigDataCloud.
- As espécies marcadas como avistadas ficam salvas só no próprio aparelho.

## Desenvolvimento

React + TypeScript + Vite, sem backend.

```sh
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # checagem de tipos + build em dist/
npm run deploy   # build e publicação no GitHub Pages (branch gh-pages)
```
