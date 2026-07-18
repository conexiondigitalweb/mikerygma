import { Link } from 'react-router-dom'

// Wrapper compartido por Terminos.jsx y Privacidad.jsx — no hay plugin de
// Tailwind Typography instalado en este proyecto, así que el espaciado de
// encabezados/párrafos/listas se define acá a mano en vez de con `prose`.
export function LegalLayout({ title, updatedAt, children }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link to="/" className="text-sm font-medium text-primary hover:underline">
        ← Volver al inicio
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Última actualización: {updatedAt}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:first:mt-0 [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground [&_strong]:text-foreground [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  )
}

export default LegalLayout
