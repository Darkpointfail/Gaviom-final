'use client';

import { CUSTOM_BULLETS } from '@/lib/content';
import { CUSTOM_VISUAL } from '@/lib/visuals';
import { Icon } from '../Icon';
import { FadeIn } from '../FadeIn';
import { useQuoteModal } from '../QuoteModalProvider';

export function CustomAccount() {
  const { openQuote } = useQuoteModal();

  return (
    <section id="custom-draw" className="section-alt py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-card-lg">
              <img
                src={CUSTOM_VISUAL.src}
                alt={CUSTOM_VISUAL.alt}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </FadeIn>

          <FadeIn delay={0.1} className="order-1 lg:order-2">
            <p className="section-badge">Option 2 · Custom Account</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Build a custom draw for your company
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-3">
              A fully personalized draw built around your company&apos;s culture
              and your employees&apos; interests.
            </p>
            <ul className="mt-8 space-y-4">
              {CUSTOM_BULLETS.map((bullet) => (
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
              onClick={() => openQuote('Custom Draw')}
              className="btn-primary mt-10 px-8 py-4 text-base"
            >
              Talk to us about a custom draw
            </button>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
