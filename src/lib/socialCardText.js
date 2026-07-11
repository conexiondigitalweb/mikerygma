const REFERENCE_REGEX = /\b((?:[1-3]\s)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s[a-záéíóúñ]+){0,2}\s\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?)\b/
const QUOTE_REGEX_GLOBAL = /["“]([^"”]+)["”]/g
const MAX_SENTENCE_LEN = 150
const MAX_REFLECTION_LEN = 120

function splitSentences(text) {
  const matches = text.match(/[^.!?]+[.!?]+["”'’]*/g)
  if (!matches || matches.length === 0) {
    return text.trim() ? [text.trim()] : []
  }
  return matches.map((s) => s.trim()).filter(Boolean)
}

function cleanSentence(sentence) {
  return (sentence ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^["“”]+|["“”]+$/g, '')
    .trim()
}

function stripHashtagsAndEmojis(text) {
  return text
    .replace(/#\S+/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordCount(sentence) {
  return sentence.trim().split(/\s+/).filter(Boolean).length
}

// Elige, entre las oraciones disponibles, la más corta que no exceda maxLen.
// Si ninguna cabe dentro del límite, devuelve la más corta disponible.
// Nunca corta una oración a la mitad.
function pickReasonableSentence(sentences, maxLen = MAX_SENTENCE_LEN) {
  if (sentences.length === 0) return ''
  const within = sentences.filter((s) => s.length <= maxLen)
  const pool = within.length > 0 ? within : sentences
  return pool.reduce((shortest, s) => (s.length < shortest.length ? s : shortest), pool[0])
}

function firstReasonableSentence(sentences, maxLen = MAX_SENTENCE_LEN) {
  if (sentences.length === 0) return ''
  if (sentences[0].length <= maxLen) return sentences[0]
  return pickReasonableSentence(sentences, maxLen)
}

function extractVerseCard(text) {
  const referenceMatch = text.match(REFERENCE_REGEX)
  const reference = referenceMatch ? referenceMatch[1].trim() : undefined
  const sentences = splitSentences(text)

  if (reference) {
    const quotes = [...text.matchAll(QUOTE_REGEX_GLOBAL)]
    if (quotes.length > 0) {
      const refIndex = referenceMatch.index ?? 0
      const closest = quotes.reduce((best, q) => {
        const dist = Math.abs((q.index ?? 0) - refIndex)
        const bestDist = Math.abs((best.index ?? 0) - refIndex)
        return dist < bestDist ? q : best
      }, quotes[0])
      const quoted = cleanSentence(closest[1])
      if (quoted) return { mainText: quoted, reference }
    }

    const containingSentence = sentences.find((s) => s.includes(reference))
    if (containingSentence) {
      const cleaned = cleanSentence(containingSentence)
      return {
        mainText: cleaned.length <= MAX_SENTENCE_LEN ? cleaned : cleanSentence(pickReasonableSentence(sentences)),
        reference,
      }
    }
  }

  return { mainText: cleanSentence(firstReasonableSentence(sentences)), reference }
}

function extractQuoteCard(text) {
  const clean = stripHashtagsAndEmojis(text)
  const referenceMatch = clean.match(REFERENCE_REGEX)
  const reference = referenceMatch ? referenceMatch[1].trim() : undefined
  const sentences = splitSentences(clean)

  const question = sentences.find((s) => s.trim().endsWith('?'))
  if (question) return { mainText: cleanSentence(question), reference }

  const candidates = sentences.filter((s) => wordCount(s) > 5)
  const pool = candidates.length > 0 ? candidates : sentences
  if (pool.length === 0) return { mainText: cleanSentence(clean), reference }

  const shortest = pool.reduce((a, b) => (b.length < a.length ? b : a))
  return { mainText: cleanSentence(shortest), reference }
}

function extractReflectionCard(text) {
  const referenceMatch = text.match(REFERENCE_REGEX)
  const reference = referenceMatch ? referenceMatch[1].trim() : undefined
  const sentences = splitSentences(text)
  if (sentences.length === 0) return { mainText: cleanSentence(text), reference }

  const firstSentence = cleanSentence(sentences[0])
  const firstTwo = sentences.slice(0, 2).map(cleanSentence).join(' ')

  if (firstTwo.length <= MAX_REFLECTION_LEN) {
    return { mainText: firstTwo, reference }
  }

  if (firstSentence.length <= MAX_SENTENCE_LEN) {
    return { mainText: firstSentence, reference }
  }

  return { mainText: cleanSentence(pickReasonableSentence(sentences)), reference }
}

export function extractCardText(rawText = '', type = 'instagram') {
  const text = (rawText ?? '').trim()
  if (!text) return { mainText: '', reference: undefined }

  if (type === 'story') return extractQuoteCard(text)
  if (type === 'twitter') return extractReflectionCard(text)
  return extractVerseCard(text)
}
