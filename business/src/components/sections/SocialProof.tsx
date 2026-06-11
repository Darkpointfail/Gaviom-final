import { PRIZE_STRIP } from '@/lib/visuals';
import { FadeIn } from '../FadeIn';

export function SocialProof() {
  return (
    <section className="border-y border-line bg-canvas/80 py-10">
      <FadeIn className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="mb-8 text-center text-sm text-muted">
          Real prizes from our rotating catalog — no stock logos, no filler brands
        </p>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PRIZE_STRIP.map((item) => (
            <li key={item.label}>
              <figure className="group overflow-hidden rounded-2xl border border-line bg-paper shadow-card">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={item.thumb}
                    alt={item.alt}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent" />
                  <figcaption className="absolute bottom-0 left-0 right-0 px-4 py-3">
                    <span className="font-display text-sm font-semibold text-paper">
                      {item.label}
                    </span>
                  </figcaption>
                </div>
              </figure>
            </li>
          ))}
        </ul>
      </FadeIn>
    </section>
  );
}
