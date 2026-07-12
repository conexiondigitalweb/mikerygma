# CLAUDE.md — MiKerygma

Copiloto ministerial con IA para pastores y líderes cristianos hispanohablantes. Genera sermones, devocionales, contenido para redes y oraciones personalizados según el ADN Pastoral del usuario.

**Repo:** github.com/conexiondigitalweb/mikerygma | **Deploy:** mikerygma.com (Vercel auto-deploy desde `main`)

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 + shadcn/ui (New York, Radix + CVA) |
| Backend/Auth/DB | Supabase (proyecto `wknsgaavpjudtiljntwb`) |
| IA | Anthropic API — `claude-sonnet-4-6` primario, con dos capas de fallback automático a `claude-haiku-4-5` si hay bloqueo por content filtering (ver Pipeline de Generación). `maxDuration: 300s` en `api/generate.js` (ver `vercel.json`) |
| Transcripción | Supadata API (YouTube) |
| Léxico original | Bolls Bible API (bolls.life, sin autenticación) — griego/hebreo con números Strong |
| Email | Resend (dominio mikerygma.com, pendiente depuración SMTP) |
| Auth social | Google OAuth (vía Supabase Auth) |
| PWA | vite-plugin-pwa — manifest + Service Worker con auto-actualización forzada |
| Contacto/Pagos | WhatsApp (wa.me) — sin pasarela de pago automática todavía |

### Paleta de colores
- Primario/CTAs: `#B8860B` (dorado/ámbar)
- Fondo: `#FFF8F0` (crema)
- Texto secundario: `#8B7355` (marrón)
- Acentos: `#C1694F` (terracota)
- Texto principal: `#4A3728`

## Estructura de Carpetas

```
mikerygma/
├── CLAUDE.md
├── vite.config.js               # Plugin PWA (VitePWA) + inyección de %VITE_BUILD_TIME%
├── vercel.json                  # maxDuration por función (generate.js=300s, preview.js/save-generation.js=30s)
├── src/
│   ├── App.jsx                  # Rutas
│   ├── index.css                # Tailwind + variables CSS shadcn
│   ├── components/
│   │   ├── Layout.jsx, Navbar.jsx, Footer.jsx, ProtectedRoute.jsx, HomeRoute.jsx
│   │   ├── GenerationCounter.jsx, CopyButton.jsx
│   │   ├── UpgradePrompt.jsx    # Feature teasing: inline/overlay/modal/banner
│   │   ├── DowngradeNotice.jsx  # Banner de downgrade automático; "Renovar plan" abre WhatsApp
│   │   ├── UpdatePrompt.jsx     # Auto-actualización PWA (ver sección dedicada)
│   │   ├── SocialCard.jsx, SocialCardPreview.jsx  # Estilos INLINE obligatorios (html2canvas no captura Tailwind)
│   │   └── ui/                  # shadcn components
│   ├── pages/
│   │   ├── Landing.jsx, Login.jsx, Onboarding.jsx
│   │   ├── Dashboard.jsx, Generate.jsx, Result.jsx
│   │   ├── Pricing.jsx, Profile.jsx, Library.jsx
│   ├── lib/
│   │   ├── supabase.js, AuthContext.jsx, ProfileContext.jsx
│   │   ├── constants.js         # PLANS, DENOMINATIONS, INPUT_TYPES, ADN Pastoral options
│   │   ├── planHelpers.js       # canUseFeature(), getUpgradePlan()
│   │   ├── billingCycle.js      # resolveGenerationsCycle() — ver Ciclos de Facturación
│   │   ├── streamMarkers.js     # STAGE_MARKER/META_MARKER/STREAM_ERROR_MARKER (ver Pipeline de Generación)
│   │   ├── jsonRepair.js        # cleanJsonResponse(), repairTruncatedJson() — compartido cliente/servidor
│   │   ├── scriptureParser.js, bollsBooks.js  # parseo de referencias + mapeo a libros de Bolls Bible API
│   │   ├── whatsapp.js          # buildWhatsAppLink(), identityLine()
│   │   ├── socialCardText.js, utils.js
├── api/                          # Vercel serverless functions
│   ├── generate.js              # POST — generación completa + revisión teológica + notas léxicas (ver Pipeline de Generación)
│   ├── preview.js                # POST — preview de enfoque (max_tokens 800, NO cuenta como generación)
│   ├── save-generation.js       # POST — persiste la generación ya completa en `generations` (llamado por el cliente después de recibir el stream)
│   └── transcribe.js            # POST — transcripción YouTube vía Supadata (max 5000 palabras)
├── supabase/
│   ├── schema.sql               # Esquema consolidado
│   └── migrations/              # 002-009, se corren a mano en el SQL Editor de Supabase
```

