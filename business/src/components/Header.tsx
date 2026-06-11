'use client';

import Link from 'next/link';
import { useQuoteModal } from './QuoteModalProvider';

export function Header() {
  const { openQuote } = useQuoteModal();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-paper/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold font-display text-sm font-bold text-ink-deep">
            G
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            Gaviom
            <span className="text-muted"> / Business</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-ink-3 md:flex">
          <a href="#our-offer" className="transition hover:text-ink">
            Our offer
          </a>
          <a href="#packages" className="transition hover:text-ink">
            Packages
          </a>
          <a href="#faq" className="transition hover:text-ink">
            FAQ
          </a>
        </nav>
        <button type="button" onClick={() => openQuote()} className="btn-primary !py-2.5 !text-xs sm:!text-sm">
          Get a Custom Quote
        </button>
      </div>
    </header>
  );
}
