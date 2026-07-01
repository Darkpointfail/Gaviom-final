'use client';

import { motion } from 'framer-motion';
import { HERO_VISUAL } from '@/lib/visuals';

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-24">
      <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
        <div className="absolute -left-1/4 top-0 h-[520px] w-[520px] rounded-full bg-gold/8 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[420px] w-[420px] rounded-full bg-ochre-soft/60 blur-[100px]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <div className="text-center lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="section-badge mb-6"
          >
            Employee prize draw platform
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.15rem]"
          >
            Turnkey employee reward draws, fully managed for your company
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-ink-3 sm:text-xl"
          >
            Give your employees a unique, memorable experience, without managing
            anything. We handle it all.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row lg:justify-start"
          >
            <a href="#choose-path" className="btn-primary text-base px-8 py-4">
              Compare your options
            </a>
            <a href="#why-gaviom" className="btn-secondary text-base px-8 py-4">
              Why Gaviom
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto w-full max-w-lg lg:mx-0"
        >
          <div className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-card-lg">
            <img
              src={HERO_VISUAL.src}
              alt={HERO_VISUAL.alt}
              className="aspect-[4/3] w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted lg:text-left">
            Premium experiences, company-funded and Gaviom-certified
          </p>
        </motion.div>
      </div>
    </section>
  );
}
