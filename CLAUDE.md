# CLAUDE.md — MiKerygma

## Identidad del Proyecto

**Nombre:** MiKerygma
**Dominio:** mikerygma.com
**Posicionamiento:** Copiloto ministerial inteligente para pastores y líderes cristianos hispanohablantes. **MiKerygma no es un generador de sermones — es un copiloto ministerial que acompaña al pastor desde la idea hasta el mensaje completo.**
**Tagline:** "Tu copiloto ministerial con inteligencia artificial"
**Descripción:** Plataforma de IA diseñada exclusivamente para líderes cristianos hispanohablantes. Entiende el perfil pastoral del usuario (ADN Pastoral), respeta su tradición bíblica y se adapta a su audiencia y estilo de comunicación. Genera sermones, devocionales, contenido para redes sociales y oraciones a partir de un pasaje bíblico, un tema, una situación cotidiana o un video de YouTube. No reemplaza al predicador — le devuelve horas para pastorear.

**Origen:** Pivote estratégico del proyecto Reposta (reposta.live). Reutiliza parte de la infraestructura existente (auth, integración con Anthropic, sistema freemium, UI base).

**Marca madre:** La Gracia que Transforma (lagraciaquetransforma.com)
**Autor:** Doiler Alfonso Sanjuán Sánchez
**Repo:** github.com/conexiondigitalweb/mikerygma

---

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 + shadcn/ui (Radix + class-variance-authority) |
| Backend/Auth/DB | Supabase (proyecto dedicado) |
| IA | Anthropic API (`claude-haiku-4-5` — elegido en vez de Sonnet para evitar el timeout de 60s de Vercel Hobby) |
| Transcripción | Supadata API (transcripción de videos de YouTube) |
| Email | Resend (dominio mikerygma.com) |
| Auth social | Google OAuth (vía Supabase Auth) |
| Deploy | Vercel (auto-deploy desde GitHub, rama `main`) |
| Repo | github.com/conexiondigitalweb/mikerygma |
| Dominio | mikerygma.com |

### Paleta de colores
- Dorado / ámbar (primario, CTAs, acentos): `#B8860B`
- Crema / blanco cremoso (fondo principal): `#FFF8F0`
- Marrón suave (texto secundario): `#8B7355`
- Terracota (acentos secundarios): `#C1694F`
- Texto principal: `#4A3728` (nota: la variable `--foreground` en `src/index.css` está en `#3A2E22`, un tono muy cercano — verificar si se busca consistencia exacta con la marca)

### Decisiones técnicas heredadas de Reposta
- Supabase Auth con Email/Password + Google OAuth
- Conteo de generaciones por usuario directamente en la tabla `profiles` (columnas `generations_used` / `generations_limit`)
- Loading progresivo con mensajes de fase durante generación
- Vercel serverless functions para llamadas a Anthropic API (API key nunca expuesta al cliente)

### Decisiones técnicas clave (estado actual)
- **Modelo `claude-haiku-4-5`** en vez de Sonnet, para evitar timeout de Vercel Hobby (60s máx.)
- **`max_tokens: 3500`** en `api/generate.js` para evitar truncamiento del JSON de salida
- **`repairTruncatedJson()`** como fallback de parseo cuando Claude corta la respuesta a mitad del JSON
- **Estilos inline obligatorios** en `SocialCard.jsx` — `html2canvas` no captura clases de Tailwind, solo estilos inline
- **`ProfileContext`** como fuente de verdad del estado del perfil, para evitar re-consultas innecesarias y estados obsoletos en `ProtectedRoute`

---

## Arquitectura de la Base de Datos (Supabase)

El esquema vigente vive en `supabase/schema.sql` (consolidado a partir de `supabase/migrations/002_session3_features.sql`, `003_perfil_ministerial_adn_pastoral.sql` y `004_planes_y_feature_teasing.sql`).

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
  generations_limit INTEGER DEFAULT 3, -- free=3, mensajero=15, proclamador=40
  -- ADN Pastoral (Sesión 4) — estilo de comunicación y teología del usuario
  pastoral_tone TEXT, -- pastoral_calido, profetico_desafiante, academico_reflexivo, evangelistico, conversacional
  target_audience TEXT, -- general, jovenes, mujeres, familias, adultos_mayores, profesionales, rural
  pastoral_instructions TEXT, -- instrucciones permanentes de estilo (máx. 1000 caracteres, validado en frontend)
  theological_center TEXT, -- gracia, reino, discipulado, santidad, evangelismo, familia, justicia, adoracion, esperanza
  teaching_style TEXT, -- expositivo, tematico, narrativo, pastoral, apologetico, devocional
  confrontation_level TEXT, -- suave, moderado, directo, profetico
  application_type TEXT, -- practica_diaria, introspectiva, comunitaria, evangelistica, familiar
  pastoral_closing TEXT, -- llamado, oracion_guiada, reflexion, desafio, consuelo
  phrases_to_avoid TEXT, -- frases o enfoques a evitar (máx. 500 caracteres, validado en frontend)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `generations`
