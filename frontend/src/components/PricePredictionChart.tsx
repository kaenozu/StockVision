import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import './PricePredictionChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartDataPoint {
  date: string;
  actual?: number;
  predicted?: number;
  upperBound?: number;
  lowerBound?: number;
}

interface TradingMarker {
  date: string;
  price: number;
  type: 'buy' | 'sell';
  reason: string;
}

interface ChartData {
  stock: {
    id: string;
    symbol: string;
    name: string;
    category: string;
  };
  chartData: {
    labels: string[];
    datasets: unknown[];
  };
  markers: {
    buy: { date: string; price: number; reason: string; }[];
    sell: { date: string; price: number; reason: string; }[];
  };
  chartType: string;
  generatedAt: string;
}

interface PricePredictionChartProps {
  symbol: string;
  period: 'short' | 'medium';
  height?: number;
}

const PricePredictionChart: React.FC<PricePredictionChartProps> = ({
  symbol,
  period,
  height = 400
}) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ref is not required; omit to avoid type friction across versions

  useEffect(() => {
    fetchChartData();
  }, [symbol, period, fetchChartData]);

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/price-predictions/${symbol}?period=${period}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('指定された銘柄のチャートデータが見つかりません');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ChartData = await response.json();
      console.log('=== Price prediction chart data received ===');
      console.log('Full data:', data);
      console.log('Chart labels (length=' + data.chartData.labels.length + '):', data.chartData.labels);
      console.log('Labels detail:');
      data.chartData.labels.forEach((label, index) => {
        console.log(`  [${index}]: ${label}`);
      });
      console.log('Actual price data:', data.chartData.datasets[0]?.data);
      setChartData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チャートデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [symbol, period]);

  const createChartData = () => {
    if (!chartData) return null;

    console.log('=== Creating chart data ===');
    console.log('Input chartData.labels length:', chartData.chartData.labels.length);
    console.log('Input chartData.labels:', chartData.chartData.labels);
    
    // Check for actual historical data (non-null values)
    const actualData = chartData.chartData.datasets[0]?.data || [];
    const nonNullCount = actualData.filter(val => val !== null).length;
    console.log('Historical data points (non-null):', nonNullCount);
    console.log('First few actual prices:', actualData.slice(0, 10));

    // APIレスポンスの chartData は既に Chart.js の形式で整形済み
    const result = {
      labels: chartData.chartData.labels,
      datasets: chartData.chartData.datasets
    };
    
    console.log('Final chart data labels:', result.labels);
    console.log('Final chart data datasets count:', result.datasets.length);
    return result;
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12
          },
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: true,
        text: `${symbol} 価格予想チャート (${period === 'short' ? '短期' : '中期'})`,
        font: {
          size: 16,
          weight: 700
        },
        padding: 20
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: (context: unknown[]) => {
            const date = new Date(chartData?.chartData.labels[context[0].dataIndex] || '');
            return date.toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          },
          label: (context: { parsed: { y: number }, dataset: { label: string } }) => {
            const value = context.parsed.y;
            if (value === null || value === undefined) return '';
            return `${context.dataset.label}: ¥${value.toLocaleString('ja-JP')}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '日付'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          autoSkip: false,
          callback: function(value: any, index: number) {
            const labels = chartData?.chartData.labels;
            if (!labels || !labels[index]) {
              console.log('DEBUG PricePredictionChart X-axis: NO LABEL at index', index);
              return '';
            }
            
            const dataLength = labels.length;
            console.log(`DEBUG PricePredictionChart X-axis: index=${index}/${dataLength-1}, date=${labels[index]}`);
            
            // 全てのラベルを表示（テスト用）
            const dateObj = new Date(labels[index]);
            const result = dateObj.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
            console.log(`DEBUG PricePredictionChart: ✓ SHOWING index ${index}: ${labels[index]} → ${result}`);
            return result;
          }
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '価格 (¥)'
        },
        min: chartData ? Math.min(...chartData.chartData.datasets.flatMap((d: { data: number[] }) => d.data.filter((v: number) => v !== null))) * 0.95 : undefined,
        max: chartData ? Math.max(...chartData.chartData.datasets.flatMap((d: { data: number[] }) => d.data.filter((v: number) => v !== null))) * 1.05 : undefined,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: (value: number) => {
            return `¥${value.toLocaleString('ja-JP')}`;
          }
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    elements: {
      line: {
        tension: 0.1
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

  if (loading) {
    return (
      <div className="chart-loading">
        <div className="loading-spinner" />
        <p>チャートを読み込んでいます...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-error">
        <h4>チャートの読み込みに失敗しました</h4>
        <p>{error}</p>
        <button onClick={fetchChartData} className="retry-button">
          再試行
        </button>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="chart-no-data">
        <p>チャートデータが利用できません</p>
      </div>
    );
  }

  const data = createChartData();
  if (!data) {
    return (
      <div className="chart-no-data">
        <p>チャートデータの作成に失敗しました</p>
      </div>
    );
  }

  return (
    <div className="price-prediction-chart-container">
      {/* Chart Info */}
      <div className="chart-info">
        <div className="chart-metadata">
          <div className="metadata-item">
            <span className="label">予想期間:</span>
            <span className="value">{period === 'short' ? '短期 (7日)' : '中期 (14日)'}</span>
          </div>
          <div className="metadata-item">
            <span className="label">信頼度:</span>
            <span className="value">75.0%</span>
          </div>
          <div className="metadata-item">
            <span className="label">生成日時:</span>
            <span className="value">
              {new Date(chartData.generatedAt).toLocaleString('ja-JP')}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-wrapper" style={{ height: `${height}px` }}>
        <Line data={data} options={chartOptions} />
      </div>

      {/* Trading Markers Info */}
      {(chartData.markers.buy.length > 0 || chartData.markers.sell.length > 0) && (
        <div className="trading-markers-info">
          <h4>取引シグナル</h4>
          <div className="markers-list">
            {chartData.markers.buy.map((marker, index) => (
              <div key={`buy-${index}`} className={`marker-item buy`}>
                <div className="marker-header">
                  <span className={`marker-type buy`}>買い</span>
                  <span className="marker-date">
                    {new Date(marker.date).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div className="marker-details">
                  <span className="marker-price">¥{formatPrice(marker.price)}</span>
                  <span className="marker-reason">{marker.reason}</span>
                </div>
              </div>
            ))}
            {chartData.markers.sell.map((marker, index) => (
              <div key={`sell-${index}`} className={`marker-item sell`}>
                <div className="marker-header">
                  <span className={`marker-type sell`}>売り</span>
                  <span className="marker-date">
                    {new Date(marker.date).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div className="marker-details">
                  <span className="marker-price">¥{formatPrice(marker.price)}</span>
                  <span className="marker-reason">{marker.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Legend */}
      <div className="chart-legend-custom">
        <div className="legend-item">
          <div className="legend-line actual"></div>
          <span>実際の価格</span>
        </div>
        <div className="legend-item">
          <div className="legend-line predicted"></div>
          <span>予想価格</span>
        </div>
        <div className="legend-item">
          <div className="legend-area confidence"></div>
          <span>信頼区間</span>
        </div>
      </div>
    </div>
  );
};

export default PricePredictionChart;
