# CLAUDE.md — MiKerygma

## Identidad del Proyecto

**Nombre:** MiKerygma
**Dominio:** mikerygma.com
**Tagline:** "Tu asistente de IA para la proclamación del Evangelio"
**Descripción:** Plataforma de IA diseñada exclusivamente para líderes cristianos hispanohablantes. Genera sermones, devocionales, contenido para redes sociales y reflexiones a partir de un pasaje bíblico, un tema o una situación cotidiana. No reemplaza al predicador — le devuelve horas para pastorear.

**Origen:** Pivote estratégico del proyecto Reposta (reposta.live). Reutiliza ~70% de la infraestructura existente (auth, API Anthropic, sistema freemium, UI base).

**Marca madre:** La Gracia que Transforma (lagraciaquetransforma.com)
**Autor:** Doiler Alfonso Sanjuán Sánchez

---

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Backend/Auth/DB | Supabase (nuevo proyecto dedicado) |
| IA | Anthropic API (claude-sonnet-4-6) |
| Deploy | Vercel (auto-deploy desde GitHub) |
| Repo | github.com/conexiondigitalweb/mikerygma |
| Dominio | mikerygma.com |
| Emails | Resend (si se necesitan notificaciones) |

### Decisiones técnicas heredadas de Reposta
- Supabase Auth con Email/Password + Google OAuth
- Conteo de generaciones por usuario en tabla `user_usage`
- Loading progresivo con mensajes de fase durante generación
- Vercel serverless functions para llamadas a Anthropic API (API key nunca expuesta al cliente)

---

## Arquitectura de la Base de Datos (Supabase)

