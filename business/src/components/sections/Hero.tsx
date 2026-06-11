'use client';

import { motion } from 'framer-motion';
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
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-gold/50"
            style={{
              left: `${(i * 17 + 5) % 100}%`,
              top: `${(i * 23 + 10) % 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.7, 0.2],
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: 3 + (i % 4),
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
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
          className="font-display max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
        >
          Turn Your Workforce Into Winners
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-3 sm:text-xl"
        >
          Give your employees the chance to win luxury prizes — iPhones, travel,
          watches, and more. We handle everything. You take the credit.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center"
        >
          <button type="button" onClick={() => openQuote()} className="btn-primary text-base px-8 py-4">
            Get a Custom Quote
          </button>
          <a href="#how-it-works" className="btn-secondary text-base px-8 py-4">
            See How It Works
          </a>
        </motion.div>
      </div>
    </section>
  );
}
