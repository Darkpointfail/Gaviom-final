'use client';

import { CALENDLY_URL } from '@/lib/content';
import { FadeIn } from '../FadeIn';
import { useQuoteModal } from '../QuoteModalProvider';

export function FinalCTA() {
  const { openQuote } = useQuoteModal();

  return (
    <section id="discovery" className="relative overflow-hidden py-24 sm:py-32">
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            'linear-gradient(135deg, #FAF7F2 0%, #F4EFE6 40%, #F3EBD9 70%, #FAF7F2 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(201,168,76,0.14) 0%, transparent 65%)',
        }}
      />
      <FadeIn className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
          Book a 15-min discovery call
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-lg text-ink-3">
          15 minutes, no obligation. Walk through ticket packs vs. custom draw with
          someone who runs corporate programs every day.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary px-10 py-4 text-base"
          >
            Schedule discovery call
          </a>
          <button
            type="button"
            onClick={() => openQuote()}
            className="btn-secondary px-10 py-4 text-base"
          >
            Or send a message
          </button>
        </div>
        <p className="mt-4 text-xs text-muted">
          Prefer email?{' '}
          <a href="mailto:info@getgaviom.com" className="underline hover:text-ink">
            info@getgaviom.com
          </a>
        </p>
      </FadeIn>
    </section>
  );
}
