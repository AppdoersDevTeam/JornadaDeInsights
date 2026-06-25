import type { AppLocale } from '@/locales/messages';

const LOCALHOST_PATTERN = /localhost|127\.0\.0\.1/i;

const UNKNOWN_COUNTRY_LABEL: Record<AppLocale, string> = {
  'pt-BR': 'Desconhecido',
  en: 'Unknown',
};

const countryDisplayNamesByLocale = new Map<string, Intl.DisplayNames>();

function getCountryDisplayNames(locale: AppLocale): Intl.DisplayNames | null {
  const intlLocale = locale === 'en' ? 'en' : 'pt';
  const cached = countryDisplayNamesByLocale.get(intlLocale);
  if (cached) return cached;

  try {
    const displayNames = new Intl.DisplayNames([intlLocale], { type: 'region' });
    countryDisplayNamesByLocale.set(intlLocale, displayNames);
    return displayNames;
  } catch {
    return null;
  }
}

export function isLocalhostTraffic(value: string | null | undefined): boolean {
  if (!value) return false;
  return LOCALHOST_PATTERN.test(value);
}

export function formatCountryName(code: string, locale: AppLocale = 'pt-BR'): string {
  if (!code || code === 'Unknown') return UNKNOWN_COUNTRY_LABEL[locale];
  const displayNames = getCountryDisplayNames(locale);
  return displayNames?.of(code) ?? code;
}
