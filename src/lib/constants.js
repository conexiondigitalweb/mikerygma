export const ROLES = [
  { value: 'pastor', label: 'Pastor' },
  { value: 'lider', label: 'Líder' },
  { value: 'creador', label: 'Creador de contenido' },
  { value: 'otro', label: 'Otro' },
]

export const TRANSLATIONS = [
  { value: 'RVR1960', label: 'Reina Valera 1960', short: 'RVR60' },
  { value: 'NVI', label: 'Nueva Versión Internacional', short: 'NVI' },
  { value: 'DHH', label: 'Dios Habla Hoy', short: 'DHH' },
  { value: 'LBLA', label: 'La Biblia de las Américas', short: 'LBLA' },
  { value: 'NTV', label: 'Nueva Traducción Viviente', short: 'NTV' },
  { value: 'TLA', label: 'Traducción en Lenguaje Actual', short: 'TLA' },
]

export const OCCASIONS = [
  { value: 'culto_dominical', label: 'Culto dominical' },
  { value: 'estudio_biblico', label: 'Estudio bíblico' },
  { value: 'grupo_jovenes', label: 'Grupo de jóvenes' },
  { value: 'celula', label: 'Célula / grupo pequeño' },
  { value: 'devocional', label: 'Devocional personal' },
  { value: 'funeral', label: 'Funeral / honras fúnebres' },
  { value: 'boda', label: 'Boda / matrimonio' },
  { value: 'retiro', label: 'Retiro espiritual' },
  { value: 'otro', label: 'Otro' },
]

export const DENOMINATIONS = [
  { value: 'pentecostal', label: 'Pentecostal / Carismática' },
  { value: 'bautista', label: 'Bautista' },
  { value: 'presbiteriano', label: 'Presbiteriana / Reformada' },
  { value: 'metodista', label: 'Metodista' },
  { value: 'adventista', label: 'Adventista' },
  { value: 'catolica', label: 'Católica' },
  { value: 'anglicana', label: 'Anglicana / Episcopal' },
  { value: 'luterana', label: 'Luterana' },
  { value: 'interdenominacional', label: 'Interdenominacional' },
  { value: 'otro', label: 'Otra' },
]

export const DURATIONS = [
  { value: 'breve', label: 'Breve (5-10 min)', points: 2 },
  { value: 'regular', label: 'Regular (15-25 min)', points: 3 },
  { value: 'extenso', label: 'Extenso (30-45 min)', points: 4 },
]

export const INPUT_TYPES = [
  { value: 'pasaje', label: 'Desde un pasaje bíblico', icon: '📖', placeholder: 'Ej: Juan 3:16-21, Salmo 23, Romanos 8:28-39' },
  { value: 'tema', label: 'Desde un tema', icon: '💡', placeholder: 'Ej: La gracia de Dios, El perdón, La fe en tiempos difíciles' },
  { value: 'situacion', label: 'Desde una situación cotidiana', icon: '🤝', placeholder: 'Ej: Un joven de la iglesia perdió a su madre, La congregación enfrenta una crisis económica' },
]

export const PLANS = {
  free: { name: 'Gratis', price: 0, generations: 5, features: ['Todas las funciones', 'Marca de agua en outputs'] },
  mensajero: { name: 'Mensajero', price: 9, generations: 50, features: ['Sin marca de agua', 'Historial completo', 'Soporte por email'] },
  proclamador: { name: 'Proclamador', price: 19, generations: -1, features: ['Generaciones ilimitadas', 'PDF descargable', 'Acceso anticipado'] },
}

export const LOADING_MESSAGES = [
  'Buscando en la Palabra...',
  'Estructurando el mensaje...',
  'Preparando la aplicación práctica...',
  'Creando contenido para redes...',
  'Tu kerygma está casi listo...',
]
