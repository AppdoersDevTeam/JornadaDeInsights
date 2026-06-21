import type { AppLocale } from '@/locales/messages';

export type EbookContentLocale = AppLocale;

export function ebookMatchesSiteLanguage(
  contentLocale: EbookContentLocale | string | null | undefined,
  siteLanguage: AppLocale,
): boolean {
  const locale = contentLocale === 'en' ? 'en' : 'pt-BR';
  return locale === siteLanguage;
}