```sql
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL, -- 'pasaje', 'tema', 'situacion', 'youtube'
  input_text TEXT NOT NULL, -- el pasaje, tema, situación o transcripción ingresada
  occasion TEXT NOT NULL, -- 'culto_dominical', 'estudio_biblico', 'grupo_jovenes', 'devocional', 'funeral', 'boda', 'celula', 'retiro', 'otro'
  translation TEXT NOT NULL, -- traducción bíblica seleccionada
  custom_instructions TEXT, -- instrucciones adicionales específicas de esta generación (opcional, solo planes pagos)
  output_sermon JSONB, -- bosquejo del sermón estructurado
  output_devotional JSONB, -- devocional corto
  output_social JSONB, -- posts para redes
  output_prayer TEXT, -- oración de cierre
  model_used TEXT DEFAULT 'claude-sonnet-4-6', -- valor por defecto de la columna; api/generate.js siempre inserta el modelo real usado ('claude-haiku-4-5')
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `saved_sermons` (Fase 2 — no implementada aún)
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
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users read own generations" ON generations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own generations" ON generations FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT ALL ON profiles TO authenticated;
GRANT ALL ON generations TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT ALL ON generations TO service_role;
```

---

## Modelo de Planes y Feature Gating

| Plan | Precio | Generaciones/mes |
|---|---|---|
| **Gratis** | $0 | 3 |
| **Mensajero** | $9/mes | 15 |
| **Proclamador** | $19/mes | 40 |

**Pasarela de pago:** Stripe (configurar después de validación con primeros usuarios)

**Lógica de conteo:** Cada generación completa (que produce los 4 outputs) cuenta como 1 generación. Si el usuario regenera un output individual, o vuelve a pedir un enfoque en el preview, NO cuenta como generación adicional.

### Tabla de features por plan (`PLANS.features` en `src/lib/constants.js`)

| Feature | Gratis | Mensajero | Proclamador |
|---|---|---|---|
| `basic_profile` | ✓ | ✓ | ✓ |
| `full_adn_pastoral` | ✗ | ✓ | ✓ |
| `mode_pasaje` | ✓ | ✓ | ✓ |
| `mode_tema` | ✓ | ✓ | ✓ |
| `mode_situacion` | ✗ | ✓ | ✓ |
| `mode_youtube` | ✗ | ✓ | ✓ |
| `custom_instructions` | ✗ | ✓ | ✓ |
| `edit_preview` | ✗ | ✓ | ✓ |
| `full_history` | ✗ | ✓ | ✓ |
| `watermark` | ✓ | ✗ | ✗ |
| `pdf_export` | ✗ | ✗ | ✓ |

`src/lib/planHelpers.js` expone `canUseFeature(userPlan, featureName)`, que se usa tanto en el cliente (mostrar/ocultar/bloquear UI) como en los endpoints serverless (rechazar la petición si el plan no tiene la feature).

### Feature Teasing
Los usuarios en plan Gratis **ven** las funciones premium, pero bloqueadas — nunca se ocultan por completo. El objetivo es que el usuario entienda constantemente el valor que se está perdiendo, sin que el teasing sea agresivo. El componente reutilizable es `UpgradePrompt.jsx` (`src/components/UpgradePrompt.jsx`), con 4 variantes:

- `inline` — texto corto con ícono de candado y link "Ver planes", para debajo de un campo bloqueado.
- `overlay` — capa semitransparente centrada sobre un bloque de contenido bloqueado, con botón "Ver planes".
- `modal` — diálogo (shadcn `Dialog`) que se abre al intentar usar una función bloqueada (p. ej. al hacer clic en un modo de input bloqueado en `Generate.jsx`).
- `banner` — franja horizontal con mensaje + CTA, usada por ejemplo tras ver un resultado con marca de agua.

**Validación server-side:** `api/generate.js` y `api/preview.js` vuelven a validar cada feature contra el plan del perfil (consultado con `service_role`, no confiable el valor del cliente) antes de construir el prompt — modos bloqueados devuelven 403, `custom_instructions` y el ADN Pastoral completo se ignoran silenciosamente si el plan no los permite.

