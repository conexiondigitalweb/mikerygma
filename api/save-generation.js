import { createClient } from '@supabase/supabase-js'
import { parseReference } from '../src/lib/scriptureParser.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const {
    user_id,
    input_type,
    input_text,
    occasion,
    translation,
    custom_instructions,
    model_used,
    sermon,
    devocional,
    redes,
    oracion_cierre,
    notas_lexicas,
    lexicon_notes_status,
    passage_paraphrased,
  } = req.body ?? {}

  if (!user_id || !input_type || !input_text || !occasion || !translation || !sermon) {
    res.status(400).json({ error: 'Faltan campos requeridos para guardar la generación.' })
    return
  }

  const authHeader = req.headers.authorization ?? ''
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!accessToken) {
    res.status(401).json({ error: 'No autenticado.' })
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Configuración del servidor incompleta.' })
    return
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
  if (authError || authData?.user?.id !== user_id) {
    res.status(401).json({ error: 'No autorizado.' })
    return
  }

  let generationRow
  try {
    const { data, error } = await supabaseAdmin
      .from('generations')
      .insert({
        user_id,
        input_type,
        input_text,
        occasion,
        translation,
        custom_instructions: custom_instructions?.trim() || null,
        output_sermon: sermon ?? null,
        output_devotional: devocional ?? null,
        output_social: redes ?? null,
        output_prayer: oracion_cierre ?? null,
        model_used: model_used ?? 'claude-sonnet-4-6',
        title: sermon?.titulo ?? null,
        pasaje_central: sermon?.pasaje_central ?? null,
        output_lexicon_notes: notas_lexicas ?? null,
        lexicon_notes_status: lexicon_notes_status ?? 'not_attempted',
        passage_paraphrased: Boolean(passage_paraphrased),
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
    const scriptureRows = []

    if (sermon?.pasaje_central) {
      scriptureRows.push({ reference: sermon.pasaje_central, usage_type: 'central' })
    }
    for (const punto of sermon?.puntos ?? []) {
      for (const ref of punto.pasajes_apoyo ?? []) {
        if (ref) scriptureRows.push({ reference: ref, usage_type: 'apoyo' })
      }
    }

    if (scriptureRows.length > 0) {
      const { error: scriptureError } = await supabaseAdmin.from('scripture_usage').insert(
        scriptureRows.map(({ reference, usage_type }) => {
          const parsedRef = parseReference(reference)
          return {
            user_id,
            generation_id: generationRow.id,
            reference,
            book: parsedRef.book,
            chapter: parsedRef.chapter,
            verse_start: parsedRef.verse_start,
            verse_end: parsedRef.verse_end,
            usage_type,
          }
        })
      )
      if (scriptureError) {
        console.error('Error guardando scripture_usage:', scriptureError)
      }
    }
  } catch (err) {
    console.error('Error inesperado guardando scripture_usage:', err)
  }

  try {
    const { data: profileRow } = await supabaseAdmin
      .from('profiles')
      .select('generations_used')
      .eq('id', user_id)
      .single()

    if (profileRow) {
      await supabaseAdmin
        .from('profiles')
        .update({ generations_used: profileRow.generations_used + 1 })
        .eq('id', user_id)
    }
  } catch (err) {
    console.error('Error actualizando el contador de generaciones:', err)
  }

  res.status(200).json({
    id: generationRow.id,
    created_at: generationRow.created_at,
  })
}
