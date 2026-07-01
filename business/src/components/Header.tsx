'use client';

import Link from 'next/link';
import { useQuoteModal } from './QuoteModalProvider';

export function Header() {
  const { openQuote } = useQuoteModal();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-paper/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-ink transition hover:text-ink-2"
        >
          Gaviom
          <span className="text-muted"> / Business</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-ink-3 md:flex">
          <a href="#choose-path" className="transition hover:text-ink">
            Options
          </a>
          <a href="#ticket-packs" className="transition hover:text-ink">
            Ticket packs
          </a>
          <a href="#custom-draw" className="transition hover:text-ink">
            Custom draw
          </a>
          <a href="#faq" className="transition hover:text-ink">
            FAQ
          </a>
        </nav>
        <button type="button" onClick={() => openQuote()} className="btn-primary !py-2.5 !text-xs sm:!text-sm">
          Book discovery call
        </button>
      </div>
    </header>
  );
}
