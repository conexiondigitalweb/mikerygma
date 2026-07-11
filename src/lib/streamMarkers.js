// Token improbable de aparecer en el texto generado por Claude: permite distinguir
// un error de streaming a mitad de camino de un JSON simplemente truncado.
export const STREAM_ERROR_MARKER = '\n<<MIKERYGMA_STREAM_ERROR>>\n'

// Marcadores de progreso EN BANDA: mismo principio que STREAM_ERROR_MARKER
// (tokens improbables de aparecer en contenido real), pero para señalar en
// tiempo real que el servidor pasó a una etapa del pipeline posterior a la
// generación principal (auto-revisión teológica, notas léxicas). Existen
// porque api/generate.js necesita adelantar res.writeHead() para que estas
// señales lleguen mientras el servidor todavía trabaja — a esa altura
// X-Theological-Review y X-Lexicon-Status ya no pueden ser headers HTTP
// (dependen de pasos que aún no corrieron), así que viajan aquí, en un
// marcador final de metadatos, justo antes del contenido real.
export const STAGE_MARKER_PREFIX = '\n<<MIKERYGMA_STAGE:'
export const STAGE_MARKER_SUFFIX = '>>\n'
export const STAGE_MARKER_REGEX = /\n<<MIKERYGMA_STAGE:([a-z_]+)>>\n/g

export const GENERATION_STAGES = {
  REVIEWING: 'reviewing',
  LEXICON: 'lexicon',
}

export const META_MARKER_PREFIX = '\n<<MIKERYGMA_META:'
export const META_MARKER_SUFFIX = '>>\n'
export const META_MARKER_REGEX = /\n<<MIKERYGMA_META:(.*?)>>\n/

export function buildStageMarker(stage) {
  return `${STAGE_MARKER_PREFIX}${stage}${STAGE_MARKER_SUFFIX}`
}

export function buildMetaMarker(meta) {
  return `${META_MARKER_PREFIX}${JSON.stringify(meta)}${META_MARKER_SUFFIX}`
}