### Tabla: `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'pastor', -- pastor, lider, creador, otro
  denomination TEXT, -- denominación: bautista, pentecostal, presbiteriano, católico, interdenominacional, otro
  preferred_translation TEXT DEFAULT 'RVR1960', -- RVR1960, NVI, DHH, LBLA, NTV, TLA
  country TEXT,
  church_name TEXT,
  plan TEXT DEFAULT 'free', -- free, mensajero ($9/mes), proclamador ($19/mes)
  generations_used INTEGER DEFAULT 0,
  generations_limit INTEGER DEFAULT 5, -- free=5, mensajero=50, proclamador=ilimitado
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `generations`
```sql
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL, -- 'pasaje', 'tema', 'situacion'
  input_text TEXT NOT NULL, -- el pasaje, tema o situación ingresada
  occasion TEXT NOT NULL, -- 'culto_dominical', 'estudio_biblico', 'grupo_jovenes', 'devocional', 'funeral', 'boda', 'celula', 'retiro', 'otro'
  translation TEXT NOT NULL, -- traducción bíblica seleccionada
  output_sermon JSONB, -- bosquejo del sermón estructurado
  output_devotional JSONB, -- devocional corto
  output_social JSONB, -- 3 posts para redes
  output_prayer TEXT, -- oración de cierre
  model_used TEXT DEFAULT 'claude-sonnet-4-6',
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `saved_sermons` (Fase 2)
```sql
CREATE TABLE saved_sermons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES generations(id),
  title TEXT NOT NULL,
  notes TEXT, -- notas personales del pastor
  preached_date DATE, -- fecha en que se predicó
  tags TEXT[], -- etiquetas: ['gracia', 'fe', 'familia']
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS (Row Level Security)
IMPORTANTE: Aplicar RLS desde el inicio + GRANT explícito a `service_role` y `authenticated` en TODAS las tablas. Patrón recurrente en proyectos de Doiler: BYPASSRLS y GRANT son capas separadas — siempre hacer ambas.

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users read own generations" ON generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own generations" ON generations FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT ALL ON profiles TO authenticated;
GRANT ALL ON generations TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT ALL ON generations TO service_role;
```

---

## Flujo de Usuario (MVP)

### 1. Landing Page
- Hero: "Prepara tu sermón en minutos, no en horas. IA diseñada para pastores y líderes cristianos hispanohablantes."
- Subhero: "Genera bosquejos de sermones, devocionales y contenido para redes desde un pasaje bíblico, un tema o una situación cotidiana."
- CTA principal: "Empieza gratis — 5 generaciones sin costo"
- Sección de credibilidad: "Construido por un autor cristiano con más de un año produciendo devocionales diarios" + logo La Gracia que Transforma
- Sección de cómo funciona (3 pasos visuales)
- Pricing: 3 planes
- Footer con link a Gracia Inmerecida en Amazon

### 2. Registro/Login
- Email + contraseña o Google OAuth (heredado de Reposta)
- Onboarding post-registro: nombre, rol (pastor/líder/creador), denominación, traducción bíblica preferida, país, nombre de iglesia (opcional)

### 3. Dashboard
- Contador de generaciones restantes
- Botón principal: "Nueva generación"
- Historial de generaciones anteriores (lista con fecha, tipo, input resumido)
- Banner de upgrade cuando quedan ≤1 generación

### 4. Flujo de Generación (PANTALLA PRINCIPAL)

**Paso 1 — Input**
El usuario elige UNO de tres modos:

a) **Desde un pasaje bíblico:** campo de texto para ingresar la referencia (ej: "Juan 3:16-21", "Salmo 23", "Romanos 8:28-39")

b) **Desde un tema:** campo de texto libre (ej: "La gracia de Dios", "El perdón", "Cómo enfrentar la ansiedad", "El propósito de Dios en el sufrimiento")

c) **Desde una situación cotidiana:** campo de texto libre (ej: "Un joven de la iglesia perdió a su madre", "La congregación está pasando por una crisis económica", "Un matrimonio en la iglesia está al borde del divorcio")

**Selectores adicionales:**
- Traducción bíblica: RVR1960 (default), NVI, DHH, LBLA, NTV, TLA
- Tipo de ocasión: Culto dominical, Estudio bíblico, Grupo de jóvenes, Célula/grupo pequeño, Devocional personal, Funeral, Boda, Retiro, Otro
- Duración estimada del sermón: Breve (5-10 min), Regular (15-25 min), Extenso (30-45 min)

**Paso 2 — Generación con loading progresivo**
Mensajes de fase (NO mensajes genéricos — mensajes con identidad espiritual):
1. "Buscando en la Palabra..."
2. "Estructurando el mensaje..."
3. "Preparando la aplicación práctica..."
4. "Creando contenido para redes..."
5. "Tu kerygma está casi listo..."

**Paso 3 — Output (4 secciones en tabs o acordeón)**

**Tab 1: Bosquejo del Sermón**
```json
{
  "titulo": "string",
  "pasaje_central": "string (referencia bíblica)",
  "texto_completo_pasaje": "string (el pasaje en la traducción seleccionada)",
  "introduccion": {
    "gancho": "string (historia, pregunta o dato que captura atención)",
    "contexto": "string (contexto bíblico/histórico del pasaje)",
    "tesis": "string (la idea central del sermón en una oración)"
  },
  "puntos": [
    {
      "numero": 1,
      "titulo": "string",
      "desarrollo": "string (2-3 párrafos)",
      "pasajes_apoyo": ["referencia1", "referencia2"],
      "ilustracion": "string (historia, analogía o ejemplo cotidiano)",
      "aplicacion": "string (cómo aplicar este punto a la vida diaria)"
    }
    // 3-4 puntos según la duración seleccionada
  ],
  "conclusion": {
    "resumen": "string",
    "llamado_accion": "string",
    "pasaje_cierre": "string"
  },
  "oracion_cierre": "string"
}
```

**Tab 2: Devocional**
Un devocional corto (300-500 palabras) derivado del mismo tema, con:
- Versículo clave
- Reflexión personal
- Aplicación práctica
- Oración
- Formato listo para copiar y enviar por WhatsApp

**Tab 3: Contenido para Redes (3 posts)**
- Post 1: Frase de impacto con el versículo clave (formato para Instagram/Facebook)
- Post 2: Pregunta de reflexión para generar engagement (formato para stories o Twitter)
- Post 3: Resumen del mensaje en 280 caracteres (formato Twitter/X)
- Cada post con hashtags relevantes sugeridos

**Tab 4: Oración de Cierre**
- Oración pastoral completa relacionada con el tema
- Formato listo para leer en el culto

**Cada tab tiene botón "Copiar" individual.**

---

## Prompt de Generación (System Prompt para Anthropic API)

```
Eres un asistente teológico experto diseñado para apoyar a pastores y líderes cristianos hispanohablantes en la preparación de sus mensajes. NO reemplazas al predicador — eres una herramienta que estructura, investiga y sugiere para que el pastor pueda enfocarse en la guía del Espíritu Santo y su conexión personal con la congregación.

REGLAS FUNDAMENTALES:
1. SIEMPRE usa la traducción bíblica que el usuario seleccionó: {translation}. Cita los versículos EXACTAMENTE como aparecen en esa traducción.
2. El tono debe ser pastoral, cálido, profundo pero accesible. NO académico seco. NO superficial.
3. Las ilustraciones deben ser culturalmente relevantes para Hispanoamérica: referencias a la vida cotidiana latinoamericana, situaciones familiares hispanas, contexto cultural hispano.
4. NUNCA inventes citas bíblicas. Si no estás seguro de la cita exacta en la traducción solicitada, indica la referencia sin citar textualmente.
5. Respeta la diversidad denominacional. Si el usuario indicó su denominación ({denomination}), ajusta el enfoque teológico sin contradecir doctrinas centrales del cristianismo histórico.
6. La estructura del sermón debe ser predicable: un pastor real debe poder tomar este bosquejo y predicar desde él con mínima edición.
7. Las aplicaciones prácticas deben ser concretas y accionables, no abstractas.
8. El contenido para redes debe ser nativo de cada plataforma: conciso para Twitter, visual para Instagram, reflexivo para Facebook.

