import React from 'react'
import { useAccessibility } from '../contexts/AccessibilityContext'
// import { useTheme } from '../contexts/ThemeContext'

interface AccessibilityPanelProps {
  isOpen: boolean
  onClose: () => void
}

const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ isOpen, onClose }) => {
  const {
    focusMode,
    reducedMotion,
    highContrast,
    largeText,
    fontSize,
    setFocusMode,
    setReducedMotion,
    setHighContrast,
    setLargeText,
    setFontSize
  } = useAccessibility()


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl transform transition-transform">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              アクセシビリティ設定
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="設定パネルを閉じる"
            >
              ✕
            </button>
          </div>

          {/* Settings */}
          <div className="space-y-6">
            {/* Focus Mode */}
            <div>
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-gray-900 dark:text-white font-medium">
                    フォーカスモード
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    キーボード操作時のフォーカスを強調
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={focusMode}
                  onChange={(e) => setFocusMode(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>

            {/* Reduced Motion */}
            <div>
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-gray-900 dark:text-white font-medium">
                    モーション削減
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    アニメーションを減らす
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>

            {/* High Contrast */}
            <div>
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-gray-900 dark:text-white font-medium">
                    高コントラスト
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    色のコントラストを強調
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>

            {/* Large Text */}
            <div>
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-gray-900 dark:text-white font-medium">
                    大きな文字
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    テキストサイズを大きくする
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={largeText}
                  onChange={(e) => setLargeText(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>

            {/* Font Size */}
            <div>
              <span className="text-gray-900 dark:text-white font-medium">
                フォントサイズ
              </span>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <button
                  onClick={() => setFontSize('small')}
                  className={`px-3 py-2 rounded ${
                    fontSize === 'small'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  } transition-colors`}
                >
                  小
                </button>
                <button
                  onClick={() => setFontSize('medium')}
                  className={`px-3 py-2 rounded ${
                    fontSize === 'medium'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  } transition-colors`}
                >
                  中
                </button>
                <button
                  onClick={() => setFontSize('large')}
                  className={`px-3 py-2 rounded ${
                    fontSize === 'large'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  } transition-colors`}
                >
                  大
                </button>
                <button
                  onClick={() => setFontSize('extra-large')}
                  className={`px-3 py-2 rounded ${
                    fontSize === 'extra-large'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  } transition-colors`}
                >
                  特大
                </button>
              </div>
            </div>

            {/* Keyboard Shortcuts Info */}
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                キーボードショートカット
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                    Tab
                  </kbd>
                  {' - 次の要素へ移動'}
                </li>
                <li>
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                    Shift + Tab
                  </kbd>
                  {' - 前の要素へ移動'}
                </li>
                <li>
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                    Enter / Space
                  </kbd>
                  {' - 選択/実行'}
                </li>
                <li>
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                    Escape
                  </kbd>
                  {' - キャンセル/閉じる'}
                </li>
                <li>
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                    Alt + F
                  </kbd>
                  {' - フォーカスモード切替'}
                </li>
                <li>
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                    Alt + M
                  </kbd>
                  {' - モーション削減切替'}
                </li>
                <li>
                  <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                    Ctrl + Shift + T
                  </kbd>
                  {' - テーマ切替'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccessibilityPanel