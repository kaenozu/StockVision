import React, { useState, useEffect } from 'react';
import { stockApi } from '../../services/stockApi';

interface MetricsSummary {
  total_requests: number;
  slow_requests_count: number;
  average_response_time: number;
  request_rate_per_second: number;
  status_code_distribution: Record<string, number>;
  top_slow_endpoints: Array<{ endpoint: string; average_time: number }>;
  endpoint_stats: Record<string, any>;
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

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [slowRequests, setSlowRequests] = useState<SlowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const summary = await stockApi.getMetricsSummary();
      const slowReqs = await stockApi.getSlowRequests();
      setMetrics(summary);
      setSlowRequests(slowReqs);
      setError(null);
    } catch (err) {
      setError('Failed to fetch performance metrics');
      console.error('Error fetching performance metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // 30秒ごとにメトリクスを更新
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Performance Dashboard</h1>
      
      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold">Total Requests</h2>
          <p className="text-2xl">{metrics.total_requests}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold">Slow Requests</h2>
          <p className="text-2xl text-yellow-600">{metrics.slow_requests_count}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold">Avg Response Time</h2>
          <p className="text-2xl">{metrics.average_response_time.toFixed(3)}s</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold">Req Rate</h2>
          <p className="text-2xl">{metrics.request_rate_per_second.toFixed(2)}/s</p>
        </div>
      </div>

      {/* ステータスコード分布 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Status Code Distribution</h2>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(metrics.status_code_distribution).map(([code, count]) => (
            <div key={code} className="text-center">
              <div className="text-lg font-bold">{code}</div>
              <div className="text-sm">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* トップスローエンドポイント */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Top Slow Endpoints</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Endpoint
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Time (s)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.top_slow_endpoints.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.endpoint}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.average_time.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 最近のスローリクエスト */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Slow Requests</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Path
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time (s)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {slowRequests.map((req, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(req.timestamp * 1000).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {req.method}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {req.path}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                  {req.process_time.toFixed(3)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {req.status_code}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PerformanceDashboard;