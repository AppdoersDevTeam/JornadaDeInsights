import type { Curiosidade, CuriosidadeCategory } from '@/lib/supabase';
import type { AppLocale } from '@/locales/messages';

function pickText(
  language: AppLocale,
  pt: string | null | undefined,
  en: string | null | undefined,
): string {
  const ptTrim = pt?.trim() || '';
  const enTrim = en?.trim() || '';
  if (language === 'en') {
    return enTrim || ptTrim;
  }
  return ptTrim || enTrim;
}

export function categoryDisplayName(
  category: CuriosidadeCategory | null | undefined,
  language: AppLocale,
): string | null {
  if (!category) return null;
  const pt = category.name?.trim() || '';
  const en = category.name_en?.trim() || '';
  if (language === 'en') {
    return en || pt || null;
  }
  return pt || en || null;
}

export function curiosidadeDisplayTitle(curiosidade: Curiosidade, language: AppLocale): string {
  return pickText(language, curiosidade.title, curiosidade.title_en);
}

export function curiosidadeDisplayBody(curiosidade: Curiosidade, language: AppLocale): string {
  return pickText(language, curiosidade.body, curiosidade.body_en);
}
