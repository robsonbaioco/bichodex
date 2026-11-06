# Documentação do Bichodex

Guia para quem vai dar manutenção no Bichodex. O [README da raiz](../README.md) diz o que o app faz; aqui está **como ele funciona por dentro** e **como mexer nele sem quebrar nada**.

| Documento | Para que serve |
|---|---|
| [TypeScript e React](typescript-e-react.md) | Para quem nunca usou: o necessário para ler e alterar este código, com exemplos dele |
| [Arquitetura](arquitetura.md) | Visão geral, pastas, papel de cada arquivo, estado do App, navegação |
| [Dados e APIs](dados-e-apis.md) | O que fica salvo no aparelho, backup, APIs externas, service worker e atualização |
| [Funcionalidades](funcionalidades.md) | Como cada tela funciona: lista, ficha, cartão de conquista, colorir, baralho, trilha, mapa, dex, missões, destaques, jogos, temas |
| [Biodiversigames](biodiversigames.md) | Os três jogos diários: `common.js`, regras, pontuação, integração com o app |
| [Manutenção](manutencao.md) | Receitas passo a passo (tema novo, data comemorativa, jogo novo, deploy...) e pontos frágeis conhecidos |

O [README do Biodiversigames](../biodiversigames/README.md) continua sendo o guia do gerador de conteúdo dos jogos (APIs, cache, licenças).

## Começo rápido

```sh
npm install
npm run dev      # servidor local (antes, copia os jogos para public/jogos/)
npm run build    # tsc (checagem de tipos) + vite build em dist/
npm run deploy   # build e publica no GitHub Pages (branch gh-pages)
```

No Windows, o `iniciar.bat` faz `npm install` (quando o `package-lock.json` muda) e abre o `npm run dev` com dois cliques.

Requisitos: Node 18+ (os geradores dos jogos usam o `fetch` nativo).

## Onde estão os comentários

Todo arquivo de código começa com um comentário dizendo o papel dele e com quem ele conversa. Toda função, componente e hook tem um `/** ... */` explicando o que faz. Comentários de linha aparecem só onde a lógica não é óbvia (o *porquê*, não o *quê*). Ao mudar o código, atualize o comentário junto.

## Convenções

- Textos, nomes de variáveis novas e comentários em português do Brasil (os nomes antigos, em inglês, ficam como estão).
- Sem backend: tudo roda no navegador, com APIs públicas e `localStorage`.
- Navegação por `#` no endereço (funciona no GitHub Pages sem configuração de servidor).
- `public/jogos/` e `dist/` são gerados e ficam fora do git. Não edite nada lá.
