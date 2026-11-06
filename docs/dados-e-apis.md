# Dados e APIs

## O que fica salvo no aparelho

Tudo passa por `load`/`save` de `src/storage.ts`, que gravam JSON no `localStorage` com o prefixo **`bichodex:`** e ignoram falhas (modo anônimo, cota cheia).

| Chave | Quem grava | Conteúdo |
|---|---|---|
| `bichodex:place` | App | `{ lat, lng, label }` (coordenadas arredondadas, ~1 km) |
| `bichodex:radius` | App | raio em km (padrão 10) |
| `bichodex:seen` | App | `number[]`: ids avistados, na ordem da marcação |
| `bichodex:zoo` | App | ids vistos em zoológico |
| `bichodex:seenAt` | App | `{ [id]: "AAAA-MM-DDTHH:MM" }`: quando foi visto |
| `bichodex:progress` | App via `missions.ts` | sequência, recorde e missões do dia |
| `bichodex:trail` | App | trilha em andamento ou encerrada (`TrailState`; `ended` só existe depois de encerrar) ou `null` |
| `bichodex:daily` | `highlights.ts` | cache do bicho do dia (data, local, raio, espécie) |
| `bichodex:game2048` | `Game2048.tsx` | recorde `{ score, maxTile }` |
| `bichodex:theme`, `bichodex:intensity`, `bichodex:textSize` | `themes.ts` | aparência |

Os jogos do Biodiversigames rodam na mesma origem (iframe) e gravam no mesmo `localStorage`, mas **sem** o prefixo: `parentes:*`, `conexoes:*`, `onde-vive:*` (ver [Biodiversigames](biodiversigames.md)).

Não há IndexedDB. O único Cache Storage é `bichodex-v1`, do service worker.

### Backup

`exportBackup` gera um JSON `{ app: 'bichodex', version: 1, exportedAt, data }` com **todas as chaves `bichodex:`**; `Backup.tsx` baixa como `bichodex-AAAA-MM-DD.json`. `parseBackup` valida o arquivo e `restoreBackup` apaga as chaves atuais e grava as do arquivo (o app recarrega depois). Se a gravação falhar no meio (cota cheia), ele desfaz e devolve os valores antigos, e o Backup avisa que os dados foram mantidos.

- As estatísticas dos jogos do Biodiversigames **não entram** no backup (não têm o prefixo).
- Se a gravação falhar no meio da restauração, os dados ficam parciais: o erro aparece, mas não há desfazer.
- Ao mudar o formato de alguma chave, mantenha a leitura do formato antigo, porque backups antigos continuam sendo importados.

## APIs externas

Todas públicas, sem chave. Todas as chamadas do app estão em `src/api.ts`.

| Serviço | Endereço | Para quê |
|---|---|---|
| iNaturalist | `https://api.inaturalist.org/v1/observations/species_counts` | Lista da região, candidatos ao bicho do dia e ao 2048, contagens |
| | `/observations/iconic_taxa_species_counts` | Números das categorias |
| | `/observations` | Registros recentes do mapa |
| | `/taxa/{id}` | Ficha (fotos, Wikipédia, classificação); lotes de 30 ids na dex |
| | `/taxa?q=` | Busca no mundo todo |
| BigDataCloud | `https://api.bigdatacloud.net/data/reverse-geocode-client` | Nome do lugar a partir das coordenadas |
| Open-Meteo | `https://geocoding-api.open-meteo.com/v1/search` | Busca de cidade |
| OpenStreetMap | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Mapa da aba Mapa (com atribuição) |
| CDN de fotos do iNaturalist | `inaturalist-open-data.s3.amazonaws.com` | Fotos |

Os parâmetros comuns das buscas por área (`areaParams`) são: círculo `lat`/`lng`/`radius`, só registros verificáveis, `locale=pt-BR` e, com o filtro "em risco", `threatened=true`.

**Limite de uso**: o iNaturalist limita requisições por minuto. A busca por nome dispara várias páginas em sequência; evite criar recursos que façam muitas chamadas em laço. As fichas (`fetchTaxon`) ficam guardadas na memória da página depois da primeira busca: a ficha, o cartão e o colorir da mesma espécie fazem uma requisição só.

### Fotos em canvas (CORS)

O cartão de conquista e a página de colorir desenham fotos em `<canvas>`. Para o canvas não ficar "contaminado" (o que faz `toBlob`/`getImageData` falharem), as fotos são baixadas por `loadImage` (`shareCard.ts`) com `fetch` em `mode: 'cors'` e `cache: 'reload'`. O `reload` é necessário porque as `<img>` da lista já deixaram no cache do navegador respostas sem cabeçalho CORS. Só são usadas fotos com licença Creative Commons sem "nd" (`isReusable`, em `src/photos.ts`, junto com `largeUrl`).

## Service worker (`public/sw.js`)

Registrado só em produção.

- `install` ativa na hora (`skipWaiting`); `activate` apaga caches com outro nome e assume as abas abertas (`clients.claim`).
- Só intercepta **GET da mesma origem**. APIs e fotos passam direto, sem cache.
- Estratégia "rede primeiro": busca na rede (navegações com `cache: 'no-cache'`, porque o GitHub Pages manda guardar por 10 min), guarda a cópia (só de respostas de sucesso) e, sem rede, serve a cópia. Navegação sem cópia recebe a página inicial (as rotas são por `#`).
- Para jogar fora o cache antigo de todo mundo, troque o nome `bichodex-v1`.

## Aviso de atualização (`src/updates.ts` + `UpdatePrompt.tsx`)

Não depende do service worker. `watchForUpdates` baixa `./` com `no-store` e compara o nome do script `assets/index-<hash>.js` com o da página aberta. Confere quando o app volta a ficar visível e a cada 30 min enquanto está visível. Ao achar versão nova: fora dos jogos, recarrega sozinho; dentro de `#/jogos`, mostra um cartão com "Atualizar" (para não perder a partida).

Se a saída do Vite deixar de gerar `assets/index-*.js`, a detecção para **em silêncio**.
