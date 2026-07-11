import { createClient } from '@supabase/supabase-js'
import {
  OCCASIONS,
  DURATIONS,
  DENOMINATIONS,
  PASTORAL_TONES,
  TARGET_AUDIENCES,
  THEOLOGICAL_CENTERS,
  TEACHING_STYLES,
  CONFRONTATION_LEVELS,
  APPLICATION_TYPES,
  PASTORAL_CLOSINGS,
} from '../src/lib/constants.js'
import { canUseFeature } from '../src/lib/planHelpers.js'

const MODEL = 'claude-haiku-4-5'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MAX_TOKENS = 800

function labelFor(list, value, fallback) {
  return list.find((item) => item.value === value)?.label ?? fallback ?? value
}

function buildPreviewPrompt({
  translation,
  denomination,
  userRole,
  occasion,
  duration,
  inputType,
  inputText,
  customInstructions,
  theologicalCenter,
  teachingStyle,
  confrontationLevel,
  applicationType,
  pastoralClosing,
  pastoralTone,
  targetAudience,
  phrasesToAvoid,
  pastoralInstructions,
}) {
  const occasionLabel = labelFor(OCCASIONS, occasion)
  const durationInfo = DURATIONS.find((d) => d.value === duration) ?? DURATIONS[1]
  const denominationLabel = denomination ? labelFor(DENOMINATIONS, denomination, denomination) : 'interdenominacional'

  const adnFields = [
    theologicalCenter && `Centro teológico: ${labelFor(THEOLOGICAL_CENTERS, theologicalCenter, theologicalCenter)}`,
    teachingStyle && `Estilo de enseñanza: ${labelFor(TEACHING_STYLES, teachingStyle, teachingStyle)}`,
    confrontationLevel && `Nivel de confrontación: ${labelFor(CONFRONTATION_LEVELS, confrontationLevel, confrontationLevel)}`,
    applicationType && `Tipo de aplicación preferida: ${labelFor(APPLICATION_TYPES, applicationType, applicationType)}`,
    pastoralClosing && `Forma de cierre: ${labelFor(PASTORAL_CLOSINGS, pastoralClosing, pastoralClosing)}`,
    pastoralTone && `Tono preferido: ${labelFor(PASTORAL_TONES, pastoralTone, pastoralTone)}`,
    targetAudience && `Audiencia principal: ${labelFor(TARGET_AUDIENCES, targetAudience, targetAudience)}`,
    phrasesToAvoid && `Frases o enfoques a evitar: ${phrasesToAvoid}`,
    pastoralInstructions && `Instrucciones permanentes: ${pastoralInstructions}`,
  ].filter(Boolean)

  const adnSection = adnFields.length > 0
    ? `\n\nADN PASTORAL DEL USUARIO:\n${adnFields.join('\n')}`
    : ''

  const customInstructionsSection = customInstructions
    ? `\n\nÉNFASIS ADICIONAL SOLICITADO POR EL USUARIO: ${customInstructions}`
    : ''

  return `Eres un asistente pastoral. A partir del input del usuario, propón un enfoque pastoral para un mensaje. Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin backticks de markdown. Si necesitas usar comillas dobles dentro de un valor de texto (por ejemplo para citar una frase o un apodo), escápalas SIEMPRE como \\" — nunca dejes una comilla doble sin escapar dentro de un string, porque eso rompe el JSON.

CONTEXTO DEL USUARIO:
- Rol: ${userRole}
- Denominación: ${denominationLabel}
- Traducción preferida: ${translation}${adnSection}${customInstructionsSection}

INPUT: ${inputText}
TIPO: ${inputType}
OCASIÓN: ${occasionLabel}
DURACIÓN: ${durationInfo.label}

Genera SOLO esto:
{
  "titulo_propuesto": "string — título evocador y pastoral para el mensaje",
  "tesis": "string — la idea central del mensaje en una oración clara",
  "tension_humana": "string — la experiencia o dolor humano desde donde parte el mensaje",
  "intencion_pastoral": "string — consolar, enseñar, confrontar, evangelizar, formar o animar",
  "pasaje_central": "string — el pasaje bíblico principal (referencia)",
  "pasajes_apoyo": ["ref1", "ref2", "ref3"],
  "puntos_sugeridos": ["título punto 1", "título punto 2", "título punto 3"],
  "audiencia_sugerida": "string — a quién le habla principalmente este mensaje"
}`
}

function cleanJsonResponse(text) {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  }
  return cleaned.trim()
}

function repairTruncatedJson(text) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { input_type, input_text, occasion, translation, duration, custom_instructions, user_id } = req.body ?? {}

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
      .select('role, denomination, plan, pastoral_tone, target_audience, pastoral_instructions, theological_center, teaching_style, confrontation_level, application_type, pastoral_closing, phrases_to_avoid')
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

  const userPlan = profile.plan ?? 'free'
  const allowFullAdn = canUseFeature(userPlan, 'full_adn_pastoral')

  const prompt = buildPreviewPrompt({
    translation,
    denomination: profile.denomination,
    userRole: profile.role ?? 'pastor',
    occasion,
    duration,
    inputType: input_type,
    inputText: input_text,
    customInstructions: canUseFeature(userPlan, 'custom_instructions') ? custom_instructions?.trim() || null : null,
    theologicalCenter: allowFullAdn ? profile.theological_center : null,
    teachingStyle: allowFullAdn ? profile.teaching_style : null,
    confrontationLevel: allowFullAdn ? profile.confrontation_level : null,
    applicationType: allowFullAdn ? profile.application_type : null,
    pastoralClosing: allowFullAdn ? profile.pastoral_closing : null,
    pastoralTone: allowFullAdn ? profile.pastoral_tone : null,
    targetAudience: allowFullAdn ? profile.target_audience : null,
    phrasesToAvoid: allowFullAdn ? profile.phrases_to_avoid : null,
    pastoralInstructions: allowFullAdn ? profile.pastoral_instructions : null,
  })

  let parsed
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
      res.status(502).json({ error: 'La IA no pudo proponer un enfoque en este momento. Intenta de nuevo en unos segundos.' })
      return
    }

    const data = await response.json()
    const rawText = data?.content?.[0]?.text ?? ''

    const cleanedText = cleanJsonResponse(rawText)
    try {
      parsed = JSON.parse(cleanedText)
    } catch (parseErr) {
      const repaired = repairTruncatedJson(cleanedText)
      if (repaired) {
        parsed = repaired
      } else {
        console.error('Error parseando JSON de Claude:', parseErr, rawText)
        res.status(502).json({ error: 'No se pudo interpretar la propuesta de enfoque. Intenta de nuevo.' })
        return
      }
    }
  } catch (err) {
    console.error('Error llamando a la API de Anthropic:', err)
    res.status(502).json({ error: 'No se pudo conectar con la IA. Verifica tu conexión e intenta de nuevo.' })
    return
  }

  res.status(200).json(parsed)
}
