import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../i18n/config';
import { I18nContextProps, SupportedLanguage } from '../i18n/types';

export const I18nContext = createContext<I18nContextProps | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const { i18n, t } = useTranslation();
  const [language, setLanguage] = useState(i18n.language);

  useEffect(() => {
    // i18nの言語が変更されたときに状態を更新
    const handleLanguageChanged = (lng: string) => {
      setLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
  };

  const value: I18nContextProps = {
    language: language as any, // 型アサーション
    setLanguage: changeLanguage,
    t,
    changeLanguage,
    languages: SUPPORTED_LANGUAGES,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};