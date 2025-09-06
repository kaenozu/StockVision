import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useTranslation } from 'react-i18next' // i18nをインポート
import { SUPPORTED_LANGUAGES } from '../../i18n/config' // サポート言語をインポート

interface NavItem {
  path: string
  label: string
  icon: string
}

export function MobileNav() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { i18n, t } = useTranslation(['common']) // 翻訳フックを使用

  const navItems: NavItem[] = [
    { path: '/', label: t('common.home'), icon: '🏠' },
    { path: '/watchlist', label: t('common.watchlist'), icon: '⭐' },
    { path: '/performance', label: t('common.performance'), icon: '📊' },
    { path: '/docs', label: t('common.documents'), icon: '📚' },
    { path: '/search', label: t('common.search'), icon: '🔍' },
    { path: '/settings', label: t('common.settings'), icon: '⚙️' },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  // 言語を変更する関数
  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
  };

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${
      theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
    } border-t`}>
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isActive(item.path)
                ? theme === 'dark' 
                  ? 'text-blue-400 bg-gray-800' 
                  : 'text-blue-600 bg-blue-50'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-label={`${item.label}ページに移動`}
            aria-current={isActive(item.path) ? 'page' : undefined}
          >
            <span className="text-xl" role="img" aria-hidden="true">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
      
      {/* モバイル用の追加コントロール */}
      <div className={`px-4 py-2 border-t ${
        theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-center justify-between">
          {/* テーマ切り替え */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full ${
              theme === 'dark' 
                ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-300' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            aria-label={t('common.theme')}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          
          {/* 言語セレクター */}
          <select
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
            className={`
              px-2 py-1 rounded-md text-sm
              ${theme === 'dark' 
                ? 'bg-gray-800 text-gray-300 border-gray-700' 
                : 'bg-white text-gray-700 border-gray-300'
              }
            `}
            aria-label={t('common.language')}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </nav>
  )
}