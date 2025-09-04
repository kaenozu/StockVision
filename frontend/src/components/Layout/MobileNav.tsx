import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'

interface NavItem {
  path: string
  label: string
  icon: string
}

export function MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()

  const navItems: NavItem[] = [
    { path: '/', label: 'ホーム', icon: '🏠' },
    { path: '/watchlist', label: 'ウォッチ', icon: '⭐' },
    { path: '/search', label: '検索', icon: '🔍' },
    { path: '/settings', label: '設定', icon: '⚙️' },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${
      theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
    } border-t`}>
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
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
          </button>
        ))}
      </div>
    </nav>
  )
}