**Nota:** `AuthContext.jsx` y `ProfileContext.jsx` viven en `src/lib/`, no en `src/contexts/`.

## Base de Datos

### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, email TEXT,
  role TEXT DEFAULT 'pastor',        -- pastor, lider, creador, otro
  denomination TEXT,                  -- pentecostal, bautista, presbiteriano, metodista, adventista, catolica, anglicana, luterana, interdenominacional, otro
  denomination_other TEXT,            -- solo si denomination='otro'; texto libre del usuario (ver Denominaciones)
  preferred_translation TEXT DEFAULT 'RVR1960',
  country TEXT, church_name TEXT,
  plan TEXT DEFAULT 'free',           -- free, mensajero ($9), proclamador ($19)
  generations_used INTEGER DEFAULT 0,
  generations_limit INTEGER DEFAULT 3, -- free=3, mensajero=15, proclamador=40
  plan_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),      -- activación del plan ACTUAL; ancla de ciclo para planes pagos (ver Ciclos de Facturación)
  generations_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- inicio del ciclo de generaciones vigente
  downgraded_at TIMESTAMPTZ,          -- se llena en un downgrade automático a free; el frontend avisa mientras no sea NULL
  -- ADN Pastoral
  pastoral_tone TEXT, target_audience TEXT, pastoral_instructions TEXT,
  theological_center TEXT, teaching_style TEXT, confrontation_level TEXT,
  application_type TEXT, pastoral_closing TEXT, phrases_to_avoid TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### generations
