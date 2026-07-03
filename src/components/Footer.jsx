export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center text-sm text-muted-foreground">
        <p>
          Un proyecto de{' '}
          <a
            href="https://lagraciaquetransforma.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            La Gracia que Transforma
          </a>
        </p>
        <p>
          Por Doiler Alfonso Sanjuán Sánchez ·{' '}
          <a
            href="https://www.amazon.com/dp/B0F9DXGB7N"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Gracia Inmerecida, disponible en Amazon
          </a>
        </p>
        <p className="text-xs">© {new Date().getFullYear()} MiKerygma. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