---

## Diferenciadores vs Competencia (en inglés)

1. **Nativo en español:** No es una traducción. Los prompts, la UX, las ilustraciones, el tono — todo está pensado desde y para la cultura pastoral hispana.
2. **Traducciones bíblicas en español:** RVR1960, NVI, DHH, LBLA, NTV, TLA. Las herramientas en inglés no manejan estas traducciones.
3. **Contexto cultural hispano:** Las ilustraciones y aplicaciones reflejan la vida en Latinoamérica y España, no la experiencia norteamericana traducida.
4. **Paquete completo en un solo flujo:** Sermón + devocional + redes + oración. La mayoría de herramientas en inglés hacen solo una de estas cosas.
5. **Precio accesible:** $9/mes vs $29-49/mes de competidores en inglés.
6. **Modo "situación cotidiana":** Ningún competidor ofrece generar un mensaje pastoral a partir de una situación real de la congregación (duelo, crisis, conflicto).
7. **ADN Pastoral:** la personalización profunda del perfil ministerial (centro teológico, estilo de enseñanza, nivel de confrontación, tono, audiencia) hace que cada output suene al pastor, no a una plantilla genérica de IA.
8. **Preview de enfoque antes de generar:** el usuario ve y puede ajustar el ángulo pastoral del mensaje antes de invertir una generación completa — transforma la percepción de "la máquina me escupe un sermón" a "la herramienta me ayuda a pensar mi mensaje".

---

## Flujo de Usuario

### 1. Landing Page
- Hero y subhero con el posicionamiento de copiloto ministerial (ver Identidad del Proyecto)
- CTA principal: "Empieza gratis — 3 generaciones sin costo"
- Sección de credibilidad: "Construido por un autor cristiano con más de un año produciendo devocionales diarios" + logo La Gracia que Transforma
- Sección de cómo funciona (pasos visuales)
- Pricing dinámico, sincronizado con `PLANS` de `src/lib/constants.js` (no hardcodeado)
- Footer con link a Gracia Inmerecida en Amazon

### 2. Registro/Login
- Email + contraseña o Google OAuth (`src/lib/AuthContext.jsx`, vía `supabase.auth.signInWithOAuth({ provider: 'google' })`)
- Onboarding post-registro: nombre, rol (pastor/líder/creador/otro), denominación, traducción bíblica preferida, país, nombre de iglesia (opcional)

### 3. Perfil / ADN Pastoral
Además de los datos básicos del onboarding, `Profile.jsx` permite configurar (bloqueado con overlay para plan Gratis, requiere `full_adn_pastoral`):
- **Identidad ministerial:** centro teológico, estilo de enseñanza
- **Forma de comunicar:** tono pastoral, nivel de confrontación, tipo de aplicación, forma de cierre
- **Personalización avanzada:** audiencia principal, frases a evitar, instrucciones permanentes

### 4. Dashboard
- Contador de generaciones restantes
- Botón principal: "Nueva generación"
- Historial de generaciones anteriores (completo solo con `full_history`)
- Banner de upgrade cuando quedan pocas generaciones

### 5. Flujo de Generación (PANTALLA PRINCIPAL — `Generate.jsx`)

**Paso 1 — Input**
El usuario elige UNO de cuatro modos (los dos últimos bloqueados en plan Gratis, requieren `mode_situacion` / `mode_youtube`):

a) **Desde un pasaje bíblico:** campo de texto para ingresar la referencia (ej: "Juan 3:16-21", "Salmo 23", "Romanos 8:28-39")

b) **Desde un tema:** campo de texto libre (ej: "La gracia de Dios", "El perdón", "Cómo enfrentar la ansiedad")

c) **Desde una situación cotidiana:** campo de texto libre (ej: "Un joven de la iglesia perdió a su madre", "La congregación está pasando por una crisis económica")

d) **Desde un video de YouTube:** se pega la URL, se transcribe vía `api/transcribe.js` (Supadata) y el texto resultante se usa como input

**Selectores adicionales:**
- Traducción bíblica: RVR1960 (default), NVI, DHH, LBLA, NTV, TLA
- Tipo de ocasión: Culto dominical, Estudio bíblico, Grupo de jóvenes, Célula/grupo pequeño, Devocional personal, Funeral, Boda, Retiro, Otro
- Duración estimada del sermón: Breve (5-10 min, 2 puntos), Regular (15-25 min, 3 puntos), Extenso (30-45 min, 4 puntos)
- Instrucciones adicionales (opcional, hasta 500 caracteres, requiere `custom_instructions`)

