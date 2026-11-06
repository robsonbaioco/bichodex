# TypeScript e React para quem nunca usou

Este guia é para quem sabe JavaScript mas nunca mexeu com TypeScript nem com React. Ele não substitui um curso; explica só o necessário para ler e alterar **este** código, com exemplos tirados dos arquivos do projeto. Para ir além, veja os links no fim.

> Os jogos do Biodiversigames (`biodiversigames/`) são JavaScript puro, sem TypeScript nem React. Este guia vale para `src/`.

---

## Parte 1: TypeScript

### O que é

TypeScript é JavaScript com **tipos**: anotações que dizem que forma cada valor tem ("isto é um número", "isto é uma espécie com `id` e `name`"). Os tipos só servem para conferir o código **antes** de rodar. O navegador nunca vê TypeScript: na build os tipos são apagados e sobra JavaScript comum.

Neste projeto, duas ferramentas fazem papéis diferentes:

| Ferramenta | O que faz | Quando roda |
|---|---|---|
| `tsc` | Confere os tipos e aponta erros. Não gera arquivo nenhum (`"noEmit": true` no `tsconfig.json`) | No `npm run build` (`tsc && vite build`) |
| Vite | Apaga os tipos, junta os arquivos e gera o JavaScript final | No `npm run dev` e no `npm run build` |

Consequência importante: **o `npm run dev` roda mesmo com erro de tipo**, porque o Vite não confere tipos. Quem trava é o `npm run build`. Rode `npx tsc --noEmit` (ou o build) antes de publicar. O VS Code também mostra os erros enquanto você digita, sublinhados em vermelho.

### Anotando tipos

O tipo vem depois de dois-pontos. Em `src/storage.ts`:

```ts
export function save(key: string, value: unknown): void {
```

- `key: string`: o parâmetro `key` tem que ser texto;
- `value: unknown`: pode ser qualquer coisa (mas, antes de usar, o código teria que conferir o que é);
- `: void`: a função não devolve nada.

Na maior parte do tempo **não é preciso anotar**: o TypeScript deduz sozinho. `const PER_PAGE = 48` já é um número; `useState(false)` já é um booleano.

Tipos básicos que aparecem aqui: `string`, `number`, `boolean`, `null`, `undefined`, `number[]` (lista de números), `Record<string, number>` (objeto com chaves de texto e valores numéricos, como `{ Aves: 120, Plantae: 300 }`).

### `interface`: a forma de um objeto

Em `src/api.ts`, o tipo de uma espécie do iNaturalist:

```ts
export interface Taxon {
  id: number
  name: string
  rank: string
  preferred_common_name?: string
  iconic_taxon_name?: string | null
  default_photo?: Photo | null
  ...
}
```

- O `?` em `preferred_common_name?` quer dizer **opcional**: o campo pode nem existir (valor `undefined`). Nem toda espécie tem nome popular.
- `string | null` quer dizer "texto **ou** `null`". A barra `|` é "ou".
- `Photo` é outra `interface`, definida no mesmo arquivo. Tipos podem se compor.
- `interface TaxonDetail extends Taxon { ... }`: a ficha completa tem tudo de `Taxon` mais alguns campos.

Essas interfaces descrevem o que a API **costuma** devolver; o TypeScript não confere a resposta real da rede. Se o iNaturalist mudar um campo, o tipo fica mentindo até alguém atualizá-lo.

### `type` e uniões de textos

Em `src/themes.ts` e `src/format.ts`:

```ts
export type Intensity = 'suave' | 'forte'
export type SeenWhere = 'wild' | 'zoo'
```

Uma variável do tipo `Intensity` só aceita exatamente `'suave'` ou `'forte'`. Se alguém escrever `'forte '` (com espaço) ou `'Forte'`, o `tsc` acusa. É assim que `ThemeId` lista todos os temas: ao criar um tema novo, você acrescenta o id ali e o TypeScript passa a exigir que ele exista em `THEMES`.

`type` e `interface` são parecidos; aqui a convenção é `interface` para objetos e `type` para uniões e apelidos.

### Genéricos: o `<T>`

Em `src/storage.ts`:

```ts
export function load<T>(key: string, fallback: T): T {
```

`T` é um "tipo a definir". Quem chama decide: em `load('radius', 10)` o `T` vira `number`; em `load<number[]>('seen', [])`, uma lista de números. A função devolve um valor do mesmo tipo do `fallback`.

Em `src/api.ts`, `getJson<T>(url)` faz o mesmo para respostas da rede: quem chama diz que forma espera receber.

### Lidando com valores que podem faltar

Como muitos campos são opcionais, o código usa bastante dois operadores do JavaScript moderno:

```ts
const photo = taxon.default_photo?.medium_url ?? taxon.default_photo?.square_url
```

- `?.` (encadeamento opcional): se `default_photo` for `null`/`undefined`, para ali e dá `undefined` em vez de quebrar;
- `??` (coalescência): "se o da esquerda for `null`/`undefined`, use o da direita".

Com `"strict": true` (ligado no `tsconfig.json`), o TypeScript **obriga** a tratar o caso de valor ausente. Muitos erros de tipo que você vai ver são isso: "este valor pode ser `undefined`".

### `import type`

```ts
import type { Taxon } from '../api'
```

Importa só o tipo, não código. Some na build. Se você apagar uma linha dessas, o `tsc` acusa `Cannot find name 'Taxon'`.

### Três atalhos para calar o compilador (e quando evitar)

| Atalho | O que diz ao TypeScript | Quando é aceitável |
|---|---|---|
| `valor!` | "confie em mim, não é `null`" | Quando há certeza por outra razão. Ex.: `largeUrl` em `Coloring.tsx` usa `!` porque só recebe fotos já filtradas |
| `valor as Tipo` | "trate como este tipo" | Para dados de fora (JSON, `localStorage`), como em `JSON.parse(raw) as T` |
| `any` | "não confira nada" | Praticamente nunca. O projeto não usa |

Os três **desligam a conferência**: se a certeza estiver errada, o erro aparece no navegador, não no `tsc`. Diante de um erro de tipo, primeiro tente tratar o caso (`if (!valor) return`, `?.`, `??`); use `!` ou `as` só quando souber explicar por quê, e deixe um comentário.

### Lendo um erro do `tsc`

```
src/components/Dex.tsx:42:7 - error TS2322: Type 'string' is not assignable to type 'number'.
```

Arquivo, linha e coluna, código do erro e a explicação: "você pôs um texto onde se espera um número". Os mais comuns:

| Mensagem | Quer dizer |
|---|---|
| `Type 'X' is not assignable to type 'Y'` | Valor do tipo errado |
| `Object is possibly 'undefined'` / `'null'` | Faltou tratar o caso de valor ausente |
| `Property 'x' does not exist on type 'Y'` | Campo com nome errado, ou faltou declará-lo na `interface` |
| `Cannot find name 'X'` | Faltou importar ou declarar |
| `Argument of type ... is not assignable to parameter ...` | Chamou uma função com argumento errado |

### O `tsconfig.json`

As opções que importam aqui: `"strict": true` (conferência rigorosa, incluindo `null`), `"noEmit": true` (o `tsc` só confere, quem gera arquivos é o Vite), `"jsx": "react-jsx"` (entende a sintaxe de React) e `"include": ["src"]` (só `src/` é conferido; scripts `.mjs` e os jogos ficam de fora).

---

## Parte 2: React

### A ideia

Com React, a tela é **uma função do estado**. Você não muda a página à mão (`document.querySelector(...).textContent = ...`); você muda o **estado**, e o React redesenha o que precisa. Cada pedaço da tela é um **componente**: uma função que recebe dados e devolve o que mostrar.

### Componentes e JSX

`src/components/SpeciesCard.tsx`, resumido:

```tsx
interface Props {
  entry: { taxon: Taxon; count?: number }
  number?: number
  seen: boolean
  onOpen: () => void
  onToggleSeen: () => void
}

export function SpeciesCard({ entry, number, seen, onOpen, onToggleSeen }: Props) {
  const { taxon, count } = entry
  return (
    <article className="card">
      <h3>{displayName(taxon)}</h3>
      {number != null && <span className="card-number">{entryNumber(number)}</span>}
      <button onClick={onToggleSeen} aria-pressed={seen}>✓</button>
    </article>
  )
}
```

- O que parece HTML dentro do JavaScript é **JSX**. Arquivos com JSX têm extensão `.tsx`.
- Entre chaves `{ }` vai JavaScript: `{displayName(taxon)}` mostra o resultado da função.
- Diferenças do HTML: `className` em vez de `class`; eventos em camelCase (`onClick`); `style` recebe um objeto (`style={{ color: 'red' }}`).
- `{condição && <elemento />}` mostra o elemento só se a condição for verdadeira. `{a ? <X /> : <Y />}` escolhe entre dois.
- Listas: `lista.map(item => <SpeciesCard key={item.taxon.id} ... />)`. O `key` precisa ser único e estável (o id), para o React saber qual cartão é qual entre um desenho e outro.

### Props: dados de cima para baixo, avisos de baixo para cima

O componente recebe **props** (as "propriedades", tipadas pela `interface Props`). Em `App.tsx`:

```tsx
<SpeciesCard
  key={entry.taxon.id}
  entry={entry}
  seen={seenSet.has(entry.taxon.id)}
  onToggleSeen={() => toggleSeen(entry.taxon)}
/>
```

