import jornadaLogoPt from '@/Jornada logo.png';
import jornadaLogoFooterPt from '@/Jornada logo footer.png';
import type { AppLocale } from '@/locales/messages';

/** English brand logo served from /public */
export const SITE_LOGO_EN = '/Jornada logo (3200 x 1300 px) (3800 x 1300 px) (3800 x 1000 px).png';

export type SiteLogoVariant = 'header' | 'footer';

export function siteLogoSrc(language: AppLocale, variant: SiteLogoVariant = 'header'): string {
  if (language === 'en') {
    return SITE_LOGO_EN;
  }
  return variant === 'footer' ? jornadaLogoFooterPt : jornadaLogoPt;
}

export function siteLogoAlt(language: AppLocale): string {
  return language === 'en' ? 'Journey of Insights' : 'Jornada de Insights';
}