**Paso 2 — Preview de enfoque pastoral (NUEVO — Sesión 7)**
Al enviar el formulario, en vez de generar directamente, se llama a `api/preview.js` con un loading sutil ("Analizando tu mensaje..."). El preview:
- **NO cuenta como generación** y **no se guarda** en la tabla `generations`.
- Devuelve un enfoque propuesto: título, tesis, tensión humana, intención pastoral, pasaje central, pasajes de apoyo, puntos sugeridos y audiencia sugerida.
- Los campos título, tesis y puntos son **editables solo si el plan tiene `edit_preview`** (Mensajero/Proclamador); en plan Gratis se muestran de solo lectura con un `UpgradePrompt` inline.
- El usuario puede "Generar mi kerygma con este enfoque", "Proponer otro enfoque" (vuelve a llamar a `api/preview.js`) o "Volver al input".
- Si `api/preview.js` falla, se ofrece "Reintentar" o "Generar sin preview" (generación directa, como antes de la Sesión 7).

**Paso 3 — Generación con loading progresivo**
Al confirmar el enfoque (o generar directo), se llama a `api/generate.js`, incluyendo el enfoque confirmado como `preview_context` cuando aplica. Mensajes de fase (NO mensajes genéricos — mensajes con identidad espiritual):
1. "Buscando en la Palabra..."
2. "Estructurando el mensaje..."
3. "Preparando la aplicación práctica..."
4. "Creando contenido para redes..."
5. "Tu kerygma está casi listo..."

**Paso 4 — Output (`Result.jsx`, 4 tabs)**

La respuesta completa de `api/generate.js` tiene esta estructura JSON (ver también la sección "System Prompt" para el contrato exacto que se le pide a Claude):

```json
{
  "sermon": {
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
        "desarrollo": "string (1 párrafo, máximo 80 palabras)",
        "pasajes_apoyo": ["referencia1", "referencia2"],
        "ilustracion": "string (máximo 40 palabras)",
        "aplicacion": "string (máximo 50 palabras)"
      }
      // 2-4 puntos según la duración seleccionada
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
    "post_instagram": { "texto": "string (máximo 50 palabras)", "hashtags": ["#hash1", "#hash2"] },
    "post_stories": { "texto": "string (máximo 50 palabras)", "hashtags": ["#hash1", "#hash2"] },
    "post_twitter": { "texto": "string (máximo 50 palabras)", "hashtags": ["#hash1", "#hash2"] }
  },
  "oracion_cierre": "string (máximo 80 palabras)"
}
```

**Tab 1: Bosquejo del Sermón** — usa `sermon`, con botón "Copiar" del texto formateado.

**Tab 2: Devocional** — usa `devocional`, formato listo para copiar y enviar por WhatsApp.

**Tab 3: Contenido para Redes** — usa `redes`. Cada post (`post_instagram`, `post_stories`, `post_twitter`) se renderiza también como imagen descargable vía `SocialCard.jsx` + `html2canvas`:
  - Instagram: 1080×1080
  - Stories: 1080×1920
  - Twitter/X: 1200×675

**Tab 4: Oración de Cierre** — usa `oracion_cierre` (top-level), formato listo para leer en el culto.

**Cada tab tiene botón "Copiar" individual.** El plan Gratis agrega una marca de agua ("Generado con MiKerygma.com") al texto copiado (`watermark: true`).

---

## Serverless Functions (`api/`)

### `api/generate.js` — generación completa
- Recibe `input_type`, `input_text`, `occasion`, `translation`, `denomination`, `duration`, `user_id`, `custom_instructions` (opcional) y **`preview_context`** (opcional — enfoque confirmado desde el preview).
- Consulta el perfil con `service_role` y valida server-side: generaciones restantes (`generations_used` < `generations_limit`, o plan ilimitado), y que el modo/`custom_instructions`/ADN Pastoral completo estén permitidos por el plan (`canUseFeature`).
- Construye el system prompt (ver "System Prompt" abajo) y llama a Anthropic con `model: 'claude-haiku-4-5'`, `max_tokens: 3500`.
- Parsea el JSON de respuesta con `try/catch`; si falla, usa `repairTruncatedJson()` como fallback (recorta al último `}` válido y cierra llaves/corchetes abiertos) antes de rendirse.
- Guarda la generación en la tabla `generations` (incluyendo `custom_instructions`) e incrementa `generations_used` en `profiles`.
- Retorna `{ id, created_at, input_type, input_text, occasion, translation, sermon, devocional, redes, oracion_cierre }`.

### `api/preview.js` — preview de enfoque pastoral (NUEVO — Sesión 7)
- Recibe los mismos campos base que `api/generate.js` (sin `preview_context`, ya que es anterior a la generación).
- Consulta el perfil igual que `api/generate.js` y aplica el mismo `canUseFeature` para decidir si inyecta el ADN Pastoral completo y las instrucciones adicionales.
- Llama a Anthropic con `model: 'claude-haiku-4-5'`, `max_tokens: 800` y un prompt corto (sin ejemplos de referencia ni guías denominacionales completas).
- Reutiliza `cleanJsonResponse()` / `repairTruncatedJson()` para el parseo.
- **NO cuenta como generación** (no toca `generations_used`) y **no escribe** en la tabla `generations`.
- Retorna `{ titulo_propuesto, tesis, tension_humana, intencion_pastoral, pasaje_central, pasajes_apoyo, puntos_sugeridos, audiencia_sugerida }`.

### `api/transcribe.js` — transcripción de YouTube
- Recibe `{ url }`, llama a la API de Supadata (`SUPADATA_API_KEY`) pidiendo la transcripción en español.
- Si el video no tiene transcripción disponible, retorna 404 con mensaje claro.
- Trunca la transcripción a **5000 palabras** (`MAX_WORDS`) para no disparar el tamaño del prompt.
- Retorna `{ transcript, word_count }`.

---

## System Prompt (`api/generate.js` → `buildPrompt()`)

El prompt completo vive en el código de `api/generate.js`; esta sección documenta el **orden fijo** de sus secciones:

1. **Disclaimer ministerial** — encuadra todo el contenido como material educativo/pastoral de uso exclusivo para servicios religiosos (reduce falsos positivos de los filtros de contenido).
2. **Reglas fundamentales** — 5 reglas: traducción exacta y citada tal cual, nunca inventar citas bíblicas, respetar la denominación según las guías del punto 6, estructura predicable con mínima edición, aplicaciones concretas y no abstractas.
3. **ADN de voz y estilo (obligatorio)** — tono pastoral/cálido, estructura narrativa de 4 pasos (experiencia humana → mirar el corazón sin juicio → gracia de Dios como respuesta → esperanza práctica), patrones de lenguaje reutilizables ("La gracia nos recuerda que...", "Cuando permitimos que Dios...", etc.), lista de lenguaje prohibido (tono legalista, fórmulas vacías, clichés, ilustraciones norteamericanas), criterios de las ilustraciones (culturalmente hispanas, cotidianas, breves, que conecten antes de enseñar).
4. **Ejemplo de devocional de referencia** — few-shot real (Santiago 1:3) que ilustra el tono y la estructura esperados.
5. **Ejemplo de sermón de referencia** — estructura referencial de introducción (gancho/contexto/tesis), puntos (título/desarrollo/pasajes de apoyo/ilustración/aplicación) y conclusión.
6. **Guías de énfasis denominacional** — 10 denominaciones (Pentecostal/Carismática, Bautista, Presbiteriana/Reformada, Metodista, Adventista, Católica, Anglicana/Episcopal, Luterana, Interdenominacional/Otra), cada una con su énfasis teológico, pasajes frecuentes y tono, manteniendo siempre las doctrinas centrales del cristianismo histórico.
7. **Límites estrictos de extensión** (obligatorios):
   - Desarrollo de cada punto del sermón: máximo 80 palabras
   - Ilustraciones: máximo 40 palabras
   - Aplicación de cada punto: máximo 50 palabras
   - Reflexión del devocional: máximo 150 palabras
   - Cada post de redes: máximo 50 palabras
   - Oración de cierre: máximo 80 palabras
8. **ADN Pastoral del usuario** (condicional — solo si el plan tiene `full_adn_pastoral` y el usuario configuró campos en `Profile.jsx`): centro teológico, estilo de enseñanza, nivel de confrontación, tipo de aplicación, forma de cierre, tono, audiencia, frases a evitar, instrucciones permanentes.
9. **Énfasis adicional del usuario** (condicional — `custom_instructions`, solo si el plan lo permite): se trata como una guía de énfasis a integrar orgánicamente, no como una directiva literal — explícitamente se le pide a Claude no repetir las instrucciones textualmente como título.
10. **Enfoque pastoral confirmado** (condicional — `preview_context`, solo si el usuario pasó por el preview de la Sesión 7 y confirmó): título, tesis y puntos quedan fijos y no deben cambiarse; Claude debe desarrollar el contenido completo siguiendo esa estructura.
11. **Contexto del usuario** — rol, denominación, traducción preferida, tipo de input, ocasión, duración (con el número exacto de puntos a generar según la duración).
12. **Input del usuario** — el pasaje/tema/situación tal cual, o la transcripción de YouTube con un preámbulo especial cuando `input_type === 'youtube'`.
13. **Formato de respuesta** — exige JSON puro, sin backticks de markdown ni texto adicional antes o después, con la estructura exacta documentada en "Flujo de Usuario → Paso 4 — Output".

