/**
 * Performance Monitoring Dashboard Component
 * 
 * リアルタイムパフォーマンス監視ダッシュボード
 * システムメトリクス、アラート、パフォーマンス統計を表示
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useResponsive } from '../../contexts/ResponsiveContext';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import ErrorMessage from '../UI/ErrorMessage';

// 型定義
interface SystemMetrics {
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  memory_used_mb: number;
  memory_available_mb: number;
  disk_usage_percent: number;
  disk_free_gb: number;
  active_connections: number;
}

interface PerformanceAlert {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metric_type: string;
  message: string;
  value: number;
  threshold: number;
  endpoint?: string;
  resolved: boolean;
  resolved_at?: string;
}

interface PerformanceStats {
  total_requests: number;
  total_errors: number;
  average_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  uptime_start: string;
}

interface DashboardData {
  timestamp: string;
  uptime_seconds: number;
  system_metrics: SystemMetrics | null;
  performance_stats: PerformanceStats;
  active_alerts: PerformanceAlert[];
  recent_alerts: PerformanceAlert[];
  endpoint_stats: Record<string, any>;
  monitoring_active: boolean;
  total_active_alerts: number;
}

interface MetricHistory {
  timestamp: string;
  value: number;
}

export interface PerformanceDashboardProps {
  refreshInterval?: number;
  className?: string;
  showDetailedMetrics?: boolean;
  showAlerts?: boolean;
  showSystemMetrics?: boolean;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  refreshInterval = 30000, // 30秒
  className = '',
  showDetailedMetrics = true,
  showAlerts = true,
  showSystemMetrics = true
}) => {
  const { announce } = useAccessibility();
  const { isMobile } = useResponsive();

  // 状態管理
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStartingMonitoring, setIsStartingMonitoring] = useState(false);
  const [cpuHistory, setCpuHistory] = useState<MetricHistory[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<MetricHistory[]>([]);
  
  // データ取得
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/metrics/dashboard');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetricHistory = async (metricType: string) => {
    try {
      const response = await fetch(`/api/metrics/history/${metricType}?hours=1`);
      if (response.ok) {
        const data = await response.json();
        if (metricType === 'cpu_usage') {
          setCpuHistory(data);
        } else if (metricType === 'memory_usage') {
          setMemoryHistory(data);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${metricType} history:`, err);
    }
  };

  // 監視開始/停止
  const toggleMonitoring = async () => {
    if (!dashboardData) return;
    
    setIsStartingMonitoring(true);
    try {
      const endpoint = dashboardData.monitoring_active 
        ? '/api/metrics/monitoring/stop'
        : '/api/metrics/monitoring/start';
      
      const response = await fetch(endpoint, { method: 'POST' });
      if (response.ok) {
        await fetchDashboardData();
        announce(
          dashboardData.monitoring_active 
            ? '監視を停止しました' 
            : '監視を開始しました'
        );
      } else {
        throw new Error('監視状態の変更に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作に失敗しました');
    } finally {
      setIsStartingMonitoring(false);
    }
  };

  // 初期データ取得と定期更新
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // メトリクス履歴取得
  useEffect(() => {
    if (dashboardData?.monitoring_active && showSystemMetrics) {
      fetchMetricHistory('cpu_usage');
      fetchMetricHistory('memory_usage');
      
      const interval = setInterval(() => {
        fetchMetricHistory('cpu_usage');
        fetchMetricHistory('memory_usage');
      }, 60000); // 1分間隔
      
      return () => clearInterval(interval);
    }
  }, [dashboardData?.monitoring_active, showSystemMetrics]);

  // アラートの重要度カラー
  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'error': return 'text-red-500 bg-red-50 border-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // システムメトリクスの状態カラー
  const getMetricStatusColor = (value: number, warningThreshold: number = 70, criticalThreshold: number = 85) => {
    if (value >= criticalThreshold) return 'text-red-600';
    if (value >= warningThreshold) return 'text-yellow-600';
    return 'text-green-600';
  };

  // アップタイム表示フォーマット
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}日 ${hours}時間 ${minutes}分`;
    } else if (hours > 0) {
      return `${hours}時間 ${minutes}分`;
    } else {
      return `${minutes}分`;
    }
  };

  // 簡単なチャート描画（シンプルな線グラフ）
  const renderSimpleChart = (data: MetricHistory[], color: string = '#3B82F6') => {
    if (data.length < 2) return null;

    const values = data.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return (
      <div className="h-16 w-full relative">
        <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1"
            points={data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 50 - ((d.value - min) / range) * 50;
              return `${x},${y}`;
            }).join(' ')}
          />
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <LoadingSpinner size="lg" showMessage message="ダッシュボードを読み込んでいます..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <ErrorMessage 
          error={error}
          onRetry={fetchDashboardData}
          retryText="再読み込み"
        />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        <p>ダッシュボードデータが取得できませんでした</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">パフォーマンス監視</h2>
          <p className="text-sm text-gray-500 mt-1">
            最終更新: {new Date(dashboardData.timestamp).toLocaleString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div 
              className={`w-3 h-3 rounded-full ${
                dashboardData.monitoring_active ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm font-medium">
              {dashboardData.monitoring_active ? '監視中' : '停止中'}
            </span>
          </div>
          
          <Button
            variant={dashboardData.monitoring_active ? 'secondary' : 'primary'}
            onClick={toggleMonitoring}
            loading={isStartingMonitoring}
            disabled={isStartingMonitoring}
            size={isMobile ? 'sm' : 'md'}
          >
            {dashboardData.monitoring_active ? '監視停止' : '監視開始'}
          </Button>
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">稼働時間</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatUptime(dashboardData.uptime_seconds)}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">総リクエスト数</div>
          <div className="text-lg font-semibold text-gray-900">
            {dashboardData.performance_stats.total_requests.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">平均レスポンス時間</div>
          <div className="text-lg font-semibold text-gray-900">
            {dashboardData.performance_stats.average_response_time.toFixed(3)}s
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">アクティブアラート</div>
          <div className={`text-lg font-semibold ${
            dashboardData.total_active_alerts > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {dashboardData.total_active_alerts}
          </div>
        </div>
      </div>

      {/* システムメトリクス */}
      {showSystemMetrics && dashboardData.system_metrics && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">システムメトリクス</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU使用率 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">CPU使用率</span>
                <span className={`text-sm font-medium ${
                  getMetricStatusColor(dashboardData.system_metrics.cpu_percent)
                }`}>
                  {dashboardData.system_metrics.cpu_percent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full ${
                    dashboardData.system_metrics.cpu_percent >= 85 ? 'bg-red-500' :
                    dashboardData.system_metrics.cpu_percent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${dashboardData.system_metrics.cpu_percent}%` }}
                />
              </div>
              {cpuHistory.length > 0 && renderSimpleChart(cpuHistory, '#EF4444')}
            </div>

            {/* メモリ使用率 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">メモリ使用率</span>
                <span className={`text-sm font-medium ${
                  getMetricStatusColor(dashboardData.system_metrics.memory_percent)
                }`}>
                  {dashboardData.system_metrics.memory_percent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full ${
                    dashboardData.system_metrics.memory_percent >= 85 ? 'bg-red-500' :
                    dashboardData.system_metrics.memory_percent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${dashboardData.system_metrics.memory_percent}%` }}
                />
              </div>
              {memoryHistory.length > 0 && renderSimpleChart(memoryHistory, '#F59E0B')}
            </div>

            {/* ディスク使用率 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">ディスク使用率</span>
                <span className={`text-sm font-medium ${
                  getMetricStatusColor(dashboardData.system_metrics.disk_usage_percent)
                }`}>
                  {dashboardData.system_metrics.disk_usage_percent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full ${
                    dashboardData.system_metrics.disk_usage_percent >= 85 ? 'bg-red-500' :
                    dashboardData.system_metrics.disk_usage_percent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${dashboardData.system_metrics.disk_usage_percent}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                空き容量: {dashboardData.system_metrics.disk_free_gb.toFixed(1)}GB
              </div>
            </div>
          </div>
        </div>
      )}

      {/* アラート */}
      {showAlerts && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">アクティブアラート</h3>
          
          {dashboardData.active_alerts.length === 0 ? (
            <p className="text-green-600 text-sm">現在、アクティブなアラートはありません</p>
          ) : (
            <div className="space-y-3">
              {dashboardData.active_alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-medium uppercase px-2 py-1 rounded ${
                          alert.severity === 'critical' ? 'bg-red-600 text-white' :
                          alert.severity === 'error' ? 'bg-red-500 text-white' :
                          alert.severity === 'warning' ? 'bg-yellow-500 text-white' :
                          'bg-blue-500 text-white'
                        }`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                      {alert.endpoint && (
                        <p className="text-xs text-gray-500 mt-1">
                          エンドポイント: {alert.endpoint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* エンドポイント統計 */}
      {showDetailedMetrics && Object.keys(dashboardData.endpoint_stats).length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">エンドポイント統計</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    エンドポイント
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    リクエスト数
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    平均レスポンス時間
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    エラー率
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(dashboardData.endpoint_stats).map(([endpoint, stats]) => (
                  <tr key={endpoint}>
                    <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                      {endpoint}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                      {stats.request_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                      {stats.average_response_time.toFixed(3)}s
                    </td>
                    <td className={`px-4 py-2 text-sm text-right ${
                      stats.error_rate > 0.1 ? 'text-red-600' :
                      stats.error_rate > 0.05 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {(stats.error_rate * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;