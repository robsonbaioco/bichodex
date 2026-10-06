// Datas comemorativas de animais. Cada data aponta para um táxon do iNaturalist (espécie ou grupo).

export interface SpecialDay {
  /** Nome da data, como aparece no destaque (ex.: "Dia Mundial do Leão"). */
  name: string
  /** Como o grupo é chamado em uma frase ou filtro (ex.: "Leões"). */
  group: string
  emoji: string
  taxonId: number
  month: number
  /** Dia fixo do mês... */
  day?: number
  /** ...ou regra móvel: enésimo (nth; -1 = último) dia da semana (0 = domingo) do mês. */
  weekday?: number
  nth?: number
}

const SUNDAY = 0
const WEDNESDAY = 3
const FRIDAY = 5
const SATURDAY = 6

// Datas conferidas em outubro de 2026 nos sites das entidades organizadoras ou em duas fontes independentes.
// Mais de uma data pode cair no mesmo dia; todas aparecem no destaque.
export const SPECIAL_DAYS: SpecialDay[] = [
  { name: 'Dia Internacional da Zebra', group: 'Zebras', emoji: '🦓', taxonId: 43335, month: 1, day: 31 },
  { name: 'Dia Mundial do Hipopótamo', group: 'Hipopótamos', emoji: '🦛', taxonId: 42149, month: 2, day: 15 },
  { name: 'Dia Internacional do Urso-polar', group: 'Ursos-polares', emoji: '🐻‍❄️', taxonId: 41644, month: 2, day: 27 },
  { name: 'Dia Mundial do Pangolim', group: 'Pangolins', emoji: '🦔', taxonId: 43357, month: 2, weekday: SATURDAY, nth: 3 },
  { name: 'Dia Mundial da Baleia', group: 'Baleias', emoji: '🐋', taxonId: 424321, month: 2, weekday: SUNDAY, nth: 3 },
  { name: 'Dia Mundial do Sapo', group: 'Sapos, rãs e pererecas', emoji: '🐸', taxonId: 20979, month: 3, day: 20 },
  { name: 'Dia Mundial do Pardal', group: 'Pardais', emoji: '🐦', taxonId: 13858, month: 3, day: 20 },
  { name: 'Dia de Valorização do Peixe-boi', group: 'Peixes-boi', emoji: '🌊', taxonId: 46315, month: 3, weekday: WEDNESDAY, nth: -1 },
  { name: 'Dia Internacional do Morcego', group: 'Morcegos', emoji: '🦇', taxonId: 40268, month: 4, day: 17 },
  { name: 'Dia Mundial do Pinguim', group: 'Pinguins', emoji: '🐧', taxonId: 3806, month: 4, day: 25 },
  { name: 'Dia Mundial da Anta', group: 'Antas', emoji: '🌿', taxonId: 43352, month: 4, day: 27 },
  { name: 'Dia do Coala Selvagem', group: 'Coalas', emoji: '🐨', taxonId: 42983, month: 5, day: 3 },
  { name: 'Dia Mundial das Abelhas', group: 'Abelhas', emoji: '🐝', taxonId: 630955, month: 5, day: 20 },
  { name: 'Dia Mundial da Tartaruga', group: 'Tartarugas, cágados e jabutis', emoji: '🐢', taxonId: 39532, month: 5, day: 23 },
  { name: 'Dia Mundial da Lontra', group: 'Lontras', emoji: '🦦', taxonId: 526556, month: 5, weekday: WEDNESDAY, nth: -1 },
  { name: 'Dia Mundial do Papagaio', group: 'Papagaios, araras e periquitos', emoji: '🦜', taxonId: 18874, month: 5, day: 31 },
  { name: 'Dia Mundial da Tartaruga Marinha', group: 'Tartarugas-marinhas', emoji: '🐢', taxonId: 372234, month: 6, day: 16 },
  { name: 'Dia Mundial do Crocodilo', group: 'Crocodilos e jacarés', emoji: '🐊', taxonId: 26039, month: 6, day: 17 },
  { name: 'Dia Mundial da Girafa', group: 'Girafas', emoji: '🦒', taxonId: 42156, month: 6, day: 21 },
  { name: 'Dia da Capivara', group: 'Capivaras', emoji: '🐹', taxonId: 74442, month: 7, day: 10 },
  { name: 'Dia Mundial do Chimpanzé', group: 'Chimpanzés', emoji: '🐒', taxonId: 43577, month: 7, day: 14 },
  { name: 'Dia de Conscientização sobre Tubarões', group: 'Tubarões', emoji: '🦈', taxonId: 551307, month: 7, day: 14 },
  { name: 'Dia Mundial da Cobra', group: 'Cobras', emoji: '🐍', taxonId: 85553, month: 7, day: 16 },
  { name: 'Dia Internacional do Tigre', group: 'Tigres', emoji: '🐅', taxonId: 41967, month: 7, day: 29 },
  { name: 'Dia do Mico-leão-dourado', group: 'Micos-leões-dourados', emoji: '🐒', taxonId: 43396, month: 8, day: 2 },
  { name: 'Dia Internacional da Coruja', group: 'Corujas', emoji: '🦉', taxonId: 19350, month: 8, day: 4 },
  { name: 'Dia Mundial do Leão', group: 'Leões', emoji: '🦁', taxonId: 41964, month: 8, day: 10 },
  { name: 'Dia Mundial do Elefante', group: 'Elefantes', emoji: '🐘', taxonId: 43692, month: 8, day: 12 },
  { name: 'Dia Internacional do Lobo', group: 'Lobos', emoji: '🐺', taxonId: 42048, month: 8, day: 13 },
  { name: 'Dia Internacional do Orangotango', group: 'Orangotangos', emoji: '🦧', taxonId: 43581, month: 8, day: 19 },
  { name: 'Dia Internacional dos Abutres e Urubus', group: 'Urubus e condores', emoji: '🦅', taxonId: 71306, month: 9, weekday: SATURDAY, nth: 1 },
  { name: 'Dia Internacional do Peixe-boi', group: 'Peixes-boi', emoji: '🌊', taxonId: 46315, month: 9, day: 7 },
  { name: 'Dia Mundial do Golfinho', group: 'Golfinhos', emoji: '🐬', taxonId: 41479, month: 9, day: 12 },
  { name: 'Dia Internacional do Panda-vermelho', group: 'Pandas-vermelhos', emoji: '🐾', taxonId: 41653, month: 9, weekday: SATURDAY, nth: 3 },
  { name: 'Dia Mundial do Rinoceronte', group: 'Rinocerontes', emoji: '🦏', taxonId: 43341, month: 9, day: 22 },
  { name: 'Dia Mundial do Gorila', group: 'Gorilas', emoji: '🦍', taxonId: 43579, month: 9, day: 24 },
  { name: 'Dia Mundial do Polvo', group: 'Polvos', emoji: '🐙', taxonId: 47458, month: 10, day: 8 },
  { name: 'Dia do Lobo-guará', group: 'Lobos-guarás', emoji: '🦊', taxonId: 42091, month: 10, day: 12 },
  { name: 'Dia Internacional da Preguiça', group: 'Preguiças', emoji: '🦥', taxonId: 1317251, month: 10, day: 20 },
  { name: 'Dia Internacional do Leopardo-das-neves', group: 'Leopardos-das-neves', emoji: '🐆', taxonId: 74831, month: 10, day: 23 },
  { name: 'Dia Internacional dos Golfinhos de Rio', group: 'Botos', emoji: '🐬', taxonId: 41466, month: 10, day: 24 },
  { name: 'Dia Mundial do Canguru', group: 'Cangurus', emoji: '🦘', taxonId: 42864, month: 10, day: 24 },
  { name: 'Dia Mundial do Lêmure', group: 'Lêmures', emoji: '🐒', taxonId: 467897, month: 10, weekday: FRIDAY, nth: -1 },
  { name: 'Dia Mundial do Tamanduá', group: 'Tamanduás', emoji: '🐜', taxonId: 1317250, month: 11, day: 19 },
  { name: 'Dia da Onça-pintada', group: 'Onças-pintadas', emoji: '🐆', taxonId: 41970, month: 11, day: 29 },
  { name: 'Dia Internacional do Guepardo', group: 'Guepardos', emoji: '🐆', taxonId: 41955, month: 12, day: 4 },
  { name: 'Dia Mundial do Macaco', group: 'Macacos', emoji: '🐒', taxonId: 554251, month: 12, day: 14 },

  // Datas do calendário "Datas Comemorativas" (edição de 2025), usadas como dia fixo em qualquer ano.
  { name: 'Dia do Caranguejo', group: 'Caranguejos', emoji: '🦀', taxonId: 121639, month: 1, day: 12 },
  { name: 'Dia do Pinguim', group: 'Pinguins', emoji: '🐧', taxonId: 3806, month: 1, day: 20 },
  { name: 'Dia do Esquilo', group: 'Esquilos', emoji: '🐿️', taxonId: 45933, month: 1, day: 21 },
  { name: 'Dia da Marmota', group: 'Marmotas', emoji: '🐿️', taxonId: 46078, month: 2, day: 2 },
  { name: 'Dia da Borboleta-monarca', group: 'Borboletas-monarcas', emoji: '🦋', taxonId: 48662, month: 2, day: 5 },
  { name: 'Dia Internacional do Leopardo-árabe', group: 'Leopardos-árabes', emoji: '🐆', taxonId: 147735, month: 2, day: 10 },
  { name: 'Dia Mundial do Gato', group: 'Gatos', emoji: '🐈', taxonId: 118552, month: 2, day: 17 },
  { name: 'Dia Internacional do Porco', group: 'Porcos e javalis', emoji: '🐖', taxonId: 42134, month: 3, day: 1 },
  { name: 'Dia Mundial da Vida Selvagem', group: 'Animais', emoji: '🌍', taxonId: 1, month: 3, day: 3 },
  { name: 'Dia Mundial do Panda', group: 'Pandas-gigantes', emoji: '🐼', taxonId: 41659, month: 3, day: 16 },
  { name: 'Dia Mundial do Urso', group: 'Ursos', emoji: '🐻', taxonId: 41636, month: 3, day: 23 },
  { name: 'Dia Internacional do Furão', group: 'Furões', emoji: '🐾', taxonId: 399272, month: 4, day: 2 },
  { name: 'Dia Mundial do Rato', group: 'Ratos', emoji: '🐀', taxonId: 44540, month: 4, day: 4 },
  { name: 'Dia do Castor', group: 'Castores', emoji: '🦫', taxonId: 43792, month: 4, day: 7 },
  { name: 'Dia do Hamster', group: 'Hamsters', emoji: '🐹', taxonId: 735066, month: 4, day: 12 },
  { name: 'Dia do Boi', group: 'Bois', emoji: '🐂', taxonId: 74113, month: 4, day: 24 },
  { name: 'Dia Mundial do Atum', group: 'Atuns', emoji: '🐟', taxonId: 69676, month: 5, day: 2 },
  { name: 'Dia Internacional de Respeito às Galinhas', group: 'Galinhas', emoji: '🐔', taxonId: 882, month: 5, day: 4 },
  { name: 'Dia Internacional do Burro', group: 'Burros', emoji: '🫏', taxonId: 148030, month: 5, day: 8 },
  { name: 'Dia Internacional do Markhor', group: 'Markhores', emoji: '🐐', taxonId: 42356, month: 5, day: 24 },
  { name: 'Dia Mundial do Albatroz', group: 'Albatrozes', emoji: '🕊️', taxonId: 67526, month: 6, day: 19 },
  { name: 'Dia Mundial do Camelo', group: 'Camelos', emoji: '🐫', taxonId: 42232, month: 6, day: 22 },
  { name: 'Dia Internacional do Porquinho-da-índia', group: 'Porquinhos-da-índia', emoji: '🐹', taxonId: 119405, month: 7, day: 16 },
  { name: 'Dia Mundial da Baleia e do Golfinho', group: 'Baleias e golfinhos', emoji: '🐋', taxonId: 152871, month: 7, day: 23 },
  { name: 'Dia da Baleia-franca', group: 'Baleias-francas', emoji: '🐋', taxonId: 41571, month: 7, day: 31 },
  { name: 'Dia Mundial do Cão', group: 'Cães', emoji: '🐕', taxonId: 47144, month: 8, day: 26 },
  { name: 'Dia do Macaco Muriqui', group: 'Muriquis', emoji: '🐒', taxonId: 43403, month: 8, day: 27 },
  { name: 'Dia Internacional do Tubarão-baleia', group: 'Tubarões-baleia', emoji: '🦈', taxonId: 52188, month: 8, day: 30 },
  { name: 'Dia Mundial do Primata', group: 'Primatas', emoji: '🐒', taxonId: 43367, month: 9, day: 1 },
  { name: 'Dia da Iguana', group: 'Iguanas', emoji: '🦎', taxonId: 35342, month: 9, day: 14 },
  { name: 'Dia Nacional do Cavalo', group: 'Cavalos', emoji: '🐎', taxonId: 209233, month: 9, day: 14 },
  { name: 'Dia de Defesa da Fauna', group: 'Animais', emoji: '🌍', taxonId: 1, month: 9, day: 22 },
  { name: 'Dia Internacional do Coelho', group: 'Coelhos', emoji: '🐇', taxonId: 43151, month: 9, day: 30 },
  { name: 'Dia Nacional das Abelhas', group: 'Abelhas', emoji: '🐝', taxonId: 630955, month: 10, day: 3 },
  { name: 'Dia Mundial dos Animais', group: 'Animais', emoji: '🌍', taxonId: 1, month: 10, day: 4 },
  { name: 'Dia das Aves', group: 'Aves', emoji: '🦜', taxonId: 3, month: 10, day: 5 },
  { name: 'Dia Mundial do Ocapi', group: 'Ocapis', emoji: '🦒', taxonId: 42155, month: 10, day: 18 },
  { name: 'Dia do Macaco Sauim', group: 'Sauins-de-coleira', emoji: '🐒', taxonId: 43383, month: 10, day: 20 },
  { name: 'Dia Mundial dos Répteis', group: 'Répteis', emoji: '🦎', taxonId: 26036, month: 10, day: 21 },
  { name: 'Dia Internacional do Gibão', group: 'Gibões', emoji: '🐒', taxonId: 43585, month: 10, day: 24 },
  { name: 'Dia Nacional do Tubarão e da Raia', group: 'Tubarões e raias', emoji: '🦈', taxonId: 47273, month: 11, day: 14 },
]
