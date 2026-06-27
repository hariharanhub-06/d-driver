'use client';

import { createContext, useContext, useState, useEffect } from 'react';

export type Lang = 'en' | 'ta' | 'both';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'both',
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('both');

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null;
    if (stored && ['en', 'ta', 'both'].includes(stored)) setLangState(stored);

    // Keep every open tab/iframe (e.g. the /qa multi-frame page) in sync: the `storage`
    // event fires in the OTHER frames when one of them changes the language, so a parent
    // frame that loaded before you picked English still updates.
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'lang' && e.newValue && ['en', 'ta', 'both'].includes(e.newValue)) {
        setLangState(e.newValue as Lang);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
