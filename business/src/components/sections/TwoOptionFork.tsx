'use client';

import { PATH_OPTIONS } from '@/lib/content';
import { Icon } from '../Icon';
import { FadeIn } from '../FadeIn';

export function TwoOptionFork() {
  return (
    <section
      id="choose-path"
      className="relative border-y border-line bg-paper-2/50 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="section-badge">Choose your path</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
            Two ways to bring exclusive draws to your workforce
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-3">
            Both paths are fully managed by Gaviom. Pick the model that fits how
            your organization wants to engage employees.
          </p>
        </FadeIn>

        <div className="mt-14 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {PATH_OPTIONS.map((option, i) => (
            <FadeIn key={option.id} delay={i * 0.08}>
              <a
                href={option.anchor}
                className="group flex h-full flex-col rounded-2xl border-2 border-line bg-canvas p-8 shadow-card transition-all duration-300 hover:border-gold/50 hover:shadow-card-lg sm:p-10"
              >
                <span className="inline-flex w-fit rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">
                  {option.tagline}
                </span>
                <h3 className="mt-5 font-display text-2xl font-bold leading-snug text-ink sm:text-[1.65rem]">
                  {option.label}
                </h3>
                <p className="mt-4 flex-1 text-base leading-relaxed text-ink-3">
                  {option.shortLine}
                </p>
                <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-gold-dark transition group-hover:gap-3">
                  {option.cta}
                  <Icon name="trending" className="h-4 w-4 rotate-90" />
                </span>
              </a>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
