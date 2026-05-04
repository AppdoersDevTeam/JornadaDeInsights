import type { Curiosidade, CuriosidadeCategory } from '@/lib/supabase';
import type { AppLocale } from '@/locales/messages';

export function categoryDisplayName(
  category: CuriosidadeCategory | null | undefined,
  language: AppLocale,
): string | null {
  if (!category) return null;
  if (language === 'en' && category.name_en?.trim()) {
    return category.name_en.trim();
  }
  return category.name;
}

export function curiosidadeDisplayTitle(curiosidade: Curiosidade, language: AppLocale): string {
  if (language === 'en' && curiosidade.title_en?.trim()) {
    return curiosidade.title_en.trim();
  }
  return curiosidade.title;
}

export function curiosidadeDisplayBody(curiosidade: Curiosidade, language: AppLocale): string {
  if (language === 'en' && curiosidade.body_en?.trim()) {
    return curiosidade.body_en.trim();
  }
  return curiosidade.body;
}
