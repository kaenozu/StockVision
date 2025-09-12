import React, { useState, useEffect } from 'react';
import './ScenarioPredictionPanel.css';
import { getScenarios } from '../../services/api'; // Import the new service

interface ScenarioData {
  scenario_name: string;
  probability: number;
  predicted_price: number;
  predicted_return: number;
  description: string;
  risk_level: string;
}

interface ScenarioApiResponse {
  stock_code: string;
  current_price: number;
  prediction_date: string;
  scenarios: ScenarioData[];
  most_likely_scenario: string;
  overall_confidence: number;
  recommendation: {
    action: string;
    action_jp: string;
    expected_return: number;
    reasoning: string;
    risk_assessment: string;
    confidence: number;
  };
}

interface ScenarioPredictionPanelProps {
  stockCode: string;
  predictionDays?: number;
}

const ScenarioPredictionPanel: React.FC<ScenarioPredictionPanelProps> = ({
  stockCode,
  predictionDays = 7
}) => {
  const [scenarioData, setScenarioData] = useState<ScenarioApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScenarioData();
  }, [stockCode, predictionDays]);

  const fetchScenarioData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getScenarios(stockCode, predictionDays);
      
      setScenarioData(response.data);
    } catch (error) {
      console.error('Error fetching scenario data:', error);
      setError('シナリオ予測データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case '低': return '#28a745';
      case '中': return '#ffc107';
      case '高': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getScenarioColor = (scenarioName: string) => {
    switch (scenarioName) {
      case '楽観的': return '#28a745';
      case '現実的': return '#007bff';
      case '悲観的': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="scenario-panel">
        <div className="scenario-panel-header">
          <h3>📊 シナリオ別予測</h3>
        </div>
        <div className="loading-spinner">読み込み中...</div>
      </div>
    );
  }

  if (error || !scenarioData) {
    return (
      <div className="scenario-panel">
        <div className="scenario-panel-header">
          <h3>📊 シナリオ別予測</h3>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="scenario-panel">
      <div className="scenario-panel-header">
        <h3>📊 シナリオ別予測 ({predictionDays}日後)</h3>
        <div className="current-price">
          現在価格: {formatCurrency(scenarioData.current_price)}
        </div>
      </div>

      <div className="scenarios-container">
        {scenarioData.scenarios.map((scenario, index) => (
          <div 
            key={index} 
            className={`scenario-item ${scenario.scenario_name === scenarioData.most_likely_scenario ? 'most-likely' : ''}`}
          >
            <div className="scenario-header">
              <span 
                className="scenario-name"
                style={{ color: getScenarioColor(scenario.scenario_name) }}
              >
                {scenario.scenario_name}
              </span>
              <span className="scenario-probability">
                {(scenario.probability * 100).toFixed(1)}%
              </span>
            </div>

            <div className="probability-bar">
              <div 
                className="probability-fill"
                style={{ 
                  width: `${scenario.probability * 100}%`,
                  backgroundColor: getScenarioColor(scenario.scenario_name)
                }}
              />
            </div>

            <div className="scenario-details">
              <div className="price-prediction">
                予測価格: <strong>{formatCurrency(scenario.predicted_price)}</strong>
                <span className={`return ${scenario.predicted_return >= 0 ? 'positive' : 'negative'}`}>
                  ({scenario.predicted_return >= 0 ? '+' : ''}{formatPercent(scenario.predicted_return)})
                </span>
              </div>
              <div className="scenario-description">
                {scenario.description}
              </div>
              <div className="risk-level">
                リスクレベル: 
                <span 
                  className="risk-badge"
                  style={{ backgroundColor: getRiskColor(scenario.risk_level) }}
                >
                  {scenario.risk_level}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="recommendation-panel">
        <h4>🎯 投資推奨</h4>
        <div className="recommendation-content">
          <div className="recommendation-action">
            <strong>推奨アクション: {scenarioData.recommendation.action_jp}</strong>
          </div>
          <div className="recommendation-details">
            <div>期待リターン: {formatPercent(scenarioData.recommendation.expected_return)}</div>
            <div>信頼度: {(scenarioData.recommendation.confidence * 100).toFixed(1)}%</div>
            <div>リスク評価: {scenarioData.recommendation.risk_assessment}</div>
          </div>
          <div className="recommendation-reasoning">
            {scenarioData.recommendation.reasoning}
          </div>
        </div>
      </div>

      <div className="panel-footer">
        <small>
          最有力シナリオ: <strong>{scenarioData.most_likely_scenario}</strong> | 
          総合信頼度: {(scenarioData.overall_confidence * 100).toFixed(1)}%
        </small>
      </div>
    </div>
  );
};

export default ScenarioPredictionPanel;