```sql
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL, input_text TEXT NOT NULL,
  occasion TEXT NOT NULL, translation TEXT NOT NULL,
  custom_instructions TEXT,
  output_sermon JSONB, output_devotional JSONB, output_social JSONB, output_prayer TEXT,
  model_used TEXT DEFAULT 'claude-sonnet-4-6', -- modelo REAL que ganó (Sonnet o Haiku si hubo fallback) — api/generate.js lo informa vía header X-Model-Used, el cliente lo reenvía a save-generation.js
  tokens_used INTEGER,
  title TEXT,                         -- extraído del output, para Biblioteca Ministerial
  status TEXT DEFAULT 'borrador',     -- borrador, revisado, predicado, publicado, archivado
  tags TEXT[], is_favorite BOOLEAN DEFAULT false,
  preached_date DATE, notes TEXT,
  pasaje_central TEXT,                -- extraído del sermón, para indexar reutilización de pasajes
  output_lexicon_notes JSONB,         -- array de { strong, lexema, transliteracion, significado_original, aplicacion_pastoral } o null (ver Pipeline de Generación)
  lexicon_notes_status TEXT DEFAULT 'not_attempted', -- included, not_applicable, no_data, timeout, error, not_attempted
  passage_paraphrased BOOLEAN NOT NULL DEFAULT false, -- true si texto_completo_pasaje es una paráfrasis (tercera capa de degradación, ver Pipeline de Generación) en vez de cita textual — dispara aviso en la UI (migración 010)
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### scripture_usage
Control de qué pasajes ya usó cada usuario (central o de apoyo), para advertir reutilización reciente en el flujo de generación. `user_id`, `generation_id`, `reference`, `book`, `chapter`, `verse_start`, `verse_end`, `usage_type` ('central'/'apoyo').

### theological_review_log
Log de monitoreo en agregado de la auto-revisión teológica (ver Pipeline de Generación) — **sin FK a `generations`**, porque la revisión corre antes de que exista esa fila. `user_id`, `model_used`, `review_model`, `was_corrected`, `issues_found`, `created_at`.

### RLS — PATRÓN CRÍTICO
**RLS + GRANT son capas independientes. Siempre hacer ambas.**
```sql
ALTER TABLE [tabla] ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON [tabla] FOR [op] USING (auth.uid() = id/user_id);
GRANT ALL ON [tabla] TO authenticated;
GRANT ALL ON [tabla] TO service_role;
```

## Planes y Feature Gating

| Feature | Gratis | Mensajero | Proclamador |
|---|---|---|---|
| `basic_profile` | ✓ | ✓ | ✓ |
| `full_adn_pastoral` | ✗ | ✓ | ✓ |
| `mode_pasaje`, `mode_tema` | ✓ | ✓ | ✓ |
| `mode_situacion`, `mode_youtube` | ✗ | ✓ | ✓ |
| `custom_instructions`, `edit_preview` | ✗ | ✓ | ✓ |
| `full_history` | ✗ | ✓ | ✓ |
| `watermark` | ✓ | ✗ | ✗ |
| `pdf_export` | ✗ | ✗ | ✓ |

Validación server-side en `api/generate.js` y `api/preview.js`: consultan perfil con `service_role` y corren `canUseFeature()` antes de construir el prompt.

## Ciclos de Facturación y Reseteo (`src/lib/billingCycle.js`)

Sin cron jobs (Vercel Hobby): el reseteo se resuelve de forma perezosa en cada request a `api/generate.js` y `api/preview.js`, justo después de leer el perfil y ANTES de validar el límite — `resolveGenerationsCycle(profile)` decide si el ciclo mensual ya venció y qué hacer.

**Ancla del ciclo:**
- Plan `free`: aniversario mensual de `created_at` (fecha de registro).
- Planes pagos (`mensajero`/`proclamador`): aniversario mensual de `plan_started_at` (fecha de activación de ESE plan, no del registro).

**Sin acumulación:** cada ciclo nuevo arranca `generations_used` en 0, sin arrastrar lo no usado del ciclo anterior.

**"Renovación" hoy (sin pasarela de pago automática):** actualizar `plan_started_at` a mano en Supabase. Si el ciclo de un plan pago vence y `plan_started_at` no cambió desde que empezó ese ciclo, se asume no-renovación → downgrade automático a `plan='free'`, `generations_limit=3`, `generations_used=0`, y se llena `downgraded_at` (dispara el banner `DowngradeNotice` en el Dashboard — no hay email automático todavía, Resend sigue pendiente de depuración SMTP; "Renovar plan" en ese banner abre WhatsApp).

**Prorrateo de upgrades (mensajero → proclamador a mitad de ciclo):** no hay checkout automático, se cobra a mano, pero los datos ya están listos para ese cálculo (ver comentario completo en `src/lib/billingCycle.js`):
```
diasRestantes   = días entre ahora y (currentCycleStart(plan_started_at, ahora) + 1 mes)
creditoViejo    = (PLANS[planViejo].price / 30) * diasRestantes
cargoNuevo      = (PLANS[planNuevo].price / 30) * diasRestantes
cobroProrrateo  = cargoNuevo - creditoViejo
```
Al aplicar el upgrade, `plan_started_at` se actualiza a la fecha del cambio (igual que una renovación), reiniciando el ciclo con el plan nuevo.

## Pipeline de Generación (`api/generate.js`)

Los primeros cuatro son pasos secuenciales del request, cada uno con degradación silenciosa (si un paso posterior a la generación principal falla, el usuario igual recibe el sermón completo sin ese extra — nunca se rompe la respuesta por un paso opcional); los puntos 5 y 6 son reglas de contenido/formato del prompt que afectan a varios de esos pasos.

**1. Generación principal con TRES capas de degradación por content filtering.** `MAX_TOKENS=5000` (subido de 3500: los campos extendidos de oración/reflexión, ver punto 5 más abajo, truncaban el JSON con el límite viejo — confirmado con truncamiento real en pruebas). Tres intentos posibles, en orden, solo avanzando al siguiente cuando el anterior fue bloqueado específicamente por content filtering (cualquier otro error — HTTP, red — no reintenta):
  - **Intento 1 — `claude-sonnet-4-6`** (modelo primario, cita el pasaje textualmente).
  - **Intento 2 — `claude-haiku-4-5` textual** (`FALLBACK_MAX_TOKENS=8000`), si Sonnet fue bloqueado. Diagnosticado: Sonnet bloqueó Lucas 15:11-32 en 4/4 pruebas con el mismo prompt; Haiku nunca lo bloqueó en 3/3.
  - **Intento 3 — `claude-haiku-4-5` en modo parafraseado** (`PARAPHRASE_MAX_TOKENS=8000`), si el intento 2 TAMBIÉN fue bloqueado por content filtering — es decir, ambos modelos bloquearon el mismo pasaje citado textualmente. `buildPrompt({ ..., paraphrasePassage: true })` cambia ÚNICAMENTE la instrucción del campo `texto_completo_pasaje`: en vez de citar el pasaje palabra por palabra, se le pide al modelo parafrasearlo fielmente en español natural (mismo sentido teológico, mismo orden de eventos, sin inventar nada) — el resto del sermón (`pasajes_apoyo`, `pasaje_cierre`, `versiculo_clave`) sigue citando con la traducción normal. Diagnóstico previo confirmó que el bloqueo ocurría específicamente al citar el texto bíblico textual, nunca en el resto del contenido. Verificado 3/3 contra el caso real (Lucas 15:11-32). Si este tercer intento también falla, no hay un cuarto — se propaga como error al cliente (`friendlyStreamError()`).

  Si el intento ganador fue el 3, `generations.passage_paraphrased = true` y el header `X-Passage-Paraphrased: 'true'` viaja al cliente — dispara un aviso visible en `Result.jsx` ("Este texto es una paráfrasis generada por la IA, no una cita textual de la Escritura — verifícalo en tu Biblia..."), que también persiste en Dashboard/Library y en "Copiar sermón completo". El modelo que ganó (cualquiera de los tres intentos) viaja en `X-Model-Used` y se guarda en `generations.model_used`.

**2. Streaming con marcadores de progreso real.** `res.writeHead(200)` se dispara apenas se sabe qué modelo ganó (antes de correr revisión teológica/notas léxicas), para que el cliente tenga la conexión abierta de inmediato. Mientras corren los pasos 3 y 4, el servidor escribe marcadores en banda (`STAGE_MARKER`, `src/lib/streamMarkers.js`) — tokens improbables de aparecer en contenido real (`\n<<MIKERYGMA_STAGE:reviewing>>\n`, `\n<<MIKERYGMA_STAGE:lexicon>>\n`) — que el cliente (`Generate.jsx`) detecta para mostrar en qué etapa real está el servidor, no una simulación por timers. El contenido final (el JSON completo del sermón) se manda con `writeSimulatedStream()`, que lo reparte en chunks de 80 caracteres cada 20ms para que la barra de progreso avance de forma gradual — esto es simulado (el texto ya está completo en memoria) porque Anthropic ya devolvió todo antes de este punto; lo que SÍ es en tiempo real son los `STAGE_MARKER` de los pasos 3 y 4, que sí reflejan trabajo en curso.

**3. Auto-revisión teológica.** Corre con `claude-haiku-4-5` sobre un resumen de los puntos del sermón (no el sermón completo). Audita únicamente si cada `pasajes_apoyo` y cada `aplicacion` están genuinamente conectados con su punto, o si la conexión es forzada/superficial — caso real que motivó esto: en un sermón sobre las bodas de Caná (Juan 2:1-11), se usó Lucas 15:8-9 (la moneda perdida) como apoyo a un punto sobre "lo ordinario", una conexión forzada porque Lucas 15:8-9 trata sobre búsqueda diligente, no cotidianidad. Si encuentra problemas, corrige **solo el campo específico señalado** (`pasajes_apoyo` o `aplicacion` de ese punto) — nunca regenera el sermón completo. Se registra en `theological_review_log` para monitoreo agregado. Timeout propio de 8s (`REVIEW_FETCH_TIMEOUT_MS`) — antes no tenía ninguno, a diferencia de notas léxicas, lo que podía dejar al cliente esperando sin techo predecible.

**4. Notas léxicas (griego/hebreo original).** Ancla 2-4 palabras del pasaje central a datos léxicos REALES de Bolls Bible API (`bolls.life`, sin autenticación) en vez de dejar que el modelo invente definiciones. Flujo: resuelve el libro bíblico → pide el capítulo Strong-tagged (TISCH para griego NT, WLCa para hebreo AT) → extrae palabras con su código Strong → filtra palabras puramente gramaticales (artículos, conjunciones — `LEXICON_STOPWORD_STRONGS`) → pide la definición real de cada candidata al diccionario BDBT (Thayer's griego + BDB hebreo) → Haiku compone 2-4 notas en español separando claramente "qué dice el dato léxico" de "cómo se aplica pastoralmente", basándose ÚNICAMENTE en las definiciones reales recibidas. El paso de composición ahora también recibe `texto_completo_pasaje` (la traducción exacta ya generada, no una traducción genérica de memoria) como contexto, para que cada nota indique explícitamente a qué palabra/frase del texto en español corresponde el término original — patrón obligatorio: `"[lexema] se transcribe como [transliteración] y se traduce en el pasaje como '[palabra en español]'."`. Si la correspondencia no es clara (traducción muy libre, perífrasis), la candidata se omite en vez de forzarla.

  Estrictamente opcional y con presupuesto de tiempo total de **12s** (`LEXICON_STEP_TIMEOUT_MS`, subido de 9000ms, vía `Promise.race`) — si Bolls está lento, no hay suficientes palabras candidatas, o se acaba el tiempo, se omite sin bloquear ni degradar el resto de la respuesta. El cuello de botella real, medido con timing instrumentado por fase (logs `[lexicon] ...` permanentes en el código), es la composición de Haiku, no Bolls (los fetches a Bolls son constantes, ~600ms cada uno) — y esa composición ahora tarda más porque debe calcular la correspondencia palabra-a-palabra del párrafo anterior (medido con Salmo 103, 22 versículos: 8555ms total, peligrosamente cerca del techo viejo de 9000ms). También se agregó un tope defensivo de 3000 caracteres (`LEXICON_PASSAGE_TEXT_MAX_CHARS`) sobre el texto en español que se pasa a ese prompt, para el caso patológico de capítulos muy largos. Resultado en `generations.output_lexicon_notes` / `lexicon_notes_status`.

**Reglas hermenéuticas explícitas en el prompt** (`buildPrompt()`): (a) cada pasaje de apoyo debe compartir género literario, contexto histórico-cultural o tema teológico genuino con el punto que sostiene — no basta compartir una palabra o concepto superficial (mismo ejemplo Caná/Lucas 15:8-9 de arriba, incluido literalmente en el prompt como caso a evitar); (b) separación obligatoria entre exégesis y aplicación en el desarrollo de cada punto — primero qué dice el texto en su contexto original, después qué significa para el oyente hoy, nunca mezclado.

**5. Extensión de oración y reflexión.** Tres campos tienen un rango de palabras obligatorio (ni cortos ni desbordados), en vez de solo un máximo como el resto del contenido: `sermon.oracion_cierre` (120-180 palabras, misma oración repetida en la raíz del JSON), `devocional.reflexion` (200-280 palabras, tono **autorreflexivo no confrontativo** — primera/segunda persona cercana, nunca "debes"/"tienes que"), `devocional.oracion` (80-130 palabras, antes sin guía de extensión). Guía de profundidad en el prompt: deben sentirse como algo que un pastor real escribiría para acompañar a alguien, no un cierre formal de una frase — nombrar la condición humana de la que parte el mensaje, pedir algo concreto, cerrar con esperanza genuina. Este cambio es lo que forzó a subir `MAX_TOKENS` (punto 1) y `LEXICON_STEP_TIMEOUT_MS` (punto 4).

**6. Regla general de escape de comillas en JSON.** El prompt enseña la regla real de JSON en vez de listar caracteres específicos: el ÚNICO carácter de comillas que se escapa con backslash es la comilla recta doble (`"` → `\"`); cualquier otro estilo (angulares `« »` — comunes en TLA/NVI —, tipográficas `" "` / `' '`) se escribe tal cual, SIN backslash. Motivado por dos bugs reales del mismo patrón (Claude sobregeneralizando "escapa las comillas" a caracteres que nunca debieron escaparse): primero con comillas rectas anidadas dentro de `texto_completo_pasaje`, después con comillas angulares en TLA/NVI. La regla generalizada se verificó contra las 6 traducciones disponibles (incluyendo NTV, no probada explícitamente durante el diagnóstico) y contra el modo parafraseado del punto 1, sin romperse — el objetivo explícito de esta reescritura fue no repetir el ciclo con un cuarto carácter nuevo en el futuro.

