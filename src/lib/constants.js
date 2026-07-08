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
  { value: 'youtube', label: 'Desde un video de YouTube', icon: '🎬', placeholder: 'Pega la URL de cualquier video de YouTube (prédicas, enseñanzas, conferencias, podcasts...)' },
]

export const LIBRARY_STATUSES = [
  { value: 'borrador', label: 'Borrador', badgeClass: 'bg-secondary text-secondary-foreground' },
  { value: 'revisado', label: 'Revisado', badgeClass: 'bg-[#5B7FA6] text-white' },
  { value: 'predicado', label: 'Predicado', badgeClass: 'bg-[#7A9174] text-white' },
  { value: 'publicado', label: 'Publicado', badgeClass: 'bg-primary text-primary-foreground' },
  { value: 'archivado', label: 'Archivado', badgeClass: 'bg-destructive/15 text-destructive' },
]

export const PASTORAL_TONES = [
  { value: 'pastoral_calido', label: 'Pastoral cálido — cercano, empático, como un amigo que camina contigo' },
  { value: 'profetico_desafiante', label: 'Profético desafiante — directo, confrontador con amor, urgente' },
  { value: 'academico_reflexivo', label: 'Académico reflexivo — analítico, profundo, con énfasis en el estudio' },
  { value: 'evangelistico', label: 'Evangelístico — orientado a la decisión, apasionado, invitacional' },
  { value: 'conversacional', label: 'Conversacional — informal, con preguntas retóricas, como una charla' },
]

export const TARGET_AUDIENCES = [
  { value: 'general', label: 'Congregación general' },
  { value: 'jovenes', label: 'Jóvenes y adolescentes' },
  { value: 'mujeres', label: 'Mujeres' },
  { value: 'familias', label: 'Familias y matrimonios' },
  { value: 'adultos_mayores', label: 'Adultos mayores' },
  { value: 'profesionales', label: 'Profesionales y emprendedores' },
  { value: 'rural', label: 'Comunidad rural' },
]

export const THEOLOGICAL_CENTERS = [
  { value: 'gracia', label: 'La gracia de Dios' },
  { value: 'reino', label: 'El Reino de Dios' },
  { value: 'discipulado', label: 'Discipulado y formación' },
  { value: 'santidad', label: 'Santidad y vida consagrada' },
  { value: 'evangelismo', label: 'Evangelismo y misión' },
  { value: 'familia', label: 'Familia y relaciones' },
  { value: 'justicia', label: 'Justicia social y compasión' },
  { value: 'adoracion', label: 'Adoración y vida devocional' },
  { value: 'esperanza', label: 'Esperanza y restauración' },
]

export const TEACHING_STYLES = [
  { value: 'expositivo', label: 'Expositivo — análisis detallado del texto bíblico' },
  { value: 'tematico', label: 'Temático — desarrollo de un tema con varios pasajes' },
  { value: 'narrativo', label: 'Narrativo — cuenta la historia bíblica y la conecta con la vida' },
  { value: 'pastoral', label: 'Pastoral — centrado en el cuidado y las necesidades de la congregación' },
  { value: 'apologetico', label: 'Apologético — defiende la fe con argumentos y evidencias' },
  { value: 'devocional', label: 'Devocional — reflexión íntima y personal' },
]

export const CONFRONTATION_LEVELS = [
  { value: 'suave', label: 'Suave — invita a reflexionar sin presionar' },
  { value: 'moderado', label: 'Moderado — señala con amor y claridad' },
  { value: 'directo', label: 'Directo — confronta con firmeza y respeto' },
  { value: 'profetico', label: 'Profético — desafía con urgencia y autoridad espiritual' },
]

export const APPLICATION_TYPES = [
  { value: 'practica_diaria', label: 'Práctica diaria — acciones concretas para la semana' },
  { value: 'introspectiva', label: 'Introspectiva — invita a la reflexión interior' },
  { value: 'comunitaria', label: 'Comunitaria — fortalece la vida en comunidad' },
  { value: 'evangelistica', label: 'Evangelística — motiva a compartir la fe' },
  { value: 'familiar', label: 'Familiar — aplicable en el hogar y las relaciones' },
]

export const PASTORAL_CLOSINGS = [
  { value: 'llamado', label: 'Llamado a decisión — invita a responder públicamente' },
  { value: 'oracion_guiada', label: 'Oración guiada — cierra con una oración que el oyente repite' },
  { value: 'reflexion', label: 'Reflexión silenciosa — deja un espacio para meditar' },
  { value: 'desafio', label: 'Desafío práctico — propone una acción concreta' },
  { value: 'consuelo', label: 'Consuelo y esperanza — cierra con una promesa de Dios' },
]

export const PLANS = {
  free: {
    name: 'Gratis',
    tagline: 'Descubre tu copiloto',
    price: 0,
    generations: 3,
    features: {
      basic_profile: true,
      full_adn_pastoral: false,
      mode_pasaje: true,
      mode_tema: true,
      mode_situacion: false,
      mode_youtube: false,
      custom_instructions: false,
      full_history: false,
      watermark: true,
      pdf_export: false,
      edit_preview: false,
      full_library: false,
    },
    display_features: [
      '3 generaciones al mes',
      'Perfil básico',
      'Pasaje bíblico y tema',
      'Marca de agua en outputs',
    ],
  },
  mensajero: {
    name: 'Mensajero',
    tagline: 'Para el pastor comprometido',
    price: 9,
    generations: 15,
    features: {
      basic_profile: true,
      full_adn_pastoral: true,
      mode_pasaje: true,
      mode_tema: true,
      mode_situacion: true,
      mode_youtube: true,
      custom_instructions: true,
      full_history: true,
      watermark: false,
      pdf_export: false,
      edit_preview: true,
      full_library: true,
    },
    display_features: [
      '15 generaciones al mes',
      'ADN Pastoral completo',
      '4 modos de input',
      'Instrucciones por generación',
      'Historial completo',
      'Sin marca de agua',
    ],
  },
  proclamador: {
    name: 'Proclamador',
    tagline: 'Para ministerios en crecimiento',
    price: 19,
    generations: 40,
    features: {
      basic_profile: true,
      full_adn_pastoral: true,
      mode_pasaje: true,
      mode_tema: true,
      mode_situacion: true,
      mode_youtube: true,
      custom_instructions: true,
      full_history: true,
      watermark: false,
      pdf_export: true,
      edit_preview: true,
      full_library: true,
    },
    display_features: [
      '40 generaciones al mes',
      'Todas las funciones',
      'Exportación a PDF',
      'Acceso anticipado a nuevas funciones',
    ],
  },
}

export const LOADING_MESSAGES = [
  'Buscando en la Palabra...',
  'Estructurando el mensaje...',
  'Preparando la aplicación práctica...',
  'Creando contenido para redes...',
  'Tu kerygma está casi listo...',
]
