import React, { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'

export function SettingsPage() {
  const { theme, setTheme, actualTheme } = useTheme()
  const [refreshInterval, setRefreshInterval] = useState('5')
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    recommendations: false
  })

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
  }

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          設定
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          アプリケーションの設定をカスタマイズします
        </p>
      </div>

      <div className="space-y-6">
        {/* テーマ設定 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            テーマ設定
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            現在のテーマ: {actualTheme === 'dark' ? 'ダークモード' : 'ライトモード'}
          </p>
          <div className="space-y-3">
            {[
              { value: 'light', label: 'ライトモード' },
              { value: 'dark', label: 'ダークモード' },
              { value: 'system', label: 'システム設定に従う' }
            ].map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => handleThemeChange(option.value as any)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-gray-700 dark:text-gray-300">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* データ更新設定 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            データ更新設定
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              自動更新間隔
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1">1分</option>
              <option value="5">5分</option>
              <option value="15">15分</option>
              <option value="30">30分</option>
              <option value="0">手動更新のみ</option>
            </select>
          </div>
        </div>

        {/* 通知設定 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            通知設定
          </h3>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifications.priceAlerts}
                onChange={() => handleNotificationChange('priceAlerts')}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-700 dark:text-gray-300">
                価格アラート通知
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifications.recommendations}
                onChange={() => handleNotificationChange('recommendations')}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-700 dark:text-gray-300">
                投資判断の更新通知
              </span>
            </label>
          </div>
        </div>

        {/* 情報セクション */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            アプリケーション情報
          </h3>
          <div className="space-y-2 text-blue-800 dark:text-blue-200">
            <p>• バージョン: 1.0.0</p>
            <p>• 最終更新: 2025年1月</p>
            <p>• 開発: Claude Code</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage