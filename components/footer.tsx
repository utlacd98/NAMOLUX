import { Zap } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-muted/30 py-12" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-semibold text-foreground">NamoLux</span>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="flex gap-8">
              <li>
                <a href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Privacy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Terms
                </a>
              </li>
              <li>
                <a href="/contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Contact
                </a>
              </li>
            </ul>
          </nav>

          <p className="text-sm text-muted-foreground">© {currentYear} DomainSniper AI</p>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Availability checks are best-effort and may vary by registrar. Always verify with your preferred registrar
          before purchase.
        </p>
      </div>
    </footer>
  )
}
