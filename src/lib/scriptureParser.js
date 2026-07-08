// Libro (con prefijo numérico opcional, ej. "1 Corintios") + capítulo + versos opcionales.
// El grupo del libro es perezoso para que el último número de la referencia siempre se lea como capítulo.
const REFERENCE_PATTERN =
  /^((?:[1-3]\s+)?[A-Za-zÀ-ÖØ-öø-ÿ'.]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ'.]+)*?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*-\s*(\d+))?)?\s*$/

export function parseReference(reference) {
  const trimmed = (reference ?? '').trim()

  if (!trimmed) {
    return { book: trimmed, chapter: null, verse_start: null, verse_end: null }
  }

  const normalized = trimmed.replace(/[–—]/g, '-')
  const match = normalized.match(REFERENCE_PATTERN)

  if (!match) {
    return { book: trimmed, chapter: null, verse_start: null, verse_end: null }
  }

  const [, book, chapter, verseStart, verseEnd] = match

  return {
    book: book.trim(),
    chapter: Number(chapter),
    verse_start: verseStart ? Number(verseStart) : null,
    verse_end: verseEnd ? Number(verseEnd) : null,
  }
}