`api/preview.js` reutiliza el mismo ADN Pastoral (punto 8) y énfasis adicional (punto 9), pero con un prompt mucho más corto que omite los ejemplos de referencia (puntos 4-5) y las guías denominacionales completas (punto 6), ya que solo necesita proponer un enfoque, no el contenido final.

---

## Roadmap

### Fase 1 — MVP (Semanas 1-3)
- [x] Landing page con propuesta de valor clara
- [x] Registro/login con onboarding (denominación, traducción, rol)
- [x] Flujo de generación: 4 modos de input → preview de enfoque → 4 outputs
- [x] Dashboard con historial y contador de generaciones
- [ ] Deploy en Vercel con dominio mikerygma.com
- [ ] 10-15 beta testers (pastores reales)

### Fase 2 — Validación y Retención (Semanas 4-8)
- [ ] Feedback de beta testers incorporado
- [ ] Biblioteca de sermones guardados con búsqueda (`Library.jsx`, ver Estructura de Carpetas)
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
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx                  # Rutas
│   ├── index.css                # Tailwind + variables CSS de shadcn
│   ├── components/
│   │   ├── Layout.jsx           # Layout con navbar y footer
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── GenerationCounter.jsx
│   │   ├── CopyButton.jsx
│   │   ├── UpgradePrompt.jsx    # Feature teasing: inline / overlay / modal / banner
│   │   ├── SocialCard.jsx       # Tarjetas para redes (estilos inline para html2canvas)
│   │   ├── SocialCardPreview.jsx
│   │   └── ui/                  # Componentes shadcn (button, card, dialog, tabs, etc.)
│   ├── pages/
│   │   ├── Landing.jsx          # Landing page pública
│   │   ├── Login.jsx            # Login/registro (email + Google)
│   │   ├── Onboarding.jsx       # Configuración post-registro
│   │   ├── Dashboard.jsx        # Panel principal
│   │   ├── Generate.jsx         # Input + Preview de enfoque + Generación
│   │   ├── Result.jsx           # Visualización de resultado con 4 tabs
│   │   ├── Pricing.jsx          # Planes y precios
│   │   ├── Profile.jsx          # Perfil del usuario + ADN Pastoral
│   │   └── Library.jsx          # (pendiente — Fase 2) Biblioteca de sermones guardados
│   ├── lib/
│   │   ├── supabase.js          # Cliente Supabase
│   │   ├── AuthContext.jsx      # Contexto de autenticación (useAuth)
│   │   ├── ProfileContext.jsx   # Contexto del perfil (useProfile, refreshProfile)
│   │   ├── constants.js         # Traducciones, ocasiones, denominaciones, ADN Pastoral, PLANS
│   │   ├── planHelpers.js       # canUseFeature(), getUpgradePlan()
│   │   ├── socialCardText.js    # Extracción de texto para las tarjetas de redes
│   │   ├── utils.js             # cn() y utilidades de shadcn
│   │   └── scriptureParser.js   # (pendiente) Parseo/validación de referencias bíblicas
│   └── hooks/
│       ├── useAuth.js
│       └── useProfile.js
├── api/                          # Vercel serverless functions
│   ├── generate.js              # POST — genera sermón/devocional/redes/oración
│   ├── preview.js                # POST — preview de enfoque pastoral (no cuenta como generación)
│   └── transcribe.js            # POST — transcripción de YouTube vía Supadata
├── supabase/
│   ├── schema.sql                # Esquema consolidado vigente
│   └── migrations/
│       ├── 002_session3_features.sql
│       ├── 003_perfil_ministerial_adn_pastoral.sql
│       └── 004_planes_y_feature_teasing.sql
├── vercel.json                  # maxDuration por función (generate.js=60s, preview.js=30s)
├── tailwind.config.js
├── vite.config.js
├── package.json
└── .env.local                   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPADATA_API_KEY
```

**Nota:** `AuthContext.jsx` y `ProfileContext.jsx` viven en `src/lib/`, no en un `src/contexts/` separado.

---

## Constantes del Producto

```javascript
// src/lib/constants.js

