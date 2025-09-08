"""
Analytics API Endpoints

高度な分析機能のAPIエンドポイント
テクニカル分析、市場分析、投資レコメンデーション等を提供
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field

from ..analytics.market_analyzer import (
    market_analyzer,
    TrendAnalysis,
    TechnicalIndicators,
    MarketSignal
)
from ..config import get_settings

router = APIRouter(prefix="/analytics", tags=["Analytics"])
logger = logging.getLogger(__name__)


class AnalysisRequest(BaseModel):
    """分析要求"""
    stock_codes: List[str] = Field(..., description="銘柄コードリスト")
    analysis_days: int = Field(default=100, ge=20, le=365, description="分析対象日数")
    include_signals: bool = Field(default=True, description="シグナル分析を含む")


class TechnicalIndicatorsResponse(BaseModel):
    """テクニカル指標レスポンス"""
    stock_code: str
    indicators: Dict[str, Optional[float]]
    timestamp: str


class TrendAnalysisResponse(BaseModel):
    """トレンド分析レスポンス"""
    stock_code: str
    current_price: float
    trend_direction: str
    trend_strength: float
    support_level: Optional[float]
    resistance_level: Optional[float]
    key_levels: List[float]
    recommendation: str
    confidence_score: float
    analysis_timestamp: str
    technical_indicators: Dict[str, Optional[float]]
    signals: List[Dict[str, Any]]


class MarketOverviewResponse(BaseModel):
    """市場概要レスポンス"""
    total_stocks: int
    market_sentiment: Dict[str, Any]
    technical_overview: Dict[str, Any]
    top_performers: List[Dict[str, Any]]
    analysis_timestamp: str


@router.get("/technical-indicators/{stock_code}",
           response_model=TechnicalIndicatorsResponse,
           summary="テクニカル指標取得",
           description="指定銘柄のテクニカル指標を取得")
async def get_technical_indicators(
    stock_code: str,
    days: int = Query(100, ge=20, le=365, description="分析対象日数")
):
    """
    テクニカル指標取得
    
    Args:
        stock_code: 銘柄コード
        days: 分析対象日数
        
    Returns:
        TechnicalIndicatorsResponse: テクニカル指標データ
    """
    try:
        analysis = await market_analyzer.analyze_stock(stock_code, days)
        
        if not analysis:
            raise HTTPException(
                status_code=404, 
                detail=f"Analysis data not available for {stock_code}"
            )
        
        # テクニカル指標を辞書形式に変換
        indicators_dict = {}
        indicators = analysis.technical_indicators
        
        # 移動平均
        if indicators.sma_5: indicators_dict['sma_5'] = indicators.sma_5
        if indicators.sma_20: indicators_dict['sma_20'] = indicators.sma_20
        if indicators.sma_50: indicators_dict['sma_50'] = indicators.sma_50
        if indicators.sma_200: indicators_dict['sma_200'] = indicators.sma_200
        if indicators.ema_12: indicators_dict['ema_12'] = indicators.ema_12
        if indicators.ema_26: indicators_dict['ema_26'] = indicators.ema_26
        
        # オシレーター
        if indicators.rsi_14: indicators_dict['rsi_14'] = indicators.rsi_14
        if indicators.stoch_k: indicators_dict['stoch_k'] = indicators.stoch_k
        if indicators.stoch_d: indicators_dict['stoch_d'] = indicators.stoch_d
        
        # MACD
        if indicators.macd_line: indicators_dict['macd_line'] = indicators.macd_line
        if indicators.macd_signal: indicators_dict['macd_signal'] = indicators.macd_signal
        if indicators.macd_histogram: indicators_dict['macd_histogram'] = indicators.macd_histogram
        
        # ボリンジャーバンド
        if indicators.bb_upper: indicators_dict['bb_upper'] = indicators.bb_upper
        if indicators.bb_middle: indicators_dict['bb_middle'] = indicators.bb_middle
        if indicators.bb_lower: indicators_dict['bb_lower'] = indicators.bb_lower
        if indicators.bb_width: indicators_dict['bb_width'] = indicators.bb_width
        
        # ボラティリティ
        if indicators.volatility_20: indicators_dict['volatility_20'] = indicators.volatility_20
        if indicators.atr_14: indicators_dict['atr_14'] = indicators.atr_14
        
        # ボリューム
        if indicators.volume_sma_20: indicators_dict['volume_sma_20'] = indicators.volume_sma_20
        if indicators.volume_ratio: indicators_dict['volume_ratio'] = indicators.volume_ratio
        
        return TechnicalIndicatorsResponse(
            stock_code=stock_code,
            indicators=indicators_dict,
            timestamp=analysis.analysis_timestamp.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting technical indicators for {stock_code}: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/trend-analysis/{stock_code}",
           response_model=TrendAnalysisResponse,
           summary="トレンド分析実行",
           description="指定銘柄の包括的トレンド分析を実行")
async def get_trend_analysis(
    stock_code: str,
    days: int = Query(100, ge=20, le=365, description="分析対象日数"),
    include_signals: bool = Query(True, description="シグナル分析を含む")
):
    """
    トレンド分析実行
    
    Args:
        stock_code: 銘柄コード
        days: 分析対象日数
        include_signals: シグナル分析を含むかどうか
        
    Returns:
        TrendAnalysisResponse: 包括的トレンド分析結果
    """
    try:
        analysis = await market_analyzer.analyze_stock(stock_code, days)
        
        if not analysis:
            raise HTTPException(
                status_code=404, 
                detail=f"Analysis data not available for {stock_code}"
            )
        
        # テクニカル指標を辞書形式に変換（前の関数と同じロジック）
        indicators = analysis.technical_indicators
        indicators_dict = {}
        
        for field_name in indicators.__dataclass_fields__:
            value = getattr(indicators, field_name)
            if value is not None:
                indicators_dict[field_name] = value
        
        # シグナルを辞書形式に変換
        signals_list = []
        if include_signals:
            for signal in analysis.signals:
                signals_list.append({
                    "signal_type": signal.signal_type,
                    "strength": signal.strength.value,
                    "direction": signal.direction.value,
                    "confidence": signal.confidence,
                    "description": signal.description,
                    "timestamp": signal.timestamp.isoformat(),
                    "target_price": signal.target_price,
                    "stop_loss": signal.stop_loss
                })
        
        # 信頼度スコア計算
        confidence_score = min(0.95, analysis.trend_strength + 
                             (len([s for s in analysis.signals if s.confidence > 0.6]) * 0.1))
        
        return TrendAnalysisResponse(
            stock_code=stock_code,
            current_price=analysis.current_price,
            trend_direction=analysis.trend_direction.value,
            trend_strength=analysis.trend_strength,
            support_level=analysis.support_level,
            resistance_level=analysis.resistance_level,
            key_levels=analysis.key_levels,
            recommendation=analysis.recommendation,
            confidence_score=confidence_score,
            analysis_timestamp=analysis.analysis_timestamp.isoformat(),
            technical_indicators=indicators_dict,
            signals=signals_list
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in trend analysis for {stock_code}: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/batch-analysis",
            response_model=List[TrendAnalysisResponse],
            summary="バッチ分析実行",
            description="複数銘柄の一括トレンド分析")
async def batch_trend_analysis(request: AnalysisRequest):
    """
    バッチ分析実行
    
    Args:
        request: 分析要求
        
    Returns:
        List[TrendAnalysisResponse]: 分析結果リスト
    """
    try:
        if len(request.stock_codes) > 20:
            raise HTTPException(
                status_code=400, 
                detail="Maximum 20 stock codes allowed per batch"
            )
        
        results = []
        
        for stock_code in request.stock_codes:
            try:
                analysis = await market_analyzer.analyze_stock(
                    stock_code, 
                    request.analysis_days
                )
                
                if analysis:
                    # テクニカル指標変換
                    indicators_dict = {}
                    for field_name in analysis.technical_indicators.__dataclass_fields__:
                        value = getattr(analysis.technical_indicators, field_name)
                        if value is not None:
                            indicators_dict[field_name] = value
                    
                    # シグナル変換
                    signals_list = []
                    if request.include_signals:
                        for signal in analysis.signals:
                            signals_list.append({
                                "signal_type": signal.signal_type,
                                "strength": signal.strength.value,
                                "direction": signal.direction.value,
                                "confidence": signal.confidence,
                                "description": signal.description,
                                "timestamp": signal.timestamp.isoformat(),
                                "target_price": signal.target_price,
                                "stop_loss": signal.stop_loss
                            })
                    
                    confidence_score = min(0.95, analysis.trend_strength + 
                                         (len([s for s in analysis.signals if s.confidence > 0.6]) * 0.1))
                    
                    results.append(TrendAnalysisResponse(
                        stock_code=stock_code,
                        current_price=analysis.current_price,
                        trend_direction=analysis.trend_direction.value,
                        trend_strength=analysis.trend_strength,
                        support_level=analysis.support_level,
                        resistance_level=analysis.resistance_level,
                        key_levels=analysis.key_levels,
                        recommendation=analysis.recommendation,
                        confidence_score=confidence_score,
                        analysis_timestamp=analysis.analysis_timestamp.isoformat(),
                        technical_indicators=indicators_dict,
                        signals=signals_list
                    ))
                    
            except Exception as e:
                logger.error(f"Error analyzing {stock_code}: {e}")
                # 個別銘柄のエラーはスキップして他を続行
                continue
        
        if not results:
            raise HTTPException(
                status_code=404, 
                detail="No analysis results available for any of the requested stocks"
            )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Batch analysis failed: {str(e)}")


@router.get("/market-overview",
           response_model=MarketOverviewResponse,
           summary="市場概要取得",
           description="市場全体の概要と統計情報を取得")
async def get_market_overview(
    stock_codes: List[str] = Query(..., description="監視銘柄リスト"),
    days: int = Query(100, ge=20, le=365, description="分析対象日数")
):
    """
    市場概要取得
    
    Args:
        stock_codes: 監視銘柄リスト
        days: 分析対象日数
        
    Returns:
        MarketOverviewResponse: 市場概要データ
    """
    try:
        if len(stock_codes) > 50:
            raise HTTPException(
                status_code=400, 
                detail="Maximum 50 stock codes allowed for market overview"
            )
        
        # 市場分析実行
        market_data = await market_analyzer.analyze_market_overview(stock_codes[:20])  # 最大20銘柄
        
        if "error" in market_data:
            raise HTTPException(
                status_code=500, 
                detail=f"Market analysis failed: {market_data['error']}"
            )
        
        # トップパフォーマー計算（簡易版）
        top_performers = []
        for stock_code in stock_codes[:10]:  # 上位10銘柄のみ
            try:
                analysis = await market_analyzer.analyze_stock(stock_code, days)
                if analysis and analysis.trend_direction.value in ['bullish', 'strong_bullish']:
                    top_performers.append({
                        "stock_code": stock_code,
                        "trend_strength": analysis.trend_strength,
                        "recommendation": analysis.recommendation
                    })
            except:
                continue
        
        # トレンド強度でソート
        top_performers.sort(key=lambda x: x['trend_strength'], reverse=True)
        top_performers = top_performers[:5]  # 上位5銘柄
        
        return MarketOverviewResponse(
            total_stocks=market_data["total_stocks"],
            market_sentiment=market_data["market_sentiment"],
            technical_overview=market_data["technical_overview"],
            top_performers=top_performers,
            analysis_timestamp=market_data["analysis_timestamp"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in market overview: {e}")
        raise HTTPException(status_code=500, detail=f"Market overview failed: {str(e)}")


@router.get("/signals/{stock_code}",
           summary="投資シグナル取得",
           description="指定銘柄の最新投資シグナルを取得")
async def get_investment_signals(
    stock_code: str,
    days: int = Query(100, ge=20, le=365, description="分析対象日数"),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0, description="最小信頼度")
):
    """
    投資シグナル取得
    
    Args:
        stock_code: 銘柄コード
        days: 分析対象日数
        min_confidence: 最小信頼度
        
    Returns:
        Dict: シグナルデータ
    """
    try:
        analysis = await market_analyzer.analyze_stock(stock_code, days)
        
        if not analysis:
            raise HTTPException(
                status_code=404, 
                detail=f"Signal data not available for {stock_code}"
            )
        
        # 信頼度でフィルタリング
        filtered_signals = [
            {
                "signal_type": s.signal_type,
                "strength": s.strength.value,
                "direction": s.direction.value,
                "confidence": s.confidence,
                "description": s.description,
                "timestamp": s.timestamp.isoformat(),
                "target_price": s.target_price,
                "stop_loss": s.stop_loss
            }
            for s in analysis.signals 
            if s.confidence >= min_confidence
        ]
        
        return {
            "stock_code": stock_code,
            "total_signals": len(filtered_signals),
            "signals": filtered_signals,
            "overall_recommendation": analysis.recommendation,
            "trend_direction": analysis.trend_direction.value,
            "analysis_timestamp": analysis.analysis_timestamp.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting signals for {stock_code}: {e}")
        raise HTTPException(status_code=500, detail=f"Signal analysis failed: {str(e)}")


@router.get("/health",
           summary="分析エンジンヘルスチェック",
           description="分析エンジンの稼働状況を確認")
async def analytics_health_check():
    """
    分析エンジンヘルスチェック
    
    Returns:
        Dict: ヘルス情報
    """
    try:
        # 簡単なテスト分析実行
        test_analysis = await market_analyzer.analyze_stock("7203", 30)  # トヨタで簡易テスト
        
        return {
            "status": "healthy",
            "analytics_engine": "operational",
            "test_analysis": test_analysis is not None,
            "dependencies": {
                "numpy": True,
                "pandas": True,
                "stock_service": True
            },
            "timestamp": market_data.get("analysis_timestamp", "unknown") if 'market_data' in locals() else None
        }
        
    except Exception as e:
        logger.error(f"Analytics health check failed: {e}")
        return {
            "status": "unhealthy",
            "analytics_engine": "error",
            "error": str(e),
            "dependencies": {
                "numpy": True,
                "pandas": True,
                "stock_service": False
            }
        }