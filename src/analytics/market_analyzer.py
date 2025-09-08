"""
Market Trend Analysis Engine

市場トレンド分析とテクニカル指標計算のための包括的エンジン
統計分析、移動平均、RSI、MACD、ボリンガーバンド等を提供
"""

import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum

from ..services.stock_service import get_stock_service
from ..stock_api.data_models import PriceHistoryItem

logger = logging.getLogger(__name__)


class TrendDirection(Enum):
    """トレンド方向"""
    STRONG_BULLISH = "strong_bullish"
    BULLISH = "bullish"
    NEUTRAL = "neutral"
    BEARISH = "bearish"
    STRONG_BEARISH = "strong_bearish"


class SignalStrength(Enum):
    """シグナル強度"""
    VERY_STRONG = "very_strong"
    STRONG = "strong"
    MODERATE = "moderate"
    WEAK = "weak"
    NEUTRAL = "neutral"


@dataclass
class TechnicalIndicators:
    """テクニカル指標データ"""
    # 移動平均
    sma_5: Optional[float] = None
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    ema_12: Optional[float] = None
    ema_26: Optional[float] = None
    
    # オシレーター
    rsi_14: Optional[float] = None
    stoch_k: Optional[float] = None
    stoch_d: Optional[float] = None
    
    # MACD
    macd_line: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_histogram: Optional[float] = None
    
    # ボリンジャーバンド
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    bb_width: Optional[float] = None
    
    # ボラティリティ
    volatility_20: Optional[float] = None
    atr_14: Optional[float] = None
    
    # ボリューム
    volume_sma_20: Optional[float] = None
    volume_ratio: Optional[float] = None


@dataclass
class MarketSignal:
    """市場シグナル"""
    signal_type: str
    strength: SignalStrength
    direction: TrendDirection
    confidence: float
    description: str
    timestamp: datetime
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None


@dataclass
class TrendAnalysis:
    """トレンド分析結果"""
    stock_code: str
    current_price: float
    trend_direction: TrendDirection
    trend_strength: float
    support_level: Optional[float]
    resistance_level: Optional[float]
    key_levels: List[float]
    signals: List[MarketSignal]
    technical_indicators: TechnicalIndicators
    analysis_timestamp: datetime
    recommendation: str


