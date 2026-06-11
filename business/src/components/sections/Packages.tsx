'use client';

import { PACKAGES } from '@/lib/content';
import { FadeIn } from '../FadeIn';
import { useQuoteModal } from '../QuoteModalProvider';

export function Packages() {
  const { openQuote } = useQuoteModal();

  return (
    <section id="packages" className="section-alt py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="section-badge">Our packages</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Built for every stage of your program
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-3">
            No pricing on this page — every proposal is custom-built for your
            headcount and goals.
          </p>
        </FadeIn>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PACKAGES.map((pkg, i) => (
            <FadeIn key={pkg.title} delay={i * 0.08} as="article">
              <div className="glass-card card-hover flex h-full flex-col p-8">
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    pkg.badgeVariant === 'gold'
                      ? 'bg-gold/15 text-gold'
                      : 'bg-ochre-soft text-ink-3'
                  }`}
                >
                  {pkg.badge}
                </span>
                <h3 className="mt-5 font-display text-2xl font-bold">{pkg.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-3">
                  {pkg.description}
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {pkg.features.map((f) => (
                    <li
                      key={f}
                      className="flex gap-2.5 text-sm text-ink-2"
                    >
                      <span className="mt-0.5 text-gold">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs leading-relaxed text-muted">
                  Pricing based on number of employees + contest frequency —
                  contact us for a custom quote.
                </p>
                <button
                  type="button"
                  onClick={() => openQuote(pkg.packageValue)}
                  className={`mt-6 w-full ${i === 0 ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Get a Quote
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