## Denominaciones (`src/lib/constants.js`)

10 opciones en `DENOMINATIONS`. Los labels de **Pentecostal / Carismática** y **Adventista** incluyen ejemplos reconocibles entre paréntesis ("Asambleas de Dios, Cuadrangular, Iglesia de Dios, etc." / "Adventista del Séptimo Día") — un pastor de una de estas iglesias no siempre se reconoce en la categoría académica sola y dejaba el campo vacío, perdiendo el énfasis denominacional que sí le correspondía. El resto de las categorías (Bautista, Presbiteriana/Reformada, Metodista, Luterana, Anglicana/Episcopal) ya son términos con los que la gente se autoidentifica directamente, así que no llevan ejemplos adicionales — evitar nombrar congregaciones específicas ahí evita favorecer unas sobre otras sin necesidad real.

**"Otra"** ahora tiene un campo de texto libre opcional (`denomination_other`, mostrado en `Onboarding.jsx` y `Profile.jsx` solo cuando `denomination === 'otro'`). En `buildPrompt()`, si el usuario lo llenó, se inyecta como pista adicional dentro del bloque de guía "INTERDENOMINACIONAL / OTRA" (`El usuario se identifica específicamente como: [texto]`) — no hay una guía de énfasis escrita a mano por denominación posible, así que esto le da al modelo contexto sin necesitar una.

