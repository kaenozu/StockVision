/**
 * Performance Monitoring Page
 * 
 * パフォーマンス監視とメトリクスダッシュボードページ
 * システム管理者向けの包括的な監視インターフェース
 */

import React, { useState } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useResponsive } from '../contexts/ResponsiveContext';
import PerformanceDashboard from '../components/monitoring/PerformanceDashboard';
import Button from '../components/UI/Button';

interface PerformanceMonitoringPageProps {
  className?: string;
}

const PerformanceMonitoringPage: React.FC<PerformanceMonitoringPageProps> = ({
  className = ''
}) => {
  const { announce } = useAccessibility();
  const { isMobile } = useResponsive();

  const [refreshInterval, setRefreshInterval] = useState(30000); // 30秒
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showSystemMetrics, setShowSystemMetrics] = useState(true);

  // 設定変更ハンドラ
  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
    announce(`更新間隔を${interval / 1000}秒に変更しました`);
  };

  const toggleDetailedMetrics = () => {
    const newValue = !showDetailedMetrics;
    setShowDetailedMetrics(newValue);
    announce(newValue ? '詳細メトリクスを表示します' : '詳細メトリクスを非表示にします');
  };

  const toggleAlerts = () => {
    const newValue = !showAlerts;
    setShowAlerts(newValue);
    announce(newValue ? 'アラートを表示します' : 'アラートを非表示にします');
  };

  const toggleSystemMetrics = () => {
    const newValue = !showSystemMetrics;
    setShowSystemMetrics(newValue);
    announce(newValue ? 'システムメトリクスを表示します' : 'システムメトリクスを非表示にします');
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* ページヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                パフォーマンス監視
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                システムパフォーマンスとアプリケーション品質の監視
              </p>
            </div>

            {/* 設定メニュー */}
            {!isMobile && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">更新間隔:</label>
                  <select
                    value={refreshInterval}
                    onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={10000}>10秒</option>
                    <option value={30000}>30秒</option>
                    <option value={60000}>1分</option>
                    <option value={300000}>5分</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 設定パネル */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">表示設定</h3>
          
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showSystemMetrics}
                onChange={toggleSystemMetrics}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">システムメトリクス</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showAlerts}
                onChange={toggleAlerts}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">アラート</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showDetailedMetrics}
                onChange={toggleDetailedMetrics}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">詳細メトリクス</span>
            </label>

            {isMobile && (
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">更新間隔:</label>
                <select
                  value={refreshInterval}
                  onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10000}>10秒</option>
                  <option value={30000}>30秒</option>
                  <option value={60000}>1分</option>
                  <option value={300000}>5分</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* パフォーマンスダッシュボード */}
        <PerformanceDashboard
          refreshInterval={refreshInterval}
          showDetailedMetrics={showDetailedMetrics}
          showAlerts={showAlerts}
          showSystemMetrics={showSystemMetrics}
          className="max-w-none"
        />

        {/* 追加情報パネル */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                パフォーマンス監視について
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>システムリソース（CPU、メモリ、ディスク）をリアルタイムで監視</li>
                  <li>APIレスポンス時間とエラー率を追跡</li>
                  <li>設定された閾値を超過した場合にアラートを生成</li>
                  <li>パフォーマンス問題の早期発見と分析をサポート</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* アクセシビリティ改善のための追加情報 */}
        <div className="mt-4 text-xs text-gray-500">
          <p>
            このページは{refreshInterval / 1000}秒間隔で自動更新されます。
            スクリーンリーダーをお使いの場合は、重要な変更をお知らせします。
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitoringPage;