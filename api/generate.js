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
import { STREAM_ERROR_MARKER, GENERATION_STAGES, buildStageMarker, buildMetaMarker } from '../src/lib/streamMarkers.js'
import { cleanJsonResponse, repairTruncatedJson } from '../src/lib/jsonRepair.js'
import { parseReference } from '../src/lib/scriptureParser.js'
import { resolveBollsBook } from '../src/lib/bollsBooks.js'
import { resolveGenerationsCycle } from '../src/lib/billingCycle.js'

export const config = {
  supportsResponseStreaming: true,
}

const MODEL = 'claude-sonnet-4-6'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MAX_TOKENS = 3500

// Fallback cuando Sonnet bloquea por content filtering (ver diagnóstico:
// claude-sonnet-4-6 bloqueó Lucas 15:11-32 en 4/4 pruebas con el mismo prompt,
// mientras que claude-haiku-4-5 nunca lo bloqueó en 3/3). En las pruebas, los
// JSON completos de Haiku para este tipo de contenido rondaron 10,200-10,550
// caracteres y se truncaron con MAX_TOKENS=3500 (la relación caracteres/token
// varía entre generaciones, así que no basta un margen ajustado). 8000 tokens
// da margen amplio (~2x lo observado) y se mantiene bajo el techo tradicional
// de 8192 tokens de salida para modelos Haiku sin headers beta.
const FALLBACK_MODEL = 'claude-haiku-4-5'
const FALLBACK_MAX_TOKENS = 8000

// Paso de auto-revisión teológica (post-generación): audita únicamente si los
// pasajes_apoyo y la aplicación de cada punto están genuinamente conectados
// con ese punto, o si la conexión es forzada/superficial. Usa Haiku porque es
// una tarea de validación acotada (recibe solo un resumen de los puntos, no
// el sermón completo) — no una segunda generación completa.
const REVIEW_MODEL = 'claude-haiku-4-5'
const REVIEW_MAX_TOKENS = 1000
// Igual que LEXICON_STEP_TIMEOUT_MS: este paso es una mejora de calidad
// opcional, nunca debe alargar la respuesta de forma impredecible.
const REVIEW_FETCH_TIMEOUT_MS = 8000

// Paso de notas léxicas (griego/hebreo original, post-generación): ancla 2-4
// palabras del pasaje central a datos léxicos REALES de Bolls Bible API
// (bolls.life, sin autenticación) en vez de dejar que el modelo invente
// definiciones de griego/hebreo. Estrictamente opcional — ver
// runLexiconStepWithTimeout — nunca bloquea ni retrasa significativamente la
// generación principal.
const LEXICON_MODEL = 'claude-haiku-4-5'
const LEXICON_MAX_TOKENS = 1100
const BOLLS_BASE_URL = 'https://bolls.life'
const BOLLS_FETCH_TIMEOUT_MS = 2000
// Medido end-to-end (ver test-lexicon-notes.js, varias corridas): fetch de
// pasaje (~0.5-0.6s) + fetch de diccionario en paralelo (~0.5-0.6s) +
// composición con Haiku (~5.5-6s, la parte dominante — no Bolls). Recortar el
// pool de candidatas y las definiciones (ver LEXICON_DEFINITION_EXCERPT_CHARS)
// bajó esto desde ~7-8s. Un presupuesto de 3-4s como se planteó originalmente
// descartaría este paso casi siempre por timeout; 9s da margen real con la
// variabilidad observada.
const LEXICON_STEP_TIMEOUT_MS = 9000
const LEXICON_CANDIDATE_POOL_SIZE = 6
const LEXICON_MIN_CANDIDATES = 2

// Códigos Strong puramente gramaticales (artículos, conjunciones, pronombres,
// preposiciones muy comunes) que casi nunca son teológicamente notables por sí
// mismos. Esto NO es un sistema de "relevancia teológica" — es solo un filtro
// de palabras funcionales para no gastar llamadas al diccionario en ellas; la
// selección real de cuáles de las candidatas restantes son significativas la
// hace el propio paso de LLM (ver buildLexiconPrompt).
const LEXICON_STOPWORD_STRONGS = new Set([
  // Griego: artículo, conjunciones, pronombres, preposiciones y partículas comunes
  'G3588', 'G2532', 'G1161', 'G1063', 'G3739', 'G846', 'G1473', 'G4771',
  'G1519', 'G1722', 'G1537', 'G1909', 'G4314', 'G575', 'G3326', 'G1223',
  'G3756', 'G3361', 'G3754', 'G1510', 'G1096', 'G3778', 'G1565', 'G5100', 'G5101',
  // Hebreo: marcador de objeto directo, relativo, "ser/estar", negación, preposiciones
  'H853', 'H3588', 'H834', 'H1961', 'H3808', 'H5921', 'H413', 'H4480',
  'H5704', 'H3605', 'H1992', 'H1571', 'H2088', 'H2063', 'H859', 'H589',
])

const MODE_FEATURE_KEYS = {
  situacion: 'mode_situacion',
  youtube: 'mode_youtube',
}

function labelFor(list, value, fallback) {
  return list.find((item) => item.value === value)?.label ?? fallback ?? value
}

export function buildPrompt({
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
  previewContext,
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
ÉNFASIS ADICIONAL SOLICITADO POR EL USUARIO
═══════════════════════════════════════
El usuario quiere que el contenido tenga este énfasis particular:
${customInstructions}

IMPORTANTE: Estas instrucciones son una GUÍA DE ÉNFASIS, no directivas literales. Integra este énfasis de manera orgánica y natural en todo el contenido. NO uses estas palabras textualmente como título del sermón. El título debe ser original, evocador y conectado con el pasaje o tema, no una repetición de las instrucciones del usuario.`
    : ''

  const previewContextSection = previewContext
    ? `

═══════════════════════════════════════
ENFOQUE PASTORAL CONFIRMADO POR EL USUARIO
═══════════════════════════════════════
El usuario ha revisado y aprobado el siguiente enfoque para este mensaje. DEBES respetar estos lineamientos:
- Título del sermón: ${previewContext.titulo}
- Tesis central: ${previewContext.tesis}
- Puntos principales: ${(previewContext.puntos ?? []).join(', ')}

Estos elementos fueron confirmados por el usuario y NO deben cambiarse. Desarrolla el contenido completo siguiendo esta estructura.`
    : ''

  const youtubeContext = inputType === 'youtube'
    ? 'El usuario ha proporcionado la transcripción de un video de YouTube. A partir de este contenido, genera un paquete pastoral completo (sermón estructurado, devocional, contenido para redes y oración) que capture la esencia del mensaje, lo reorganice, profundice y adapte al formato de MiKerygma según el ADN pastoral del usuario.\n\n'
    : ''

  const passageInput = inputType === 'pasaje'
    ? `[The following is a biblical passage for pastoral exposition — it is sacred scripture being studied for a worship service]: ${inputText}`
    : inputText

  return `You are a pastoral content assistant for Christian ministers. All content generated is for use in religious worship services, Bible studies, and pastoral care. Biblical texts, including those describing human sin, moral failure, and redemption, are quoted and discussed in their theological and pastoral context.

Este es un asistente de preparación de contenido ministerial para uso exclusivo de pastores y líderes de iglesia. Todo el contenido generado es material educativo y pastoral para uso en servicios religiosos.

Eres un asistente teológico experto diseñado para apoyar a pastores y líderes cristianos hispanohablantes en la preparación de sus mensajes. NO reemplazas al predicador — eres una herramienta que estructura, investiga y sugiere para que el pastor pueda enfocarse en la guía del Espíritu Santo y su conexión personal con la congregación.

═══════════════════════════════════════
REGLAS FUNDAMENTALES
═══════════════════════════════════════

1. SIEMPRE usa la traducción bíblica que el usuario seleccionó: ${translation}. Cita los versículos EXACTAMENTE como aparecen en esa traducción.
2. NUNCA inventes citas bíblicas. Si no estás seguro de la cita exacta en la traducción solicitada, indica la referencia sin citar textualmente.
3. Respeta la diversidad denominacional según las guías de énfasis denominacional (ver sección más abajo).
4. La estructura del sermón debe ser predicable: un pastor real debe poder tomar este bosquejo y predicar desde él con mínima edición.
5. Las aplicaciones prácticas deben ser concretas, realizables y específicas — nunca abstractas ni genéricas.
6. Interpretación contextual de pasajes de apoyo: cada referencia bíblica que uses para sostener un punto debe compartir género literario, contexto histórico-cultural o tema teológico genuino con ese punto — no basta que comparta una palabra o un concepto superficialmente similar. Antes de proponer un pasaje de apoyo, verifica internamente (como parte de tu razonamiento) que ese pasaje realmente sostiene el punto y no solo lo menciona tangencialmente. Ejemplo de error a evitar: en un sermón sobre las bodas de Caná (Juan 2:1-11), usar Lucas 15:8-9 (la moneda perdida) como apoyo a un punto sobre "lo ordinario" es una conexión forzada, porque Lucas 15:8-9 trata sobre búsqueda diligente, no sobre cotidianidad.
7. Separación entre exégesis y aplicación: en el desarrollo de cada punto, primero deja claro qué dice el texto en su contexto original, y solo después qué significa para la vida del oyente hoy. Nunca mezcles ambas cosas como si fueran lo mismo — la aplicación debe desprenderse naturalmente de la exégesis, no ser una idea genérica pegada al final.

═══════════════════════════════════════
ADN DE VOZ Y ESTILO (OBLIGATORIO)
═══════════════════════════════════════

Recordatorio: esto es exposición pastoral para un servicio de adoración, no narrativa literaria. Cuando una reflexión toque pecado, rebeldía o crisis moral, nómbralo con lenguaje teológico y reflexivo — como se predicaría desde un púlpito — sin reconstruir la escena en detalle narrativo o gráfico.

Todo el contenido generado DEBE seguir estos principios de voz:

TONO: Pastoral, cálido, profundo pero accesible. Como alguien que camina al lado del lector, no que le predica desde arriba.

ESTRUCTURA NARRATIVA DE CADA REFLEXIÓN:
1. Partir de una experiencia profundamente humana (el cansancio, la incertidumbre, el miedo, la frustración, la soledad). Si el pasaje o tema involucra pecado, rebeldía o crisis moral, nombra esa condición de forma expositiva y teológica (ej. "la distancia que crea el orgullo", "el vacío de vivir lejos de Dios") — no la dramatices como relato.
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
- Dramatización narrativa o gráfica de escenas de pecado, crisis o consecuencias — la exposición pastoral explica y aplica, no reconstruye la escena en detalle

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
- Desarrollo: UN párrafo que primero expone qué dice el texto en su contexto original (exégesis) y luego lo conecta con la experiencia humana, de forma expositiva y teológica — si el punto involucra pecado o crisis, nómbralo con lenguaje pastoral y muévete a la verdad bíblica, sin dramatizar la escena
- Pasajes de apoyo: 2-3 referencias bíblicas adicionales que compartan género literario, contexto histórico-cultural o tema teológico genuino con este punto — no incluyas una referencia solo porque comparte una palabra o imagen superficial con el punto
- Ilustración: historia breve de la vida cotidiana hispana (2-3 oraciones)
- Aplicación: UNA acción concreta y específica para la semana que se desprenda naturalmente del desarrollo del punto (no una idea genérica añadida al final), formulada como invitación pastoral, no como relato de la crisis que la origina

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
- Duración estimada: ${durationInfo.label} (genera exactamente ${durationInfo.points} puntos en el sermón)${pastoralStyleSection}${customInstructionsSection}${previewContextSection}

═══════════════════════════════════════
INPUT DEL USUARIO
═══════════════════════════════════════

${youtubeContext}${passageInput}

═══════════════════════════════════════
FORMATO DE RESPUESTA
═══════════════════════════════════════

Recordatorio antes de generar: este JSON es contenido pastoral para un servicio de adoración. Al redactar "gancho", "desarrollo", "aplicacion" y "reflexion", mantén un tono expositivo y teológico — no narrativo ni gráfico — incluso cuando el pasaje o tema trate pecado, crisis humana o consecuencias morales.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin backticks de markdown, sin explicaciones previas ni posteriores. Si necesitas usar comillas dobles dentro de un valor de texto (por ejemplo para citar una frase o un apodo), escápalas SIEMPRE como \\" — nunca dejes una comilla doble sin escapar dentro de un string, porque eso rompe el JSON.

Caso específico que rompe el JSON con frecuencia — diálogo dentro de "texto_completo_pasaje": NO envuelvas el pasaje completo en tus propias comillas dobles; la app ya lo muestra visualmente como una cita (con sangría y cursiva), así que esas comillas propias son innecesarias y son justo la fuente del problema. Esto es crítico en pasajes narrativos o parábolas que incluyen discurso directo (alguien dice algo entre comillas DENTRO del pasaje mismo). Ejemplo real de esto rompiendo el JSON (evítalo exactamente así): generar texto_completo_pasaje como \\"...A medianoche se oyó un grito: "¡Ahí viene el novio! ¡Salgan a recibirlo!"... y ellas decían: "Señor, señor, ábrenos"...\\" — ahí las comillas de apertura/cierre del pasaje sí llevan \\" pero las de "¡Ahí viene el novio!..." y "Señor, señor, ábrenos" no, y esas comillas sin escapar rompen el JSON en el primer diálogo. La regla: no pongas comillas propias alrededor de todo el pasaje; y si el pasaje en sí contiene diálogo citado, escapa TODAS y cada una de esas comillas internas como \\", sin ninguna excepción.

El JSON debe tener exactamente esta estructura:

{
  "sermon": {
    "titulo": "string",
    "pasaje_central": "string",
    "texto_completo_pasaje": "string (el pasaje en la traducción seleccionada, SIN comillas propias envolviendo todo el texto — ver instrucción arriba)",
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

// Construye el prompt de la revisión teológica puntual: recibe solo un resumen
// compacto de los puntos del sermón (no el sermón completo) para mantener la
// llamada barata y rápida.
function buildReviewPrompt(sermon) {
  const puntosResumen = (sermon.puntos ?? []).map((p) => ({
    numero: p.numero,
    titulo: p.titulo,
    desarrollo: p.desarrollo,
    pasajes_apoyo: p.pasajes_apoyo,
    aplicacion: p.aplicacion,
  }))

  return `Eres un revisor teológico experto en hermenéutica bíblica. Tu única tarea es auditar, para cada punto de este bosquejo de sermón, si sus "pasajes_apoyo" y su "aplicacion" están genuinamente conectados con ese punto. No revises nada más del sermón (título, ilustraciones, redacción, etc.).

Para cada punto evalúa dos cosas:
1. ¿Cada referencia en "pasajes_apoyo" sostiene genuinamente el punto — comparte género literario, contexto histórico-cultural o tema teológico real — o solo comparte una palabra o concepto superficialmente similar?
2. ¿La "aplicacion" se desprende naturalmente del "desarrollo" del punto, o es forzada, genérica o desconectada de él?

Ejemplo del tipo de error a detectar (caso ya documentado): en un sermón sobre Juan 2:1-11 (bodas de Caná), se usó Lucas 15:8-9 (la moneda perdida) como apoyo a un punto sobre "lo ordinario". Es una conexión forzada porque Lucas 15:8-9 trata sobre búsqueda diligente, no sobre cotidianidad — solo comparten una asociación superficial, no un tema teológico real.

Pasaje central del sermón: ${sermon.pasaje_central ?? 'no especificado'}
Tesis: ${sermon.introduccion?.tesis ?? 'no especificada'}

Puntos a evaluar:
${JSON.stringify(puntosResumen, null, 2)}

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin backticks de markdown, con esta estructura exacta:
{
  "issues": [
    {
      "numero": <número del punto>,
      "campo": "pasajes_apoyo" o "aplicacion",
      "problema": "explicación breve de qué está mal",
      "valor_corregido": <array de 2-3 strings si "campo" es "pasajes_apoyo", o un string si "campo" es "aplicacion">
    }
  ]
}

Si no encuentras ningún problema, responde exactamente: {"issues": []}
No reportes problemas dudosos o menores — solo conexiones genuinamente forzadas o superficiales.`
}

// Llamada puntual (no streaming) a Haiku para auditar las conexiones
// hermenéuticas del sermón ya generado. Cualquier fallo (red, HTTP, JSON
// inválido) se degrada silenciosamente a "sin problemas detectados": este
// paso es una mejora de calidad, nunca debe bloquear ni romper la generación
// principal que ya tuvo éxito.
async function runTheologicalReview({ sermon, apiKey }) {
  // A diferencia de las notas léxicas (que corren tras un Promise.race de 9s),
  // esta llamada no tenía NINGÚN límite propio — solo el maxDuration de 300s
  // de toda la función. Un Anthropic lento aquí podía dejar al cliente
  // esperando en la etapa "reviewing" sin ningún techo predecible, contrario
  // al principio declarado de este paso (nunca debe bloquear la generación).
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REVIEW_FETCH_TIMEOUT_MS)

  let response
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: REVIEW_MODEL,
        max_tokens: REVIEW_MAX_TOKENS,
        messages: [{ role: 'user', content: buildReviewPrompt(sermon) }],
      }),
      signal: controller.signal,
    })
  } catch (err) {
    console.error(`Error llamando a la revisión teológica (timeout=${REVIEW_FETCH_TIMEOUT_MS}ms):`, err)
    return { issues: [] }
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    console.error('Error HTTP en la revisión teológica:', response.status, await response.text().catch(() => ''))
    return { issues: [] }
  }

  let data
  try {
    data = await response.json()
  } catch (err) {
    console.error('Error parseando respuesta de la revisión teológica:', err)
    return { issues: [] }
  }

  const rawText = data?.content?.[0]?.text ?? ''
  const cleaned = cleanJsonResponse(rawText)

  try {
    const parsed = JSON.parse(cleaned)
    return { issues: Array.isArray(parsed.issues) ? parsed.issues : [] }
  } catch {
    console.error('No se pudo interpretar el JSON de la revisión teológica:', rawText)
    return { issues: [] }
  }
}

// Aplica correcciones puntuales sobre el objeto `sermon` ya parseado — solo
// reemplaza el campo específico (pasajes_apoyo o aplicacion) del punto
// señalado, nunca regenera el sermón completo.
function applyTheologicalFixes(sermon, issues) {
  let corrected = false
  for (const issue of issues) {
    const punto = (sermon.puntos ?? []).find((p) => p.numero === issue.numero)
    if (!punto) continue

    if (issue.campo === 'pasajes_apoyo' && Array.isArray(issue.valor_corregido) && issue.valor_corregido.length > 0) {
      punto.pasajes_apoyo = issue.valor_corregido
      corrected = true
    } else if (issue.campo === 'aplicacion' && typeof issue.valor_corregido === 'string' && issue.valor_corregido.trim()) {
      punto.aplicacion = issue.valor_corregido.trim()
      corrected = true
    }
  }
  return corrected
}

// Helper genérico de fetch con timeout vía AbortController. Se usa para TODAS
// las llamadas a Bolls Bible API — un servicio de hobby sin SLA (sus propios
// docs piden explícitamente no sobrecargarlo) — para que un Bolls lento nunca
// alargue la respuesta al pastor más de lo presupuestado.
async function fetchJsonWithTimeout(url, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return { ok: false }
    const data = await response.json()
    return { ok: true, data }
  } catch {
    return { ok: false }
  } finally {
    clearTimeout(timer)
  }
}

function stripHtmlTags(html) {
  return (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

// Extrae pares (palabra, Strong) del HTML de un versículo de Bolls: la palabra
// va seguida de <S>NNNN</S> (el número SIN prefijo G/H — Bolls exige el
// prefijo para el endpoint de diccionario, por eso se antepone aquí mismo y
// nunca se pierde en el resto del pipeline).
function extractStrongWords(html, strongPrefix) {
  const regex = /([^\s<>]+)<S>(\d+)<\/S>/g
  const words = []
  let match
  while ((match = regex.exec(html ?? '')) !== null) {
    words.push({ word: match[1], strong: `${strongPrefix}${match[2]}` })
  }
  return words
}

// Fetch de un capítulo Strong-tagged en Bolls (TISCH para NT griego, WLCa
// para AT hebreo) y extracción de las palabras del rango de versículos
// pedido. Devuelve [] ante cualquier fallo — nunca lanza.
async function fetchBollsPassageWords({ translation, bookId, chapter, verseStart, verseEnd, strongPrefix }) {
  const url = `${BOLLS_BASE_URL}/get-text/${translation}/${bookId}/${chapter}/`
  const result = await fetchJsonWithTimeout(url, BOLLS_FETCH_TIMEOUT_MS)
  if (!result.ok || !Array.isArray(result.data) || result.data.length === 0) return []

  const from = verseStart ?? 1
  const to = verseEnd ?? verseStart ?? Infinity
  const verses = result.data.filter((v) => v.verse >= from && v.verse <= to)
  return verses.flatMap((v) => extractStrongWords(v.text, strongPrefix))
}

// Fetch de la definición léxica real (BDBT = Thayer's griego + BDB hebreo,
// combinados, en inglés) para un código Strong CON prefijo (ej. "G26",
// "H3068"). Devuelve null si Bolls no tiene la palabra (responde 200 con
// array vacío, no un error) o ante cualquier fallo de red/timeout.
async function fetchBollsDefinition(strongCode) {
  const url = `${BOLLS_BASE_URL}/dictionary-definition/BDBT/${strongCode}/`
  const result = await fetchJsonWithTimeout(url, BOLLS_FETCH_TIMEOUT_MS)
  if (!result.ok || !Array.isArray(result.data) || result.data.length === 0) return null

  const entry = result.data[0]
  return {
    strong: strongCode,
    lexeme: entry.lexeme,
    transliteration: entry.transliteration,
    pronunciation: entry.pronunciation,
    shortDefinition: entry.short_definition,
    definition: stripHtmlTags(entry.definition),
  }
}

// Algunas entradas de BDBT (sobre todo Thayer's para palabras con muchas
// acepciones, ej. "padre") superan los 2000 caracteres. Se recorta a las
// primeras ~450 (unas 2-3 oraciones) porque: (a) reduce tokens de entrada y
// con ello la latencia de Haiku, y (b) con menos material en bruto para
// sintetizar, el modelo tiende a producir notas más concisas — el
// short_definition (gloss corto) igual se envía completo como ancla.
const LEXICON_DEFINITION_EXCERPT_CHARS = 450

function excerptDefinition(definition) {
  if (definition.length <= LEXICON_DEFINITION_EXCERPT_CHARS) return definition
  return `${definition.slice(0, LEXICON_DEFINITION_EXCERPT_CHARS)}…`
}

// Construye el prompt de composición de notas léxicas: recibe SOLO datos ya
// obtenidos de Bolls (nunca conocimiento propio del modelo sobre griego o
// hebreo) y exige separar el dato léxico de la aplicación pastoral — mismo
// principio de exégesis/aplicación que ya rige buildPrompt() y
// buildReviewPrompt().
function buildLexiconPrompt({ pasajeCentral, tesis, candidates }) {
  const candidateList = candidates
    .map(
      (c, i) =>
        `${i + 1}. Strong ${c.strong} — lexema: ${c.lexeme}, transliteración: ${c.transliteration}, pronunciación: ${c.pronunciation}, gloss corto: "${c.shortDefinition}"\n   Definición (diccionario BDBT, en inglés): ${excerptDefinition(c.definition)}`
    )
    .join('\n\n')

  return `Eres un asistente que ayuda a pastores hispanohablantes a entender el idioma original (griego o hebreo) de un pasaje bíblico. Recibes una lista de palabras del texto original con datos léxicos REALES obtenidos de un diccionario (Thayer's para griego, Brown-Driver-Briggs para hebreo, ambos en inglés). NUNCA inventes ni completes con tu propio conocimiento del griego/hebreo información que no esté en los datos que recibes a continuación — si algo no está en el dato, no lo afirmes.

Pasaje: ${pasajeCentral}
Tesis del sermón: ${tesis ?? 'no especificada'}

Palabras candidatas (con datos léxicos reales del diccionario):

${candidateList}

Tu tarea:
1. De esta lista de candidatas, elige las 2 a 4 que sean más teológicamente significativas para este pasaje — no tienes que usar todas.
2. Para cada una, redacta una nota breve en español pastoral: accesible para un pastor, no un paper académico, pero precisa — sin diluir el matiz del término original al parafrasear del inglés.
3. Cada nota debe separar CLARAMENTE dos cosas: (a) qué significa la palabra en su idioma original según el dato léxico recibido, y (b) cómo se puede aplicar pastoralmente esa palabra en la predicación de este pasaje — nunca mezcladas como si fueran lo mismo.
4. Basa la parte (a) ÚNICAMENTE en los datos léxicos reales de arriba. La parte (b) sí es tu aporte pastoral, pero debe desprenderse naturalmente del dato léxico, no ser una idea genérica pegada al término.

LÍMITES ESTRICTOS DE EXTENSIÓN (obligatorios — una nota corta y precisa es mejor que una larga y truncada):
- "significado_original": MÁXIMO 35 palabras
- "aplicacion_pastoral": MÁXIMO 35 palabras

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin backticks de markdown, con esta estructura exacta:
{
  "notas": [
    {
      "strong": "<código Strong exactamente como aparece arriba, ej. G4697>",
      "significado_original": "string — qué dice el dato léxico, en español, SIN aplicación pastoral",
      "aplicacion_pastoral": "string — cómo se conecta esto con la predicación de este pasaje"
    }
  ]
}`
}

// Orquesta el paso completo: pasaje -> testamento -> palabras Strong-tagged ->
// filtrado de palabras gramaticales -> definiciones reales -> composición de
// notas en español. Devuelve un `status` para monitoreo (ver
// theological_review_log como precedente) y `notes` (null salvo 'included').
// Nunca lanza: cualquier fallo interno se traduce a un status y notes: null.
async function runLexiconStep({ sermon, apiKey }) {
  const parsedRef = parseReference(sermon?.pasaje_central)
  const resolved = resolveBollsBook(parsedRef.book)
  if (!resolved) return { status: 'not_applicable', notes: null }

  if (!parsedRef.chapter) return { status: 'not_applicable', notes: null }

  const words = await fetchBollsPassageWords({
    translation: resolved.translation,
    bookId: resolved.bookId,
    chapter: parsedRef.chapter,
    verseStart: parsedRef.verse_start,
    verseEnd: parsedRef.verse_end,
    strongPrefix: resolved.strongPrefix,
  })
  if (words.length === 0) return { status: 'no_data', notes: null }

  const candidateCodes = []
  const seen = new Set()
  for (const { strong } of words) {
    if (seen.has(strong) || LEXICON_STOPWORD_STRONGS.has(strong)) continue
    seen.add(strong)
    candidateCodes.push(strong)
    if (candidateCodes.length >= LEXICON_CANDIDATE_POOL_SIZE) break
  }
  if (candidateCodes.length < LEXICON_MIN_CANDIDATES) return { status: 'no_data', notes: null }

  const definitions = await Promise.all(candidateCodes.map(fetchBollsDefinition))
  const validCandidates = definitions.filter(Boolean)
  if (validCandidates.length < LEXICON_MIN_CANDIDATES) return { status: 'no_data', notes: null }

  let response
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: LEXICON_MODEL,
        max_tokens: LEXICON_MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: buildLexiconPrompt({
              pasajeCentral: sermon.pasaje_central,
              tesis: sermon.introduccion?.tesis,
              candidates: validCandidates,
            }),
          },
        ],
      }),
    })
  } catch (err) {
    console.error('Error llamando a la composición de notas léxicas:', err)
    return { status: 'error', notes: null }
  }

  if (!response.ok) {
    console.error('Error HTTP en la composición de notas léxicas:', response.status, await response.text().catch(() => ''))
    return { status: 'error', notes: null }
  }

  let data
  try {
    data = await response.json()
  } catch (err) {
    console.error('Error parseando respuesta de la composición de notas léxicas:', err)
    return { status: 'error', notes: null }
  }

  const rawText = data?.content?.[0]?.text ?? ''
  const cleaned = cleanJsonResponse(rawText)

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('No se pudo interpretar el JSON de las notas léxicas:', rawText)
    return { status: 'error', notes: null }
  }

  // Solo se aceptan notas cuyo Strong coincide con una candidata REAL —
  // descarta cualquier código que el modelo pudiera haber inventado. Además,
  // strong/lexema/transliteración se toman siempre del dato de Bolls (nunca
  // de lo que el modelo haya podido escribir), para que la cita sea 100%
  // verificable por el pastor.
  const candidateByStrong = new Map(validCandidates.map((c) => [c.strong, c]))
  const notes = (Array.isArray(parsed.notas) ? parsed.notas : [])
    .filter((n) => n && typeof n.strong === 'string' && candidateByStrong.has(n.strong) && n.significado_original && n.aplicacion_pastoral)
    .slice(0, 4)
    .map((n) => {
      const candidate = candidateByStrong.get(n.strong)
      return {
        strong: candidate.strong,
        lexema: candidate.lexeme,
        transliteracion: candidate.transliteration,
        significado_original: n.significado_original,
        aplicacion_pastoral: n.aplicacion_pastoral,
      }
    })

  if (notes.length === 0) return { status: 'no_data', notes: null }
  return { status: 'included', notes }
}

// Envuelve runLexiconStep con un presupuesto de tiempo total corto: Bolls es
// un servicio de hobby sin SLA, así que esta función NUNCA debe alargar la
// respuesta al pastor más de LEXICON_STEP_TIMEOUT_MS, sin importar cuántas
// llamadas HTTP estén pendientes. `.catch()` asegura que un rechazo tardío de
// la carrera perdida no quede como una unhandled rejection.
async function runLexiconStepWithTimeout({ sermon, apiKey }) {
  let timer
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ status: 'timeout', notes: null }), LEXICON_STEP_TIMEOUT_MS)
  })

  try {
    return await Promise.race([
      runLexiconStep({ sermon, apiKey }).catch((err) => {
        console.error('Error inesperado en el paso de notas léxicas:', err)
        return { status: 'error', notes: null }
      }),
      timeoutPromise,
    ])
  } finally {
    clearTimeout(timer)
  }
}

// Shape confirmado empíricamente (ver diagnóstico con test-content-filter.js):
// { type: "error", error: { type: "invalid_request_error", message: "Output blocked by content filtering policy" } }
function isContentFilterBlock(errorEvent) {
  return (
    errorEvent?.type === 'invalid_request_error' &&
    typeof errorEvent?.message === 'string' &&
    errorEvent.message.toLowerCase().includes('content filtering')
  )
}

// Ejecuta una generación completa contra la API de Anthropic y devuelve el texto
// entero en memoria — a propósito NO escribe nada en `res`. Así se puede decidir
// si el intento tuvo éxito (y con qué modelo) ANTES de mandar cualquier byte al
// cliente: un fallback nunca mezcla contenido parcial del intento que falló con
// el del reintento, porque el intento que falló nunca llegó a escribirse.
async function runGeneration({ model, maxTokens, prompt, apiKey }) {
  let anthropicResponse
  try {
    anthropicResponse = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch (err) {
    console.error(`Error llamando a la API de Anthropic (${model}):`, err)
    return { ok: false, kind: 'network_error', message: 'No se pudo conectar con la IA. Verifica tu conexión e intenta de nuevo.' }
  }

  if (!anthropicResponse.ok) {
    const errorBody = await anthropicResponse.text()
    console.error(`Error de la API de Anthropic (${model}):`, anthropicResponse.status, errorBody)
    return { ok: false, kind: 'http_error', message: 'La IA no pudo generar el contenido en este momento. Intenta de nuevo en unos segundos.' }
  }

  const reader = anthropicResponse.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let streamErrorEvent = null

  try {
    streamLoop: while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const dataStr = line.slice(6).trim()
        if (!dataStr || dataStr === '[DONE]') continue

        let event
        try {
          event = JSON.parse(dataStr)
        } catch {
          continue
        }

        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          text += event.delta.text
        } else if (event.type === 'error') {
          console.error(`Error en el stream de Anthropic (${model}):`, event.error)
          streamErrorEvent = event.error
          break streamLoop
        }
      }
    }
  } catch (err) {
    console.error(`Error leyendo el stream de Anthropic (${model}):`, err)
    return { ok: false, kind: 'stream_error', message: 'Se perdió la conexión con la IA durante la generación.' }
  }

  if (streamErrorEvent) {
    return {
      ok: false,
      kind: isContentFilterBlock(streamErrorEvent) ? 'content_filter' : 'stream_error',
      message: streamErrorEvent.message || 'La IA interrumpió la generación.',
    }
  }

  return { ok: true, text }
}

