"""
Phase 3: 強化された統合予想システム
高度な特徴量エンジニアリングを統合したLSTM + アンサンブル予想システム
"""
import logging
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass

from .integrated_predictor import IntegratedPredictor, IntegratedPredictionResult
from .advanced_feature_engine import advanced_feature_engine
from .lstm_predictor import lstm_predictor, TENSORFLOW_AVAILABLE
from .ensemble_predictor import ensemble_predictor
from ..stock_storage.database import get_session_scope
from ..models.price_history import PriceHistory

logger = logging.getLogger(__name__)

@dataclass
class EnhancedPredictionResult:
    """強化された統合予想結果"""
    stock_code: str
    predicted_price: float
    confidence: float
    lstm_prediction: float
    ensemble_prediction: float
    enhanced_features_used: int
    market_context_score: float
    seasonal_factor: float
    volatility_regime: str
    prediction_components: Dict[str, float]
    feature_importance: Dict[str, float]
    prediction_date: datetime

class EnhancedIntegratedPredictor:
    """Phase 3: 強化された統合予想システム"""
    
    def __init__(self):
        self.base_predictor = IntegratedPredictor()
        self.feature_engine = advanced_feature_engine
        self.feature_weights = {
            'technical': 0.4,
            'market': 0.25,
            'seasonal': 0.15,
            'macro': 0.1,
            'sentiment': 0.1
        }
        
    def enhance_price_data(self, stock_code: str, days: int = 100) -> Optional[pd.DataFrame]:
        """価格データを高度な特徴量で強化"""
        try:
            # 基本価格データを取得
            with get_session_scope() as session:
                price_history = session.query(PriceHistory).filter(
                    PriceHistory.stock_code == stock_code
                ).order_by(PriceHistory.date.desc()).limit(days).all()
                
                if len(price_history) < 20:
                    logger.error(f"Insufficient data for {stock_code}")
                    return None
                
                # 時系列順に並び替え
                price_history.reverse()
                
                # データフレームに変換
                df = pd.DataFrame([{
                    'date': record.date,
                    'Open': float(record.open_price),
                    'High': float(record.high_price),
                    'Low': float(record.low_price),
                    'Close': float(record.close_price),
                    'Volume': int(record.volume)
                } for record in price_history])
                
                df.set_index('date', inplace=True)
                df.index = pd.to_datetime(df.index)
                
        except Exception as e:
            logger.error(f"Failed to get price data for {stock_code}: {e}")
            return None
        
        # 高度な特徴量を追加
        try:
            enhanced_df = self.feature_engine.create_all_advanced_features(df, stock_code)
            logger.info(f"Enhanced {stock_code} data with {enhanced_df.shape[1]} features")
            return enhanced_df
            
        except Exception as e:
            logger.error(f"Failed to enhance features for {stock_code}: {e}")
            return df
    
    def calculate_feature_importance(self, df: pd.DataFrame) -> Dict[str, float]:
        """特徴量重要度を計算"""
        importance = {}
        
        # 特徴量カテゴリ別の重要度計算
        technical_features = [col for col in df.columns 
                            if any(x in col.lower() for x in ['sma', 'ema', 'rsi', 'macd', 'bb_', 'returns'])]
        
        market_features = [col for col in df.columns 
                         if any(x in col.lower() for x in ['nikkei', 'topix', 'mothers', 'vix', 'regime'])]
        
        seasonal_features = [col for col in df.columns 
                           if any(x in col.lower() for x in ['day_', 'month', 'quarter', 'season', 'holiday'])]
        
        macro_features = [col for col in df.columns 
                        if any(x in col.lower() for x in ['rate', 'inflation', 'gdp', 'unemployment'])]
        
        sentiment_features = [col for col in df.columns 
                            if any(x in col.lower() for x in ['sentiment', 'fear', 'greed', 'put_call'])]
        
        # 各カテゴリの特徴量数に基づく重要度
        total_features = len(df.columns)
        if total_features > 0:
            importance['technical'] = len(technical_features) / total_features
            importance['market'] = len(market_features) / total_features
            importance['seasonal'] = len(seasonal_features) / total_features
            importance['macro'] = len(macro_features) / total_features
            importance['sentiment'] = len(sentiment_features) / total_features
        
        return importance
    
    def analyze_market_context(self, stock_code: str) -> Dict[str, float]:
        """マーケットコンテキストを分析"""
        try:
            market_ctx = self.feature_engine.get_market_context()
            
            # マーケットスコアを計算
            market_score = 0.0
            
            # 日経平均の変化率によるスコア
            if market_ctx.nikkei225_change > 1.0:
                market_score += 0.3
            elif market_ctx.nikkei225_change < -1.0:
                market_score -= 0.3
            
            # VIXレベルによるスコア
            if market_ctx.vix_level < 20:
                market_score += 0.2
            elif market_ctx.vix_level > 30:
                market_score -= 0.2
            
            # 為替によるスコア（輸出関連株は円安で有利）
            export_stocks = ["7203", "6758", "7751"]  # トヨタ、ソニー、キヤノン
            if stock_code in export_stocks:
                if market_ctx.usd_jpy_change > 0.5:  # 円安
                    market_score += 0.2
                elif market_ctx.usd_jpy_change < -0.5:  # 円高
                    market_score -= 0.2
            
            # セクターパフォーマンス
            stock_sector = self.feature_engine.sector_mapping.get(stock_code, "その他")
            sector_perf = market_ctx.sector_performance.get(stock_sector, 0.0)
            market_score += sector_perf * 0.01  # パーセントをスコアに変換
            
            return {
                'market_score': max(-1.0, min(1.0, market_score)),  # -1 ~ 1 に正規化
                'regime_factor': 0.1 if market_ctx.regime.value in ['bull_market', 'low_volatility'] else -0.1,
                'vix_factor': max(-0.5, min(0.5, (30 - market_ctx.vix_level) / 20)),
                'sector_factor': sector_perf * 0.01
            }
            
        except Exception as e:
            logger.warning(f"Failed to analyze market context: {e}")
            return {
                'market_score': 0.0,
                'regime_factor': 0.0,
                'vix_factor': 0.0,
                'sector_factor': 0.0
            }
    
    def calculate_seasonal_factor(self, date: datetime = None) -> float:
        """季節性要因を計算"""
        if date is None:
            date = datetime.now()
        
        seasonal_factor = 0.0
        
        # 月別季節性
        month_factors = {
            1: 0.05,   # 新年効果
            2: -0.02,  # 2月は弱い
            3: -0.05,  # 年度末売り
            4: 0.08,   # 新年度効果
            5: -0.03,  # 5月売り
            6: -0.02,  # 梅雨時期
            7: -0.01,  # 夏枯れ
            8: -0.05,  # 夏休み
            9: 0.02,   # 9月効果
            10: 0.03,  # 秋相場
            11: 0.05,  # 年末に向けて
            12: 0.02   # 年末効果
        }
        
        seasonal_factor += month_factors.get(date.month, 0.0)
        
        # 四半期末効果
        if date.month in [3, 6, 9, 12] and date.day > 25:
            seasonal_factor -= 0.03  # 四半期末は下落傾向
        
        # 年末年始効果
        if date.month == 12 and date.day > 28:
            seasonal_factor += 0.02
        elif date.month == 1 and date.day < 5:
            seasonal_factor += 0.03
        
        return max(-0.2, min(0.2, seasonal_factor))
    
    def predict_enhanced(self, stock_code: str, use_advanced_features: bool = True) -> Optional[EnhancedPredictionResult]:
        """強化された統合予想を実行"""
        try:
            logger.info(f"Starting enhanced prediction for {stock_code}")
            
            # 基本の統合予想を実行
            base_result = self.base_predictor.predict(stock_code, use_adaptive_weights=True)
            if not base_result:
                logger.error(f"Failed to get base prediction for {stock_code}")
                return None
            
            # 高度な特徴量を使用する場合
            if use_advanced_features:
                # 強化されたデータを取得
                enhanced_df = self.enhance_price_data(stock_code)
                if enhanced_df is None:
                    logger.warning(f"Failed to enhance data for {stock_code}, using base prediction")
                    use_advanced_features = False
            
            if use_advanced_features:
                # 特徴量重要度を計算
                feature_importance = self.calculate_feature_importance(enhanced_df)
                
                # マーケットコンテキスト分析
                market_analysis = self.analyze_market_context(stock_code)
                
                # 季節性要因
                seasonal_factor = self.calculate_seasonal_factor()
                
                # 予想価格の調整
                base_price = base_result.predicted_price
                current_price = base_result.technical_indicators['current_price']
                
                # 各要因による調整
                market_adjustment = base_price * market_analysis['market_score'] * 0.02
                seasonal_adjustment = base_price * seasonal_factor
                
                # 調整後の予想価格
                adjusted_price = base_price + market_adjustment + seasonal_adjustment
                
                # 信頼度の調整
                base_confidence = base_result.confidence
                feature_count = enhanced_df.shape[1]
                feature_bonus = min(0.1, feature_count / 1000)  # 特徴量が多いほど信頼度向上
                adjusted_confidence = min(0.95, base_confidence + feature_bonus)
                
                # ボラティリティレジーム判定
                volatility_regime = "normal"
                if market_analysis['vix_factor'] > 0.2:
                    volatility_regime = "low_volatility"
                elif market_analysis['vix_factor'] < -0.2:
                    volatility_regime = "high_volatility"
                
                # 予想コンポーネント
                prediction_components = {
                    'base_prediction': base_price,
                    'market_adjustment': market_adjustment,
                    'seasonal_adjustment': seasonal_adjustment,
                    'technical_weight': self.feature_weights['technical'],
                    'market_weight': self.feature_weights['market'],
                    'lstm_component': base_result.lstm_prediction,
                    'ensemble_component': base_result.ensemble_prediction
                }
                
                return EnhancedPredictionResult(
                    stock_code=stock_code,
                    predicted_price=max(0, adjusted_price),
                    confidence=adjusted_confidence,
                    lstm_prediction=base_result.lstm_prediction,
                    ensemble_prediction=base_result.ensemble_prediction,
                    enhanced_features_used=feature_count,
                    market_context_score=market_analysis['market_score'],
                    seasonal_factor=seasonal_factor,
                    volatility_regime=volatility_regime,
                    prediction_components=prediction_components,
                    feature_importance=feature_importance,
                    prediction_date=datetime.now()
                )
            
            else:
                # 基本予想をそのまま返す
                return EnhancedPredictionResult(
                    stock_code=stock_code,
                    predicted_price=base_result.predicted_price,
                    confidence=base_result.confidence,
                    lstm_prediction=base_result.lstm_prediction,
                    ensemble_prediction=base_result.ensemble_prediction,
                    enhanced_features_used=0,
                    market_context_score=0.0,
                    seasonal_factor=0.0,
                    volatility_regime="unknown",
                    prediction_components={'base_prediction': base_result.predicted_price},
                    feature_importance={},
                    prediction_date=datetime.now()
                )
                
        except Exception as e:
            logger.error(f"Enhanced prediction failed for {stock_code}: {e}")
            return None
    
    def get_prediction_explanation(self, result: EnhancedPredictionResult) -> Dict[str, Any]:
        """予想結果の説明を生成"""
        current_price = result.prediction_components.get('base_prediction', result.predicted_price)
        change = result.predicted_price - current_price
        change_percent = (change / current_price) * 100 if current_price > 0 else 0
        
        explanation = {
            'summary': {
                'direction': '上昇' if change > 0 else '下降' if change < 0 else '横ばい',
                'magnitude': abs(change_percent),
                'confidence_level': '高' if result.confidence > 0.7 else '中' if result.confidence > 0.5 else '低'
            },
            'key_factors': {
                'market_context': '好材料' if result.market_context_score > 0 else '悪材料' if result.market_context_score < 0 else '中立',
                'seasonal_effect': '追い風' if result.seasonal_factor > 0 else '逆風' if result.seasonal_factor < 0 else '影響なし',
                'volatility': result.volatility_regime,
                'feature_count': result.enhanced_features_used
            },
            'model_components': {
                'lstm_weight': result.prediction_components.get('lstm_component', 0),
                'ensemble_weight': result.prediction_components.get('ensemble_component', 0),
                'adjustments': {
                    'market': result.prediction_components.get('market_adjustment', 0),
                    'seasonal': result.prediction_components.get('seasonal_adjustment', 0)
                }
            }
        }
        
        return explanation


# グローバルインスタンス
enhanced_integrated_predictor = EnhancedIntegratedPredictor()