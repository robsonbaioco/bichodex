// Puzzles do jogo "Parentes".
// Para cada alvo, 5 espécies. A ordem correta NÃO é definida aqui: o build
// consulta o Open Tree of Life e ordena pelo ancestral comum mais recente.
// Se duas opções tiverem o mesmo ancestral comum com o alvo, o build falha.
// Formato: [nome popular, nome científico]

export default [
  {
    target: ['Baleia-jubarte', 'Megaptera novaeangliae'],
    options: [
      ['Hipopótamo', 'Hippopotamus amphibius'],
      ['Boi', 'Bos taurus'],
      ['Ser humano', 'Homo sapiens'],
      ['Canguru-vermelho', 'Osphranter rufus'],
      ['Tubarão-branco', 'Carcharodon carcharias'],
    ],
    fact: 'Baleias evoluíram de mamíferos terrestres com cascos. O parente vivo mais próximo delas é o hipopótamo.',
  },
  {
    target: ['Galinha', 'Gallus gallus'],
    options: [
      ['Pato-real', 'Anas platyrhynchos'],
      ['Ema', 'Rhea americana'],
      ['Jacaré-de-papo-amarelo', 'Caiman latirostris'],
      ['Teiú', 'Salvator merianae'],
      ['Ser humano', 'Homo sapiens'],
    ],
    fact: 'Aves são dinossauros. Por isso o jacaré é mais aparentado à galinha do que a qualquer lagarto.',
  },
  {
    target: ['Lobo-guará', 'Chrysocyon brachyurus'],
    options: [
      ['Cachorro-vinagre', 'Speothos venaticus'],
      ['Lobo-marinho-sul-americano', 'Arctocephalus australis'],
      ['Onça-pintada', 'Panthera onca'],
      ['Pangolim-malaio', 'Manis javanica'],
      ['Tamanduá-bandeira', 'Myrmecophaga tridactyla'],
    ],
    fact: 'O lobo-guará não é lobo nem raposa: ele forma uma linhagem própria de canídeos sul-americanos com o cachorro-vinagre.',
  },
  {
    target: ['Elefante-africano', 'Loxodonta africana'],
    options: [
      ['Peixe-boi-marinho', 'Trichechus manatus'],
      ['Híraxe-do-cabo', 'Procavia capensis'],
      ['Musaranho-elefante', 'Macroscelides proboscideus'],
      ['Rinoceronte-branco', 'Ceratotherium simum'],
      ['Canguru-vermelho', 'Osphranter rufus'],
    ],
    fact: 'Elefantes, peixes-bois e híraxes fazem parte de Afrotheria, um grupo de mamíferos que se diversificou na África.',
  },
  {
    target: ['Abelha-europeia', 'Apis mellifera'],
    options: [
      ['Saúva', 'Atta sexdens'],
      ['Borboleta-azul-seda', 'Morpho helenor'],
      ['Barata-americana', 'Periplaneta americana'],
      ['Camarão-branco', 'Penaeus vannamei'],
      ['Caranguejeira', 'Grammostola rosea'],
    ],
    fact: 'Insetos evoluíram de dentro dos crustáceos. Um camarão é parente mais próximo da abelha do que uma aranha.',
  },
  {
    target: ['Girassol', 'Helianthus annuus'],
    options: [
      ['Alface', 'Lactuca sativa'],
      ['Tomate', 'Solanum lycopersicum'],
      ['Feijão', 'Phaseolus vulgaris'],
      ['Milho', 'Zea mays'],
      ['Pinheiro-do-paraná', 'Araucaria angustifolia'],
    ],
    fact: 'Girassol e alface são da mesma família (Asteraceae), uma das maiores famílias de plantas com flores.',
  },
  {
    target: ['Jacaré-de-papo-amarelo', 'Caiman latirostris'],
    options: [
      ['Jacaré-açu', 'Melanosuchus niger'],
      ['Crocodilo-do-nilo', 'Crocodylus niloticus'],
      ['Beija-flor-tesoura', 'Eupetomena macroura'],
      ['Jiboia', 'Boa constrictor'],
      ['Sapo-cururu', 'Rhinella marina'],
    ],
    fact: 'Crocodilianos e aves são os únicos arcossauros vivos. Um beija-flor é mais parente do jacaré do que uma cobra.',
  },
  {
    target: ['Cavalo', 'Equus caballus'],
    options: [
      ['Zebra-das-planícies', 'Equus quagga'],
      ['Anta', 'Tapirus terrestris'],
      ['Ser humano', 'Homo sapiens'],
      ['Tatu-galinha', 'Dasypus novemcinctus'],
      ['Gambá-de-orelha-branca', 'Didelphis albiventris'],
    ],
    fact: 'A anta, maior mamífero terrestre do Brasil, é da mesma ordem dos cavalos e rinocerontes: Perissodactyla.',
  },
  {
    target: ['Polvo-comum', 'Octopus vulgaris'],
    options: [
      ['Lula', 'Doryteuthis pleii'],
      ['Náutilo', 'Nautilus pompilius'],
      ['Caramujo-africano', 'Lissachatina fulica'],
      ['Minhoca', 'Lumbricus terrestris'],
      ['Estrela-do-mar', 'Asterias rubens'],
    ],
    fact: 'Polvos são moluscos, como os caramujos, mas perderam a concha ao longo da evolução. O náutilo ainda tem a dele.',
  },
  {
    target: ['Arara-azul-grande', 'Anodorhynchus hyacinthinus'],
    options: [
      ['Papagaio-verdadeiro', 'Amazona aestiva'],
      ['Periquito-australiano', 'Melopsittacus undulatus'],
      ['Sabiá-laranjeira', 'Turdus rufiventris'],
      ['Falcão-peregrino', 'Falco peregrinus'],
      ['Gavião-carijó', 'Rupornis magnirostris'],
    ],
    fact: 'Falcões não são parentes próximos de gaviões: estão mais perto de papagaios e passarinhos. A semelhança é convergência.',
  },
  {
    target: ['Tamanduá-bandeira', 'Myrmecophaga tridactyla'],
    options: [
      ['Tamanduá-mirim', 'Tamandua tetradactyla'],
      ['Preguiça-de-três-dedos', 'Bradypus variegatus'],
      ['Tatu-galinha', 'Dasypus novemcinctus'],
      ['Pangolim-malaio', 'Manis javanica'],
      ['Ornitorrinco', 'Ornithorhynchus anatinus'],
    ],
    fact: 'Pangolins também comem formigas com línguas compridas, mas são parentes de carnívoros. Tamanduás são parentes de preguiças e tatus.',
  },
  {
    target: ['Mandioca', 'Manihot esculenta'],
    options: [
      ['Seringueira', 'Hevea brasiliensis'],
      ['Maracujá', 'Passiflora edulis'],
      ['Laranja', 'Citrus sinensis'],
      ['Café', 'Coffea arabica'],
      ['Banana', 'Musa acuminata'],
    ],
    fact: 'Mandioca e seringueira são da mesma família, Euphorbiaceae. Ambas produzem látex.',
  },
  {
    target: ['Tomate', 'Solanum lycopersicum'],
    options: [
      ['Batata', 'Solanum tuberosum'],
      ['Pimentão', 'Capsicum annuum'],
      ['Batata-doce', 'Ipomoea batatas'],
      ['Café', 'Coffea arabica'],
      ['Cenoura', 'Daucus carota'],
    ],
    fact: 'Tomate e batata são do mesmo gênero, Solanum. Já a batata-doce é de outra família, a mesma das ipomeias.',
  },
  {
    target: ['Ser humano', 'Homo sapiens'],
    options: [
      ['Chimpanzé', 'Pan troglodytes'],
      ['Gorila-ocidental', 'Gorilla gorilla'],
      ['Orangotango-de-bornéu', 'Pongo pygmaeus'],
      ['Macaco-prego', 'Sapajus nigritus'],
      ['Camundongo', 'Mus musculus'],
    ],
    fact: 'Compartilhamos com os chimpanzés um ancestral que viveu há cerca de 6 a 7 milhões de anos.',
  },
  {
    target: ['Gambá-de-orelha-branca', 'Didelphis albiventris'],
    options: [
      ['Cuíca-lanosa', 'Caluromys philander'],
      ['Canguru-vermelho', 'Osphranter rufus'],
      ['Ser humano', 'Homo sapiens'],
      ['Ornitorrinco', 'Ornithorhynchus anatinus'],
      ['Galinha', 'Gallus gallus'],
    ],
    fact: 'O gambá é um marsupial, como o canguru: os filhotes terminam o desenvolvimento dentro de uma bolsa.',
  },
  {
    target: ['Tubarão-branco', 'Carcharodon carcharias'],
    options: [
      ['Tubarão-martelo-recortado', 'Sphyrna lewini'],
      ['Raia-manta', 'Mobula birostris'],
      ['Ser humano', 'Homo sapiens'],
      ['Lampreia-marinha', 'Petromyzon marinus'],
      ['Polvo-comum', 'Octopus vulgaris'],
    ],
    fact: 'Raias e tubarões formam o mesmo grupo de peixes cartilaginosos. E o tubarão é mais parente de você do que da lampreia, um peixe sem mandíbula.',
  },
  {
    target: ['Pirarucu', 'Arapaima gigas'],
    options: [
      ['Aruanã', 'Osteoglossum bicirrhosum'],
      ['Piranha-vermelha', 'Pygocentrus nattereri'],
      ['Esturjão-branco', 'Acipenser transmontanus'],
      ['Ser humano', 'Homo sapiens'],
      ['Tubarão-branco', 'Carcharodon carcharias'],
    ],
    fact: 'Somos peixes ósseos modificados: um pirarucu é mais parente de você do que de um tubarão.',
  },
  {
    target: ['Sapo-cururu', 'Rhinella marina'],
    options: [
      ['Sapo-ferreiro', 'Boana faber'],
      ['Rã-touro', 'Lithobates catesbeianus'],
      ['Salamandra-de-fogo', 'Salamandra salamandra'],
      ['Cobra-cega', 'Siphonops annulatus'],
      ['Lagartixa-de-parede', 'Hemidactylus mabouia'],
    ],
    fact: 'A cobra-cega não é cobra: é um anfíbio sem patas, parente de sapos e salamandras.',
  },
  {
    target: ['Pinguim-de-magalhães', 'Spheniscus magellanicus'],
    options: [
      ['Albatroz-errante', 'Diomedea exulans'],
      ['Garça-branca-grande', 'Ardea alba'],
      ['Coruja-buraqueira', 'Athene cunicularia'],
      ['Galinha', 'Gallus gallus'],
      ['Ema', 'Rhea americana'],
    ],
    fact: 'Pinguins são parentes próximos de albatrozes e petréis, aves oceânicas que voam por milhares de quilômetros.',
  },
  {
    target: ['Cupim-arborícola', 'Nasutitermes corniger'],
    options: [
      ['Barata-americana', 'Periplaneta americana'],
      ['Louva-a-deus', 'Mantis religiosa'],
      ['Gafanhoto-do-deserto', 'Schistocerca gregaria'],
      ['Saúva', 'Atta sexdens'],
      ['Caranguejeira', 'Grammostola rosea'],
    ],
    fact: 'Cupins são baratas sociais! Eles evoluíram de dentro do grupo das baratas.',
  },
  {
    target: ['Cogumelo-de-paris', 'Agaricus bisporus'],
    options: [
      ['Shiitake', 'Lentinula edodes'],
      ['Levedura-de-cerveja', 'Saccharomyces cerevisiae'],
      ['Ser humano', 'Homo sapiens'],
      ['Milho', 'Zea mays'],
      ['Escherichia coli', 'Escherichia coli'],
    ],
    fact: 'Fungos são mais parentes dos animais do que das plantas. Você e o champignon estão no mesmo grande grupo: Opisthokonta.',
  },
  {
    target: ['Morcego-vampiro', 'Desmodus rotundus'],
    options: [
      ['Morcego-fruteiro-grande', 'Artibeus lituratus'],
      ['Raposa-voadora-grande', 'Pteropus vampyrus'],
      ['Onça-pintada', 'Panthera onca'],
      ['Ser humano', 'Homo sapiens'],
      ['Beija-flor-tesoura', 'Eupetomena macroura'],
    ],
    fact: 'O morcego-vampiro é da mesma família de muitos morcegos que comem frutas e néctar na América do Sul.',
  },
];
