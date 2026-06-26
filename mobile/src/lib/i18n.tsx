// Lightweight bilingual i18n matching the web app's t(en, ta) signature.
// Lang persists in AsyncStorage. 'both' stacks EN + Tamil where used.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getPref, setPref } from './secureStore';

export type Lang = 'en' | 'ta' | 'both';

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
    lang: 'en',
    setLang: () => {},
});

const LANG_KEY = 'lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<Lang>('en');

    useEffect(() => {
        getPref(LANG_KEY).then((v) => {
            if (v === 'en' || v === 'ta' || v === 'both') setLangState(v);
        });
    }, []);

    const setLang = useCallback((l: Lang) => {
        setLangState(l);
        setPref(LANG_KEY, l);
    }, []);

    return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

// t('English', 'தமிழ்') — returns the active language string ('both' prefers English inline).
export function useT() {
    const { lang } = useLang();
    return useCallback(
        (en: string, ta?: string) => {
            if (lang === 'ta' && ta) return ta;
            if (lang === 'both' && ta) return `${en} / ${ta}`;
            return en;
        },
        [lang],
    );
}
