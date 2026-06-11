import { TESTIMONIALS } from '@/lib/content';
import { FadeIn } from '../FadeIn';

export function Testimonials() {
  return (
    <section className="section-alt py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="section-badge">Testimonials</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            What our partners are saying
          </h2>
        </FadeIn>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.08} as="article">
              <div className="glass-card flex h-full flex-col p-8">
                <span
                  className="font-display text-4xl leading-none text-gold/50"
                  aria-hidden
                >
                  &ldquo;
                </span>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">
                  {t.quote}
                </p>
                <div className="mt-6 border-t border-line pt-6">
                  <p className="text-sm font-semibold text-ink">{t.name}</p>
                  <p className="text-xs text-muted">
                    {t.title}, {t.company}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
