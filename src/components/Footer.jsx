import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { buildWhatsAppLink, identityLine } from '@/lib/whatsapp'

export function Footer() {
  const { user } = useAuth()
  const [fullName, setFullName] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name)
      })
  }, [user])

  const id = identityLine({ fullName, email: user?.email })
  const contactMessage = id
    ? `Hola, ${id}. Tengo una pregunta sobre MiKerygma.`
    : 'Hola, tengo una pregunta sobre MiKerygma.'

  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center text-sm text-muted-foreground">
        <p className="text-base font-semibold text-foreground">MiKerygma — Tu copiloto ministerial</p>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link to="/login" className="hover:text-primary hover:underline">
            Iniciar sesión
          </Link>
          <Link to="/login?mode=signup" className="hover:text-primary hover:underline">
            Crear cuenta
          </Link>
          <Link to="/pricing" className="hover:text-primary hover:underline">
            Precios
          </Link>
          <Link to="/terminos" className="hover:text-primary hover:underline">
            Términos y Condiciones
          </Link>
          <Link to="/privacidad" className="hover:text-primary hover:underline">
            Política de Privacidad
          </Link>
          <a
            href={buildWhatsAppLink(contactMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary hover:underline"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            ¿Tienes dudas? Escríbenos por WhatsApp
          </a>
        </nav>

        <p>
          Construido con ❤️ por <span className="font-medium text-foreground">La Gracia que Transforma</span>
        </p>

        <p className="text-xs">© {new Date().getFullYear()} MiKerygma. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