export const ROLES = [
  { value: 'pastor', label: 'Pastor' },
  { value: 'lider', label: 'Líder' },
  { value: 'creador', label: 'Creador de contenido' },
  { value: 'otro', label: 'Otro' },
];

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
  { value: 'youtube', label: 'Desde un video de YouTube', icon: '🎬', placeholder: 'Pega la URL de cualquier video de YouTube (prédicas, enseñanzas, conferencias, podcasts...)' },
];

// ADN Pastoral — perfil ministerial (Sesión 4)

export const PASTORAL_TONES = [
  { value: 'pastoral_calido', label: 'Pastoral cálido — cercano, empático, como un amigo que camina contigo' },
  { value: 'profetico_desafiante', label: 'Profético desafiante — directo, confrontador con amor, urgente' },
  { value: 'academico_reflexivo', label: 'Académico reflexivo — analítico, profundo, con énfasis en el estudio' },
  { value: 'evangelistico', label: 'Evangelístico — orientado a la decisión, apasionado, invitacional' },
  { value: 'conversacional', label: 'Conversacional — informal, con preguntas retóricas, como una charla' },
];

export const TARGET_AUDIENCES = [
  { value: 'general', label: 'Congregación general' },
  { value: 'jovenes', label: 'Jóvenes y adolescentes' },
  { value: 'mujeres', label: 'Mujeres' },
  { value: 'familias', label: 'Familias y matrimonios' },
  { value: 'adultos_mayores', label: 'Adultos mayores' },
  { value: 'profesionales', label: 'Profesionales y emprendedores' },
  { value: 'rural', label: 'Comunidad rural' },
];

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
];

export const TEACHING_STYLES = [
  { value: 'expositivo', label: 'Expositivo — análisis detallado del texto bíblico' },
  { value: 'tematico', label: 'Temático — desarrollo de un tema con varios pasajes' },
  { value: 'narrativo', label: 'Narrativo — cuenta la historia bíblica y la conecta con la vida' },
  { value: 'pastoral', label: 'Pastoral — centrado en el cuidado y las necesidades de la congregación' },
  { value: 'apologetico', label: 'Apologético — defiende la fe con argumentos y evidencias' },
  { value: 'devocional', label: 'Devocional — reflexión íntima y personal' },
];

export const CONFRONTATION_LEVELS = [
  { value: 'suave', label: 'Suave — invita a reflexionar sin presionar' },
  { value: 'moderado', label: 'Moderado — señala con amor y claridad' },
  { value: 'directo', label: 'Directo — confronta con firmeza y respeto' },
  { value: 'profetico', label: 'Profético — desafía con urgencia y autoridad espiritual' },
];

export const APPLICATION_TYPES = [
  { value: 'practica_diaria', label: 'Práctica diaria — acciones concretas para la semana' },
  { value: 'introspectiva', label: 'Introspectiva — invita a la reflexión interior' },
  { value: 'comunitaria', label: 'Comunitaria — fortalece la vida en comunidad' },
  { value: 'evangelistica', label: 'Evangelística — motiva a compartir la fe' },
  { value: 'familiar', label: 'Familiar — aplicable en el hogar y las relaciones' },
];

export const PASTORAL_CLOSINGS = [
  { value: 'llamado', label: 'Llamado a decisión — invita a responder públicamente' },
  { value: 'oracion_guiada', label: 'Oración guiada — cierra con una oración que el oyente repite' },
  { value: 'reflexion', label: 'Reflexión silenciosa — deja un espacio para meditar' },
  { value: 'desafio', label: 'Desafío práctico — propone una acción concreta' },
  { value: 'consuelo', label: 'Consuelo y esperanza — cierra con una promesa de Dios' },
];

