'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { QuoteModal } from './QuoteModal';

type PackagePreset = string | undefined;

type QuoteContextValue = {
  openQuote: (packageInterest?: string) => void;
  closeQuote: () => void;
};

const QuoteContext = createContext<QuoteContextValue | null>(null);

export function QuoteModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [presetPackage, setPresetPackage] = useState<PackagePreset>();

  const openQuote = useCallback((packageInterest?: string) => {
    setPresetPackage(packageInterest);
    setOpen(true);
  }, []);

  const closeQuote = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ openQuote, closeQuote }),
    [openQuote, closeQuote],
  );

  return (
    <QuoteContext.Provider value={value}>
      {children}
      <QuoteModal
        open={open}
        onClose={closeQuote}
        presetPackage={presetPackage}
      />
    </QuoteContext.Provider>
  );
}

export function useQuoteModal() {
  const ctx = useContext(QuoteContext);
  if (!ctx) {
    throw new Error('useQuoteModal must be used within QuoteModalProvider');
  }
  return ctx;
}
