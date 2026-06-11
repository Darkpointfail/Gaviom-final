import { PRIZE_CATEGORIES } from '@/lib/content';
import { FadeIn } from '../FadeIn';

export function PrizeCatalog() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="section-badge">Prize catalog</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Prizes your employees will actually want
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-ink-3">
            Our catalog rotates regularly — here&apos;s a taste of what&apos;s up
            for grabs.
          </p>
        </FadeIn>

        <div className="mt-12 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-3">
          {PRIZE_CATEGORIES.map((cat, i) => (
            <FadeIn
              key={cat.title}
              delay={i * 0.05}
              as="article"
              className="min-w-[280px] shrink-0 snap-start md:min-w-0"
            >
              <div className="glass-card card-hover h-full p-7">
                <span className="text-3xl" aria-hidden>
                  {cat.icon}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">
                  {cat.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {cat.items}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
