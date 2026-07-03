import { createClient } from '@supabase/supabase-js'
import { OCCASIONS, DURATIONS, DENOMINATIONS, INPUT_TYPES } from '../src/lib/constants.js'

const MODEL = 'claude-haiku-4-5'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MAX_TOKENS = 4096

function labelFor(list, value, fallback) {
  return list.find((item) => item.value === value)?.label ?? fallback ?? value
}

function buildPrompt({ translation, denomination, userRole, occasion, duration, inputType, inputText }) {
  const occasionLabel = labelFor(OCCASIONS, occasion)
  const durationInfo = DURATIONS.find((d) => d.value === duration) ?? DURATIONS[1]
  const denominationLabel = denomination ? labelFor(DENOMINATIONS, denomination, denomination) : 'interdenominacional'
  const inputTypeLabel = labelFor(INPUT_TYPES, inputType)

  return `Este es un asistente de preparación de contenido ministerial para uso exclusivo de pastores y líderes de iglesia. Todo el contenido generado es material educativo y pastoral para uso en servicios religiosos.

Eres un asistente teológico experto diseñado para apoyar a pastores y líderes cristianos hispanohablantes en la preparación de sus mensajes. NO reemplazas al predicador — eres una herramienta que estructura, investiga y sugiere para que el pastor pueda enfocarse en la guía del Espíritu Santo y su conexión personal con la congregación.

IMPORTANTE: Sé conciso y directo. El desarrollo de cada punto del sermón debe ser 1 párrafo (no 2-3). Las ilustraciones deben ser breves (2-3 oraciones). Prioriza calidad sobre extensión.

REGLAS FUNDAMENTALES:
1. SIEMPRE usa la traducción bíblica que el usuario seleccionó: ${translation}. Cita los versículos EXACTAMENTE como aparecen en esa traducción.
2. El tono debe ser pastoral, cálido, profundo pero accesible. NO académico seco. NO superficial.
3. Las ilustraciones deben ser culturalmente relevantes para Hispanoamérica: referencias a la vida cotidiana latinoamericana, situaciones familiares hispanas, contexto cultural hispano.
4. NUNCA inventes citas bíblicas. Si no estás seguro de la cita exacta en la traducción solicitada, indica la referencia sin citar textualmente.
5. Respeta la diversidad denominacional. Si el usuario indicó su denominación (${denominationLabel}), ajusta el enfoque teológico sin contradecir doctrinas centrales del cristianismo histórico.
6. La estructura del sermón debe ser predicable: un pastor real debe poder tomar este bosquejo y predicar desde él con mínima edición.
7. Las aplicaciones prácticas deben ser concretas y accionables, no abstractas.
8. El contenido para redes debe ser nativo de cada plataforma: conciso para Twitter, visual para Instagram, reflexivo para Facebook.

CONTEXTO DEL USUARIO:
- Rol: ${userRole}
- Denominación: ${denominationLabel}
- Traducción preferida: ${translation}
- Tipo de input: ${inputTypeLabel}
- Ocasión: ${occasionLabel}
- Duración estimada: ${durationInfo.label} (genera exactamente ${durationInfo.points} puntos en el sermón)

INPUT DEL USUARIO:
${inputText}

GENERA un JSON con la siguiente estructura EXACTA (respeta los nombres de las llaves tal cual):
{
  "sermon": {
    "titulo": "string",
    "pasaje_central": "string (referencia bíblica)",
    "texto_completo_pasaje": "string (el pasaje en la traducción ${translation})",
    "introduccion": {
      "gancho": "string (historia, pregunta o dato que captura atención)",
      "contexto": "string (contexto bíblico/histórico del pasaje)",
      "tesis": "string (la idea central del sermón en una oración)"
    },
    "puntos": [
      {
        "numero": 1,
        "titulo": "string",
        "desarrollo": "string (1 párrafo)",
        "pasajes_apoyo": ["referencia1", "referencia2"],
        "ilustracion": "string (historia, analogía o ejemplo cotidiano)",
        "aplicacion": "string (cómo aplicar este punto a la vida diaria)"
      }
    ],
    "conclusion": {
      "resumen": "string",
      "llamado_accion": "string",
      "pasaje_cierre": "string"
    },
    "oracion_cierre": "string"
  },
  "devocional": {
    "versiculo_clave": "string",
    "reflexion": "string (300-500 palabras)",
    "aplicacion": "string",
    "oracion": "string"
  },
  "redes": {
    "post_instagram": { "texto": "string (frase de impacto con el versículo clave)", "hashtags": ["#hashtag1", "#hashtag2"] },
    "post_stories": { "texto": "string (pregunta de reflexión para generar engagement)", "hashtags": ["#hashtag1", "#hashtag2"] },
    "post_twitter": { "texto": "string (resumen del mensaje en máximo 280 caracteres)", "hashtags": ["#hashtag1", "#hashtag2"] }
  },
  "oracion_cierre": "string (oración pastoral completa relacionada con el tema, lista para leer en el culto)"
}

El array "puntos" debe tener exactamente ${durationInfo.points} elementos.
Responde ÚNICAMENTE con el JSON válido, sin texto adicional, sin backticks de markdown.`
}

function cleanJsonResponse(text) {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  }
  return cleaned.trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { input_type, input_text, occasion, translation, denomination, duration, user_id } = req.body ?? {}

  if (!input_type || !input_text || !occasion || !translation || !duration || !user_id) {
    res.status(400).json({ error: 'Faltan campos requeridos: input_type, input_text, occasion, translation, duration, user_id.' })
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY

  if (!supabaseUrl || !serviceRoleKey || !anthropicApiKey) {
    res.status(500).json({ error: 'Configuración del servidor incompleta.' })
    return
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  let profile
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('role, denomination, generations_used, generations_limit')
      .eq('id', user_id)
      .single()

    if (error || !data) {
      res.status(404).json({ error: 'No se encontró tu perfil. Completa el onboarding antes de generar.' })
      return
    }
    profile = data
  } catch (err) {
    console.error('Error consultando perfil:', err)
    res.status(500).json({ error: 'No se pudo verificar tu cuenta. Intenta de nuevo.' })
    return
  }

  const isUnlimited = profile.generations_limit === -1
  if (!isUnlimited && profile.generations_used >= profile.generations_limit) {
    res.status(403).json({
      error: 'Has alcanzado el límite de generaciones de tu plan. Actualiza tu plan para seguir generando contenido.',
    })
    return
  }

  const prompt = buildPrompt({
    translation,
    denomination,
    userRole: profile.role ?? 'pastor',
    occasion,
    duration,
    inputType: input_type,
    inputText: input_text,
  })

  let parsed
  let usage
  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Error de la API de Anthropic:', response.status, errorBody)
      res.status(502).json({ error: 'La IA no pudo generar el contenido en este momento. Intenta de nuevo en unos segundos.' })
      return
    }

    const data = await response.json()
    const rawText = data?.content?.[0]?.text ?? ''
    usage = data?.usage

    try {
      parsed = JSON.parse(cleanJsonResponse(rawText))
    } catch (parseErr) {
      console.error('Error parseando JSON de Claude:', parseErr, rawText)
      res.status(502).json({ error: 'No se pudo interpretar la respuesta de la IA. Intenta de nuevo.' })
      return
    }
  } catch (err) {
    console.error('Error llamando a la API de Anthropic:', err)
    res.status(502).json({ error: 'No se pudo conectar con la IA. Verifica tu conexión e intenta de nuevo.' })
    return
  }

  let generationRow
  try {
    const tokensUsed = usage ? (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0) : null

    const { data, error } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id,
        input_type,
        input_text,
        occasion,
        translation,
        output_sermon: parsed.sermon ?? null,
        output_devotional: parsed.devocional ?? null,
        output_social: parsed.redes ?? null,
        output_prayer: parsed.oracion_cierre ?? null,
        model_used: MODEL,
        tokens_used: tokensUsed,
      })
      .select()
      .single()

    if (error) {
      console.error('Error guardando la generación:', error)
      res.status(500).json({ error: 'El contenido se generó pero no se pudo guardar. Intenta de nuevo.' })
      return
    }
    generationRow = data
  } catch (err) {
    console.error('Error inesperado guardando la generación:', err)
    res.status(500).json({ error: 'El contenido se generó pero no se pudo guardar. Intenta de nuevo.' })
    return
  }

  try {
    await supabaseAdmin
      .from('profiles')
      .update({ generations_used: profile.generations_used + 1 })
      .eq('id', user_id)
  } catch (err) {
    console.error('Error actualizando el contador de generaciones:', err)
  }

  res.status(200).json({
    id: generationRow.id,
    created_at: generationRow.created_at,
    input_type,
    input_text,
    occasion,
    translation,
    sermon: parsed.sermon,
    devocional: parsed.devocional,
    redes: parsed.redes,
    oracion_cierre: parsed.oracion_cierre,
  })
}
