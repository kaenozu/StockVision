/**
 * Real-time Price Chart Component
 * 
 * Interactive price chart with real-time updates using Chart.js and WebSocket data
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { ChartDataset, ChartOptions } from 'chart.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
  ChartData as ChartJSData,
  ChartDataset as ChartJSDataset
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { PriceHistoryItem, ChartConfig, ChartTimeframe, ChartType } from '../../types/stock';
import { formatPrice, formatDateShort, formatDateJapanese } from '../../utils/formatters';
import LoadingSpinner from '../UI/LoadingSpinner';
import ErrorMessage from '../UI/ErrorMessage';
import Button, { ButtonGroup } from '../UI/Button';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { getRealtimePrice } from '../../services/webSocketMiddleware';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface RealtimePriceChartProps {
  data: PriceHistoryItem[];
  loading?: boolean;
  error?: string | null;
  config?: Partial<ChartConfig>;
  onConfigChange?: (config: ChartConfig) => void;
  onRefresh?: () => void;
  stockCode?: string;
  height?: number;
  className?: string;
}

const timeframeOptions: { value: ChartTimeframe; label: string }[] = [
  { value: '7d', label: '7日間' },
  { value: '30d', label: '30日間' },
  { value: '90d', label: '90日間' },
  { value: '1y', label: '1年間' }
];

const chartTypeOptions: { value: ChartType; label: string }[] = [
  { value: 'line', label: 'ライン' },
  { value: 'candlestick', label: 'ローソク足' }
];

import { calculateMovingAverage } from '../../utils/chartHelpers';

export function RealtimePriceChart({
  data,
  loading = false,
  error = null,
  config = {},
  onConfigChange,
  onRefresh,
  stockCode = '',
  height = 400,
  className = ''
}: RealtimePriceChartProps) {
  const { isDark } = useTheme();
  const dispatch = useAppDispatch();
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    timeframe: '30d',
    chart_type: 'line',
    show_volume: false,
    theme: isDark ? 'dark' : 'light',
    ...config
  });
  
  const [showMA5, setShowMA5] = useState(false);
  const [showMA20, setShowMA20] = useState(false);
  const [realtimeData, setRealtimeData] = useState<{price: number, timestamp: string}[]>([]);
  const maxRealtimePoints = 50; // Maximum number of realtime points to display

  // Get real-time price from Redux store
  const realtimePrice = useAppSelector((state) => 
    stockCode ? getRealtimePrice(state, stockCode) : undefined
  );

  // Reference to track if we've subscribed to real-time data
  const isSubscribed = useRef(false);

  const updateConfig = (newConfig: Partial<ChartConfig>) => {
    const updatedConfig = { ...chartConfig, ...newConfig };
    setChartConfig(updatedConfig);
    onConfigChange?.(updatedConfig);
  };

  // Subscribe to real-time data when component mounts
  useEffect(() => {
    if (stockCode && !isSubscribed.current) {
      // Dispatch action to subscribe to real-time data
      dispatch({ type: 'REALTIME_SUBSCRIBE', payload: { stockCode } });
      isSubscribed.current = true;
    }

    // Cleanup subscription on unmount
    return () => {
      if (stockCode && isSubscribed.current) {
        dispatch({ type: 'REALTIME_UNSUBSCRIBE', payload: { stockCode } });
        isSubscribed.current = false;
      }
    };
  }, [stockCode, dispatch]);

  // Update chart with real-time data
  useEffect(() => {
    if (realtimePrice) {
      const newPoint = {
        price: realtimePrice.price,
        timestamp: realtimePrice.timestamp
      };

      setRealtimeData(prev => {
        // Add new point and maintain maximum length
        const newData = [...prev, newPoint];
        if (newData.length > maxRealtimePoints) {
          return newData.slice(newData.length - maxRealtimePoints);
        }
        return newData;
      });
    }
  }, [realtimePrice]);

  // Process data for chart
  const chartData = useMemo((): ChartJSData<'line'> => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Sort data by date (most recent first, then reverse for chart display)
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Combine historical data with real-time data
    let allData = sortedData;
    let allLabels = sortedData.map(item => formatDateShort(item.date));
    
    // Add real-time data points if available
    if (realtimeData.length > 0) {
      // Create new data points for real-time data
      const realtimePoints = realtimeData.map((point, index) => ({
        date: point.timestamp,
        open: point.price,
        high: point.price,
        low: point.price,
        close: point.price,
        volume: 0 // Placeholder volume
      }));
      
      // Combine with historical data
      allData = [...sortedData, ...realtimePoints];
      allLabels = [...sortedData.map(item => formatDateShort(item.date)), 
                   ...realtimePoints.map(() => 'リアルタイム')];
    }

    const closePrices = allData.map(item => item.close);
    
    const datasets: ChartDataset<'line', (number | null)[]>[] = [];
    
    if (chartConfig.chart_type === 'line') {
      // Main price line
      datasets.push({
        label: '終値',
        data: closePrices,
        borderColor: isDark ? 'rgb(99, 179, 237)' : 'rgb(59, 130, 246)',
        backgroundColor: isDark ? 'rgba(99, 179, 237, 0.1)' : 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 6,
        pointBackgroundColor: isDark ? 'rgb(99, 179, 237)' : 'rgb(59, 130, 246)',
        pointBorderColor: isDark ? 'rgb(31, 41, 55)' : 'white',
        pointBorderWidth: 2
      });
      
      // Moving averages
      if (showMA5) {
        const ma5 = calculateMovingAverage(closePrices, 5);
        datasets.push({
          label: 'MA5',
          data: ma5,
          borderColor: isDark ? 'rgb(248, 113, 113)' : 'rgb(239, 68, 68)',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderDash: [5, 5]
        });
      }
      
      if (showMA20) {
        const ma20 = calculateMovingAverage(closePrices, 20);
        datasets.push({
          label: 'MA20',
          data: ma20,
          borderColor: isDark ? 'rgb(134, 239, 172)' : 'rgb(34, 197, 94)',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderDash: [10, 5]
        });
      }
      
      return { labels: allLabels, datasets };
    } else {
      // For candlestick, we'll use a line chart with OHLC data approximation
      // In a real implementation, you'd use a candlestick chart library
      return {
        labels: allLabels,
        datasets: [
          {
            label: '高値',
            data: allData.map(item => item.high),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'transparent',
            borderWidth: 1,
            pointRadius: 1
          },
          {
            label: '安値',
            data: allData.map(item => item.low),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'transparent',
            borderWidth: 1,
            pointRadius: 1
          },
          {
            label: '終値',
            data: allData.map(item => item.close),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderWidth: 2,
            fill: false,
            pointRadius: 2
          }
        ]
      };
    }
  }, [data, chartConfig.chart_type, isDark, showMA5, showMA20, realtimeData]);

  // Chart options
  const chartOptions = useMemo<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: 'Noto Sans JP, sans-serif'
          },
          color: isDark ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)'
        }
      },
      title: {
        display: !!stockCode,
        text: stockCode ? `${stockCode} - 価格チャート` : '',
        font: {
          family: 'Noto Sans JP, sans-serif',
          size: 16,
          weight: 700
        },
        color: isDark ? 'rgb(209, 213, 219)' : 'rgb(55, 65, 81)'
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        titleFont: {
          family: 'Noto Sans JP, sans-serif'
        },
        bodyFont: {
          family: 'Noto Sans JP, sans-serif'
        },
        callbacks: {
          title: function(context: TooltipItem<'line'>[]) {
            const dataIndex = context[0]?.dataIndex;
            if (dataIndex !== undefined && data[dataIndex]) {
              return formatDateJapanese(data[dataIndex].date);
            }
            return '';
          },
          label: function(context: TooltipItem<'line'>) {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${formatPrice(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '日付',
          font: {
            family: 'Noto Sans JP, sans-serif'
          },
          color: isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)'
        },
        ticks: {
          font: {
            family: 'Noto Sans JP, sans-serif'
          },
          color: isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)'
        },
        grid: {
          color: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(156, 163, 175, 0.3)'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '価格 (¥)',
          font: {
            family: 'Noto Sans JP, sans-serif'
          },
          color: isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)'
        },
        ticks: {
          font: {
            family: 'Noto Sans JP, sans-serif'
          },
          color: isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)',
          callback: function(this, tickValue: string | number) {
            return typeof tickValue === 'number' ? formatPrice(tickValue) : String(tickValue);
          }
        },
        grid: {
          color: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(156, 163, 175, 0.3)'
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    },
    animation: {
      duration: 500 // Animation duration for real-time updates
    }
  }), [stockCode, data, isDark]);

  if (loading) {
    return (
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-md border ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-center" style={{ height }}>
            <LoadingSpinner size="lg" showMessage message="チャートを読み込み中..." />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
        <div className="p-6">
          <ErrorMessage 
            error={error} 
            onRetry={onRefresh}
            retryText="再読み込み"
          />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-medium mb-2">チャートデータがありません</h3>
            <p className="text-gray-400 mb-4">株式コードを検索してチャートを表示してください</p>
            {onRefresh && (
              <Button variant="outline" onClick={onRefresh}>
                データを取得
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-md border ${className}`}>
      {/* Chart Controls */}
      <div className={`p-4 ${isDark ? 'border-gray-700' : 'border-gray-200'} border-b`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>価格チャート</h3>
            {stockCode && (
              <span className={`text-sm font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stockCode}</span>
            )}
            {realtimePrice && (
              <span className="flex items-center text-sm text-green-500">
                <span className="flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative h-2 w-2 rounded-full bg-green-500"></span>
                </span>
                リアルタイム
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Timeframe Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">期間:</span>
              <ButtonGroup className="text-sm">
                {timeframeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={chartConfig.timeframe === option.value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig({ timeframe: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </ButtonGroup>
            </div>

            {/* Chart Type Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">表示:</span>
              <ButtonGroup className="text-sm">
                {chartTypeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={chartConfig.chart_type === option.value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig({ chart_type: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </ButtonGroup>
            </div>

            {/* Moving Averages */}
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>指標:</span>
              <ButtonGroup className="text-sm">
                <Button
                  variant={showMA5 ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setShowMA5(!showMA5)}
                >
                  MA5
                </Button>
                <Button
                  variant={showMA20 ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setShowMA20(!showMA20)}
                >
                  MA20
                </Button>
              </ButtonGroup>
            </div>

            {/* Refresh Button */}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className={isDark ? 'text-gray-400' : 'text-gray-600'}
              >
                🔄 更新
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <div style={{ height }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Chart Summary */}
      <div className={`p-4 border-t ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
        <div className={`flex items-center justify-between text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <div>
            データ期間: {data.length}日間
          </div>
          <div>
            最新価格: {formatPrice(data[data.length - 1]?.close || 0)}
            {realtimePrice && (
              <span className="ml-2 text-green-500">
                リアルタイム: {formatPrice(realtimePrice.price)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RealtimePriceChart;