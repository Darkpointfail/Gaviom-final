'use client';

import { FadeIn } from '../FadeIn';
import { useQuoteModal } from '../QuoteModalProvider';

export function FinalCTA() {
  const { openQuote } = useQuoteModal();

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            'linear-gradient(135deg, #0A0A0F 0%, #1a1520 40%, #0f0f18 70%, #0A0A0F 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-50"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(201,168,76,0.14) 0%, transparent 65%)',
        }}
      />
      <FadeIn className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Ready to give your employees something to talk about?
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-lg text-white/60">
          Every proposal is custom-built. No commitment required to get a quote.
        </p>
        <button
          type="button"
          onClick={() => openQuote()}
          className="btn-primary mt-10 px-10 py-4 text-base"
        >
          Get Your Custom Quote
        </button>
        <p className="mt-4 text-xs text-white/40">
          Typically respond within 24 hours
        </p>
      </FadeIn>
    </section>
  );
}