CONTEXTO DEL USUARIO:
- Rol: {user_role}
- Denominación: {denomination}
- Traducción preferida: {translation}
- Tipo de input: {input_type} (pasaje / tema / situación)
- Ocasión: {occasion}
- Duración estimada: {duration}

INPUT DEL USUARIO:
{user_input}

GENERA un JSON con la siguiente estructura exacta:
{estructura detallada del output — ver sección "Paso 3 — Output" arriba}

Responde ÚNICAMENTE con el JSON válido, sin texto adicional, sin backticks de markdown.
```

---

## Modelo de Precios

| Plan | Precio | Generaciones/mes | Features |
|---|---|---|---|
| **Gratis** | $0 | 5 | Todas las funciones, marca de agua "Generado con MiKerygma" en outputs |
| **Mensajero** | $9/mes | 50 | Sin marca de agua, historial completo, soporte por email |
| **Proclamador** | $19/mes | Ilimitadas | Todo lo anterior + outputs en PDF descargable, acceso anticipado a nuevas funciones |

**Pasarela de pago:** Stripe (configurar después de validación con primeros usuarios)

**Lógica de conteo:** Cada generación completa (que produce los 4 outputs) cuenta como 1 generación. Si el usuario regenera un output individual, NO cuenta como generación adicional.

---

## Diferenciadores vs Competencia (en inglés)

1. **Nativo en español:** No es una traducción. Los prompts, la UX, las ilustraciones, el tono — todo está pensado desde y para la cultura pastoral hispana.
2. **Traducciones bíblicas en español:** RVR1960, NVI, DHH, LBLA, NTV, TLA. Las herramientas en inglés no manejan estas traducciones.
3. **Contexto cultural hispano:** Las ilustraciones y aplicaciones reflejan la vida en Latinoamérica y España, no la experiencia norteamericana traducida.
4. **Paquete completo en un solo flujo:** Sermón + devocional + redes + oración. La mayoría de herramientas en inglés hacen solo una de estas cosas.
5. **Precio accesible:** $9/mes vs $29-49/mes de competidores en inglés.
6. **Modo "situación cotidiana":** Ningún competidor ofrece generar un mensaje pastoral a partir de una situación real de la congregación (duelo, crisis, conflicto).

---

## Roadmap

### Fase 1 — MVP (Semanas 1-3)
- [ ] Landing page con propuesta de valor clara
- [ ] Registro/login con onboarding (denominación, traducción, rol)
- [ ] Flujo de generación: 3 modos de input → 4 outputs
- [ ] Dashboard con historial y contador de generaciones
- [ ] Deploy en Vercel con dominio mikerygma.com
- [ ] 10-15 beta testers (pastores reales)

### Fase 2 — Validación y Retención (Semanas 4-8)
- [ ] Feedback de beta testers incorporado
- [ ] Biblioteca de sermones guardados con búsqueda
- [ ] Output en PDF descargable con diseño profesional
- [ ] Integración con Stripe para planes pagos
- [ ] SEO básico + página "Sobre nosotros" con historia de La Gracia que Transforma
- [ ] Calendario litúrgico/temático (sugerencias de temas por época del año)

### Fase 3 — Crecimiento (Semanas 9-16)
- [ ] Generador de estudios bíblicos para grupos pequeños
- [ ] Generador de contenido para boletines de iglesia
- [ ] Sistema de referidos (pastor invita pastor, ambos ganan generaciones extra)
- [ ] Blog con SEO: "Cómo preparar un sermón sobre [tema]" — contenido que atrae pastores buscando en Google
- [ ] Versión del devocional diario de La Gracia que Transforma integrada como feature gratuita (atrae tráfico, construye confianza)

---

## Estructura de Carpetas del Proyecto

```
mikerygma/
├── CLAUDE.md                    # Este archivo
├── public/
│   ├── favicon.ico
│   └── og-image.png
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── components/
│   │   ├── Layout.jsx           # Layout con navbar y footer
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── GenerationCounter.jsx
│   │   └── CopyButton.jsx
│   ├── pages/
│   │   ├── Landing.jsx          # Landing page pública
│   │   ├── Login.jsx            # Login/registro
│   │   ├── Onboarding.jsx       # Configuración post-registro
│   │   ├── Dashboard.jsx        # Panel principal
│   │   ├── Generate.jsx         # Flujo de generación (pantalla principal)
│   │   ├── Result.jsx           # Visualización de resultado con tabs
│   │   ├── History.jsx          # Historial de generaciones
│   │   ├── Pricing.jsx          # Planes y precios
│   │   └── Profile.jsx          # Perfil del usuario
│   ├── lib/
│   │   ├── supabase.js          # Cliente Supabase
│   │   ├── auth.js              # Funciones de autenticación
│   │   └── constants.js         # Traducciones, ocasiones, denominaciones
│   └── hooks/
│       ├── useAuth.js
│       └── useGenerations.js
├── api/                          # Vercel serverless functions
│   └── generate.js              # POST endpoint que llama a Anthropic API
├── vercel.json
├── tailwind.config.js
├── vite.config.js
├── package.json
└── .env.local                   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY
```

---

## Constantes del Producto

```javascript
// src/lib/constants.js