// Cadencia aproximada del streaming real de Anthropic: ráfagas pequeñas y
// frecuentes. 80 caracteres cada 20ms → ~2.6s de "escritura visible" para una
// respuesta típica de ~10,500 caracteres (rango observado en las pruebas),
// prácticamente nada frente al tiempo real de inferencia (varios segundos a
// decenas de segundos). Solo se usa para el texto ya confirmado como ganador
// — nunca para contenido bloqueado o de un intento fallido.
const SIMULATED_STREAM_CHUNK_SIZE = 80
const SIMULATED_STREAM_DELAY_MS = 20

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Reparte `text` en varias llamadas a res.write() con una pausa mínima entre
// cada una, para que streamedChars en Generate.jsx vuelva a incrementar
// progresivamente en vez de saltar de 0 al total en una sola lectura. Se llama
// EXCLUSIVAMENTE con contenido ya validado como ganador (ver handler): jamás
// se invoca antes de saber que el intento (Sonnet o el fallback de Haiku) tuvo
// éxito, así que nunca hay riesgo de transmitir contenido parcial o bloqueado.
async function writeSimulatedStream(res, text) {
  for (let i = 0; i < text.length; i += SIMULATED_STREAM_CHUNK_SIZE) {
    res.write(text.slice(i, i + SIMULATED_STREAM_CHUNK_SIZE))
    if (i + SIMULATED_STREAM_CHUNK_SIZE < text.length) {
      await sleep(SIMULATED_STREAM_DELAY_MS)
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { input_type, input_text, occasion, translation, denomination, duration, user_id, custom_instructions, preview_context } = req.body ?? {}

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
      .select('role, denomination, generations_used, generations_limit, plan, created_at, plan_started_at, generations_reset_at, pastoral_tone, target_audience, pastoral_instructions, theological_center, teaching_style, confrontation_level, application_type, pastoral_closing, phrases_to_avoid')
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

  // Reseteo/downgrade de ciclo ANTES de validar el límite: si el ciclo del
  // usuario ya venció, resolveGenerationsCycle() decide si toca resetear
  // generations_used (free) o degradar a free por falta de renovación (plan
  // pago) — ver src/lib/billingCycle.js. El resto del handler usa `profile`
  // ya actualizado, así que el límite y canUseFeature() ven el plan vigente.
  const cycleResult = resolveGenerationsCycle(profile)
  if (cycleResult.changed) {
    profile = cycleResult.profile
    try {
      await supabaseAdmin.from('profiles').update(cycleResult.updates).eq('id', user_id)
    } catch (err) {
      console.error('Error persistiendo el reseteo/downgrade del ciclo de generaciones:', err)
    }
    if (cycleResult.event === 'downgrade') {
      console.warn(`generate.js: downgrade automático a free para user=${user_id} (ciclo pago vencido sin renovación)`)
    }
  }

  const isUnlimited = profile.generations_limit === -1
  if (!isUnlimited && profile.generations_used >= profile.generations_limit) {
    res.status(403).json({
      error: 'Has alcanzado el límite de generaciones de tu plan. Actualiza tu plan para seguir generando contenido.',
    })
    return
  }

  const userPlan = profile.plan ?? 'free'

  const requiredFeature = MODE_FEATURE_KEYS[input_type]
  if (requiredFeature && !canUseFeature(userPlan, requiredFeature)) {
    res.status(403).json({ error: 'Esta función requiere el Plan Mensajero' })
    return
  }

  const allowCustomInstructions = canUseFeature(userPlan, 'custom_instructions')
  const allowFullAdn = canUseFeature(userPlan, 'full_adn_pastoral')
  const effectiveCustomInstructions = allowCustomInstructions ? custom_instructions?.trim() || null : null

  // Timestamps de diagnóstico: el único rastro que antes quedaba de una
  // request lenta era "200 OK" en los logs de Vercel, sin forma de saber en
  // qué etapa se fue el tiempo (generación principal, fallback, revisión
  // teológica o notas léxicas). `elapsed()` da el tiempo transcurrido desde
  // el inicio de esta request en cada punto clave.
  const requestStart = Date.now()
  const elapsed = () => `${Date.now() - requestStart}ms`
  console.log(`[generate] inicio user=${user_id} input_type=${input_type} +${elapsed()}`)

  const prompt = buildPrompt({
    translation,
    denomination,
    userRole: profile.role ?? 'pastor',
    occasion,
    duration,
    inputType: input_type,
    inputText: input_text,
    customInstructions: effectiveCustomInstructions,
    theologicalCenter: allowFullAdn ? profile.theological_center : null,
    teachingStyle: allowFullAdn ? profile.teaching_style : null,
    confrontationLevel: allowFullAdn ? profile.confrontation_level : null,
    applicationType: allowFullAdn ? profile.application_type : null,
    pastoralClosing: allowFullAdn ? profile.pastoral_closing : null,
    pastoralTone: allowFullAdn ? profile.pastoral_tone : null,
    targetAudience: allowFullAdn ? profile.target_audience : null,
    phrasesToAvoid: allowFullAdn ? profile.phrases_to_avoid : null,
    pastoralInstructions: allowFullAdn ? profile.pastoral_instructions : null,
    previewContext: preview_context ?? null,
  })

  const primaryResult = await runGeneration({ model: MODEL, maxTokens: MAX_TOKENS, prompt, apiKey: anthropicApiKey })
  console.log(`[generate] generación principal (${MODEL}) ${primaryResult.ok ? 'ok' : `fallo:${primaryResult.kind}`} +${elapsed()}`)

  let winningText = null
  let winningModel = null
  let finalError = null

  if (primaryResult.ok) {
    winningText = primaryResult.text
    winningModel = MODEL
  } else if (primaryResult.kind === 'content_filter') {
    // Único reintento permitido, y solo para este motivo específico — ver
    // diagnóstico: Sonnet bloqueó Lucas 15:11-32 en 4/4 pruebas por content
    // filtering; Haiku nunca lo bloqueó en 3/3 con el mismo prompt exacto.
    console.warn(`generate.js: ${MODEL} bloqueado por content filtering, reintentando una vez con ${FALLBACK_MODEL}`)
    const fallbackResult = await runGeneration({ model: FALLBACK_MODEL, maxTokens: FALLBACK_MAX_TOKENS, prompt, apiKey: anthropicApiKey })
    console.log(`[generate] fallback (${FALLBACK_MODEL}) ${fallbackResult.ok ? 'ok' : `fallo:${fallbackResult.kind}`} +${elapsed()}`)

    if (fallbackResult.ok) {
      winningText = fallbackResult.text
      winningModel = FALLBACK_MODEL
    } else {
      // Cualquier motivo de fallo del reintento (incluyendo otro bloqueo por
      // content filtering) se propaga tal cual, sin un segundo reintento.
      finalError = fallbackResult
    }
  } else if (primaryResult.kind === 'http_error' || primaryResult.kind === 'network_error') {
    // Fallo antes de iniciar el stream, no relacionado con content filtering —
    // mismo comportamiento que antes: error directo, sin reintento.
    res.status(502).json({ error: primaryResult.message })
    return
  } else {
    finalError = primaryResult
  }

  console.log(`[generate] fin generación principal, modelo ganador=${winningModel ?? 'ninguno'} +${elapsed()}`)

  // A partir de aquí YA se sabe si la generación principal (con su fallback)
  // ganó, así que se abren los headers ahora — antes, no después de la
  // revisión teológica y las notas léxicas — para que el cliente reciba la
  // conexión de inmediato y pueda ver en tiempo real, vía marcadores en banda
  // (ver src/lib/streamMarkers.js), en qué paso posterior está el servidor.
  // X-Theological-Review y X-Lexicon-Status ya NO pueden viajar como headers
  // HTTP porque dependen de pasos que todavía no corrieron a esta altura —
  // van en el marcador META justo antes del contenido final (más abajo).
  // X-Model-Used sí se conoce ya, así que se mantiene como header normal.
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
    ...(winningModel ? { 'X-Model-Used': winningModel } : {}),
  })

  // Paso de auto-revisión teológica: solo corre si la generación principal (o
  // su fallback) tuvo éxito. Nunca bloquea ni degrada la respuesta al usuario
  // — cualquier fallo en este paso deja `finalText` igual a `winningText`.
  let finalText = winningText
  let theologicalReviewCorrected = false
  let reviewIssuesFound = 0
  let lexiconStatus = 'not_attempted'
  let sermonPackage = null

  if (winningText !== null) {
    try {
      const cleaned = cleanJsonResponse(winningText)
      try {
        sermonPackage = JSON.parse(cleaned)
      } catch {
        sermonPackage = repairTruncatedJson(cleaned)
      }

      if (!sermonPackage) {
        // Antes esto pasaba en silencio: ni JSON.parse ni el reparador de
        // truncados lograban interpretar winningText, se saltaban revisión
        // teológica y notas léxicas, y finalText seguía siendo el texto roto
        // — que se transmitía igual con 200 OK. El cliente fallaba después al
        // intentar el mismo parseo ("No se pudo interpretar la respuesta de
        // la IA"), pero en los logs de Vercel no quedaba ningún rastro de
        // que el JSON de ${winningModel} nunca fue válido. Con este log al
        // menos queda registrado el motivo real y un fragmento del texto.
        console.error(
          `[generate] JSON de ${winningModel} no parseable ni reparable (len=${winningText.length}) +${elapsed()}. Primeros 500 chars:`,
          winningText.slice(0, 500)
        )
      } else if (sermonPackage?.sermon?.puntos?.length) {
        res.write(buildStageMarker(GENERATION_STAGES.REVIEWING))

        const reviewStart = Date.now()
        const { issues } = await runTheologicalReview({ sermon: sermonPackage.sermon, apiKey: anthropicApiKey })
        reviewIssuesFound = issues.length
        console.log(`[generate] revisión teológica: ${issues.length} issue(s) +${elapsed()} (paso tomó ${Date.now() - reviewStart}ms)`)

        if (issues.length > 0 && applyTheologicalFixes(sermonPackage.sermon, issues)) {
          finalText = JSON.stringify(sermonPackage)
          theologicalReviewCorrected = true
        }
      }
    } catch (err) {
      console.error('Error en el paso de revisión teológica, se usa el contenido original sin cambios:', err)
    }

    // Log de monitoreo: no está ligado al id de la fila en `generations` (esa
    // fila la crea api/save-generation.js después, a partir de lo que envíe
    // el cliente) — sirve para observar en agregado, con el tiempo, qué tan
    // seguido se activa esta corrección.
    try {
      await supabaseAdmin.from('theological_review_log').insert({
        user_id,
        model_used: winningModel,
        review_model: REVIEW_MODEL,
        was_corrected: theologicalReviewCorrected,
        issues_found: reviewIssuesFound,
      })
    } catch (err) {
      console.error('Error registrando el log de revisión teológica:', err)
    }

    // Paso de notas léxicas (Bolls Bible API): independiente de la revisión
    // teológica, corre después para operar sobre el sermón ya corregido si
    // hubo corrección. Estrictamente opcional — ver runLexiconStepWithTimeout.
    if (sermonPackage?.sermon?.puntos?.length) {
      try {
        res.write(buildStageMarker(GENERATION_STAGES.LEXICON))

        const lexiconStart = Date.now()
        const lexiconResult = await runLexiconStepWithTimeout({ sermon: sermonPackage.sermon, apiKey: anthropicApiKey })
        lexiconStatus = lexiconResult.status
        console.log(`[generate] notas léxicas: status=${lexiconStatus} +${elapsed()} (paso tomó ${Date.now() - lexiconStart}ms)`)
        if (lexiconResult.status === 'included') {
          sermonPackage.notas_lexicas = lexiconResult.notes
          finalText = JSON.stringify(sermonPackage)
        }
      } catch (err) {
        console.error('Error en el paso de notas léxicas, se omite sin bloquear la generación:', err)
        lexiconStatus = 'error'
      }
    }
  }

  if (finalText !== null) {
    res.write(buildMetaMarker({ theological_review: theologicalReviewCorrected ? 'corrected' : 'clean', lexicon_status: lexiconStatus }))
    await writeSimulatedStream(res, finalText)
    console.log(`[generate] respuesta final enviada (${finalText.length} chars) +${elapsed()}`)
  } else {
    console.log(`[generate] respuesta final: error (${finalError?.kind ?? 'desconocido'}) +${elapsed()}`)
    res.write(`${STREAM_ERROR_MARKER}${finalError?.message ?? 'La IA interrumpió la generación.'}`)
  }

  res.end()
}
