import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

// Se muestra en el Dashboard cuando el usuario tiene un plan pago
// (mensajero/proclamador) y todavía no ha guardado ningún campo de su ADN
// Pastoral — ver isAdnPastoralEmpty() en src/lib/planHelpers.js.
//
// A diferencia de DowngradeNotice, este banner NO necesita una columna en
// `profiles` para su persistencia "permanente": en cuanto el usuario guarda
// UN campo de ADN Pastoral, isAdnPastoralEmpty() pasa a false por sí solo y
// el banner deja de cumplir su condición de aparición — no hace falta
// rastrear un dismiss aparte para eso. "Más tarde" sí necesita un dismiss,
// pero solo para el login actual, así que basta sessionStorage (ver
// Dashboard.jsx) en vez de otra columna nueva.
export function AdnPastoralPrompt({ onDismiss }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-foreground">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          Todavía no has configurado tu ADN Pastoral. No es obligatorio, pero mientras más información nos des,
          más depurado y personalizado será cada sermón, devocional y oración que generes.
        </span>
      </p>
      <div className="flex shrink-0 gap-2 sm:ml-4">
        <Button size="sm" variant="outline" onClick={onDismiss}>
          Más tarde
        </Button>
        <Button size="sm" asChild>
          <Link to="/profile#adn-pastoral">Completar mi ADN Pastoral</Link>
        </Button>
      </div>
    </div>
  )
}

export default AdnPastoralPrompt
