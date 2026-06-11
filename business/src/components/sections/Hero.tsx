'use client';

import { motion } from 'framer-motion';
import { HERO_PHOTO_STACK } from '@/lib/visuals';
import { useQuoteModal } from '../QuoteModalProvider';

export function Hero() {
  const { openQuote } = useQuoteModal();

  return (
    <section className="relative min-h-[92vh] overflow-hidden pt-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
      >
        <div className="absolute -left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-gold/15 blur-[120px] animate-float" />
        <div
          className="absolute -right-1/4 bottom-0 h-[500px] w-[500px] rounded-full bg-ochre-soft/70 blur-[100px]"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute inset-0 bg-[length:200%_200%] opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, rgba(201,168,76,0.18) 0%, transparent 45%), radial-gradient(circle at 80% 70%, rgba(244,239,230,0.6) 0%, transparent 40%)',
            animation: 'gradient-shift 12s ease infinite',
          }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <div className="text-center lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="section-badge mb-6"
          >
            Employee contest benefits
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
          >
            Turn Your Workforce Into Winners
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-ink-3 sm:text-xl"
          >
            Give your employees the chance to win luxury prizes — iPhones, travel,
            watches, and more. We handle everything. You take the credit.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row lg:justify-start"
          >
            <button type="button" onClick={() => openQuote()} className="btn-primary text-base px-8 py-4">
              Get a Custom Quote
            </button>
            <a href="#how-it-works" className="btn-secondary text-base px-8 py-4">
              See How It Works
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto h-[min(72vw,420px)] w-full max-w-md lg:mx-0 lg:h-[480px] lg:max-w-none"
          aria-hidden
        >
          {HERO_PHOTO_STACK.map((photo, i) => (
            <div
              key={photo.src}
              className={`absolute left-1/2 w-[min(88%,320px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-canvas shadow-card-lg ${photo.rotate} ${photo.offset}`}
              style={{ top: `${i * 28}px` }}
            >
              <img
                src={photo.src}
                alt=""
                className="aspect-[4/5] w-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