**Fuente de verdad:** `api/generate.js` lee `profile.denomination` y `profile.denomination_other` directamente de la fila de Supabase ya consultada — no de `req.body` (antes había una asimetría: `generate.js` confiaba en lo que mandaba el cliente, mientras `preview.js` ya leía del perfil; ahora ambos son consistentes).

## WhatsApp (`src/lib/whatsapp.js`)

Sin pasarela de pago automática todavía: los puntos de contacto relacionados con planes abren WhatsApp (**+57 318 435 1614**, formato `wa.me`) con un mensaje pre-llenado en vez de un checkout. `buildWhatsAppLink(mensaje)` arma la URL con `encodeURIComponent`; `identityLine({ fullName, email })` arma la frase de identificación ("soy Ana Pérez (ana@correo.com)") cuando hay sesión activa, o `null` si no la hay (mensaje genérico, sin datos personales).

Tres puntos de integración, cada uno con su propio mensaje:
- **`Pricing.jsx`** — "Elegir Mensajero/Proclamador" → activación nueva. Pricing es pública (no requiere sesión), así que consulta `full_name` solo si hay usuario logueado.
- **`DowngradeNotice.jsx`** — "Renovar plan" → reactivación (mensaje distinto: "Mi plan venció y quiero renovarlo"). El plan anterior específico NO es recuperable (`resolveGenerationsCycle()` sobreescribe `profiles.plan` sin guardar el valor previo en ningún lado), así que el mensaje no lo nombra.
- **`Footer.jsx`** — enlace general "¿Tienes dudas? Escríbenos por WhatsApp", visible en todas las páginas, mensaje neutral no relacionado a pagos.

