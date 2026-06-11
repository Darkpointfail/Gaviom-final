'use client';

import Link from 'next/link';
import { useQuoteModal } from './QuoteModalProvider';

export function Header() {
  const { openQuote } = useQuoteModal();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/business/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold font-display text-sm font-bold text-ink">
            G
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Gaviom
            <span className="text-white/40"> / Business</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#how-it-works" className="transition hover:text-white">
            How it works
          </a>
          <a href="#packages" className="transition hover:text-white">
            Packages
          </a>
          <a href="#faq" className="transition hover:text-white">
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
