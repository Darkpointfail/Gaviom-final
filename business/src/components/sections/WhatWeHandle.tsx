import { SHARED_HANDLE_ITEMS } from '@/lib/content';
import { IconWrap } from '../Icon';
import { FadeIn } from '../FadeIn';

export function WhatWeHandle() {
  return (
    <section className="border-y border-line py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center">
          <p className="section-badge">Included in both paths</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            What we handle in every program
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-3">
            Whether you choose ticket packs or a custom draw, Gaviom operates the
            full program so HR stays out of the logistics.
          </p>
        </FadeIn>
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {SHARED_HANDLE_ITEMS.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.06} as="article">
              <div className="glass-card card-hover h-full p-8">
                <IconWrap name={item.icon} />
                <h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
