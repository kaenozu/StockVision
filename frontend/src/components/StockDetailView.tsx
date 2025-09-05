import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PricePredictionChart from './PricePredictionChart';
import './StockDetailView.css';

interface StockDetail {
  stock: {
    id: string;
    symbol: string;
    name: string;
    category: string;
    sector?: string;
  };
  price: {
    current: number;
    change: number;
    changePercent: number;
    dayHigh: number | null;
    dayLow: number | null;
    volume: number;
    marketCap: number | null;
  };
  recommendation: {
    symbol: string;
    signal: string;
    confidence: number;
    reasoning: string;
    targetPrice: number | null;
    stopLoss: number | null;
    timeHorizon: string;
    riskLevel: string;
    validUntil: string;
    technical_indicators?: {
      rsi: number;
      macd: number;
      sma20: number;
      sma50: number;
      volume: number;
      volume_ratio: number;
      current_price: number;
      price_vs_sma20: number;
      price_vs_sma50: number;
    };
  };
  prediction: {
    shortTerm: {
      targetDate: string;
      predictedPrice: number;
      confidenceLevel: number;
      upperBound: number;
      lowerBound: number;
    } | null;
    mediumTerm: {
      targetDate: string;
      predictedPrice: number;
      confidenceLevel: number;
      upperBound: number;
      lowerBound: number;
    } | null;
  };
}

