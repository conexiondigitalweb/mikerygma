const SUPADATA_URL = 'https://api.supadata.ai/v1/youtube/transcript'
const MAX_WORDS = 5000

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { url } = req.body ?? {}

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Falta la URL del video de YouTube.' })
    return
  }

  const supadataApiKey = process.env.SUPADATA_API_KEY

  if (!supadataApiKey) {
    res.status(500).json({ error: 'Configuración del servidor incompleta.' })
    return
  }

  try {
    const response = await fetch(
      `${SUPADATA_URL}?url=${encodeURIComponent(url)}&lang=es`,
      {
        method: 'GET',
        headers: { 'x-api-key': supadataApiKey },
      }
    )

    if (response.status === 404) {
      res.status(404).json({ error: 'No se encontró el video o no tiene transcripción disponible.' })
      return
    }

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Error de la API de Supadata:', response.status, errorBody)
      res.status(502).json({ error: 'No se pudo transcribir el video en este momento. Intenta de nuevo.' })
      return
    }

    const data = await response.json()
    const segments = Array.isArray(data?.content) ? data.content : null
    const rawTranscript = segments
      ? segments.map((segment) => segment.text).join(' ')
      : (data?.transcript ?? data?.text ?? '')

    if (!rawTranscript || !rawTranscript.trim()) {
      res.status(404).json({ error: 'No se encontró transcripción disponible para este video.' })
      return
    }

    const words = rawTranscript.trim().split(/\s+/)
    const truncated = words.length > MAX_WORDS
    const finalWords = truncated ? words.slice(0, MAX_WORDS) : words
    const transcript = finalWords.join(' ')

    res.status(200).json({
      transcript,
      word_count: finalWords.length,
    })
  } catch (err) {
    console.error('Error transcribiendo el video:', err)
    res.status(502).json({ error: 'No se pudo conectar con el servicio de transcripción. Intenta de nuevo.' })
  }
}
