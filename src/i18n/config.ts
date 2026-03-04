export type Locale = 'de' | 'en' | 'sr' | 'tr';

export const defaultLocale: Locale = 'de';

export const locales: { code: Locale; label: string; flag: string }[] = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'sr', label: 'Srpski', flag: '🇷🇸' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];

export const localeMap: Record<Locale, string> = {
  de: 'de-DE',
  en: 'en-US',
  sr: 'sr-RS',
  tr: 'tr-TR',
};

export const LOCALE_COOKIE = 'fc_locale';