class MarketAnalyzer:
    """市場分析エンジン"""
    
    def __init__(self):
        self.stock_service = None
        
    async def _get_stock_service(self):
        """ストックサービス取得"""
        if self.stock_service is None:
            self.stock_service = await get_stock_service()
        return self.stock_service
    
    async def analyze_stock(
        self, 
        stock_code: str, 
        days: int = 100
    ) -> Optional[TrendAnalysis]:
        """
        株式の包括的分析
        
        Args:
            stock_code: 銘柄コード
            days: 分析対象日数
            
        Returns:
            TrendAnalysis: 分析結果
        """
        try:
            stock_service = await self._get_stock_service()
            
            # 価格履歴取得
            price_history = await stock_service.get_price_history(
                stock_code, 
                days=days
            )
            
            if not price_history or not price_history.history:
                logger.warning(f"No price history available for {stock_code}")
                return None
                
            # データをDataFrameに変換
            df = self._convert_to_dataframe(price_history.history)
            
            if len(df) < 20:
                logger.warning(f"Insufficient data for analysis: {len(df)} days")
                return None
            
            # 現在価格取得
            current_price_data = await stock_service.get_current_price(stock_code)
            current_price = current_price_data.current_price if current_price_data else df['close'].iloc[-1]
            
            # テクニカル指標計算
            technical_indicators = self._calculate_technical_indicators(df)
            
            # トレンド分析
            trend_direction, trend_strength = self._analyze_trend(df, technical_indicators)
            
            # サポート・レジスタンス計算
            support_level, resistance_level, key_levels = self._calculate_support_resistance(df)
            
            # シグナル生成
            signals = self._generate_signals(df, technical_indicators, trend_direction)
            
            # レコメンデーション生成
            recommendation = self._generate_recommendation(
                trend_direction, 
                trend_strength, 
                signals, 
                technical_indicators
            )
            
            return TrendAnalysis(
                stock_code=stock_code,
                current_price=current_price,
                trend_direction=trend_direction,
                trend_strength=trend_strength,
                support_level=support_level,
                resistance_level=resistance_level,
                key_levels=key_levels,
                signals=signals,
                technical_indicators=technical_indicators,
                analysis_timestamp=datetime.now(),
                recommendation=recommendation
            )
            
        except Exception as e:
            logger.error(f"Error analyzing stock {stock_code}: {e}")
            return None
    
    def _convert_to_dataframe(self, history: List[PriceHistoryItem]) -> pd.DataFrame:
        """価格履歴をDataFrameに変換"""
        data = []
        for item in history:
            data.append({
                'date': item.date,
                'open': item.open_price,
                'high': item.high_price,
                'low': item.low_price,
                'close': item.close_price,
                'volume': item.volume
            })
        
        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').reset_index(drop=True)
        
        return df
    
    def _calculate_technical_indicators(self, df: pd.DataFrame) -> TechnicalIndicators:
        """テクニカル指標計算"""
        indicators = TechnicalIndicators()
        
        try:
            # 移動平均
            if len(df) >= 5:
                indicators.sma_5 = df['close'].rolling(5).mean().iloc[-1]
            if len(df) >= 20:
                indicators.sma_20 = df['close'].rolling(20).mean().iloc[-1]
            if len(df) >= 50:
                indicators.sma_50 = df['close'].rolling(50).mean().iloc[-1]
            if len(df) >= 200:
                indicators.sma_200 = df['close'].rolling(200).mean().iloc[-1]
            
            # EMA
            if len(df) >= 12:
                indicators.ema_12 = df['close'].ewm(span=12).mean().iloc[-1]
            if len(df) >= 26:
                indicators.ema_26 = df['close'].ewm(span=26).mean().iloc[-1]
            
            # RSI
            if len(df) >= 14:
                indicators.rsi_14 = self._calculate_rsi(df['close'], 14)
            
            # MACD
            if len(df) >= 26:
                macd_line, macd_signal, macd_hist = self._calculate_macd(df['close'])
                indicators.macd_line = macd_line
                indicators.macd_signal = macd_signal
                indicators.macd_histogram = macd_hist
            
            # ボリンジャーバンド
            if len(df) >= 20:
                bb_upper, bb_middle, bb_lower, bb_width = self._calculate_bollinger_bands(df['close'])
                indicators.bb_upper = bb_upper
                indicators.bb_middle = bb_middle
                indicators.bb_lower = bb_lower
                indicators.bb_width = bb_width
            
            # ボラティリティ
            if len(df) >= 20:
                indicators.volatility_20 = df['close'].rolling(20).std().iloc[-1]
                indicators.atr_14 = self._calculate_atr(df, 14)
            
            # ボリューム
            if len(df) >= 20:
                indicators.volume_sma_20 = df['volume'].rolling(20).mean().iloc[-1]
                if indicators.volume_sma_20 > 0:
                    indicators.volume_ratio = df['volume'].iloc[-1] / indicators.volume_sma_20
                    
        except Exception as e:
            logger.error(f"Error calculating technical indicators: {e}")
        
        return indicators
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> float:
        """RSI計算"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1]
    
    def _calculate_macd(self, prices: pd.Series) -> Tuple[float, float, float]:
        """MACD計算"""
        ema12 = prices.ewm(span=12).mean()
        ema26 = prices.ewm(span=26).mean()
        macd_line = ema12 - ema26
        macd_signal = macd_line.ewm(span=9).mean()
        macd_histogram = macd_line - macd_signal
        
        return (
            macd_line.iloc[-1],
            macd_signal.iloc[-1],
            macd_histogram.iloc[-1]
        )
    
    def _calculate_bollinger_bands(
        self, 
        prices: pd.Series, 
        period: int = 20, 
        std_dev: int = 2
    ) -> Tuple[float, float, float, float]:
        """ボリンジャーバンド計算"""
        sma = prices.rolling(period).mean()
        std = prices.rolling(period).std()
        
        upper = sma + (std * std_dev)
        lower = sma - (std * std_dev)
        width = (upper - lower) / sma
        
        return (
            upper.iloc[-1],
            sma.iloc[-1],
            lower.iloc[-1],
            width.iloc[-1]
        )
    
    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> float:
        """ATR (Average True Range) 計算"""
        high = df['high']
        low = df['low']
        close = df['close'].shift(1)
        
        tr1 = high - low
        tr2 = abs(high - close)
        tr3 = abs(low - close)
        
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(period).mean()
        
        return atr.iloc[-1]
    
    def _analyze_trend(
        self, 
        df: pd.DataFrame, 
        indicators: TechnicalIndicators
    ) -> Tuple[TrendDirection, float]:
        """トレンド分析"""
        scores = []
        
        # 移動平均トレンド
        if indicators.sma_5 and indicators.sma_20:
            if indicators.sma_5 > indicators.sma_20:
                scores.append(1)
            else:
                scores.append(-1)
        
        # 価格vs移動平均
        current_price = df['close'].iloc[-1]
        if indicators.sma_20:
            if current_price > indicators.sma_20:
                scores.append(1)
            else:
                scores.append(-1)
        
        # MACD
        if indicators.macd_line and indicators.macd_signal:
            if indicators.macd_line > indicators.macd_signal:
                scores.append(1)
            else:
                scores.append(-1)
        
        # RSI
        if indicators.rsi_14:
            if indicators.rsi_14 > 50:
                scores.append(0.5)
            else:
                scores.append(-0.5)
        
        # 平均スコア計算
        if not scores:
            return TrendDirection.NEUTRAL, 0.0
        
        avg_score = sum(scores) / len(scores)
        strength = abs(avg_score)
        
        # トレンド方向判定
        if avg_score >= 0.7:
            direction = TrendDirection.STRONG_BULLISH
        elif avg_score >= 0.3:
            direction = TrendDirection.BULLISH
        elif avg_score <= -0.7:
            direction = TrendDirection.STRONG_BEARISH
        elif avg_score <= -0.3:
            direction = TrendDirection.BEARISH
        else:
            direction = TrendDirection.NEUTRAL
        
        return direction, strength
    
    def _calculate_support_resistance(
        self, 
        df: pd.DataFrame
    ) -> Tuple[Optional[float], Optional[float], List[float]]:
        """サポート・レジスタンスレベル計算"""
        try:
            # 直近50日のデータ使用
            recent_df = df.tail(50)
            highs = recent_df['high']
            lows = recent_df['low']
            
            # ピーク・ボトム検出
            peaks = []
            troughs = []
            
            for i in range(2, len(recent_df) - 2):
                # ピーク検出
                if (highs.iloc[i] > highs.iloc[i-1] and 
                    highs.iloc[i] > highs.iloc[i+1] and
                    highs.iloc[i] > highs.iloc[i-2] and
                    highs.iloc[i] > highs.iloc[i+2]):
                    peaks.append(highs.iloc[i])
                
                # ボトム検出
                if (lows.iloc[i] < lows.iloc[i-1] and 
                    lows.iloc[i] < lows.iloc[i+1] and
                    lows.iloc[i] < lows.iloc[i-2] and
                    lows.iloc[i] < lows.iloc[i+2]):
                    troughs.append(lows.iloc[i])
            
            # サポート・レジスタンス計算
            current_price = df['close'].iloc[-1]
            
            # レジスタンス（現在価格より上の最近のピーク）
            resistance_candidates = [p for p in peaks if p > current_price]
            resistance = min(resistance_candidates) if resistance_candidates else None
            
            # サポート（現在価格より下の最近のボトム）
            support_candidates = [t for t in troughs if t < current_price]
            support = max(support_candidates) if support_candidates else None
            
            # 重要レベル
            key_levels = sorted(set(peaks + troughs))[-5:]  # 直近5つのレベル
            
            return support, resistance, key_levels
            
        except Exception as e:
            logger.error(f"Error calculating support/resistance: {e}")
            return None, None, []
    
    def _generate_signals(
        self, 
        df: pd.DataFrame, 
        indicators: TechnicalIndicators, 
        trend_direction: TrendDirection
    ) -> List[MarketSignal]:
        """市場シグナル生成"""
        signals = []
        current_time = datetime.now()
        
        try:
            # RSIシグナル
            if indicators.rsi_14:
                if indicators.rsi_14 < 30:
                    signals.append(MarketSignal(
                        signal_type="RSI_OVERSOLD",
                        strength=SignalStrength.STRONG,
                        direction=TrendDirection.BULLISH,
                        confidence=0.7,
                        description=f"RSI過売り水準 ({indicators.rsi_14:.1f})",
                        timestamp=current_time
                    ))
                elif indicators.rsi_14 > 70:
                    signals.append(MarketSignal(
                        signal_type="RSI_OVERBOUGHT",
                        strength=SignalStrength.STRONG,
                        direction=TrendDirection.BEARISH,
                        confidence=0.7,
                        description=f"RSI過買い水準 ({indicators.rsi_14:.1f})",
                        timestamp=current_time
                    ))
            
            # MACDシグナル
            if (indicators.macd_line and indicators.macd_signal and 
                indicators.macd_histogram):
                
                if indicators.macd_line > indicators.macd_signal and indicators.macd_histogram > 0:
                    signals.append(MarketSignal(
                        signal_type="MACD_BULLISH",
                        strength=SignalStrength.MODERATE,
                        direction=TrendDirection.BULLISH,
                        confidence=0.6,
                        description="MACDゴールデンクロス",
                        timestamp=current_time
                    ))
                elif indicators.macd_line < indicators.macd_signal and indicators.macd_histogram < 0:
                    signals.append(MarketSignal(
                        signal_type="MACD_BEARISH",
                        strength=SignalStrength.MODERATE,
                        direction=TrendDirection.BEARISH,
                        confidence=0.6,
                        description="MACDデッドクロス",
                        timestamp=current_time
                    ))
            
            # ボリンジャーバンドシグナル
            if (indicators.bb_upper and indicators.bb_lower and 
                indicators.bb_middle):
                
                current_price = df['close'].iloc[-1]
                
                if current_price <= indicators.bb_lower:
                    signals.append(MarketSignal(
                        signal_type="BB_OVERSOLD",
                        strength=SignalStrength.STRONG,
                        direction=TrendDirection.BULLISH,
                        confidence=0.65,
                        description="ボリンジャーバンド下限タッチ",
                        timestamp=current_time
                    ))
                elif current_price >= indicators.bb_upper:
                    signals.append(MarketSignal(
                        signal_type="BB_OVERBOUGHT",
                        strength=SignalStrength.STRONG,
                        direction=TrendDirection.BEARISH,
                        confidence=0.65,
                        description="ボリンジャーバンド上限タッチ",
                        timestamp=current_time
                    ))
            
            # ボリューム分析
            if indicators.volume_ratio and indicators.volume_ratio > 2.0:
                signals.append(MarketSignal(
                    signal_type="HIGH_VOLUME",
                    strength=SignalStrength.MODERATE,
                    direction=trend_direction,
                    confidence=0.5,
                    description=f"異常出来高 ({indicators.volume_ratio:.1f}倍)",
                    timestamp=current_time
                ))
                
        except Exception as e:
            logger.error(f"Error generating signals: {e}")
        
        return signals
    
    def _generate_recommendation(
        self, 
        trend_direction: TrendDirection, 
        trend_strength: float,
        signals: List[MarketSignal], 
        indicators: TechnicalIndicators
    ) -> str:
        """投資レコメンデーション生成"""
        try:
            # 強気シグナル数
            bullish_signals = len([s for s in signals if s.direction in [TrendDirection.BULLISH, TrendDirection.STRONG_BULLISH]])
            bearish_signals = len([s for s in signals if s.direction in [TrendDirection.BEARISH, TrendDirection.STRONG_BEARISH]])
            
            # 総合判定
            if trend_direction == TrendDirection.STRONG_BULLISH and bullish_signals >= 2:
                return "強い買い推奨 - 複数の強気シグナルが確認されています"
            elif trend_direction == TrendDirection.BULLISH and bullish_signals >= 1:
                return "買い推奨 - 上昇トレンドが継続中です"
            elif trend_direction == TrendDirection.STRONG_BEARISH and bearish_signals >= 2:
                return "強い売り推奨 - 複数の弱気シグナルが発生しています"
            elif trend_direction == TrendDirection.BEARISH and bearish_signals >= 1:
                return "売り推奨 - 下落トレンドが確認されています"
            elif bullish_signals > bearish_signals:
                return "様子見（弱い買い） - 一部強気シグナルありますが慎重に"
            elif bearish_signals > bullish_signals:
                return "様子見（弱い売り） - 一部弱気シグナルあり注意が必要"
            else:
                return "中立 - 明確な方向性が見えないため様子見推奨"
                
        except Exception as e:
            logger.error(f"Error generating recommendation: {e}")
            return "分析エラー - レコメンデーションを生成できませんでした"

    async def analyze_market_overview(
        self, 
        stock_codes: List[str]
    ) -> Dict[str, Any]:
        """市場全体の概要分析"""
        try:
            analyses = []
            
            for stock_code in stock_codes:
                analysis = await self.analyze_stock(stock_code)
                if analysis:
                    analyses.append(analysis)
            
            if not analyses:
                return {"error": "No analysis data available"}
            
            # 市場センチメント計算
            bullish_count = len([a for a in analyses if a.trend_direction in [TrendDirection.BULLISH, TrendDirection.STRONG_BULLISH]])
            bearish_count = len([a for a in analyses if a.trend_direction in [TrendDirection.BEARISH, TrendDirection.STRONG_BEARISH]])
            neutral_count = len([a for a in analyses if a.trend_direction == TrendDirection.NEUTRAL])
            
            # 平均RSI計算
            rsi_values = [a.technical_indicators.rsi_14 for a in analyses if a.technical_indicators.rsi_14]
            avg_rsi = sum(rsi_values) / len(rsi_values) if rsi_values else None
            
            return {
                "total_stocks": len(analyses),
                "market_sentiment": {
                    "bullish": bullish_count,
                    "bearish": bearish_count,
                    "neutral": neutral_count,
                    "bullish_percentage": (bullish_count / len(analyses)) * 100
                },
                "technical_overview": {
                    "average_rsi": avg_rsi,
                    "overbought_stocks": len([a for a in analyses if a.technical_indicators.rsi_14 and a.technical_indicators.rsi_14 > 70]),
                    "oversold_stocks": len([a for a in analyses if a.technical_indicators.rsi_14 and a.technical_indicators.rsi_14 < 30])
                },
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in market overview analysis: {e}")
            return {"error": str(e)}


# グローバルアナライザーインスタンス
market_analyzer = MarketAnalyzer()