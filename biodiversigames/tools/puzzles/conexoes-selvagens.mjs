// Puzzles do jogo "Conexões Selvagens" (formato Connections).
// Cada puzzle: 4 grupos × 4 itens. `level` 0 (fácil, amarelo) a 3 (difícil, roxo).
// `check` (opcional) faz o build confirmar no GBIF que os 4 itens são do táxon indicado.
// Regra de ouro: pode haver distrações (um item que "parece" caber em dois grupos),
// mas a divisão completa em 4 grupos precisa ter UMA única solução.
// Formato dos itens: [nome exibido, nome científico usado para foto e checagem]

export default [
  {
    groups: [
      { level: 0, label: 'Felinos brasileiros', check: ['family', 'Felidae'], items: [
        ['Onça-pintada', 'Panthera onca'], ['Jaguatirica', 'Leopardus pardalis'],
        ['Gato-maracajá', 'Leopardus wiedii'], ['Suçuarana', 'Puma concolor']] },
      { level: 1, label: 'Aves que não voam', check: ['class', 'Aves'], items: [
        ['Ema', 'Rhea americana'], ['Avestruz', 'Struthio camelus'],
        ['Kiwi', 'Apteryx mantelli'], ['Pinguim-imperador', 'Aptenodytes forsteri']] },
      { level: 2, label: 'Mudam de cor para se camuflar', items: [
        ['Camaleão', 'Furcifer pardalis'], ['Polvo', 'Octopus vulgaris'],
        ['Choco', 'Sepia officinalis'], ['Linguado', 'Paralichthys orbignyanus']] },
      { level: 3, label: 'O nome engana: não são o bicho do nome', items: [
        ['Peixe-boi', 'Trichechus manatus'], ['Cobra-cega', 'Siphonops annulatus'],
        ['Tatuzinho-de-jardim', 'Armadillidium vulgare'], ['Peixe-de-prata', 'Lepisma saccharinum']] },
    ],
  },
  {
    groups: [
      { level: 0, label: 'Primatas do Brasil', check: ['order', 'Primates'], items: [
        ['Mico-leão-dourado', 'Leontopithecus rosalia'], ['Bugio', 'Alouatta guariba'],
        ['Macaco-prego', 'Sapajus nigritus'], ['Muriqui', 'Brachyteles arachnoides']] },
      { level: 1, label: 'Construtores de casas', items: [
        ['João-de-barro', 'Furnarius rufus'], ['Castor', 'Castor canadensis'],
        ['Cupim', 'Cornitermes cumulans'], ['Abelha', 'Apis mellifera']] },
      { level: 2, label: 'Peçonhentos', items: [
        ['Escorpião-amarelo', 'Tityus serrulatus'], ['Jararaca', 'Bothrops jararaca'],
        ['Taturana', 'Lonomia obliqua'], ['Arraia-de-água-doce', 'Potamotrygon motoro']] },
      { level: 3, label: 'Têm "leão" no nome', items: [
        ['Leão-marinho', 'Otaria flavescens'], ['Formiga-leão', 'Myrmeleon formicarius'],
        ['Peixe-leão', 'Pterois volitans'], ['Dente-de-leão', 'Taraxacum officinale']] },
    ],
  },
  {
    groups: [
      { level: 0, label: 'Vivem nos rios da Amazônia', items: [
        ['Boto-cor-de-rosa', 'Inia geoffrensis'], ['Pirarucu', 'Arapaima gigas'],
        ['Tambaqui', 'Colossoma macropomum'], ['Peixe-boi-amazônico', 'Trichechus inunguis']] },
      { level: 1, label: 'Árvores brasileiras', check: ['kingdom', 'Plantae'], items: [
        ['Ipê-amarelo', 'Handroanthus albus'], ['Pau-brasil', 'Paubrasilia echinata'],
        ['Castanheira-do-pará', 'Bertholletia excelsa'], ['Araucária', 'Araucaria angustifolia']] },
      { level: 2, label: 'Ícones da Caatinga', items: [
        ['Ararinha-azul', 'Cyanopsitta spixii'], ['Mandacaru', 'Cereus jamacaru'],
        ['Xique-xique', 'Pilosocereus gounellei'], ['Asa-branca', 'Patagioenas picazuro']] },
      { level: 3, label: 'O nome imita o canto', check: ['class', 'Aves'], items: [
        ['Bem-te-vi', 'Pitangus sulphuratus'], ['Quero-quero', 'Vanellus chilensis'],
        ['Tico-tico', 'Zonotrichia capensis'], ['Acauã', 'Herpetotheres cachinnans']] },
    ],
  },
  {
    groups: [
      { level: 0, label: 'Moluscos', check: ['phylum', 'Mollusca'], items: [
        ['Lesma', 'Limax maximus'], ['Lula', 'Doryteuthis pleii'],
        ['Ostra', 'Crassostrea rhizophorae'], ['Caramujo', 'Lissachatina fulica']] },
      { level: 1, label: 'Equinodermos', check: ['phylum', 'Echinodermata'], items: [
        ['Estrela-do-mar', 'Echinaster brasiliensis'], ['Ouriço-do-mar', 'Echinometra lucunter'],
        ['Pepino-do-mar', 'Holothuria grisea'], ['Bolacha-da-praia', 'Mellita quinquiesperforata']] },
      { level: 2, label: 'Cnidários', check: ['phylum', 'Cnidaria'], items: [
        ['Água-viva', 'Aurelia aurita'], ['Coral-cérebro', 'Mussismilia hispida'],
        ['Anêmona-do-mar', 'Bunodosoma caissarum'], ['Caravela-portuguesa', 'Physalia physalis']] },
      { level: 3, label: 'Crustáceos', check: ['phylum', 'Arthropoda'], items: [
        ['Craca', 'Tetraclita stalactifera'], ['Tatuzinho-de-jardim', 'Armadillidium vulgare'],
        ['Siri', 'Callinectes sapidus'], ['Krill', 'Euphausia superba']] },
    ],
  },
  {
    groups: [
      { level: 0, label: 'Tartarugas, cágados e jabutis', items: [
        ['Jabuti', 'Chelonoidis carbonarius'], ['Tartaruga-verde', 'Chelonia mydas'],
        ['Cágado', 'Phrynops geoffroanus'], ['Tracajá', 'Podocnemis unifilis']] },
      { level: 1, label: 'Serpentes', items: [
        ['Jiboia', 'Boa constrictor'], ['Sucuri', 'Eunectes murinus'],
        ['Jararaca', 'Bothrops jararaca'], ['Coral-verdadeira', 'Micrurus corallinus']] },
      { level: 2, label: 'Lagartos com patas', items: [
        ['Teiú', 'Salvator merianae'], ['Iguana', 'Iguana iguana'],
        ['Calango', 'Tropidurus torquatus'], ['Lagartixa', 'Hemidactylus mabouia']] },
      { level: 3, label: 'Sem patas, mas NÃO são serpentes', items: [
        ['Cobra-de-vidro', 'Ophiodes fragilis'], ['Cobra-cega', 'Siphonops annulatus'],
        ['Cobra-de-duas-cabeças', 'Amphisbaena alba'], ['Minhoca', 'Lumbricus terrestris']] },
    ],
  },
  {
    groups: [
      { level: 0, label: 'Frutas nativas do Brasil', items: [
        ['Jabuticaba', 'Plinia cauliflora'], ['Caju', 'Anacardium occidentale'],
        ['Açaí', 'Euterpe oleracea'], ['Pitanga', 'Eugenia uniflora']] },
      { level: 1, label: 'Plantas carnívoras', items: [
        ['Drósera', 'Drosera communis'], ['Dioneia', 'Dionaea muscipula'],
        ['Nepentes', 'Nepenthes rafflesiana'], ['Utriculária', 'Utricularia gibba']] },
      { level: 2, label: 'Comemos a raiz ou o tubérculo', items: [
        ['Mandioca', 'Manihot esculenta'], ['Batata-doce', 'Ipomoea batatas'],
        ['Cenoura', 'Daucus carota'], ['Beterraba', 'Beta vulgaris']] },
      { level: 3, label: 'Vieram da Ásia', items: [
        ['Manga', 'Mangifera indica'], ['Jaca', 'Artocarpus heterophyllus'],
        ['Arroz', 'Oryza sativa'], ['Banana', 'Musa acuminata']] },
    ],
  },
  {
    groups: [
      { level: 0, label: 'Papagaios e araras', check: ['order', 'Psittaciformes'], items: [
        ['Arara-vermelha', 'Ara chloropterus'], ['Maracanã', 'Primolius maracana'],
        ['Papagaio-verdadeiro', 'Amazona aestiva'], ['Jandaia', 'Aratinga jandaya']] },
      { level: 1, label: 'Aves de rapina', items: [
        ['Harpia', 'Harpia harpyja'], ['Carcará', 'Caracara plancus'],
        ['Coruja-buraqueira', 'Athene cunicularia'], ['Gavião-carijó', 'Rupornis magnirostris']] },
      { level: 2, label: 'Pernaltas: pernas longas para andar na água', items: [
        ['Tuiuiú', 'Jabiru mycteria'], ['Garça-branca', 'Ardea alba'],
        ['Colhereiro', 'Platalea ajaja'], ['Socó-boi', 'Tigrisoma lineatum']] },
      { level: 3, label: 'Têm nome de gente', check: ['class', 'Aves'], items: [
        ['João-de-barro', 'Furnarius rufus'], ['João-bobo', 'Nystalus chacuru'],
        ['Maria-faceira', 'Syrigma sibilatrix'], ['Maria-cavaleira', 'Myiarchus ferox']] },
    ],
  },
  {
    groups: [
      { level: 0, label: 'Roedores', check: ['order', 'Rodentia'], items: [
        ['Capivara', 'Hydrochoerus hydrochaeris'], ['Paca', 'Cuniculus paca'],
        ['Cutia', 'Dasyprocta azarae'], ['Preá', 'Cavia aperea']] },
      { level: 1, label: 'Mamíferos marinhos', check: ['class', 'Mammalia'], items: [
        ['Baleia-jubarte', 'Megaptera novaeangliae'], ['Golfinho-nariz-de-garrafa', 'Tursiops truncatus'],
        ['Lobo-marinho', 'Arctocephalus australis'], ['Peixe-boi-marinho', 'Trichechus manatus']] },
      { level: 2, label: 'Tatus, preguiças e tamanduás', items: [
        ['Tatu-galinha', 'Dasypus novemcinctus'], ['Tamanduá-bandeira', 'Myrmecophaga tridactyla'],
        ['Preguiça', 'Bradypus variegatus'], ['Tatu-bola', 'Tolypeutes tricinctus']] },
      { level: 3, label: 'Parecem roedores, mas não são', check: ['class', 'Mammalia'], items: [
        ['Tapiti', 'Sylvilagus brasiliensis'], ['Gambá', 'Didelphis albiventris'],
        ['Cuíca', 'Caluromys philander'], ['Musaranho', 'Sorex araneus']] },
    ],
  },
  {
    groups: [
      { level: 0, label: 'Não são insetos', check: ['phylum', 'Arthropoda'], items: [
        ['Aranha-armadeira', 'Phoneutria nigriventer'], ['Escorpião', 'Tityus serrulatus'],
        ['Carrapato', 'Amblyomma sculptum'], ['Lacraia', 'Scolopendra viridicornis']] },
      { level: 1, label: 'Insetos sociais', check: ['class', 'Insecta'], items: [
        ['Saúva', 'Atta sexdens'], ['Jataí', 'Tetragonisca angustula'],
        ['Cupim', 'Cornitermes cumulans'], ['Marimbondo', 'Polistes versicolor']] },
      { level: 2, label: 'Pragas dentro de casa', check: ['class', 'Insecta'], items: [
        ['Barata', 'Periplaneta americana'], ['Traça-dos-livros', 'Lepisma saccharinum'],
        ['Pernilongo', 'Culex quinquefasciatus'], ['Mosca', 'Musca domestica']] },
      { level: 3, label: 'São besouros', check: ['order', 'Coleoptera'], items: [
        ['Joaninha', 'Cycloneda sanguinea'], ['Vaga-lume', 'Photinus pyralis'],
        ['Besouro-hércules', 'Dynastes hercules'], ['Bicho-da-farinha', 'Tenebrio molitor']] },
    ],
  },
  {
    groups: [
      { level: 0, label: 'Tartarugas marinhas', items: [
        ['Tartaruga-verde', 'Chelonia mydas'], ['Tartaruga-de-couro', 'Dermochelys coriacea'],
        ['Tartaruga-cabeçuda', 'Caretta caretta'], ['Tartaruga-de-pente', 'Eretmochelys imbricata']] },
      { level: 1, label: 'Crocodilianos', items: [
        ['Jacaré-açu', 'Melanosuchus niger'], ['Jacaré-de-papo-amarelo', 'Caiman latirostris'],
        ['Crocodilo-do-nilo', 'Crocodylus niloticus'], ['Gavial', 'Gavialis gangeticus']] },
      { level: 2, label: 'Lagartos', items: [
        ['Dragão-de-komodo', 'Varanus komodoensis'], ['Teiú', 'Salvator merianae'],
        ['Iguana', 'Iguana iguana'], ['Camaleão', 'Furcifer pardalis']] },
      { level: 3, label: 'Aves grandes que correm em vez de voar', check: ['class', 'Aves'], items: [
        ['Ema', 'Rhea americana'], ['Avestruz', 'Struthio camelus'],
        ['Emu', 'Dromaius novaehollandiae'], ['Casuar', 'Casuarius casuarius']] },
    ],
  },
];
