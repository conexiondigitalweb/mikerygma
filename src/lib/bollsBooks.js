// Mapa de nombres de libros bíblicos en español -> ID numérico y testamento en
// Bolls Bible API (bolls.life). La numeración de Bolls es la estándar (Génesis=1
// ... Salmos=19 ... Job=18 ... Mateo=40 ... Apocalipsis=66) — verificada
// empíricamente contra la API (get-books, get-text) antes de construir este mapa.
const BOOKS = [
  ['genesis', 1],
  ['exodo', 2],
  ['levitico', 3],
  ['numeros', 4],
  ['deuteronomio', 5],
  ['josue', 6],
  ['jueces', 7],
  ['rut', 8],
  ['1 samuel', 9],
  ['2 samuel', 10],
  ['1 reyes', 11],
  ['2 reyes', 12],
  ['1 cronicas', 13],
  ['2 cronicas', 14],
  ['esdras', 15],
  ['nehemias', 16],
  ['ester', 17],
  ['job', 18],
  ['salmos', 19],
  ['salmo', 19],
  ['proverbios', 20],
  ['eclesiastes', 21],
  ['cantares', 22],
  ['cantar de los cantares', 22],
  ['isaias', 23],
  ['jeremias', 24],
  ['lamentaciones', 25],
  ['ezequiel', 26],
  ['daniel', 27],
  ['oseas', 28],
  ['joel', 29],
  ['amos', 30],
  ['abdias', 31],
  ['jonas', 32],
  ['miqueas', 33],
  ['nahum', 34],
  ['habacuc', 35],
  ['sofonias', 36],
  ['hageo', 37],
  ['zacarias', 38],
  ['malaquias', 39],
  ['mateo', 40],
  ['marcos', 41],
  ['lucas', 42],
  ['juan', 43],
  ['hechos', 44],
  ['romanos', 45],
  ['1 corintios', 46],
  ['2 corintios', 47],
  ['galatas', 48],
  ['efesios', 49],
  ['filipenses', 50],
  ['colosenses', 51],
  ['1 tesalonicenses', 52],
  ['2 tesalonicenses', 53],
  ['1 timoteo', 54],
  ['2 timoteo', 55],
  ['tito', 56],
  ['filemon', 57],
  ['hebreos', 58],
  ['santiago', 59],
  ['1 pedro', 60],
  ['2 pedro', 61],
  ['1 juan', 62],
  ['2 juan', 63],
  ['3 juan', 64],
  ['judas', 65],
  ['apocalipsis', 66],
]

const NT_FIRST_BOOK_ID = 40

const ACCENT_MAP = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n', ü: 'u' }

function normalize(name) {
  return (name ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[áéíóúñü]/g, (ch) => ACCENT_MAP[ch])
}

const BOOK_MAP = new Map(BOOKS.map(([name, id]) => [normalize(name), id]))

// Resuelve un nombre de libro en español (tal como lo genera el modelo en
// `pasaje_central`, ej. "Lucas", "1 Corintios", "Salmo") al ID numérico de
// Bolls Bible API y a la traducción Strong-tagged correspondiente a su
// testamento. Devuelve null si el libro no se reconoce — el llamador debe
// degradar sin bloquear nada (ver runLexiconStep en api/generate.js).
export function resolveBollsBook(bookName) {
  const bookId = BOOK_MAP.get(normalize(bookName))
  if (!bookId) return null

  const isNewTestament = bookId >= NT_FIRST_BOOK_ID
  return {
    bookId,
    testament: isNewTestament ? 'nt' : 'ot',
    // TISCH = Tischendorf's Greek NT 8th ed. con números Strong por palabra.
    // WLCa = Westminster Leningrad Codex (hebreo AT) con números Strong por palabra.
    translation: isNewTestament ? 'TISCH' : 'WLCa',
    strongPrefix: isNewTestament ? 'G' : 'H',
  }
}