export const TRANSLATIONS = [
  { value: 'RVR1960', label: 'Reina Valera 1960', short: 'RVR60' },
  { value: 'NVI', label: 'Nueva Versión Internacional', short: 'NVI' },
  { value: 'DHH', label: 'Dios Habla Hoy', short: 'DHH' },
  { value: 'LBLA', label: 'La Biblia de las Américas', short: 'LBLA' },
  { value: 'NTV', label: 'Nueva Traducción Viviente', short: 'NTV' },
  { value: 'TLA', label: 'Traducción en Lenguaje Actual', short: 'TLA' },
];

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
];

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
];

export const DURATIONS = [
  { value: 'breve', label: 'Breve (5-10 min)', points: 2 },
  { value: 'regular', label: 'Regular (15-25 min)', points: 3 },
  { value: 'extenso', label: 'Extenso (30-45 min)', points: 4 },
];

export const INPUT_TYPES = [
  { value: 'pasaje', label: 'Desde un pasaje bíblico', icon: '📖', placeholder: 'Ej: Juan 3:16-21, Salmo 23, Romanos 8:28-39' },
  { value: 'tema', label: 'Desde un tema', icon: '💡', placeholder: 'Ej: La gracia de Dios, El perdón, La fe en tiempos difíciles' },
  { value: 'situacion', label: 'Desde una situación cotidiana', icon: '🤝', placeholder: 'Ej: Un joven de la iglesia perdió a su madre, La congregación enfrenta una crisis económica' },
];

export const PLANS = {
  free: { name: 'Gratis', price: 0, generations: 5, features: ['Todas las funciones', 'Marca de agua en outputs'] },
  mensajero: { name: 'Mensajero', price: 9, generations: 50, features: ['Sin marca de agua', 'Historial completo', 'Soporte por email'] },
  proclamador: { name: 'Proclamador', price: 19, generations: -1, features: ['Generaciones ilimitadas', 'PDF descargable', 'Acceso anticipado'] },
};

export const LOADING_MESSAGES = [
  'Buscando en la Palabra...',
  'Estructurando el mensaje...',
  'Preparando la aplicación práctica...',
  'Creando contenido para redes...',
  'Tu kerygma está casi listo...',
];
```

---

## Variables de Entorno

```env
# .env.local
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
ANTHROPIC_API_KEY=[API_KEY]  # Solo en serverless, nunca en el cliente
```

---

## Notas Técnicas Importantes

1. **API Key de Anthropic NUNCA en el cliente.** Siempre a través de Vercel serverless function (`/api/generate.js`).
2. **RLS + GRANT desde el día 1.** Patrón recurrente: sin GRANT explícito, service_role no puede operar aunque tenga BYPASSRLS.
3. **Validar generaciones restantes server-side**, no solo en el frontend. El usuario no debe poder hacer más generaciones de las permitidas manipulando el cliente.
4. **El JSON de output debe parsearse con try/catch.** Claude a veces agrega texto antes/después del JSON. Limpiar backticks y texto extra antes de parsear.
5. **No depender de que Claude cite versículos perfectamente.** El prompt pide la traducción específica, pero verificar que las citas sean razonables. En Fase 2, integrar una API de Biblia para verificación (ej: api.biblia.com o bible-api.com).

---

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build para producción
npm run build

# Deploy (automático vía GitHub → Vercel)
git push origin main
```

---

## Contexto del Desarrollador

Este proyecto es construido por Doiler Alfonso Sanjuán Sánchez usando Claude Code CLI. El workflow es:
1. Diagnóstico y estrategia en Claude.ai (chat)
2. Prompts precisos generados para Claude Code
3. Ejecución en Claude Code (una tarea a la vez)
4. Push a GitHub → deploy automático en Vercel

Doiler prefiere:
- Prompts completos y copiables, no guías parciales
- Diagnóstico antes de cambios de código
- UX pensada desde la perspectiva del usuario casual que desinstala antes de investigar
- Commits descriptivos en español
