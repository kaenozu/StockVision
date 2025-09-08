import React, { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'

export function SettingsPage() {
  const { theme, setTheme, actualTheme } = useTheme()
  const [refreshInterval, setRefreshInterval] = useState('5')
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    recommendations: false,
    emailNotifications: true,
    pushNotifications: false,
    browserNotifications: true
  })
  
  const [chartSettings, setChartSettings] = useState({
    defaultTimeframe: '30d',
    chartType: 'line',
    showVolume: true,
    colorScheme: 'default',
    defaultIndicators: {
      sma: true,
      ema: false,
      rsi: true,
      macd: false,
      bollinger: false
    }
  })
  
  const [displaySettings, setDisplaySettings] = useState({
    currency: 'JPY',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: 'japanese',
    pageSize: 20,
    showAnimations: true
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

  const handleChartSettingChange = (key: string, value: any) => {
    if (key.startsWith('defaultIndicators.')) {
      const indicatorKey = key.split('.')[1]
      setChartSettings(prev => ({
        ...prev,
        defaultIndicators: {
          ...prev.defaultIndicators,
          [indicatorKey]: value
        }
      }))
    } else {
      setChartSettings(prev => ({
        ...prev,
        [key]: value
      }))
    }
  }

  const handleDisplaySettingChange = (key: keyof typeof displaySettings, value: any) => {
    setDisplaySettings(prev => ({
      ...prev,
      [key]: value
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
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">通知タイプ</h4>
              <div className="space-y-3">
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
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">通知方法</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifications.emailNotifications}
                    onChange={() => handleNotificationChange('emailNotifications')}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-700 dark:text-gray-300">
                    メール通知
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifications.pushNotifications}
                    onChange={() => handleNotificationChange('pushNotifications')}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-700 dark:text-gray-300">
                    プッシュ通知
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifications.browserNotifications}
                    onChange={() => handleNotificationChange('browserNotifications')}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-700 dark:text-gray-300">
                    ブラウザ通知
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* チャート設定 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            チャート表示設定
          </h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  デフォルト期間
                </label>
                <select
                  value={chartSettings.defaultTimeframe}
                  onChange={(e) => handleChartSettingChange('defaultTimeframe', e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="7d">7日</option>
                  <option value="30d">30日</option>
                  <option value="90d">90日</option>
                  <option value="1y">1年</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  チャートタイプ
                </label>
                <select
                  value={chartSettings.chartType}
                  onChange={(e) => handleChartSettingChange('chartType', e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="line">ラインチャート</option>
                  <option value="candlestick">ローソク足</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  カラーテーマ
                </label>
                <select
                  value={chartSettings.colorScheme}
                  onChange={(e) => handleChartSettingChange('colorScheme', e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="default">デフォルト</option>
                  <option value="colorful">カラフル</option>
                  <option value="monochrome">モノクローム</option>
                  <option value="pastel">パステル</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={chartSettings.showVolume}
                    onChange={(e) => handleChartSettingChange('showVolume', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 text-gray-700 dark:text-gray-300">
                    出来高を表示
                  </span>
                </label>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">デフォルト表示指標</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(chartSettings.defaultIndicators).map(([key, value]) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleChartSettingChange(`defaultIndicators.${key}`, e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-gray-700 dark:text-gray-300 text-sm">
                      {key === 'sma' ? 'SMA (単純移動平均)' :
                       key === 'ema' ? 'EMA (指数移動平均)' :
                       key === 'rsi' ? 'RSI' :
                       key === 'macd' ? 'MACD' :
                       key === 'bollinger' ? 'ボリンジャーバンド' : key.toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 表示設定 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            表示設定
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                通貨表示
              </label>
              <select
                value={displaySettings.currency}
                onChange={(e) => handleDisplaySettingChange('currency', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="JPY">日本円 (¥)</option>
                <option value="USD">米ドル ($)</option>
                <option value="EUR">ユーロ (€)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                日付形式
              </label>
              <select
                value={displaySettings.dateFormat}
                onChange={(e) => handleDisplaySettingChange('dateFormat', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                数値形式
              </label>
              <select
                value={displaySettings.numberFormat}
                onChange={(e) => handleDisplaySettingChange('numberFormat', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="japanese">日本式 (1,000,000)</option>
                <option value="international">国際式 (1,000,000)</option>
                <option value="metric">メトリック (1M)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ページサイズ
              </label>
              <select
                value={displaySettings.pageSize}
                onChange={(e) => handleDisplaySettingChange('pageSize', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="10">10件</option>
                <option value="20">20件</option>
                <option value="50">50件</option>
                <option value="100">100件</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={displaySettings.showAnimations}
                onChange={(e) => handleDisplaySettingChange('showAnimations', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-700 dark:text-gray-300">
                アニメーション効果を有効にする
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