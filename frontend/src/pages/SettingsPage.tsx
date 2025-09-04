import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { usePersistentSettings } from '../hooks/usePersistentState'
import { useToastActions } from '../components/ui/Toast'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { settings, updateSetting, resetSettings } = usePersistentSettings()
  const toast = useToastActions()

  const handleSettingChange = <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    updateSetting(key, value)
    toast.success('設定保存', '設定が保存されました')
  }

  const handleResetSettings = () => {
    resetSettings()
    toast.info('設定リセット', 'すべての設定をデフォルトに戻しました')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">設定</h1>
        <p className="text-gray-600">
          アプリの表示や動作を設定できます
        </p>
      </div>

      <div className="space-y-6">
        {/* テーマ設定 */}
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } shadow-sm border ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-3">表示設定</h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">テーマ</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`px-4 py-2 rounded-md text-sm ${
                    theme === 'light'
                      ? 'bg-blue-600 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ライト
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-4 py-2 rounded-md text-sm ${
                    theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ダーク
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`px-4 py-2 rounded-md text-sm ${
                    theme === 'system'
                      ? 'bg-blue-600 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  システム
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* データ更新設定 */}
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } shadow-sm border ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-3">データ設定</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                自動更新間隔 ({settings.refreshInterval}分)
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={settings.refreshInterval}
                onChange={(e) => handleSettingChange('refreshInterval', Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1分</span>
                <span>30分</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                デフォルトチャート種類
              </label>
              <select
                value={settings.chartType}
                onChange={(e) => handleSettingChange('chartType', e.target.value as 'line' | 'candlestick')}
                className={`w-full px-3 py-2 border rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <option value="line">ラインチャート</option>
                <option value="candlestick">ローソク足</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">自動更新</div>
                <div className="text-sm text-gray-500">
                  データを自動的に更新する
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoRefresh}
                  onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 ${settings.autoRefresh ? 'bg-blue-600' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
              </label>
            </div>
          </div>
        </div>

        {/* 通知設定 */}
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } shadow-sm border ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-3">通知設定</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">価格アラート</div>
                <div className="text-sm text-gray-500">
                  価格変動の通知を受け取る
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* アプリ情報 */}
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } shadow-sm border ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-3">アプリ情報</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>バージョン</span>
              <span className="text-gray-500">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>最終更新</span>
              <span className="text-gray-500">2025-09-04</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage