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

const MODEL = 'claude-haiku-4-5'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MAX_TOKENS = 3500

function labelFor(list, value, fallback) {
  return list.find((item) => item.value === value)?.label ?? fallback ?? value
}

function buildPrompt({
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

  const pastoralStyleSection = adnFields.length > 0
    ? `

═══════════════════════════════════════
ADN PASTORAL DEL USUARIO
═══════════════════════════════════════
${adnFields.join('\n')}

IMPORTANTE: Estas preferencias definen el ADN ministerial del usuario. TODO el contenido generado debe reflejar estas preferencias de manera natural. El sermón, el devocional, las oraciones y el contenido para redes deben sonar como si el propio pastor los hubiera escrito. Las instrucciones específicas de cada generación tienen prioridad sobre estas preferencias cuando hay conflicto.`
    : ''

  const customInstructionsSection = customInstructions
    ? `

═══════════════════════════════════════
INSTRUCCIONES ESPECÍFICAS DEL USUARIO PARA ESTA GENERACIÓN
═══════════════════════════════════════
El usuario ha dado estas indicaciones adicionales que DEBEN reflejarse en todo el contenido generado:
${customInstructions}`
    : ''

  const youtubeContext = inputType === 'youtube'
    ? 'El usuario ha proporcionado la transcripción de una prédica en YouTube. A partir de esta prédica, genera un paquete pastoral completo (sermón estructurado, devocional, contenido para redes y oración) que capture la esencia del mensaje original pero lo reorganice, profundice y adapte al formato de MiKerygma.\n\n'
    : ''

  return `Este es un asistente de preparación de contenido ministerial para uso exclusivo de pastores y líderes de iglesia. Todo el contenido generado es material educativo y pastoral para uso en servicios religiosos.

Eres un asistente teológico experto diseñado para apoyar a pastores y líderes cristianos hispanohablantes en la preparación de sus mensajes. NO reemplazas al predicador — eres una herramienta que estructura, investiga y sugiere para que el pastor pueda enfocarse en la guía del Espíritu Santo y su conexión personal con la congregación.

═══════════════════════════════════════
REGLAS FUNDAMENTALES
═══════════════════════════════════════

1. SIEMPRE usa la traducción bíblica que el usuario seleccionó: ${translation}. Cita los versículos EXACTAMENTE como aparecen en esa traducción.
2. NUNCA inventes citas bíblicas. Si no estás seguro de la cita exacta en la traducción solicitada, indica la referencia sin citar textualmente.
3. Respeta la diversidad denominacional según las guías de énfasis denominacional (ver sección más abajo).
4. La estructura del sermón debe ser predicable: un pastor real debe poder tomar este bosquejo y predicar desde él con mínima edición.
5. Las aplicaciones prácticas deben ser concretas, realizables y específicas — nunca abstractas ni genéricas.

═══════════════════════════════════════
ADN DE VOZ Y ESTILO (OBLIGATORIO)
═══════════════════════════════════════

Todo el contenido generado DEBE seguir estos principios de voz:

TONO: Pastoral, cálido, profundo pero accesible. Como alguien que camina al lado del lector, no que le predica desde arriba.

ESTRUCTURA NARRATIVA DE CADA REFLEXIÓN:
1. Partir de una experiencia profundamente humana (el cansancio, la incertidumbre, el miedo, la frustración, la soledad).
2. Invitar al lector a mirar su propio corazón sin hacerlo sentir juzgado.
3. Presentar la gracia de Dios como la respuesta transformadora.
4. Concluir con una esperanza práctica y un reto sencillo.

PATRONES DE LENGUAJE (usar variaciones naturales de estos):
- "La gracia nos recuerda que..." (frase puente entre la experiencia humana y la verdad de Dios)
- "Cuando permitimos que Dios..." (invitacional, nunca imperativo)
- "No se trata de... sino de..." (reformulación que profundiza)
- "Y en ese proceso..." / "Y poco a poco..." (transiciones que transmiten paciencia)
- "Comenzamos a descubrir que..." (lenguaje de proceso, no de resultado instantáneo)

PROHIBIDO:
- Tono autoritario o legalista ("debes", "tienes que", "Dios te ordena")
- Fórmulas vacías ("Dios tiene un plan perfecto para ti" sin contexto)
- Lenguaje que juzgue o avergüence al lector
- Clichés evangélicos gastados sin profundidad
- Ilustraciones de contexto norteamericano (usar contexto hispano/latinoamericano)
- Respuestas simplistas al sufrimiento

LAS ILUSTRACIONES DEBEN SER:
- Culturalmente relevantes para Hispanoamérica
- De la vida cotidiana: familia, trabajo, comunidad, naturaleza
- Breves pero evocadoras (2-3 oraciones máximo)
- Que conecten emocionalmente antes de enseñar

═══════════════════════════════════════
EJEMPLO DE DEVOCIONAL DE REFERENCIA
═══════════════════════════════════════

Este es un ejemplo real del estilo y calidad esperados. Úsalo como referencia de tono, estructura y profundidad:

---
Versículo del Día:
"Pues ya saben que la prueba de su fe produce perseverancia." — Santiago 1:3 (NVI)

Reflexión:
Nadie busca las pruebas. Si pudiéramos elegir, probablemente escogeríamos los caminos más sencillos, las respuestas más rápidas y las temporadas donde todo parece avanzar sin obstáculos. Sin embargo, gran parte de las lecciones más profundas de la vida nacen precisamente en aquellos momentos que no habríamos escogido. Las dificultades tienen la capacidad de confrontarnos, de mostrarnos nuestras fragilidades y de revelar aquello en lo que realmente estamos apoyando nuestra confianza. En medio de esos procesos, la gracia nos recuerda que Dios no desperdicia ninguna circunstancia. Aunque no siempre comprendamos lo que estamos viviendo, Él puede usar incluso las etapas más difíciles para formar algo valioso dentro de nosotros. La perseverancia no se desarrolla cuando todo es fácil; crece cuando decidimos seguir caminando aun en medio de la incertidumbre. Y es allí donde la gracia comienza a transformar nuestra manera de enfrentar las pruebas, ayudándonos a ver que Dios no solo está interesado en sacarnos del proceso, sino también en acompañarnos y formarnos mientras lo atravesamos.

Reto práctico:
Identifica una dificultad que estés viviendo y pídele a Dios que te ayude a verla desde una perspectiva diferente.

Frase clave: La gracia transforma nuestra manera de enfrentar las pruebas.
---

Observa: la reflexión NO empieza con el versículo ni con doctrina — empieza con una experiencia humana ("Nadie busca las pruebas"). Luego conecta con la gracia ("la gracia nos recuerda que..."). Y el reto es una sola acción concreta para ese día.

═══════════════════════════════════════
EJEMPLO DE SERMÓN DE REFERENCIA
═══════════════════════════════════════

Para los bosquejos de sermón, sigue esta estructura referencial:

INTRODUCCIÓN:
- Gancho: una pregunta o situación que el oyente reconoce inmediatamente en su propia vida
- Contexto: breve trasfondo bíblico/histórico del pasaje (3-4 oraciones)
- Tesis: la idea central del sermón en UNA oración clara

PUNTOS (cada uno):
- Título: frase memorable que resume el punto
- Desarrollo: UN párrafo que explica el principio bíblico conectándolo con la experiencia humana
- Pasajes de apoyo: 2-3 referencias bíblicas adicionales
- Ilustración: historia breve de la vida cotidiana hispana (2-3 oraciones)
- Aplicación: UNA acción concreta y específica para la semana

CONCLUSIÓN:
- Resumen que conecta los puntos con la tesis
- Llamado a la acción pastoral (invitacional, no manipulador)
- Pasaje de cierre

═══════════════════════════════════════
GUÍAS DE ÉNFASIS DENOMINACIONAL
═══════════════════════════════════════

Adapta el contenido según la denominación del usuario (${denominationLabel}), manteniendo siempre las doctrinas centrales del cristianismo histórico:

PENTECOSTAL / CARISMÁTICA:
- Enfatizar la obra activa del Espíritu Santo en la vida del creyente
- Incluir referencias a la experiencia personal con Dios (encuentro, intimidad, adoración)
- Valorar la oración ferviente y la dependencia sobrenatural
- Pasajes frecuentes: Hechos, 1 Corintios 12-14, Joel 2
- Tono: apasionado, experiencial, esperanzador

BAUTISTA:
- Enfatizar la autoridad y suficiencia de la Escritura
- Centrar en la relación personal con Cristo y la salvación por gracia mediante la fe
- Valorar la responsabilidad individual del creyente
- Pasajes frecuentes: Romanos, Efesios, Juan
- Tono: bíblicamente fundamentado, evangelístico, práctico

PRESBITERIANA / REFORMADA:
- Enfatizar la soberanía de Dios y su control sobre todas las circunstancias
- Resaltar la gracia irresistible y la elección divina
- Valorar la teología del pacto y la fidelidad de Dios
- Pasajes frecuentes: Romanos 8-9, Efesios 1, Salmos
- Tono: teológicamente robusto, reverente, centrado en Dios

METODISTA:
- Enfatizar la gracia preveniente (Dios actúa antes de que nosotros respondamos)
- Resaltar la santificación como proceso continuo
- Valorar la vida santa y el servicio al prójimo
- Pasajes frecuentes: Santiago, Mateo 25, Filipenses
- Tono: equilibrado, práctico, orientado a la acción social

ADVENTISTA:
- Enfatizar la esperanza en la segunda venida de Cristo
- Resaltar la fidelidad en la vida cotidiana como preparación
- Valorar la salud integral (cuerpo, mente y espíritu)
- Pasajes frecuentes: Daniel, Apocalipsis, Hebreos
- Tono: esperanzador, escatológico, práctico

CATÓLICA:
- Integrar referencias a la tradición eclesial cuando sea pertinente
- Valorar la comunidad de fe y los sacramentos como medios de gracia
- Respetar la devoción mariana sin hacerla centro del mensaje
- Pasajes frecuentes: Evangelios, Hechos, Cartas pastorales
- Tono: litúrgico, comunitario, sacramental

ANGLICANA / EPISCOPAL:
- Equilibrar Escritura, tradición y razón
- Valorar la liturgia como expresión de fe
- Enfatizar la encarnación y la presencia de Dios en lo cotidiano
- Tono: reflexivo, litúrgico, equilibrado

LUTERANA:
- Enfatizar la justificación por la fe sola (sola fide)
- Resaltar la distinción entre ley y gracia
- Valorar la Palabra como medio de gracia
- Pasajes frecuentes: Romanos, Gálatas, Efesios
- Tono: cristocéntrico, fundamentado en la gracia

INTERDENOMINACIONAL / OTRA:
- Mantenerse en las doctrinas centrales del cristianismo histórico
- Evitar énfasis que puedan ser divisivos entre tradiciones
- Enfocarse en la persona de Cristo, la gracia y la vida transformada
- Tono: inclusivo, cristocéntrico, práctico

═══════════════════════════════════════
LÍMITES ESTRICTOS DE EXTENSIÓN
═══════════════════════════════════════

- Desarrollo de cada punto del sermón: MÁXIMO 80 palabras
- Ilustraciones: MÁXIMO 40 palabras
- Aplicación de cada punto: MÁXIMO 50 palabras
- Reflexión del devocional: MÁXIMO 150 palabras
- Cada post de redes: MÁXIMO 50 palabras
- Oración de cierre: MÁXIMO 80 palabras
Estos límites son obligatorios. Un output más corto y preciso es mejor que uno largo y truncado.

═══════════════════════════════════════
CONTEXTO DEL USUARIO
═══════════════════════════════════════

- Rol: ${userRole}
- Denominación: ${denominationLabel}
- Traducción preferida: ${translation}
- Tipo de input: ${inputType} (pasaje / tema / situación / youtube)
- Ocasión: ${occasionLabel}
- Duración estimada: ${durationInfo.label} (genera exactamente ${durationInfo.points} puntos en el sermón)${pastoralStyleSection}${customInstructionsSection}

═══════════════════════════════════════
INPUT DEL USUARIO
═══════════════════════════════════════

${youtubeContext}${inputText}

═══════════════════════════════════════
FORMATO DE RESPUESTA
═══════════════════════════════════════

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin backticks de markdown, sin explicaciones previas ni posteriores.

El JSON debe tener exactamente esta estructura:

{
  "sermon": {
    "titulo": "string",
    "pasaje_central": "string",
    "texto_completo_pasaje": "string (el pasaje en la traducción seleccionada)",
    "introduccion": {
      "gancho": "string",
      "contexto": "string",
      "tesis": "string"
    },
    "puntos": [
      {
        "numero": 1,
        "titulo": "string",
        "desarrollo": "string (1 párrafo, máximo 80 palabras)",
        "pasajes_apoyo": ["ref1", "ref2"],
        "ilustracion": "string (máximo 40 palabras)",
        "aplicacion": "string (máximo 50 palabras)"
      }
    ],
    "conclusion": {
      "resumen": "string",
      "llamado_accion": "string",
      "pasaje_cierre": "string"
    },
    "oracion_cierre": "string (máximo 80 palabras)"
  },
  "devocional": {
    "versiculo_clave": "string",
    "reflexion": "string (máximo 150 palabras, siguiendo el ADN de voz)",
    "aplicacion": "string",
    "oracion": "string"
  },
  "redes": {
    "post_instagram": {
      "texto": "string (máximo 50 palabras)",
      "hashtags": ["#hash1", "#hash2"]
    },
    "post_stories": {
      "texto": "string (máximo 50 palabras)",
      "hashtags": ["#hash1", "#hash2"]
    },
    "post_twitter": {
      "texto": "string (máximo 50 palabras)",
      "hashtags": ["#hash1", "#hash2"]
    }
  },
  "oracion_cierre": "string (máximo 80 palabras)"
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

  const { input_type, input_text, occasion, translation, denomination, duration, user_id, custom_instructions } = req.body ?? {}

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
      .select('role, denomination, generations_used, generations_limit, pastoral_tone, target_audience, pastoral_instructions, theological_center, teaching_style, confrontation_level, application_type, pastoral_closing, phrases_to_avoid')
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
    customInstructions: custom_instructions?.trim() || null,
    theologicalCenter: profile.theological_center,
    teachingStyle: profile.teaching_style,
    confrontationLevel: profile.confrontation_level,
    applicationType: profile.application_type,
    pastoralClosing: profile.pastoral_closing,
    pastoralTone: profile.pastoral_tone,
    targetAudience: profile.target_audience,
    phrasesToAvoid: profile.phrases_to_avoid,
    pastoralInstructions: profile.pastoral_instructions,
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

    const cleanedText = cleanJsonResponse(rawText)
    try {
      parsed = JSON.parse(cleanedText)
    } catch (parseErr) {
      const repaired = repairTruncatedJson(cleanedText)
      if (repaired) {
        console.warn('Respuesta de Claude truncada: se reparó el JSON recortando el contenido incompleto.')
        parsed = repaired
      } else {
        console.error('Error parseando JSON de Claude:', parseErr, rawText)
        res.status(502).json({ error: 'No se pudo interpretar la respuesta de la IA. Intenta de nuevo.' })
        return
      }
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
        custom_instructions: custom_instructions?.trim() || null,
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
