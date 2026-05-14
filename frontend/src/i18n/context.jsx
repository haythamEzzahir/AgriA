import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LANGUAGES = [
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'en', label: 'English', dir: 'ltr' },
];

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('agri_lang') || 'ar');
  const [dict, setDict] = useState({});

  useEffect(() => {
    import(`./locales/${lang}.js`).then((mod) => setDict(mod.default)).catch(() => {});
    localStorage.setItem('agri_lang', lang);
    document.documentElement.dir = LANGUAGES.find((l) => l.code === lang)?.dir || 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key, fallback) => {
    const keys = key.split('.');
    let val = dict;
    for (const k of keys) {
      if (val && typeof val === 'object') val = val[k];
      else return fallback || key;
    }
    return val || fallback || key;
  }, [dict]);

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const isRTL = currentLang.dir === 'rtl';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL, languages: LANGUAGES, currentLang }}>
      <div dir={currentLang.dir} className={isRTL ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
