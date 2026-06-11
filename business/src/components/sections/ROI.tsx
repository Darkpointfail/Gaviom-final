import { STATS } from '@/lib/content';
import { FadeIn } from '../FadeIn';

export function ROI() {
  return (
    <section className="relative overflow-hidden section-alt py-20 sm:py-28">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(201,168,76,0.16) 0%, transparent 60%)',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="section-badge">ROI</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            The numbers speak for themselves
          </h2>
        </FadeIn>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STATS.map((stat, i) => (
            <FadeIn key={stat.value} delay={i * 0.1} as="article">
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-gold-dark sm:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {stat.label}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
