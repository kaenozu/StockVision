import React, { useState, useEffect, useRef } from 'react';
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
  ScriptableContext
} from 'chart.js';
import { Line } from 'react-chartjs-2';
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
    datasets: any[];
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
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    fetchChartData();
  }, [symbol, period]);

  const fetchChartData = async () => {
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
      setChartData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チャートデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const createChartData = () => {
    if (!chartData) return null;

    // APIレスポンスの chartData は既に Chart.js の形式で整形済み
    return {
      labels: chartData.chartData.labels,
      datasets: chartData.chartData.datasets
    };
  };

  const chartOptions = {
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
          weight: 'bold'
        },
        padding: 20
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: (context: any) => {
            const date = new Date(chartData?.chartData.labels[context[0].dataIndex] || '');
            return date.toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          },
          label: (context: any) => {
            const value = context.parsed.y;
            if (value === null) return null;
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
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '価格 (¥)'
        },
        min: chartData ? Math.min(...chartData.chartData.datasets.flatMap(d => d.data.filter((v: any) => v !== null))) * 0.95 : undefined,
        max: chartData ? Math.max(...chartData.chartData.datasets.flatMap(d => d.data.filter((v: any) => v !== null))) * 1.05 : undefined,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: (value: any) => {
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
        <Line 
          ref={chartRef}
          data={data} 
          options={chartOptions} 
        />
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