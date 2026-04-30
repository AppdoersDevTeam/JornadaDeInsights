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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const recommendedLanguage = useMemo(detectRecommendedLanguage, []);
  const [language, setLanguageState] = useState<SupportedLanguage>('pt-BR');
  const [isLanguagePromptOpen, setIsLanguagePromptOpen] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (savedLanguage === 'pt-BR' || savedLanguage === 'en') {
      setLanguageState(savedLanguage);
      setIsLanguagePromptOpen(false);
      return;
    }

    setLanguageState(recommendedLanguage);
    setIsLanguagePromptOpen(true);
  }, [recommendedLanguage]);

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