## PWA y Auto-actualización

`vite-plugin-pwa` genera el manifest (nombre "MiKerygma", `theme_color` `#B8860B`, `background_color` `#FFF8F0`, `display: standalone`, íconos 192/512 con variante `maskable`) y el Service Worker (`workbox: { skipWaiting: true, clientsClaim: true }`). `registerType: 'prompt'` — el registro automático del plugin NO debe recargar por su cuenta; todo el flujo de detección/aviso/recarga lo controla `UpdatePrompt.jsx`.

**Lección aplicada de un proyecto anterior (marcagol.live):** `skipWaiting` + `clientsClaim` por sí solos NO bastan — activan el Service Worker nuevo y le dan control de las pestañas abiertas, pero el HTML/JS ya cargado en memoria del navegador sigue siendo el viejo hasta que la página se recarga de verdad. Además, el flujo de "prompt" nativo de `vite-plugin-pwa` (`onNeedRefresh`/`updateSW()`) depende de que el Service Worker se quede en estado "esperando" — pero con `skipWaiting: true` el SW se auto-activa de inmediato, sin pasar por ese estado, así que ese flujo no es confiable aquí. La señal que sí es confiable: el evento `controllerchange` en `navigator.serviceWorker`, que dispara exactamente cuando `clientsClaim` toma control de una pestaña ya abierta (se filtra la primera instalación, que no cuenta como actualización real).

