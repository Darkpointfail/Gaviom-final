'use client';

import { STANDARD_BULLETS } from '@/lib/content';
import { STANDARD_VISUAL } from '@/lib/visuals';
import { Icon } from '../Icon';
import { FadeIn } from '../FadeIn';
import { useQuoteModal } from '../QuoteModalProvider';

export function StandardAccount() {
  const { openQuote } = useQuoteModal();

  return (
    <section id="ticket-packs" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn>
            <p className="section-badge">Option 1 · Standard Account</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Buy ticket packs for your employees
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-3">
              When an employee account is created through the company portal, each
              employee automatically receives 1 free entry across 3 different
              draws, funded by the company. Employees can purchase additional
              entries at their own cost for prizes that interest them.
            </p>
            <ul className="mt-8 space-y-4">
              {STANDARD_BULLETS.map((bullet) => (
                <li key={bullet} className="flex gap-3 text-ink-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-dark">
                    <Icon name="check" className="h-3.5 w-3.5" />
                  </span>
                  <span className="leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => openQuote('Ticket Packs (Standard)')}
              className="btn-primary mt-10 px-8 py-4 text-base"
            >
              Get started with ticket packs
            </button>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-card-lg">
              <img
                src={STANDARD_VISUAL.src}
                alt={STANDARD_VISUAL.alt}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
