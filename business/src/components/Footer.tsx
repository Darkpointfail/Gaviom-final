export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-ink py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold">Gaviom for Business</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/50">
              Luxury employee contest benefits. Operated by Gaviom Inc., Delaware.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm text-white/60">
            <a href="https://gaviom.com" className="transition hover:text-white">
              Consumer site
            </a>
            <a href="#packages" className="transition hover:text-white">
              Packages
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
            <a href="mailto:sales@gaviom.com" className="transition hover:text-white">
              sales@gaviom.com
            </a>
          </div>
        </div>
        <p className="mt-10 text-xs text-white/35">
          © {new Date().getFullYear()} Gaviom Inc. · 18+ · Void where prohibited · Not
          legal advice
        </p>
      </div>
    </footer>
  );
}
