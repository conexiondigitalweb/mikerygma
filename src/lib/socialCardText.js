const QUOTE_REGEX = /["“]([^"”]+)["”]/
const REFERENCE_REGEX = /((?:[123]\s)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s[A-Za-záéíóúñ]+)?\s\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?)/

export function extractCardText(rawText = '') {
  const text = (rawText ?? '').trim()
  if (!text) return { mainText: '', reference: undefined }

  const refMatch = text.match(REFERENCE_REGEX)
  const reference = refMatch ? refMatch[1].trim() : undefined

  const quoteMatch = text.match(QUOTE_REGEX)
  if (quoteMatch) {
    return { mainText: quoteMatch[1].trim(), reference }
  }

  const words = text.split(/\s+/)
  const mainText = words.slice(0, 15).join(' ') + (words.length > 15 ? '…' : '')
  return { mainText, reference }
}
