/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { localeMessages } from '@/locales/messages';

type SupportedLanguage = 'pt-BR' | 'en';

interface LanguageContextValue {
  language: SupportedLanguage;
  recommendedLanguage: SupportedLanguage;
  isLanguagePromptOpen: boolean;
  setLanguage: (lang: SupportedLanguage) => void;
  openLanguagePrompt: () => void;
  closeLanguagePrompt: () => void;
  t: (key: string, fallback: string) => string;
}

const STORAGE_KEY = 'jdi_language_preference';

const detectRecommendedLanguage = (): SupportedLanguage => {
  const browserLanguage = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'pt-br';
  if (browserLanguage.startsWith('en')) {
    return 'en';
  }
  return 'pt-BR';
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const getStoredLanguage = (): SupportedLanguage | null => {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'pt-BR' || saved === 'en' ? saved : null;
};

// Manifest link for install-time app name/branding; kept in sync with the
// active language so an install always reflects the user's chosen locale.
const applyManifestForLanguage = (lang: SupportedLanguage) => {
  if (typeof document === 'undefined') return;
  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifestLink) {
    manifestLink.href = lang === 'en' ? '/manifest-en.webmanifest' : '/manifest.webmanifest';
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const recommendedLanguage = useMemo(detectRecommendedLanguage, []);
  // Read localStorage synchronously in the initializer (not a post-mount
  // effect) so the correct language renders on the very first paint — no
  // flash of the default language when the app (especially the installed,
  // standalone PWA) opens.
  const [language, setLanguageState] = useState<SupportedLanguage>(
    () => getStoredLanguage() ?? recommendedLanguage
  );
  const [isLanguagePromptOpen, setIsLanguagePromptOpen] = useState(() => getStoredLanguage() === null);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    setIsLanguagePromptOpen(false);
  };

  const openLanguagePrompt = () => {
    setIsLanguagePromptOpen(true);
  };

  const closeLanguagePrompt = () => {
    setIsLanguagePromptOpen(false);
    localStorage.setItem(STORAGE_KEY, language);
  };

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'pt-BR';
    applyManifestForLanguage(language);
  }, [language]);

  const t = useCallback((key: string, fallback: string) => {
    return localeMessages[language][key] ?? fallback;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        recommendedLanguage,
        isLanguagePromptOpen,
        setLanguage,
        openLanguagePrompt,
        closeLanguagePrompt,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
