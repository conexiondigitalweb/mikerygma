export function cleanJsonResponse(text) {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  }
  return cleaned.trim()
}

export function repairTruncatedJson(text) {
  const lastBraceIndex = text.lastIndexOf('}')
  if (lastBraceIndex === -1) return null

  let candidate = text.slice(0, lastBraceIndex + 1)

  const openBraces = (candidate.match(/{/g) || []).length
  const closeBraces = (candidate.match(/}/g) || []).length
  const openBrackets = (candidate.match(/\[/g) || []).length
  const closeBrackets = (candidate.match(/\]/g) || []).length

  candidate += ']'.repeat(Math.max(openBrackets - closeBrackets, 0))
  candidate += '}'.repeat(Math.max(openBraces - closeBraces, 0))

  try {
    return JSON.parse(candidate)
  } catch {
    return null
  }
}
