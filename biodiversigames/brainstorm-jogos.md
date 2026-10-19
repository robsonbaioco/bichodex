# 5 jogos diários de biodiversidade com APIs gratuitas

## 1. Os formatos de jogo diário mais jogados

| Formato | Exemplos | Por que funciona |
|---|---|---|
| Adivinhar com dica a cada tentativa | Wordle, Loldle | Um desafio por dia para todo mundo e um resultado em emoji fácil de compartilhar |
| Agrupar em categorias | Connections (NYT) | Os erros são "quase acertos" e geram discussão |
| Geografia com dica de "quente/frio" | Worldle, Globle | Cada palpite traz direção e distância |
| Revelação progressiva de imagem ou som | Framed, Heardle | A dificuldade cai a cada tentativa, então todo mundo termina |
| Caça-palavras temático | Strands | Gira em torno do tema do dia |
| Taxonomia | Metazooa, Metafloora | Já provou que existe público para o tema |

Wordle continua o mais jogado. Connections e Strands vêm logo atrás, e os "-dle" de geografia são o nicho que mais cresce. As fontes sobre ranking são blogs, sem números oficiais de jogadores. O Metazooa já existe, então a ideia nº 1 abaixo precisa de um diferencial (fauna brasileira e atributos além da taxonomia).

## 2. APIs e bases gratuitas

| Fonte | Para que serve | Acesso |
|---|---|---|
| **GBIF** (`api.gbif.org/v1`) | Taxonomia, registros de ocorrência e tiles de mapa | Aberto, sem chave |
| **iNaturalist API** | Fotos e sons com grau de pesquisa, nomes populares em PT, contagem de observações | Aberto, sem chave; respeitar o limite de download de mídia |
| **Xeno-canto API v3** | Cantos de aves e anfíbios | Gratuita, mas exige chave da conta (não colocar a chave no repositório) |
| **Wikidata (SPARQL)** | Status IUCN, endemismo, massa, imagens | Aberto, CC0 |
| **PhyloPic** | Silhuetas de organismos | Aberto; a licença varia por imagem |
| **Open Tree of Life** | Linhagem e parentesco entre espécies | Aberto |
| **Flora e Funga do Brasil / Catálogo da Fauna do Brasil** | Nomes válidos e endemismo no Brasil | Aberto |

## 3. As 5 ideias

### 1. Bichodle (formato Wordle/Loldle)
- **Mecânica:** o jogador digita uma espécie brasileira e cada palpite mostra uma linha de atributos comparados com a espécie do dia: classe, ordem, família, bioma, dieta, tamanho (↑↓), status IUCN e se é endêmica. Verde é igual, amarelo é parcial e ↑↓ indica maior ou menor.
- **Dados:** GBIF para a taxonomia, Wikidata para IUCN e massa, e o Catálogo da Fauna para endemismo. No fim aparece a foto do iNaturalist.
- **Diferencial em relação ao Metazooa:** atributos ecológicos além da taxonomia, e foco no Brasil.

### 2. Onde Vive? (formato Worldle/Globle)
- **Mecânica:** aparece a foto da espécie e o jogador chuta o estado ou bioma onde ela ocorre. Cada erro mostra distância e direção até o centro das ocorrências.
- **Variante invertida:** o jogo mostra só o mapa de calor de ocorrências do GBIF e o jogador adivinha a espécie.
- **Dados:** ocorrências e tiles de mapa do GBIF, foto do iNaturalist.

### 3. Canto do Dia (formato Heardle)
- **Mecânica:** um trecho de 1 s de canto, que vai aumentando para 2, 4, 8 e 16 s. Depois de alguns erros, aparece a silhueta do PhyloPic como dica.
- **Dados:** sons do iNaturalist (sem chave) ou do Xeno-canto (com chave).
- **Público:** observadores de aves, uma comunidade grande e engajada no Brasil.

### 4. Conexões Selvagens (formato Connections)
- **Mecânica:** 16 espécies para separar em 4 grupos escondidos. Exemplos de grupo: "mesma família", "polinizadores", "só existe na Mata Atlântica" e "nomes enganosos" (peixe-boi não é peixe, bicho-preguiça…).
- **Dados:** consultas SPARQL no Wikidata e taxonomia do GBIF para gerar candidatos.
- **Ressalva:** é o jogo que mais exige curadoria manual, porque grupos bons e com pegadinha dependem de alguém escolhendo.

### 5. Parentes (formato ordenar / "mais perto ou mais longe")
- **Mecânica:** dada uma espécie-alvo (ex.: baleia), o jogador ordena 5 espécies da mais aparentada à menos aparentada (hipopótamo, vaca, tubarão…). O resultado revela a árvore filogenética desenhada.
- **Modos alternativos com a mesma tela:** ordenar por massa, por número de observações no iNaturalist ou por risco de extinção.
- **Dados:** linhagem do Open Tree of Life ou do GBIF, massa do Wikidata e contagens do iNaturalist.
- **Diferencial:** mostra o que a evolução tem de contraintuitivo, e o "nossa!" é o que faz a pessoa compartilhar.

## 4. Como montar a parte técnica
- **Gerar os puzzles antes:** um script baixa os dados das APIs e grava um JSON por dia. Assim o site fica estático, sem limite de requisições e sem expor chaves.
- **Mesmo desafio para todos:** o puzzle do dia vem da data (seed), resolvido no próprio navegador.
- **Retenção:** sequência de dias (streak) e resultado compartilhável em emoji, que são o que fez o Wordle viralizar.
- **Licenças de mídia:** filtrar fotos e sons por licença (CC0 ou CC BY se houver chance de uso comercial, porque CC BY-NC impede) e sempre mostrar o crédito do autor.
- **Ordem sugerida:** começar pelo **Bichodle** ou pelo **Canto do Dia**, que são os mais fáceis de gerar automaticamente.

## Fontes
- [Capitalle – Best puzzle games 2026](https://capitalle.app/blog/best-puzzle-games-2026)
- [SummerEngine – 15 Daily Games Like Wordle 2026](https://www.summerengine.com/blog/games-like-wordle)
- [Top 5 NYT games](https://arhsharbinger.com/42656/blogs/top-5-new-york-times-games/)
- [Fórum iNaturalist – Metazooa e Metafloora](https://forum.inaturalist.org/t/metazooa-and-metafloora-games/49390)
- [Lilach Bullock – Games like Wordle](https://www.lilachbullock.com/games-like-wordle/)
- [iNaturalist – Developers](https://inaturalist.ala.org.au/pages/developers)
- [GBIF API](https://publicapis.io/gbif-api)
- [Xeno-canto API](https://publicapi.dev/xeno-canto-api)
- [suwo – query_xenocanto](https://docs.ropensci.org/suwo/reference/query_xenocanto.html)
- [PhyloPic – API Recipes](https://www.phylopic.org/articles/api-recipes)
- [rphylopic](https://search.r-project.org/CRAN/packages/rphylopic/rphylopic.pdf)
