import { Link } from 'react-router-dom'

export function Footer() {
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
        </nav>

        <p>
          Construido con ❤️ por{' '}
          <a
            href="https://lagraciaquetransforma.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            La Gracia que Transforma
          </a>
        </p>

        <p className="text-xs">© {new Date().getFullYear()} MiKerygma. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
