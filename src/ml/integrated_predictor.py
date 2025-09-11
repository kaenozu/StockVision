"""
統合予想システム - LSTM + Random Forest/SVM アンサンブル
"""
import logging
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

from .lstm_predictor import lstm_predictor, TENSORFLOW_AVAILABLE, LSTMPredictionResult
from .ensemble_predictor import ensemble_predictor, EnsemblePredictionResult
from .advanced_feature_engine import advanced_feature_engine

logger = logging.getLogger(__name__)

@dataclass
class IntegratedPredictionResult:
    """統合予想結果"""
    stock_code: str
    predicted_price: float
    confidence: float
    lstm_prediction: float
    ensemble_prediction: float
    lstm_confidence: float
    ensemble_confidence: float
    lstm_weight: float
    ensemble_weight: float
    model_accuracies: Dict[str, float]
    technical_indicators: Dict[str, float]
    prediction_date: datetime
    method_used: str


class IntegratedPredictor:
    """LSTM + アンサンブル統合予想システム"""
    
    def __init__(self, lstm_weight: float = 0.5, ensemble_weight: float = 0.5):
        """
        統合予想器を初期化
        
        Args:
            lstm_weight: LSTMの重み（0.0-1.0）
            ensemble_weight: アンサンブルの重み（0.0-1.0）
        """
        # 重みを正規化
        total_weight = lstm_weight + ensemble_weight
        if total_weight > 0:
            self.lstm_weight = lstm_weight / total_weight
            self.ensemble_weight = ensemble_weight / total_weight
        else:
            self.lstm_weight = 0.5
            self.ensemble_weight = 0.5
            
        logger.info(f"Integrated predictor initialized - LSTM: {self.lstm_weight:.1%}, Ensemble: {self.ensemble_weight:.1%}")
    
    def adaptive_weight_calculation(self, lstm_result: LSTMPredictionResult, 
                                  ensemble_result: EnsemblePredictionResult) -> Tuple[float, float]:
        """
        モデル精度に基づく適応的重み計算
        
        Returns:
            Tuple[float, float]: (lstm_weight, ensemble_weight)
        """
        lstm_accuracy = lstm_result.model_accuracy
        ensemble_accuracy = ensemble_result.model_accuracy
        
        # 信頼度も考慮した重み計算
        lstm_score = lstm_accuracy * lstm_result.confidence
        ensemble_score = ensemble_accuracy * ensemble_result.confidence
        
        total_score = lstm_score + ensemble_score
        
        if total_score > 0:
            adapted_lstm_weight = lstm_score / total_score
            adapted_ensemble_weight = ensemble_score / total_score
        else:
            # フォールバック
            adapted_lstm_weight = self.lstm_weight
            adapted_ensemble_weight = self.ensemble_weight
        
        # 極端な重みを防ぐための制限（最小20%、最大80%）
        adapted_lstm_weight = max(0.2, min(0.8, adapted_lstm_weight))
        adapted_ensemble_weight = 1.0 - adapted_lstm_weight
        
        return adapted_lstm_weight, adapted_ensemble_weight
    
    def predict(self, stock_code: str, use_adaptive_weights: bool = True) -> IntegratedPredictionResult:
        """
        統合予想を実行
        
        Args:
            stock_code: 銘柄コード
            use_adaptive_weights: 適応的重み計算を使用するかどうか
            
        Returns:
            IntegratedPredictionResult: 統合予想結果
        """
        logger.info(f"Starting integrated prediction for {stock_code}")
        
        # TensorFlowが利用できない場合はアンサンブルのみ使用
        if not TENSORFLOW_AVAILABLE:
            logger.warning("TensorFlow not available - using ensemble predictor only")
            ensemble_result = ensemble_predictor.predict(stock_code)
            
            return IntegratedPredictionResult(
                stock_code=stock_code,
                predicted_price=ensemble_result.predicted_price,
                confidence=ensemble_result.confidence,
                lstm_prediction=0.0,
                ensemble_prediction=ensemble_result.predicted_price,
                lstm_confidence=0.0,
                ensemble_confidence=ensemble_result.confidence,
                lstm_weight=0.0,
                ensemble_weight=1.0,
                model_accuracies={
                    "lstm": 0.0,
                    "ensemble": ensemble_result.model_accuracy,
                    "integrated": ensemble_result.model_accuracy
                },
                technical_indicators=ensemble_result.technical_indicators,
                prediction_date=datetime.now(),
                method_used="ensemble_only"
            )
        
        # 両方のモデルで予想を実行
        try:
            lstm_result = lstm_predictor.predict(stock_code, days_ahead=1)
            ensemble_result = ensemble_predictor.predict(stock_code)
            
            # 適応的重み計算
            if use_adaptive_weights:
                final_lstm_weight, final_ensemble_weight = self.adaptive_weight_calculation(
                    lstm_result, ensemble_result
                )
                method_used = "adaptive_weighted"
            else:
                final_lstm_weight = self.lstm_weight
                final_ensemble_weight = self.ensemble_weight
                method_used = "fixed_weighted"
            
            # 統合予想価格を計算
            integrated_price = (
                final_lstm_weight * lstm_result.predicted_price +
                final_ensemble_weight * ensemble_result.predicted_price
            )
            
            # 統合信頼度を計算
            integrated_confidence = (
                final_lstm_weight * lstm_result.confidence +
                final_ensemble_weight * ensemble_result.confidence
            )
            
            # 統合精度を計算（重み付き平均）
            integrated_accuracy = (
                final_lstm_weight * lstm_result.model_accuracy +
                final_ensemble_weight * ensemble_result.model_accuracy
            )
            
            # 技術指標をマージ
            technical_indicators = ensemble_result.technical_indicators.copy()
            technical_indicators.update({
                'lstm_predicted_price': lstm_result.predicted_price,
                'ensemble_predicted_price': ensemble_result.predicted_price
            })
            
            result = IntegratedPredictionResult(
                stock_code=stock_code,
                predicted_price=max(0, integrated_price),  # 負の価格を防ぐ
                confidence=integrated_confidence,
                lstm_prediction=lstm_result.predicted_price,
                ensemble_prediction=ensemble_result.predicted_price,
                lstm_confidence=lstm_result.confidence,
                ensemble_confidence=ensemble_result.confidence,
                lstm_weight=final_lstm_weight,
                ensemble_weight=final_ensemble_weight,
                model_accuracies={
                    "lstm": lstm_result.model_accuracy,
                    "ensemble": ensemble_result.model_accuracy,
                    "integrated": integrated_accuracy
                },
                technical_indicators=technical_indicators,
                prediction_date=datetime.now(),
                method_used=method_used
            )
            
            logger.info(f"Integrated prediction completed for {stock_code}: "
                       f"LSTM({final_lstm_weight:.1%})={lstm_result.predicted_price:,.0f}, "
                       f"Ensemble({final_ensemble_weight:.1%})={ensemble_result.predicted_price:,.0f}, "
                       f"Final={integrated_price:,.0f}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in integrated prediction for {stock_code}: {e}")
            # フォールバックとしてアンサンブルのみ使用
            ensemble_result = ensemble_predictor.predict(stock_code)
            
            return IntegratedPredictionResult(
                stock_code=stock_code,
                predicted_price=ensemble_result.predicted_price,
                confidence=ensemble_result.confidence * 0.8,  # エラー時は信頼度を下げる
                lstm_prediction=0.0,
                ensemble_prediction=ensemble_result.predicted_price,
                lstm_confidence=0.0,
                ensemble_confidence=ensemble_result.confidence,
                lstm_weight=0.0,
                ensemble_weight=1.0,
                model_accuracies={
                    "lstm": 0.0,
                    "ensemble": ensemble_result.model_accuracy,
                    "integrated": ensemble_result.model_accuracy * 0.9
                },
                technical_indicators=ensemble_result.technical_indicators,
                prediction_date=datetime.now(),
                method_used="ensemble_fallback"
            )
    
    def get_model_info(self, stock_code: str) -> Dict:
        """統合モデル情報を取得"""
        lstm_info = lstm_predictor.get_model_info(stock_code) if TENSORFLOW_AVAILABLE else {"trained": False}
        ensemble_info = ensemble_predictor.get_model_info(stock_code)
        
        return {
            "integrated": {
                "lstm_available": TENSORFLOW_AVAILABLE,
                "lstm_trained": lstm_info.get("trained", False),
                "ensemble_trained": ensemble_info.get("trained", False),
                "weights": {
                    "lstm": self.lstm_weight,
                    "ensemble": self.ensemble_weight
                }
            },
            "lstm": lstm_info,
            "ensemble": ensemble_info
        }


# グローバルインスタンス
integrated_predictor = IntegratedPredictor()