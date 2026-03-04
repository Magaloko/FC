'use client';

import { useCallback } from 'react';
import { useUIStore } from '@/stores/ui-store';
import type { Locale } from './config';

import de from './locales/de.json';
import en from './locales/en.json';
import sr from './locales/sr.json';
import tr from './locales/tr.json';

const dictionaries: Record<Locale, Record<string, string>> = { de, en, sr, tr };

/**
 * Returns a translation function t(key) that looks up the key
 * in the current locale's dictionary, falling back to German.
 */
export function useTranslation() {
  const locale = useUIStore((s) => s.locale);
  const dict = dictionaries[locale];
  const fallback = dictionaries.de;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = dict[key] ?? fallback[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, String(v));
        });
      }
      return value;
    },
    [dict, fallback]
  );

  return { t, locale };
}
