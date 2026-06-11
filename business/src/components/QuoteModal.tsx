'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { QuoteForm } from './QuoteForm';

type QuoteModalProps = {
  open: boolean;
  onClose: () => void;
  presetPackage?: string;
};

export function QuoteModal({ open, onClose, presetPackage }: QuoteModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Close quote form"
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-modal-title"
            className="relative z-10 w-full max-w-lg glass-card p-6 shadow-card-lg sm:p-8"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:border-ink-3 hover:text-ink"
              aria-label="Close"
            >
              ×
            </button>
            <p className="section-badge mb-2">Custom quote</p>
            <h2
              id="quote-modal-title"
              className="font-display text-2xl font-bold tracking-tight text-ink"
            >
              Request your proposal
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-3">
              Every package is tailored to your headcount and goals. No commitment
              required.
            </p>
            <div className="mt-6">
              <QuoteForm presetPackage={presetPackage} onSuccess={onClose} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
