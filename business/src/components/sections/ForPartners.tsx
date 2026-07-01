'use client';

import { FadeIn } from '../FadeIn';
import { useQuoteModal } from '../QuoteModalProvider';

export function ForPartners() {
  const { openQuote } = useQuoteModal();

  return (
    <section id="partners" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="rounded-2xl border border-line bg-canvas p-8 sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div className="max-w-2xl">
              <p className="section-badge">For partners</p>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Benefits brokers &amp; consultants
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-ink-3">
                Are you a benefits broker or consultant? Resell Gaviom to your
                client portfolio, set your own margin, we handle delivery.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openQuote('Partner / Broker')}
              className="btn-secondary mt-8 shrink-0 px-8 py-4 text-base lg:mt-0"
            >
              Partner with Gaviom
            </button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
