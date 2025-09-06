import React, { useState, useEffect } from 'react';
import { stockApi } from '../../services/stockApi';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../ui/Button';

interface MetricsSummary {
  total_requests: number;
  slow_requests_count: number;
  average_response_time: number;
  request_rate_per_second: number;
  status_code_distribution: Record<string, number>;
  top_slow_endpoints: Array<{ endpoint: string; average_time: number }>;
  endpoint_stats: Record<string, any>;
  error_rate: number;
  uptime: number;
}

interface SlowRequest {
  timestamp: number;
  method: string;
  path: string;
  process_time: number;
  status_code: number;
  user_agent: string;
  client_ip: string;
}

interface EndpointStat {
  count: number;
  average_time: number;
  min_time: number;
  max_time: number;
}

const PerformanceDashboard: React.FC = () => {
  const { isDark } = useTheme();
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [slowRequests, setSlowRequests] = useState<SlowRequest[]>([]);
  const [endpointStats, setEndpointStats] = useState<Record<string, EndpointStat>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30秒

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const [summary, slowReqs, endpointStatsData] = await Promise.all([
        stockApi.getMetricsSummary(),
        stockApi.getSlowRequests(),
        stockApi.getEndpointStats()
      ]);
      setMetrics(summary);
      setSlowRequests(slowReqs);
      setEndpointStats(endpointStatsData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch performance metrics');
      console.error('Error fetching performance metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearMetrics = async () => {
    try {
      await stockApi.clearMetrics();
      fetchMetrics();
    } catch (err) {
      setError('Failed to clear metrics');
      console.error('Error clearing metrics:', err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading) {
    return <div className="p-6">Loading performance metrics...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  if (!metrics) {
    return <div className="p-6">No metrics data available</div>;
  }

  return (
    <div className={`p-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Performance Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchMetrics}>
            Refresh
          </Button>
          <Button variant="outline" onClick={clearMetrics}>
            Clear Metrics
          </Button>
        </div>
      </div>
      
      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-2">Total Requests</h2>
          <p className="text-2xl">{metrics.total_requests}</p>
        </div>
        <div className={`p-4 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-2">Slow Requests</h2>
          <p className="text-2xl text-yellow-600">{metrics.slow_requests_count}</p>
        </div>
        <div className={`p-4 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-2">Avg Response Time</h2>
          <p className="text-2xl">{metrics.average_response_time.toFixed(3)}s</p>
        </div>
        <div className={`p-4 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-lg font-semibold mb-2">Error Rate</h2>
          <p className="text-2xl">{(metrics.error_rate * 100).toFixed(2)}%</p>
        </div>
      </div>

      {/* エンドポイント統計 */}
      <div className={`mb-6 p-4 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-xl font-semibold mb-4">Endpoint Performance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Endpoint</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Requests</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Avg Time (s)</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Min Time (s)</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Max Time (s)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
              {Object.entries(endpointStats).map(([endpoint, stats]) => (
                <tr key={endpoint}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{endpoint}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{stats.count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{stats.average_time.toFixed(3)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{stats.min_time.toFixed(3)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{stats.max_time.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* トップスローエンドポイント */}
      <div className={`mb-6 p-4 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-xl font-semibold mb-4">Top Slow Endpoints</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Endpoint</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Avg Time (s)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
              {metrics.top_slow_endpoints.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{item.endpoint}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{item.average_time.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 最近のスローリクエスト */}
      <div className={`p-4 rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-xl font-semibold mb-4">Recent Slow Requests</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Path</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Time (s)</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Client IP</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
              {slowRequests.map((req, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(req.timestamp * 1000).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{req.method}</td>
                  <td className="px-6 py-4 text-sm">{req.path}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                    {req.process_time.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{req.status_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{req.client_ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;