// Planes — precio, límite de generaciones y feature gating (ver también "Modelo de Planes y Feature Gating")

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
    },
    display_features: [
      '40 generaciones al mes',
      'Todas las funciones',
      'Exportación a PDF',
      'Acceso anticipado a nuevas funciones',
    ],
  },
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
# .env.local (NUNCA en git) — replicar TODAS en Vercel: Development + Preview + Production
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
ANTHROPIC_API_KEY=[API_KEY]              # Solo en serverless, nunca en el cliente
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_KEY]  # Solo en serverless — usado para validar plan/generaciones server-side
SUPADATA_API_KEY=[SUPADATA_KEY]          # Solo en serverless — usado por api/transcribe.js
```

---

## Notas Técnicas Importantes

1. **API Key de Anthropic NUNCA en el cliente.** Siempre a través de Vercel serverless functions (`/api/generate.js`, `/api/preview.js`).
2. **RLS + GRANT desde el día 1.** Patrón recurrente: sin GRANT explícito, service_role no puede operar aunque tenga BYPASSRLS.
3. **Validar generaciones restantes y features del plan server-side**, no solo en el frontend. El usuario no debe poder generar más de lo permitido, ni usar modos/ADN Pastoral/instrucciones bloqueadas manipulando el cliente — `api/generate.js` y `api/preview.js` vuelven a consultar el perfil con `service_role` y a correr `canUseFeature()` antes de construir el prompt.
4. **El JSON de output debe parsearse con try/catch.** Claude a veces agrega texto antes/después del JSON. Limpiar backticks y texto extra (`cleanJsonResponse()`) y, si el parseo falla, intentar `repairTruncatedJson()` (recorta hasta el último `}` y cierra llaves/corchetes abiertos) antes de rendirse.
5. **No depender de que Claude cite versículos perfectamente.** El prompt pide la traducción específica, pero verificar que las citas sean razonables. En Fase 2, integrar una API de Biblia para verificación (ej: api.biblia.com o bible-api.com) o el `scriptureParser.js` planeado.
6. **`html2canvas` requiere estilos inline.** Las clases de Tailwind no se capturan al generar las imágenes de `SocialCard.jsx` — todo el estilo relevante para la captura debe ir como `style={{ ... }}`.
7. **Llamar `ProfileContext.refreshProfile()` después de cualquier cambio al perfil** (onboarding, edición en `Profile.jsx`), para evitar que `ProtectedRoute` lea un estado de perfil obsoleto y rebote al usuario al onboarding después de haberlo completado.
8. **Variables de entorno en los 3 ambientes de Vercel.** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPADATA_API_KEY` deben estar configuradas en Development, Preview **y** Production — un valor faltante en un solo ambiente es una causa recurrente de bugs que solo aparecen en preview deployments o en producción.

---

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build para producción
npm run build

# Lint
npm run lint

# Deploy (automático vía GitHub → Vercel)
git push origin main
```

---

## Historial de Sesiones

| Sesión | Contenido |
|---|---|
| 1 | Setup inicial: landing, auth (email + Google OAuth), onboarding, dashboard y flujo de generación completo |
| 2 | Optimización de `api/generate.js` (reducción de latencia para evitar timeout de Vercel Hobby, `repairTruncatedJson()` como fallback de parseo, system prompt v2 con ADN de voz y guías denominacionales), edición de perfil en `Profile.jsx` |
| 3 | Instrucciones adicionales por generación (`custom_instructions`), estilo pastoral en el perfil, cuarto modo de input (YouTube) |
| 4 | Reposicionamiento como copiloto ministerial (landing reescrita), ADN Pastoral 2.0 en el perfil (centro teológico, estilo de enseñanza, confrontación, aplicación, cierre) |
| 5 | Sistema de planes con feature teasing (`PLANS.features`, `UpgradePrompt.jsx`), validación server-side de features |
| 6 | Imágenes descargables para redes (`SocialCard.jsx` + html2canvas), ajustes de copy de YouTube y de extracción de texto de las tarjetas |
| 7 | Preview de enfoque pastoral antes de generar (`api/preview.js`), flujo Input → Preview → Confirmar/Editar → Generación |
| Fixes intermedios | Scroll horizontal y responsive en móvil, sincronización de precios del Landing con `PLANS`, redirect a onboarding cuando el perfil está incompleto (+ bug de timing), desborde del badge de intención pastoral en el preview |

---

## Contexto del Desarrollador

Este proyecto es construido por Doiler Alfonso Sanjuán Sánchez usando Claude Code CLI. El workflow es:
1. Diagnóstico y estrategia en Claude.ai (chat)
2. Prompts precisos generados para Claude Code
3. Ejecución en Claude Code (una tarea/sesión a la vez)
4. Push a GitHub → deploy automático en Vercel

Doiler prefiere:
- Prompts completos y copiables, no guías parciales
- Diagnóstico antes de cambios de código
- UX pensada desde la perspectiva del usuario casual que desinstala antes de investigar
- Commits descriptivos en español
- Responsive verificado en 375px
- shadcn/ui para todos los componentes de UI nuevos
