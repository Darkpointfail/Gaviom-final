export function Footer() {
  return (
    <footer className="border-t border-line bg-paper-2/90 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-ink">Gaviom for Business</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Luxury employee contest benefits. Operated by Gaviom Inc., Delaware.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm text-ink-3">
            <a href="https://gaviom.com" className="transition hover:text-ink">
              Consumer site
            </a>
            <a href="#packages" className="transition hover:text-ink">
              Packages
            </a>
            <a href="#faq" className="transition hover:text-ink">
              FAQ
            </a>
            <a href="mailto:info@getgaviom.com" className="transition hover:text-ink">
              info@getgaviom.com
            </a>
          </div>
        </div>
        <p className="mt-10 text-xs text-muted-2">
          © {new Date().getFullYear()} Gaviom Inc. · 18+ · Void where prohibited · Not
          legal advice
        </p>
      </div>
    </footer>
  );
}
