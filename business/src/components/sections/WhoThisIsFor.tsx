import { AUDIENCE_CARDS } from '@/lib/content';
import { FadeIn } from '../FadeIn';

export function WhoThisIsFor() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="section-badge">Who it&apos;s for</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Built for companies that care about their people
          </h2>
        </FadeIn>
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {AUDIENCE_CARDS.map((card, i) => (
            <FadeIn key={card.title} delay={i * 0.08} as="article">
              <div className="glass-card card-hover flex h-full gap-5 p-7">
                <span className="text-3xl" aria-hidden>
                  {card.icon}
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">
                    {card.description}
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
