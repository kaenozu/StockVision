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
import { getEnhancedPrediction } from '../services/api'; // Import the new service
import axios from 'axios';

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

interface PriceHistoryData {
  date: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
}

interface EnhancedPredictionResponse {
  stock_code: string;
  prediction_date: string;
  target_date: string;
  predicted_price: number;
  predicted_return: number;
  confidence: number;
  direction: string;
  model_type: string;
  enhanced_metrics: Record<string, any>;
  features_used: string[];
  recommendation: Record<string, any>;
  price_history: PriceHistoryData[];
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
  const [chartData, setChartData] = useState<EnhancedPredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getEnhancedPrediction(symbol); // Use the new service
      setChartData(response.data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 404) {
          setError('指定された銘柄のチャートデータが見つかりません');
        } else {
          setError(`HTTP error! status: ${err.response.status}`);
        }
      } else {
        setError(err instanceof Error ? err.message : 'チャートデータの取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const createChartData = () => {
    if (!chartData) return null;

    const history = chartData.price_history;
    const labels = history.map(d => d.date);
    const actualData = history.map(d => d.close_price);

    const predictionData = new Array(labels.length).fill(null);
    predictionData[labels.length - 1] = actualData[actualData.length - 1];
    
    const predictionDate = new Date(chartData.target_date);
    const lastHistoryDate = new Date(labels[labels.length - 1]);

    const diffTime = Math.abs(predictionDate.getTime() - lastHistoryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    for (let i = 1; i <= diffDays; i++) {
        const nextDate = new Date(lastHistoryDate);
        nextDate.setDate(lastHistoryDate.getDate() + i);
        labels.push(nextDate.toISOString().split('T')[0]);
        actualData.push(null);
        predictionData.push(null);
    }
    
    predictionData[predictionData.length -1] = chartData.predicted_price;


    return {
      labels,
      datasets: [
        {
          label: '実際の価格',
          data: actualData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          pointRadius: 3,
          fill: false,
        },
        {
          label: '予想価格',
          data: predictionData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3,
          fill: false,
        },
      ],
    };
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${symbol} 価格予想チャート`,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '日付',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '価格 (¥)',
        },
      },
    },
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!chartData) {
    return <div>No data available</div>;
  }

  const data = createChartData();

  if (!data) {
    return <div>No chart data available</div>;
  }

  return (
    <div className="price-prediction-chart-container">
      <div className="chart-wrapper" style={{ height: `${height}px` }}>
        <Line data={data} options={chartOptions} />
      </div>
    </div>
  );
};

export default PricePredictionChart;