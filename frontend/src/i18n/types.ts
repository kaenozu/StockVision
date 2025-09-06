// i18n関連の型定義

// サポートする言語
export interface SupportedLanguage {
  code: string;
  name: string;
}

// 言語コード
export type LanguageCode = 'ja' | 'en'; // 他の言語コードも追加可能

// 翻訳キー
export type TranslationKey = string;

// 翻訳辞書
export interface Translations {
  [key: string]: string | Translations;
}

// i18nコンテキストのプロパティ
export interface I18nContextProps {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: TranslationKey, options?: Record<string, any>) => string;
  changeLanguage: (lang: LanguageCode) => Promise<void>;
  languages: SupportedLanguage[];
}