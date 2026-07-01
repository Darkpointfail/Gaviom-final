import { WHY_GAVIOM_POINTS } from '@/lib/content';
import { WHY_VISUAL } from '@/lib/visuals';
import { IconWrap } from '../Icon';
import { FadeIn } from '../FadeIn';

export function WhyGaviom() {
  return (
    <section id="why-gaviom" className="section-alt py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <FadeIn className="lg:col-span-5">
            <p className="section-badge">Why Gaviom</p>
            <blockquote className="mt-4 font-display text-3xl font-bold leading-[1.15] tracking-tight text-ink sm:text-4xl">
              An idea alone is worth nothing, execution is what creates value.
              You hand us the program, we deliver the result.
            </blockquote>
            <div className="mt-10 overflow-hidden rounded-2xl border border-line shadow-card">
              <img
                src={WHY_VISUAL.src}
                alt={WHY_VISUAL.alt}
                className="aspect-[3/2] w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </FadeIn>

          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7 lg:content-start">
            {WHY_GAVIOM_POINTS.map((point, i) => (
              <FadeIn key={point.title} delay={i * 0.06} as="article">
                <div className="glass-card h-full p-7">
                  <IconWrap name={point.icon} />
                  <h3 className="mt-4 font-display text-lg font-semibold">{point.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{point.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