const StockDetailView: React.FC = () => {
  const { stockId } = useParams<{ stockId: string }>();
  const navigate = useNavigate();
  const [stockDetail, setStockDetail] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPredictionPeriod, setSelectedPredictionPeriod] = useState<'short' | 'medium'>('short');

  useEffect(() => {
    if (stockId) {
      fetchStockDetail(stockId);
    }
  }, [stockId]);

  const fetchStockDetail = async (symbol: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recommended-stocks/${symbol}/detail`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('指定された銘柄が見つかりません');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: StockDetail = await response.json();
      setStockDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '株式詳細の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal.toLowerCase()) {
      case 'buy': return '#22c55e';
      case 'sell': return '#ef4444';
      case 'hold': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getSignalText = (signal: string) => {
    switch (signal.toLowerCase()) {
      case 'buy': return '買い推奨';
      case 'sell': return '売り推奨';
      case 'hold': return '保有継続';
      default: return '判定中';
    }
  };

  const getRiskLevelText = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return '低リスク';
      case 'medium': return '中リスク';
      case 'high': return '高リスク';
      default: return level;
    }
  };

  const getTimeHorizonText = (horizon: string) => {
    switch (horizon.toLowerCase()) {
      case 'short_term': return '短期 (1-4週)';
      case 'medium_term': return '中期 (1-3ヶ月)';
      case 'long_term': return '長期 (3ヶ月+)';
      default: return horizon;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

  const formatPercentage = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return '#22c55e';
    if (change < 0) return '#ef4444';
    return '#6b7280';
  };

  if (loading) {
    return (
      <div className="stock-detail-loading">
        <div className="loading-spinner" />
        <p>株式詳細を読み込んでいます...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stock-detail-error">
        <h3>エラーが発生しました</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={() => navigate(-1)} className="back-button">
            戻る
          </button>
          <button onClick={() => stockId && fetchStockDetail(stockId)} className="retry-button">
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!stockDetail) {
    return null;
  }

  const activePrediction = selectedPredictionPeriod === 'short' 
    ? stockDetail.prediction.shortTerm 
    : stockDetail.prediction.mediumTerm;

  return (
    <div className="stock-detail-container">
      {/* Header */}
      <div className="stock-detail-header">
        <button onClick={() => navigate(-1)} className="back-nav-button">
          ← 推薦株一覧に戻る
        </button>
        <div className="stock-title">
          <h1>{stockDetail.stock.name}</h1>
          <div className="stock-meta">
            <span className="stock-symbol">{stockDetail.stock.symbol}</span>
            <span className="stock-category">{stockDetail.stock.category}</span>
          </div>
        </div>
      </div>

      {/* Price Summary */}
      <div className="price-summary-card">
        <div className="current-price-section">
          <div className="current-price">¥{formatPrice(stockDetail.price.current)}</div>
          <div 
            className="price-change"
            style={{ color: getPriceChangeColor(stockDetail.price.change) }}
          >
            ¥{formatPrice(Math.abs(stockDetail.price.change))} ({formatPercentage(stockDetail.price.changePercent)})
          </div>
        </div>
        
        <div className="price-details">
          <div className="price-item">
            <label>高値:</label>
            <span>{stockDetail.price.dayHigh ? `¥${formatPrice(stockDetail.price.dayHigh)}` : 'N/A'}</span>
          </div>
          <div className="price-item">
            <label>安値:</label>
            <span>{stockDetail.price.dayLow ? `¥${formatPrice(stockDetail.price.dayLow)}` : 'N/A'}</span>
          </div>
          <div className="price-item">
            <label>出来高:</label>
            <span>{formatPrice(stockDetail.price.volume)}</span>
          </div>
        </div>
      </div>

      <div className="main-content">
        {/* Left Column */}
        <div className="left-column">
          {/* Trading Recommendation */}
          <div className="recommendation-card">
            <h3>売買推奨</h3>
            <div className="recommendation-header">
              <div 
                className="signal-badge large"
                style={{ backgroundColor: getSignalColor(stockDetail.recommendation.signal) }}
              >
                {getSignalText(stockDetail.recommendation.signal)}
              </div>
              <div className="confidence-display">
                <span className="confidence-label">信頼度</span>
                <span className="confidence-value">{stockDetail.recommendation.confidence}/10</span>
              </div>
            </div>

            <div className="recommendation-details">
              <div className="recommendation-reasoning">
                <h4>推奨理由</h4>
                <p>{stockDetail.recommendation.reasoning}</p>
              </div>

              <div className="recommendation-targets">
                {stockDetail.recommendation.targetPrice && (
                  <div className="target-item">
                    <label>目標価格:</label>
                    <span className="target-price">¥{formatPrice(stockDetail.recommendation.targetPrice)}</span>
                  </div>
                )}
                {stockDetail.recommendation.stopLoss && (
                  <div className="target-item">
                    <label>ストップロス:</label>
                    <span className="stop-loss">¥{formatPrice(stockDetail.recommendation.stopLoss)}</span>
                  </div>
                )}
                <div className="target-item">
                  <label>投資期間:</label>
                  <span>{getTimeHorizonText(stockDetail.recommendation.timeHorizon)}</span>
                </div>
                <div className="target-item">
                  <label>リスクレベル:</label>
                  <span>{getRiskLevelText(stockDetail.recommendation.riskLevel)}</span>
                </div>
              </div>

              <div className="recommendation-validity">
                <small>
                  有効期限: {new Date(stockDetail.recommendation.validUntil).toLocaleString('ja-JP')}
                </small>
              </div>
            </div>
          </div>

          {/* Technical Indicators */}
          <div className="technical-indicators-card">
            <h3>テクニカル指標</h3>
            <div className="indicators-grid">
              <div className="indicator-item">
                <label>RSI</label>
                <span className={`indicator-value ${stockDetail.recommendation?.technical_indicators?.rsi > 70 ? 'high' : stockDetail.recommendation?.technical_indicators?.rsi < 30 ? 'low' : 'normal'}`}>
                  {stockDetail.recommendation?.technical_indicators?.rsi?.toFixed(1) ?? 'N/A'}
                </span>
              </div>
              <div className="indicator-item">
                <label>MACD</label>
                <span className={`indicator-value ${(stockDetail.recommendation?.technical_indicators?.macd ?? 0) > 0 ? 'positive' : 'negative'}`}>
                  {stockDetail.recommendation?.technical_indicators?.macd?.toFixed(2) ?? 'N/A'}
                </span>
              </div>
              <div className="indicator-item">
                <label>20日移動平均</label>
                <span className="indicator-value">
                  ¥{stockDetail.recommendation?.technical_indicators?.sma20 ? formatPrice(stockDetail.recommendation.technical_indicators.sma20) : 'N/A'}
                </span>
              </div>
              <div className="indicator-item">
                <label>50日移動平均</label>
                <span className="indicator-value">
                  ¥{stockDetail.recommendation?.technical_indicators?.sma50 ? formatPrice(stockDetail.recommendation.technical_indicators.sma50) : 'N/A'}
                </span>
              </div>
              <div className="indicator-item">
                <label>ボリンジャー上限</label>
                <span className="indicator-value">
                  N/A
                </span>
              </div>
              <div className="indicator-item">
                <label>ボリンジャー下限</label>
                <span className="indicator-value">
                  N/A
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="right-column">
          {/* Price Prediction */}
          <div className="prediction-card">
            <div className="prediction-header">
              <h3>価格予想</h3>
              <div className="period-selector">
                <button 
                  className={selectedPredictionPeriod === 'short' ? 'active' : ''}
                  onClick={() => setSelectedPredictionPeriod('short')}
                >
                  短期 (7日)
                </button>
                <button 
                  className={selectedPredictionPeriod === 'medium' ? 'active' : ''}
                  onClick={() => setSelectedPredictionPeriod('medium')}
                >
                  中期 (14日)
                </button>
              </div>
            </div>

            {activePrediction ? (
              <div className="prediction-content">
                <div className="prediction-summary">
                  <div className="predicted-price">
                    <label>予想価格</label>
                    <span className="prediction-value">
                      ¥{formatPrice(activePrediction.predictedPrice)}
                    </span>
                  </div>
                  <div className="prediction-confidence">
                    <label>予想信頼度</label>
                    <span className="confidence-percentage">
                      {(activePrediction.confidenceLevel * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="prediction-range">
                  <div className="range-item">
                    <label>上限予想</label>
                    <span>¥{formatPrice(activePrediction.upperBound)}</span>
                  </div>
                  <div className="range-item">
                    <label>下限予想</label>
                    <span>¥{formatPrice(activePrediction.lowerBound)}</span>
                  </div>
                  <div className="range-item">
                    <label>予想日</label>
                    <span>{new Date(activePrediction.targetDate).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="prediction-unavailable">
                <p>この期間の価格予想は現在利用できません。</p>
              </div>
            )}
          </div>

          {/* Price Chart */}
          <div className="chart-card">
            <h3>価格チャート</h3>
            <PricePredictionChart 
              symbol={stockDetail.stock.symbol}
              period={selectedPredictionPeriod}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="stock-description-card">
        <h3>企業概要</h3>
        <p>{stockDetail.stock.sector || '企業情報を準備中です。'}</p>
      </div>

      {/* Last Updated */}
      <div className="last-updated">
        最終更新: {new Date(stockDetail.recommendation.validUntil).toLocaleString('ja-JP')}
      </div>
    </div>
  );
};

export default StockDetailView;