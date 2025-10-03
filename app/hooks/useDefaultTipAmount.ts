'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'curatoor-default-tip';
const FALLBACK_DEFAULT = 1;
const DEFAULT_TIP_EVENT = 'curatoor:default-tip-changed';

type DefaultTipDetail = {
  value: number;
};

function normalize(value: number): number {
  const sanitized = Number.isFinite(value) && value > 0 ? Math.floor(value) : FALLBACK_DEFAULT;
  return sanitized || FALLBACK_DEFAULT;
}

function readStoredValue(): number {
  if (typeof window === 'undefined') {
    return FALLBACK_DEFAULT;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return FALLBACK_DEFAULT;

  const parsed = parseInt(stored, 10);
  return Number.isNaN(parsed) ? FALLBACK_DEFAULT : normalize(parsed);
}

export function useDefaultTipAmount() {
  const [defaultTipAmount, setDefaultTipAmount] = useState<number>(FALLBACK_DEFAULT);

  useEffect(() => {
    setDefaultTipAmount(readStoredValue());

    if (typeof window === 'undefined') {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setDefaultTipAmount(readStoredValue());
    };

    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<DefaultTipDetail>).detail;
      if (!detail) return;
      setDefaultTipAmount(normalize(detail.value));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(DEFAULT_TIP_EVENT, handleCustom as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(DEFAULT_TIP_EVENT, handleCustom as EventListener);
    };
  }, []);

  const updateDefaultTipAmount = (value: number) => {
    const normalized = normalize(value);
    setDefaultTipAmount(normalized);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(normalized));
      window.dispatchEvent(
        new CustomEvent<DefaultTipDetail>(DEFAULT_TIP_EVENT, {
          detail: { value: normalized },
        }),
      );
    }
  };

  return {
    defaultTipAmount,
    setDefaultTipAmount: updateDefaultTipAmount,
  };
}
