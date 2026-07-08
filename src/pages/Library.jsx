import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Star, Trash2, Pencil, X, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { INPUT_TYPES, LIBRARY_STATUSES } from '@/lib/constants'
import { canUseFeature } from '@/lib/planHelpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { UpgradePrompt } from '@/components/UpgradePrompt'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20
const FREE_LIBRARY_LIMIT = 3
const NOTES_MAX = 500

const GENERATION_COLUMNS =
  'id, title, input_type, input_text, occasion, translation, output_sermon, output_devotional, output_social, output_prayer, status, tags, is_favorite, preached_date, notes, pasaje_central, created_at'

function truncateWords(text, count = 50) {
  if (!text) return ''
  const words = text.trim().split(/\s+/)
  if (words.length <= count) return words.join(' ')
  return `${words.slice(0, count).join(' ')}…`
}

function statusMeta(status) {
  return LIBRARY_STATUSES.find((s) => s.value === status) ?? LIBRARY_STATUSES[0]
}

function formatDate(dateString) {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function Library() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [generations, setGenerations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const [stats, setStats] = useState({ total: 0, preached: 0, scriptures: 0 })

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortBy, setSortBy] = useState('recent')
  const [filtersOpen, setFiltersOpen] = useState(true)

  const [editingGeneration, setEditingGeneration] = useState(null)
  const [editStatus, setEditStatus] = useState('borrador')
  const [editPreachedDate, setEditPreachedDate] = useState('')
  const [editTags, setEditTags] = useState([])
  const [editTagInput, setEditTagInput] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setLoadingProfile(false)
      })
  }, [user])

  const userPlan = profile?.plan ?? 'free'
  const hasFullLibrary = canUseFeature(userPlan, 'full_library')

  useEffect(() => {
    if (!user || loadingProfile) return

    if (!hasFullLibrary) {
      setLoading(true)
      supabase
        .from('generations')
        .select(GENERATION_COLUMNS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(FREE_LIBRARY_LIMIT)
        .then(({ data }) => {
          setGenerations(data ?? [])
          setLoading(false)
        })
      return
    }

    setLoading(true)
    Promise.all([
      supabase
        .from('generations')
        .select(GENERATION_COLUMNS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1),
      supabase.from('generations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'predicado'),
      supabase.from('scripture_usage').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]).then(([listResult, totalResult, preachedResult, scripturesResult]) => {
      setGenerations(listResult.data ?? [])
      setHasMore((listResult.data?.length ?? 0) === PAGE_SIZE)
      setStats({
        total: totalResult.count ?? 0,
        preached: preachedResult.count ?? 0,
        scriptures: scripturesResult.count ?? 0,
      })
      setLoading(false)
    })
  }, [user, loadingProfile, hasFullLibrary])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    const { data } = await supabase
      .from('generations')
      .select(GENERATION_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(generations.length, generations.length + PAGE_SIZE - 1)

    setGenerations((prev) => [...prev, ...(data ?? [])])
    setHasMore((data?.length ?? 0) === PAGE_SIZE)
    setLoadingMore(false)
  }

  const handleViewResult = (generation) => {
    navigate('/result', {
      state: {
        result: {
          id: generation.id,
          created_at: generation.created_at,
          input_type: generation.input_type,
          input_text: generation.input_text,
          occasion: generation.occasion,
          translation: generation.translation,
          sermon: generation.output_sermon,
          devocional: generation.output_devotional,
          redes: generation.output_social,
          oracion_cierre: generation.output_prayer,
        },
      },
    })
  }

  const toggleFavorite = async (generation) => {
    const next = !generation.is_favorite
    setGenerations((prev) => prev.map((g) => (g.id === generation.id ? { ...g, is_favorite: next } : g)))
    const { error } = await supabase.from('generations').update({ is_favorite: next }).eq('id', generation.id)
    if (error) {
      setGenerations((prev) => prev.map((g) => (g.id === generation.id ? { ...g, is_favorite: !next } : g)))
    }
  }

  const handleDelete = async (generation) => {
    const confirmed = window.confirm(
      `¿Eliminar "${generation.title || 'este contenido'}" de tu biblioteca? Esta acción no se puede deshacer.`
    )
    if (!confirmed) return

    const { error } = await supabase.from('generations').delete().eq('id', generation.id)
    if (error) {
      window.alert('No se pudo eliminar. Intenta de nuevo.')
      return
    }
    setGenerations((prev) => prev.filter((g) => g.id !== generation.id))
    setStats((prev) => ({ ...prev, total: Math.max(prev.total - 1, 0) }))
  }

  const openEditModal = (generation) => {
    setEditingGeneration(generation)
    setEditStatus(generation.status ?? 'borrador')
    setEditPreachedDate(generation.preached_date ?? '')
    setEditTags(generation.tags ?? [])
    setEditTagInput('')
    setEditNotes(generation.notes ?? '')
  }

  const closeEditModal = () => {
    if (savingEdit) return
    setEditingGeneration(null)
  }

  const commitTagInput = () => {
    const value = editTagInput.trim().replace(/,$/, '')
    if (value && !editTags.includes(value)) {
      setEditTags((prev) => [...prev, value])
    }
    setEditTagInput('')
  }

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitTagInput()
    }
  }

  const removeTag = (tag) => {
    setEditTags((prev) => prev.filter((t) => t !== tag))
  }

  const handleSaveEdit = async () => {
    if (!editingGeneration) return
    setSavingEdit(true)

    const payload = {
      status: editStatus,
      preached_date: editPreachedDate || null,
      tags: editTags,
      notes: editNotes.trim() || null,
    }

    const { data, error } = await supabase
      .from('generations')
      .update(payload)
      .eq('id', editingGeneration.id)
      .select(GENERATION_COLUMNS)
      .single()

    setSavingEdit(false)

    if (error) {
      window.alert('No se pudo guardar. Intenta de nuevo.')
      return
    }

    setGenerations((prev) => prev.map((g) => (g.id === data.id ? data : g)))
    if (data.status === 'predicado') {
      setStats((prev) => ({
        ...prev,
        preached: prev.preached + (editingGeneration.status !== 'predicado' ? 1 : 0),
      }))
    } else if (editingGeneration.status === 'predicado') {
      setStats((prev) => ({ ...prev, preached: Math.max(prev.preached - 1, 0) }))
    }
    setEditingGeneration(null)
  }

  const filteredGenerations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    let list = generations.filter((g) => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false
      if (typeFilter !== 'all' && g.input_type !== typeFilter) return false
      if (favoritesOnly && !g.is_favorite) return false
      if (query) {
        const haystack = [g.title, g.input_text, ...(g.tags ?? [])].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })

    list = [...list].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'alpha') return (a.title || '').localeCompare(b.title || '', 'es')
      return new Date(b.created_at) - new Date(a.created_at)
    })

    return list
  }, [generations, searchQuery, statusFilter, typeFilter, favoritesOnly, sortBy])

  if (loading || loadingProfile) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground">
        Cargando tu biblioteca...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mi Biblioteca Ministerial</h1>
        <p className="mt-2 text-muted-foreground">Todo tu contenido organizado en un solo lugar</p>
      </div>

      {hasFullLibrary && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{stats.total} sermones</Badge>
          <Badge variant="secondary">{stats.scriptures} pasajes usados</Badge>
          <Badge variant="secondary">{stats.preached} predicados</Badge>
        </div>
      )}

      {!hasFullLibrary && (
        <UpgradePrompt
          variant="banner"
          requiredPlan="mensajero"
          message="Desbloquea tu biblioteca completa con el Plan Mensajero — organiza, busca y etiqueta todo tu contenido"
          className="mt-6"
        />
      )}

      {hasFullLibrary && (
        <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar por título, contenido o etiqueta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 sm:hidden"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-label="Mostrar filtros"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className={cn('mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4', !filtersOpen && 'hidden sm:grid')}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {LIBRARY_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo de input</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {INPUT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ordenar por</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Más recientes</SelectItem>
                  <SelectItem value="oldest">Más antiguos</SelectItem>
                  <SelectItem value="alpha">Alfabético</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Favoritos</Label>
              <Button
                type="button"
                variant={favoritesOnly ? 'default' : 'outline'}
                className="w-full justify-start gap-2"
                onClick={() => setFavoritesOnly((v) => !v)}
              >
                <Star className={cn('h-4 w-4', favoritesOnly && 'fill-current')} />
                Solo favoritos
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {generations.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-muted-foreground">
              Tu biblioteca está vacía. Genera tu primer mensaje para comenzar a construir tu historial ministerial.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/generate">Nueva generación</Link>
            </Button>
          </div>
        )}

        {generations.length > 0 && filteredGenerations.length === 0 && (
          <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No se encontraron resultados con estos filtros.
          </p>
        )}

        {filteredGenerations.map((generation) => {
          const inputType = INPUT_TYPES.find((t) => t.value === generation.input_type)
          const status = statusMeta(generation.status)
          const preachedLabel = formatDate(generation.preached_date)

          return (
            <Card key={generation.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 flex-1 break-words text-lg font-semibold text-foreground">
                    {generation.title || 'Sin título'}
                  </h3>
                  {hasFullLibrary && (
                    <button
                      type="button"
                      onClick={() => toggleFavorite(generation)}
                      aria-label={generation.is_favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                      className="shrink-0"
                    >
                      <Star
                        className={cn(
                          'h-5 w-5 transition-colors',
                          generation.is_favorite ? 'fill-primary text-primary' : 'text-muted-foreground'
                        )}
                      />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={status.badgeClass} variant="secondary">
                    {status.label}
                  </Badge>
                  <Badge variant="outline">
                    {inputType?.icon} {inputType?.label ?? generation.input_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Creado: {formatDate(generation.created_at)}</span>
                  {preachedLabel && (
                    <span className="text-xs text-muted-foreground">Predicado: {preachedLabel}</span>
                  )}
                </div>

                {generation.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {generation.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[11px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <p className="text-sm break-words text-muted-foreground">{truncateWords(generation.input_text)}</p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={() => handleViewResult(generation)}>
                    Ver completo
                  </Button>
                  {hasFullLibrary && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEditModal(generation)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Editar estado
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(generation)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {hasFullLibrary && hasMore && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Cargando...' : 'Cargar más'}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!editingGeneration} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar estado y metadatos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIBRARY_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editStatus === 'predicado' && (
              <div className="space-y-1.5">
                <Label htmlFor="preached-date">Fecha en que se predicó</Label>
                <Input
                  id="preached-date"
                  type="date"
                  value={editPreachedDate}
                  onChange={(e) => setEditPreachedDate(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tag-input">Etiquetas</Label>
              <Input
                id="tag-input"
                placeholder="Escribe una etiqueta y presiona Enter o coma..."
                value={editTagInput}
                onChange={(e) => setEditTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onBlur={commitTagInput}
              />
              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {editTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={`Quitar etiqueta ${tag}`}
                        className="rounded-full hover:bg-black/10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="notes">Notas personales</Label>
                <span className="text-xs text-muted-foreground">
                  {editNotes.length}/{NOTES_MAX}
                </span>
              </div>
              <Textarea
                id="notes"
                rows={3}
                maxLength={NOTES_MAX}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