`UpdatePrompt.jsx`: cada 30s fuerza `registration.update()` (el navegador no chequea el servidor solo con esa frecuencia). Al detectar una actualización real vía `controllerchange`: banner con cuenta regresiva de 3s, clic para recargar de inmediato, o recarga sola al llegar a 0 — sin depender de que el usuario haga nada. **Excepción única:** si hay una generación de sermón en curso (`sessionStorage.mikerygma_generating`, la misma bandera que ya usa `Generate.jsx`), la recarga se pospone hasta que termine — se revisa de nuevo con el mismo intervalo de 30s, y también justo antes de recargar por si una generación arrancó durante los 3s de cuenta regresiva.

Meta `app-version` (`<meta name="app-version" content="%VITE_BUILD_TIME%">`) con el timestamp real del build, inyectado vía `transformIndexHtml` en `vite.config.js` (el reemplazo `%VAR%` nativo de Vite solo funciona con variables de `.env`, no valores calculados en build-time) — sirve para diagnosticar en consola qué versión corre un dispositivo.

## Variables de Entorno

```env
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
ANTHROPIC_API_KEY=[API_KEY]              # Solo serverless
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_KEY]  # Solo serverless
SUPADATA_API_KEY=[SUPADATA_KEY]          # Solo serverless
```
**Replicar TODAS en Vercel: Development + Preview + Production.** Un valor faltante en Development rompe `vercel dev`. El número de WhatsApp está hardcodeado en `src/lib/whatsapp.js`, no es variable de entorno.

## Decisiones Técnicas Clave

