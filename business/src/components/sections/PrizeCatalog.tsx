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
              <div className="glass-card card-hover h-full overflow-hidden">
                <div className="relative aspect-[16/10] overflow-hidden border-b border-line">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.imageAlt}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-end bg-gradient-to-br ${'tone' in cat ? cat.tone : 'from-paper-2 to-ochre-soft'} p-5`}
                      aria-hidden
                    >
                      <span className="font-display text-lg font-semibold text-ink/80">
                        {cat.title}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-7">
                  <h3 className="font-display text-lg font-semibold">{cat.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{cat.items}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