O `SpeciesCard` **não** marca a espécie sozinho: ele só chama `onToggleSeen`, e quem decide o que acontece é o `App`. Esse é o padrão do projeto inteiro: **o `App` é dono do estado**, e os componentes recebem dados e devolvem avisos (callbacks, por convenção com nomes `on...`). Para saber o que um botão faz, procure no `App.tsx` a função passada para o `on...` dele.

### `useState`: o estado

```tsx
const [radius, setRadius] = useState<number>(() => load('radius', 10))
```

- `radius` é o valor atual; `setRadius(novo)` troca o valor **e faz o componente redesenhar**.
- Nunca altere o estado direto (`radius = 5` ou `seen.push(id)` não funcionam). Sempre crie um valor novo: `setSeen([...seen, id])`.
- `useState(() => load(...))`: com uma função, o valor inicial é calculado só na primeira vez (evita ler o `localStorage` a cada redesenho).
- `setX(anterior => ...)`: forma que recebe o valor anterior; use quando o novo depende do antigo.

Funções que começam com `use` são **hooks**. Regra: chame hooks só no topo do componente, nunca dentro de `if`, laço ou função interna.

### `useEffect`: fazer algo quando algo muda

Efeitos são para o que acontece "fora" da tela: salvar, buscar na rede, ouvir eventos. Em `App.tsx`:

```tsx
useEffect(() => save('seen', seen), [seen])
```

"Toda vez que `seen` mudar, salve no `localStorage`." A lista no fim (`[seen]`) são as **dependências**: o efeito roda de novo quando alguma delas muda.

Um efeito com limpeza, que busca na rede:

```tsx
useEffect(() => {
  if (!place) return
  const controller = new AbortController()
  fetchCategoryCounts(place, radius, threatened, controller.signal).then(setCounts)
  return () => controller.abort()
}, [place, radius, threatened])
```

A função devolvida no `return` é a **limpeza**: roda antes do efeito rodar de novo e quando o componente sai da tela. Aqui ela cancela a busca anterior quando a pessoa troca de local, para uma resposta atrasada não sobrescrever a nova.

Cuidados com as dependências:
- **Esqueceu uma**: o efeito usa um valor velho e não roda quando deveria.
- **Pôs um objeto criado a cada desenho**: o efeito roda a cada desenho, às vezes em laço infinito.
- Sem lista nenhuma, roda após **todo** desenho (o `Deck.tsx` faz isso de propósito no efeito do teclado, e o comentário explica).

### Outros hooks que aparecem aqui

| Hook | Para quê | Exemplo no projeto |
|---|---|---|
| `useMemo(() => calc, [deps])` | Guarda um cálculo e só refaz quando as dependências mudam | `seenSet` no `App.tsx` (um `Set` dos ids vistos, para consulta rápida) |
| `useCallback(fn, [deps])` | Mesmo que `useMemo`, mas para funções | `loadMore` e `changeSeenAt` no `App.tsx` |
| `useRef(valor)` | Guarda um valor que **não** redesenha a tela ao mudar; também dá acesso a um elemento do DOM | `request.current` (contador de buscas), o `<div>` do mapa no `MapView.tsx` |
| `lazy(() => import(...))` + `<Suspense>` | Carrega um componente só quando for usado | `MapView` (o Leaflet é pesado e só baixa ao abrir a aba Mapa) |

### Quando o React não é o dono

Algumas partes desenham fora do React, e é por isso que usam `useRef`:
- **Mapa** (`MapView.tsx`): o Leaflet desenha sozinho num `<div>`; o React só cria e destrói o mapa num efeito. Os popups são DOM puro.
- **Canvas** (`Coloring.tsx`, `shareCard.ts`): desenho pixel a pixel, feito com a API do canvas.
- **Jogos do Biodiversigames**: rodam num `<iframe>`, com JavaScript próprio.

### Por onde começar a ler

1. `src/main.tsx`: monta o `App`.
2. `src/App.tsx`: o estado no topo (os `useState`), os efeitos logo abaixo e o JSX no fim, que mostra qual componente aparece em cada aba.
3. Um componente simples: `SpeciesCard.tsx`; depois um com estado próprio: `Deck.tsx`.
4. Os comentários `/** ... */` acima de cada função explicam o que ela faz; no VS Code eles aparecem ao passar o mouse sobre o nome.

---

## Para aprender mais

- TypeScript para quem já sabe JavaScript: <https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html>
- React, tutorial oficial (com versão em português): <https://pt-br.react.dev/learn>
- Hooks de efeito, em detalhe: <https://pt-br.react.dev/learn/synchronizing-with-effects>