1. **API keys NUNCA en el cliente** — todo vía serverless (`/api/*.js`)
2. **`max_tokens: 5000`** en generate.js (Sonnet) / **8000** en los fallbacks de Haiku (textual y parafraseado) para evitar truncamiento del JSON
3. **`repairTruncatedJson()`** como fallback cuando Claude corta el JSON — compartido cliente/servidor vía `src/lib/jsonRepair.js`
4. **Estilos inline en `SocialCard.jsx`** — html2canvas no captura clases Tailwind
5. **`ProfileContext.refreshProfile()`** después de cualquier cambio al perfil (evita rebote en ProtectedRoute)
6. **Preview NO cuenta como generación** — no toca `generations_used` ni escribe en `generations`
7. **Reseteo de ciclo es perezoso, no por cron** — se resuelve en cada request a `api/generate.js`/`api/preview.js` vía `resolveGenerationsCycle()`, no con un job programado
8. **STAGE_MARKER/META_MARKER en banda** para progreso real durante revisión teológica/notas léxicas — no solo simulado por timers del cliente
9. **Revisión teológica y notas léxicas nunca bloquean ni rompen la respuesta principal** — cualquier fallo se degrada en silencio, el usuario siempre recibe su sermón
10. **Auto-actualización PWA vía `controllerchange`**, no el flujo "prompt" nativo de `vite-plugin-pwa` — no es confiable con `skipWaiting` activo (ver PWA y Auto-actualización)
11. **`generate.js` usa `profile.denomination`/`profile.denomination_other` de Supabase**, no `req.body` — fuente de verdad única con `preview.js`
12. **Tercera capa de degradación (parafraseo) solo si AMBOS modelos bloquean el pasaje textual por content filtering** — nunca se activa por otro tipo de error, y solo cambia `texto_completo_pasaje`, nada más del sermón (ver Pipeline de Generación)
13. **En JSON, solo la comilla recta doble (`"`) se escapa con backslash** — cualquier otro estilo de comillas (angulares, tipográficas) se escribe tal cual; la regla vive generalizada en el prompt para no repetir el mismo bug con un carácter nuevo

## Comandos

```bash
npm install          # Instalar dependencias
npm run dev          # Desarrollo local (el Service Worker NO corre en dev — usar build+preview para probar PWA)
npm run build        # Build producción
npm run preview      # Sirve dist/ localmente — necesario para probar Service Worker/PWA real
npm run lint         # Lint
git push origin main # Deploy automático vía Vercel
```

## Estado Actual

**Funcionando en producción:** Auth (email + Google), onboarding con redirect, ADN Pastoral (15 campos), 4 modos de input, preview de enfoque editable, generación con guías denominacionales (10, con ejemplos reconocibles en Pentecostal/Adventista y campo libre para "Otra"), degradación en tres capas Sonnet→Haiku textual→Haiku parafraseado por content filtering (con aviso visible al usuario si se usó paráfrasis), auto-revisión teológica post-generación, notas léxicas griego/hebreo vía Bolls Bible API con correspondencia explícita a la palabra en español, oraciones y reflexión devocional más profundas (rangos de extensión dedicados), 4 outputs en tabs (sermón/devocional/redes con imágenes descargables/oración), Biblioteca Ministerial con búsqueda/filtros/favoritos/notas, sistema freemium con feature teasing, validación server-side, persistencia de preview en sessionStorage, fix de doble generación, ciclos de facturación con reseteo mensual y downgrade automático por falta de renovación, WhatsApp como canal de conversión de pagos, PWA instalable con auto-actualización forzada.

**Bugs pendientes:**
- Mensaje post-registro con email: formulario se limpia sin feedback, falta card "¡Revisa tu correo!"
- SMTP Resend no envía emails de confirmación (posible problema de API key entre cuentas)

**Próximas features:**
- Stripe para pagos (WhatsApp es el canal manual mientras tanto)
- Logo de iglesia en imágenes (plan pago)
- Exportación PDF (Proclamador)
- **Perfil Ministerial de 3 niveles** (reemplaza el dropdown único de denominación, fuente: doc "MiKerygma - Propuesta de Modelado del Perfil Ministerial y Doctrinal"): Nivel 1 — tradición teológica más granular (Pentecostal clásica/Carismática/Neopentecostal separadas, no fusionadas; más Nazarena, Alianza C&MA, Menonita, Restauracionista, etc.); Nivel 2 — estilo ministerial (Expositivo/Pastoral/Evangelístico/Discipulado/Apologético/etc.); Nivel 3 — convicciones opcionales (dones: continuacionista/cesacionista; soteriología: calvinista/arminiana; escatología; liturgia). Objetivo: pasar de "generador personalizado" a copiloto que entiende metodología ministerial, no solo denominación.

## Convenciones

- Commits descriptivos en español
- Responsive verificado en 375px
- shadcn/ui para componentes de UI nuevos
- SQL de migraciones se ejecuta manualmente en Supabase SQL Editor
