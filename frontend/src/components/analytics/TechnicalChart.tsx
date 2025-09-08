/**
 * Technical Analysis Chart Component
 * 
 * 高度なテクニカル分析チャートコンポーネント
 * 株価チャート、テクニカル指標、トレンドライン等を表示
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScriptableContext
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useResponsive } from '../../contexts/ResponsiveContext';

// Chart.js登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  sma_5?: number[];
  sma_20?: number[];
  sma_50?: number[];
  bb_upper?: number[];
  bb_lower?: number[];
  bb_middle?: number[];
  rsi_14?: number[];
  macd_line?: number[];
  macd_signal?: number[];
  macd_histogram?: number[];
}

interface TechnicalChartProps {
  stockCode: string;
  priceData: PriceData[];
  indicators?: TechnicalIndicators;
  chartType?: 'line' | 'candlestick' | 'volume';
  showIndicators?: boolean;
  showVolume?: boolean;
  height?: number;
  className?: string;
}

const TechnicalChart: React.FC<TechnicalChartProps> = ({
  stockCode,
  priceData,
  indicators = {},
  chartType = 'line',
  showIndicators = true,
  showVolume = true,
  height = 400,
  className = ''
}) => {
  const { isMobile } = useResponsive();
  const [selectedIndicator, setSelectedIndicator] = useState<'rsi' | 'macd' | 'volume'>('rsi');
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');

  // データフィルタリング
  const filteredData = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeRange) {
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return priceData.filter(item => new Date(item.date) >= cutoffDate);
  }, [priceData, timeRange]);

  // 価格チャートデータ
  const priceChartData = useMemo(() => {
    const labels = filteredData.map(item => {
      const date = new Date(item.date);
      return isMobile 
        ? date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
        : date.toLocaleDateString('ja-JP');
    });

    const datasets = [
      {
        label: `${stockCode} 終値`,
        data: filteredData.map(item => item.close),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: chartType === 'line',
        tension: 0.1,
        pointRadius: isMobile ? 0 : 1,
        pointHoverRadius: 4
      }
    ];

    // 移動平均線
    if (showIndicators && indicators.sma_20) {
      datasets.push({
        label: 'SMA(20)',
        data: indicators.sma_20,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 3
      });
    }

    if (showIndicators && indicators.sma_50) {
      datasets.push({
        label: 'SMA(50)',
        data: indicators.sma_50,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 3
      });
    }

    // ボリンジャーバンド
    if (showIndicators && indicators.bb_upper && indicators.bb_lower) {
      datasets.push(
        {
          label: 'BB Upper',
          data: indicators.bb_upper,
          borderColor: 'rgba(156, 163, 175, 0.6)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          fill: '+1',
          tension: 0.1,
          pointRadius: 0
        },
        {
          label: 'BB Lower',
          data: indicators.bb_lower,
          borderColor: 'rgba(156, 163, 175, 0.6)',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderWidth: 1,
          fill: false,
          tension: 0.1,
          pointRadius: 0
        }
      );
    }

    return { labels, datasets };
  }, [filteredData, stockCode, chartType, showIndicators, indicators, isMobile]);

  // 副指標チャートデータ
  const subChartData = useMemo(() => {
    const labels = filteredData.map(item => {
      const date = new Date(item.date);
      return isMobile 
        ? date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
        : date.toLocaleDateString('ja-JP');
    });

    switch (selectedIndicator) {
      case 'rsi':
        return {
          labels,
          datasets: [
            {
              label: 'RSI(14)',
              data: indicators.rsi_14 || [],
              borderColor: 'rgb(147, 51, 234)',
              backgroundColor: 'rgba(147, 51, 234, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.1,
              pointRadius: 0,
              pointHoverRadius: 3
            }
          ]
        };

      case 'macd':
        return {
          labels,
          datasets: [
            {
              label: 'MACD Line',
              data: indicators.macd_line || [],
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'transparent',
              borderWidth: 2,
              fill: false,
              tension: 0.1,
              pointRadius: 0,
              type: 'line' as const
            },
            {
              label: 'Signal Line',
              data: indicators.macd_signal || [],
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'transparent',
              borderWidth: 2,
              fill: false,
              tension: 0.1,
              pointRadius: 0,
              type: 'line' as const
            },
            {
              label: 'Histogram',
              data: indicators.macd_histogram || [],
              backgroundColor: (context: ScriptableContext<'bar'>) => {
                const value = context.parsed.y;
                return value >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
              },
              borderColor: 'transparent',
              type: 'bar' as const
            }
          ]
        };

      case 'volume':
        return {
          labels,
          datasets: [
            {
              label: '出来高',
              data: filteredData.map(item => item.volume),
              backgroundColor: 'rgba(156, 163, 175, 0.6)',
              borderColor: 'rgba(156, 163, 175, 0.8)',
              borderWidth: 1
            }
          ]
        };

      default:
        return { labels: [], datasets: [] };
    }
  }, [filteredData, selectedIndicator, indicators, isMobile]);

  // チャートオプション
  const priceChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: `${stockCode} 株価チャート`,
        font: {
          size: isMobile ? 14 : 16,
          weight: 'bold' as const
        }
      },
      legend: {
        display: !isMobile,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: 'rgb(31, 41, 55)',
        bodyColor: 'rgb(31, 41, 55)',
        borderColor: 'rgb(229, 231, 235)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ¥${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: isMobile ? 5 : 10
        }
      },
      y: {
        display: true,
        position: 'right' as const,
        grid: {
          color: 'rgba(229, 231, 235, 0.5)'
        },
        ticks: {
          callback: (value: any) => `¥${value.toLocaleString()}`
        }
      }
    },
    elements: {
      point: {
        hoverBackgroundColor: 'rgb(59, 130, 246)'
      }
    }
  }), [stockCode, isMobile]);

  // 副指標チャートオプション
  const subChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: selectedIndicator === 'rsi' ? 'RSI (14)' : 
              selectedIndicator === 'macd' ? 'MACD' : '出来高',
        font: {
          size: isMobile ? 12 : 14,
          weight: 'bold' as const
        }
      },
      legend: {
        display: selectedIndicator === 'macd',
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 10
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: 'rgb(31, 41, 55)',
        bodyColor: 'rgb(31, 41, 55)',
        borderColor: 'rgb(229, 231, 235)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: isMobile ? 5 : 10
        }
      },
      y: {
        display: true,
        position: 'right' as const,
        grid: {
          color: 'rgba(229, 231, 235, 0.5)'
        },
        ...(selectedIndicator === 'rsi' && {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20
          }
        }),
        ...(selectedIndicator === 'volume' && {
          ticks: {
            callback: (value: any) => {
              if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
              } else if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}K`;
              }
              return value.toLocaleString();
            }
          }
        })
      }
    }
  }), [selectedIndicator, isMobile]);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* コントロールパネル */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700">期間:</span>
          {(['1M', '3M', '6M', '1Y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">指標:</label>
          <select
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="rsi">RSI</option>
            <option value="macd">MACD</option>
            <option value="volume">出来高</option>
          </select>
        </div>
      </div>

      {/* 価格チャート */}
      <div style={{ height: `${height}px` }} className="mb-4">
        <Line data={priceChartData} options={priceChartOptions} />
      </div>

      {/* 副指標チャート */}
      {showIndicators && (
        <div style={{ height: `${height * 0.5}px` }} className="border-t border-gray-200 pt-4">
          {selectedIndicator === 'macd' ? (
            // @ts-ignore
            <Bar data={subChartData} options={subChartOptions} />
          ) : selectedIndicator === 'volume' ? (
            <Bar data={subChartData} options={subChartOptions} />
          ) : (
            <Line data={subChartData} options={subChartOptions} />
          )}
        </div>
      )}

      {/* RSI参考線 */}
      {showIndicators && selectedIndicator === 'rsi' && (
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>過売り水準: 30以下</span>
          <span>過買い水準: 70以上</span>
        </div>
      )}

      {/* チャート情報 */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>データ期間: {filteredData.length}日</span>
          {filteredData.length > 0 && (
            <>
              <span>期間高値: ¥{Math.max(...filteredData.map(d => d.high)).toLocaleString()}</span>
              <span>期間安値: ¥{Math.min(...filteredData.map(d => d.low)).toLocaleString()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicalChart;