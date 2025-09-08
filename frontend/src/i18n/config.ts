import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// ドキュメントのサポート言語
export const SUPPORTED_LANGUAGES = [
  { code: 'ja', name: '日本語' },
  { code: 'en', name: 'English' },
  // 他の言語も追加可能
];

// デフォルト言語
export const DEFAULT_LANGUAGE = 'ja';

i18n
  // i18next-http-backendをロード
  .use(Backend)
  // ブラウザの言語検出をロード
  .use(LanguageDetector)
  // react-i18nextをロード
  .use(initReactI18next)
  // 初期化
  .init({
    // バックエンドの設定
    backend: {
      // 翻訳ファイルのパス
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    // 言語検出の設定
    detection: {
      // クッキー、ローカルストレージ、パス、クエリパラメータから言語を検出
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      
      // クエリパラメータのキー
      lookupQuerystring: 'lang',
      
      // クッキーの名前
      lookupCookie: 'i18next',
      
      // ローカルストレージのキー
      lookupLocalStorage: 'i18nextLng',
      
      // パスから言語を検出する正規表現
      lookupFromPathIndex: 0,
      
      // クッキーのオプション
      cookieOptions: { path: '/', sameSite: 'strict' },
    },
    
    // フォールバック言語
    fallbackLng: DEFAULT_LANGUAGE,
    
    // デバッグモード
    debug: import.meta.env.DEV,
    
    // 名前空間
    ns: ['common', 'docs', 'navigation'],
    defaultNS: 'common',
    
    // キーの区切り文字
    keySeparator: false,
    
    // 名前空間の区切り文字
    nsSeparator: false,
    
    // 言語を変更したときにDOMを更新
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    
    // リアクティブに言語を変更
    react: {
      useSuspense: false,
    },
    
    // 初期化処理の設定
    initImmediate: false,
    
    // サポートする言語
    supportedLngs: SUPPORTED_LANGUAGES.map(lang => lang.code),
  });

export default i18n;