// Espécies do jogo "Onde Vive?". Prefira espécies de distribuição restrita
// (endêmicas), senão o desafio fica fácil demais.
// Formato: [nome popular, nome científico, título do artigo na Wikipédia em português (opcional)]
//
// - O nome científico é casado no GBIF (ocorrências) e no iNaturalist (foto). Sem o título da
//   Wikipédia, o build tenta o nome científico e depois o nome popular; passe o título quando o
//   artigo tiver outro nome (ex.: um nome popular diferente ou com desambiguação).
// - O build exige pelo menos 3 pontos silvestres no mapa; se uma espécie ficar com menos, ele avisa
//   ("Poucos pontos") e não grava o data.js. Troque a espécie.
// - Acrescente no fim, de preferência em lotes: mudar a quantidade reembaralha a ordem dos desafios dos
//   próximos dias (dailyIndex() em shared/common.js). Depois rode `node tools/build-onde-vive.mjs`
//   de dentro de biodiversigames/.

export default [
  ['Mico-leão-dourado', 'Leontopithecus rosalia'],
  ['Muriqui-do-norte', 'Brachyteles hypoxanthus'],
  ['Soldadinho-do-araripe', 'Antilophia bokermanni'],
  ['Arara-azul-de-lear', 'Anodorhynchus leari'],
  ['Pato-mergulhão', 'Mergus octosetaceus'],
  ['Sauim-de-coleira', 'Saguinus bicolor'],
  ['Tatu-bola', 'Tolypeutes tricinctus'],
  ['Ararajuba', 'Guaruba guarouba'],
  ['Mico-leão-de-cara-preta', 'Leontopithecus caissara'],
  ['Uacari-branco', 'Cacajao calvus'],
  ['Arara-azul-grande', 'Anodorhynchus hyacinthinus'],
  ['Iguana-marinha', 'Amblyrhynchus cristatus'],
  ['Pinguim-de-galápagos', 'Spheniscus mendiculus'],
  ['Lêmure-de-cauda-anelada', 'Lemur catta'],
  ['Fossa', 'Cryptoprocta ferox'],
  ['Baobá-de-grandidier', 'Adansonia grandidieri'],
  ['Ornitorrinco', 'Ornithorhynchus anatinus'],
  ['Coala', 'Phascolarctos cinereus'],
  ['Quokka', 'Setonix brachyurus'],
  ['Diabo-da-tasmânia', 'Sarcophilus harrisii'],
  ['Kiwi-marrom', 'Apteryx mantelli'],
  ['Tuatara', 'Sphenodon punctatus'],
  ['Dragão-de-komodo', 'Varanus komodoensis'],
  ['Macaco-narigudo', 'Nasalis larvatus'],
  ['Rafflesia', 'Rafflesia arnoldi'],
  ['Panda-gigante', 'Ailuropoda melanoleuca'],
  ['Leopardo-das-neves', 'Panthera uncia'],
  ['Ocapi', 'Okapia johnstoni'],
  ['Gorila-das-montanhas', 'Gorilla beringei'],
  ['Welwitschia', 'Welwitschia mirabilis'],
  ['Árvore-sangue-de-dragão', 'Dracaena cinnabari'],
  ['Urso-polar', 'Ursus maritimus'],
  ['Pinguim-imperador', 'Aptenodytes forsteri'],
  ['Lontra-marinha', 'Enhydra lutris'],
  ['Saguaro', 'Carnegiea gigantea'],
  ['Axolote', 'Ambystoma mexicanum'],
];
