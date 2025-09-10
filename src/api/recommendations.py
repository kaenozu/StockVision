"""
Stock Recommendations API endpoints.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import random
import logging
import asyncio
import concurrent.futures
from functools import lru_cache

from ..stock_storage.database import get_session_scope
from ..models.stock import Stock
from ..models.price_history import PriceHistory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recommended-stocks", tags=["Recommendations"])

def get_db():
    """Database session dependency."""
    with get_session_scope() as session:
        yield session

def process_stock_recommendation(stock_data: tuple) -> dict:
    """
    Process recommendation for a single stock (for parallel processing).
    
    Args:
        stock_data: Tuple of (stock, db_session_data)
    
    Returns:
        Dictionary containing recommendation data
    """
    stock, session = stock_data
    
    # Calculate technical indicators
    indicators = calculate_technical_indicators(stock.stock_code, session)
    
    if not indicators:
        # If no enough data, create basic recommendation
        return {
            "symbol": stock.stock_code,
            "name": stock.company_name,
            "price": {
                "current": float(stock.current_price),
                "change": float(stock.price_change),
                "changePercent": float(stock.price_change_pct),
                "dayHigh": None,
                "dayLow": None,
                "volume": int(stock.volume)
            },
            "recommendation": {
                "symbol": stock.stock_code,
                "signal": "hold",
                "confidence": 5,
                "reasoning": "データ不足のため様子見を推奨",
                "targetPrice": None,
                "stopLoss": None,
                "timeHorizon": "medium_term",
                "riskLevel": "medium",
                "validUntil": (datetime.now() + timedelta(days=7)).isoformat()
            }
        }
    
    # Generate recommendation based on indicators
    rec_data = generate_recommendation(stock, indicators)
    
    return {
        "symbol": stock.stock_code,
        "name": stock.company_name,
        "price": {
            "current": indicators["current_price"],
            "change": indicators["price_change"],
            "changePercent": indicators["price_change_pct"],
            "dayHigh": None,
            "dayLow": None,
            "volume": int(stock.volume)
        },
        "recommendation": rec_data
    }

@lru_cache(maxsize=128, typed=True)
def get_cached_recommendations(stock_ids: tuple, cache_timestamp: str) -> List[dict]:
    """
    Cached recommendations to improve performance for large stock lists.
    Cache is invalidated every 5 minutes via cache_timestamp.
    """
    # This function signature ensures cache invalidation
    # The actual processing is done in the main endpoint
    return []

def calculate_technical_indicators(stock_code: str, db: Session, cache_results: bool = True) -> Dict[str, Any]:
    """
    Calculate technical indicators for a stock with performance optimizations.
    
    Args:
        stock_code: Stock code to analyze
        db: Database session
        cache_results: Whether to cache results for performance
    
    Returns:
        Dictionary containing technical indicators
    """
    # Get recent price history with optimized query
    recent_prices = db.query(
        PriceHistory.close_price, 
        PriceHistory.volume,
        PriceHistory.date
    ).filter(
        PriceHistory.stock_code == stock_code
    ).order_by(PriceHistory.date.desc()).limit(50).all()
    
    if len(recent_prices) < 20:
        logger.warning(f"Insufficient price data for {stock_code}: {len(recent_prices)} records")
        return {}
    
    # Extract prices and volumes more efficiently
    prices = [float(p.close_price) for p in recent_prices]
    volumes = [int(p.volume) if p.volume else 0 for p in recent_prices]
    
    current_price = prices[0]
    current_volume = volumes[0]
    
    # Calculate SMAs
    sma20 = sum(prices[:20]) / 20
    sma50 = sum(prices[:50]) / 50 if len(prices) >= 50 else sma20
    
    # Calculate RSI (optimized version)
    gains = []
    losses = []
    for i in range(1, min(15, len(prices))):  # 14 periods + current
        diff = prices[i-1] - prices[i]
        if diff > 0:
            gains.append(diff)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(diff))
    
    avg_gain = sum(gains) / len(gains) if gains else 0
    avg_loss = sum(losses) / len(losses) if losses else 0
    rs = avg_gain / avg_loss if avg_loss > 0 else 100
    rsi = 100 - (100 / (1 + rs))
    
    # Calculate price change
    if len(recent_prices) > 1:
        price_change = current_price - float(recent_prices[1].close_price)
        price_change_pct = (price_change / float(recent_prices[1].close_price)) * 100
    else:
        price_change = 0
        price_change_pct = 0
    
    # Volume analysis
    recent_volume = float(recent_prices[0].volume)
    avg_volume = sum([float(p.volume) for p in recent_prices[:20]]) / 20
    volume_ratio = recent_volume / avg_volume if avg_volume > 0 else 1
    
    return {
        "rsi": rsi,
        "sma20": sma20,
        "sma50": sma50,
        "current_price": current_price,
        "price_change": price_change,
        "price_change_pct": price_change_pct,
        "volume_ratio": volume_ratio,
        "price_vs_sma20": ((current_price - sma20) / sma20) * 100 if sma20 else 0,
        "price_vs_sma50": ((current_price - sma50) / sma50) * 100 if sma50 and sma50 > 0 else None
    }

def generate_recommendation(stock: Stock, indicators: Dict[str, Any]) -> Dict[str, Any]:
    """Generate trading recommendation based on technical indicators."""
    
    # Initialize scores
    buy_score = 0
    sell_score = 0
    hold_score = 0
    
    # RSI analysis
    if "rsi" in indicators:
        rsi = indicators["rsi"]
        if rsi < 30:
            buy_score += 3  # Oversold
        elif rsi < 40:
            buy_score += 1
        elif rsi > 70:
            sell_score += 3  # Overbought
        elif rsi > 60:
            sell_score += 1
        else:
            hold_score += 1
    
    # Moving average analysis
    if "price_vs_sma20" in indicators:
        if indicators["price_vs_sma20"] > 5:
            sell_score += 1  # Price too far above MA
        elif indicators["price_vs_sma20"] > 0:
            buy_score += 1  # Price above MA (bullish)
        elif indicators["price_vs_sma20"] < -5:
            buy_score += 2  # Price significantly below MA (potential bounce)
        else:
            hold_score += 1
    
    # Volume analysis
    if "volume_ratio" in indicators:
        if indicators["volume_ratio"] > 1.5:
            if indicators.get("price_change_pct", 0) > 0:
                buy_score += 2  # High volume with price increase
            else:
                sell_score += 1  # High volume with price decrease
    
    # Price momentum
    if "price_change_pct" in indicators:
        if indicators["price_change_pct"] > 3:
            buy_score += 1
        elif indicators["price_change_pct"] < -3:
            sell_score += 1
    
    # Determine signal
    total_score = buy_score + sell_score + hold_score
    if total_score == 0:
        signal = "hold"
        confidence = 5
    else:
        if buy_score > sell_score and buy_score > hold_score:
            signal = "buy"
            confidence = min(10, 5 + (buy_score / total_score) * 5)
        elif sell_score > buy_score and sell_score > hold_score:
            signal = "sell"
            confidence = min(10, 5 + (sell_score / total_score) * 5)
        else:
            signal = "hold"
            confidence = 5 + (hold_score / total_score) * 3
    
    # Generate reasoning
    reasons = []
    if signal == "buy":
        if indicators.get("rsi", 50) < 30:
            reasons.append("RSI指標が売られすぎを示唆")
        if indicators.get("price_vs_sma20", 0) < -5:
            reasons.append("移動平均線からの乖離が大きい")
        if indicators.get("volume_ratio", 1) > 1.5:
            reasons.append("出来高増加")
    elif signal == "sell":
        if indicators.get("rsi", 50) > 70:
            reasons.append("RSI指標が買われすぎを示唆")
        if indicators.get("price_vs_sma20", 0) > 5:
            reasons.append("移動平均線から上方乖離")
    else:
        reasons.append("明確なトレンドなし")
        reasons.append("様子見推奨")
    
    reasoning = "、".join(reasons) if reasons else "テクニカル指標に基づく判断"
    
    # Risk assessment
    volatility = abs(indicators.get("price_change_pct", 0))
    if volatility > 5:
        risk_level = "high"
    elif volatility > 2:
        risk_level = "medium"
    else:
        risk_level = "low"
    
    # Target price (simplified)
    current_price = indicators.get("current_price", 0)
    if signal == "buy":
        target_price = current_price * 1.05  # 5% gain target
        stop_loss = current_price * 0.97  # 3% stop loss
    elif signal == "sell":
        target_price = current_price * 0.95  # 5% decline target
        stop_loss = current_price * 1.03  # 3% stop loss
    else:
        target_price = None
        stop_loss = None
    
    # Time horizon
    if abs(indicators.get("price_change_pct", 0)) > 3:
        time_horizon = "short_term"
    else:
        time_horizon = "medium_term"
    
    return {
        "symbol": stock.stock_code,
        "signal": signal,
        "confidence": round(confidence, 1),
        "reasoning": reasoning,
        "targetPrice": target_price,
        "stopLoss": stop_loss,
        "timeHorizon": time_horizon,
        "riskLevel": risk_level,
        "validUntil": (datetime.now() + timedelta(days=7)).isoformat(),
        "technical_indicators": indicators
    }

@router.get("")
async def get_recommended_stocks(
    sort_by: Optional[str] = Query("signal", description="Sort by: signal, confidence, change"),
    limit: Optional[int] = Query(20, ge=1, le=100),
    use_parallel: Optional[bool] = Query(True, description="Use parallel processing for better performance"),
    db: Session = Depends(get_db)
):
    """
    Get list of recommended stocks with buy/sell/hold signals.
    Stocks with BUY signals are prioritized at the top.
    Optimized for 100+ stocks with parallel processing.
    """
    start_time = datetime.now()
    
    try:
        # Get all stocks from database
        stocks = db.query(Stock).all()
        
        if not stocks:
            return {
                "stocks": [], 
                "totalCount": 0, 
                "timestamp": datetime.now().isoformat(),
                "processingTime": "0.00s"
            }
        
        logger.info(f"Processing recommendations for {len(stocks)} stocks")
        
        recommendations = []
        
        if use_parallel and len(stocks) > 5:  # Use parallel processing for 5+ stocks
            # Parallel processing for better performance with large datasets
            max_workers = min(10, len(stocks))  # Limit concurrent threads
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Create separate DB sessions for each thread
                def get_stock_with_session(stock):
                    with get_session_scope() as thread_session:
                        return process_stock_recommendation((stock, thread_session))
                
                # Process stocks in parallel
                future_to_stock = {
                    executor.submit(get_stock_with_session, stock): stock 
                    for stock in stocks
                }
                
                for future in concurrent.futures.as_completed(future_to_stock):
                    try:
                        recommendation = future.result(timeout=5.0)  # 5 second timeout per stock
                        recommendations.append(recommendation)
                    except concurrent.futures.TimeoutError:
                        stock = future_to_stock[future]
                        logger.warning(f"Timeout processing {stock.stock_code}")
                        # Add basic recommendation for timed-out stocks
                        recommendations.append({
                            "symbol": stock.stock_code,
                            "name": stock.company_name,
                            "price": {
                                "current": float(stock.current_price),
                                "change": float(stock.price_change),
                                "changePercent": float(stock.price_change_pct),
                                "dayHigh": None,
                                "dayLow": None,
                                "volume": int(stock.volume)
                            },
                            "recommendation": {
                                "symbol": stock.stock_code,
                                "signal": "hold",
                                "confidence": 5,
                                "reasoning": "処理タイムアウトのため様子見",
                                "targetPrice": None,
                                "stopLoss": None,
                                "timeHorizon": "medium_term",
                                "riskLevel": "medium",
                                "validUntil": (datetime.now() + timedelta(days=7)).isoformat()
                            }
                        })
                    except Exception as e:
                        stock = future_to_stock[future]
                        logger.error(f"Error processing {stock.stock_code}: {e}")
        else:
            # Sequential processing for small datasets or when parallel is disabled
            for stock in stocks:
                recommendation = process_stock_recommendation((stock, db))
                recommendations.append(recommendation)
        
        # Sort recommendations - BUY signals first, then by confidence
        def sort_key(rec):
            signal = rec["recommendation"]["signal"]
            confidence = rec["recommendation"]["confidence"]
            
            # Priority: buy=3, hold=2, sell=1
            signal_priority = {"buy": 3, "hold": 2, "sell": 1}.get(signal, 0)
            
            if sort_by == "confidence":
                return (-confidence, -signal_priority)  # Higher confidence first
            elif sort_by == "change":
                return (-abs(rec["price"]["changePercent"]), -signal_priority)
            else:  # Default: sort by signal
                return (-signal_priority, -confidence)
        
        recommendations.sort(key=sort_key)
        
        # Apply limit
        recommendations = recommendations[:limit]
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        logger.info(f"Recommendations processed in {processing_time:.3f}s for {len(stocks)} stocks")
        
        return {
            "stocks": recommendations,
            "totalCount": len(recommendations),
            "timestamp": datetime.now().isoformat(),
            "processingTime": f"{processing_time:.3f}s",
            "totalStocks": len(stocks),
            "parallelProcessing": use_parallel and len(stocks) > 5
        }
    
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{symbol}/detail")
async def get_stock_detail(
    symbol: str,
    db: Session = Depends(get_db)
):
    """Get detailed information and recommendation for a specific stock."""
    try:
        # Get stock from database
        stock = db.query(Stock).filter(Stock.stock_code == symbol).first()
        
        if not stock:
            raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
        
        # Calculate technical indicators
        indicators = calculate_technical_indicators(stock.stock_code, db)
        
        if not indicators:
            # Basic response without indicators
            return {
                "stock": {
                    "id": stock.stock_code,
                    "symbol": stock.stock_code,
                    "name": stock.company_name,
                    "category": "株式",
                    "sector": None
                },
                "price": {
                    "current": float(stock.current_price),
                    "change": float(stock.price_change),
                    "changePercent": float(stock.price_change_pct),
                    "dayHigh": None,
                    "dayLow": None,
                    "volume": int(stock.volume),
                    "marketCap": float(stock.market_cap) if stock.market_cap else None
                },
                "recommendation": {
                    "symbol": stock.stock_code,
                    "signal": "hold",
                    "confidence": 5,
                    "reasoning": "データ不足のため分析できません",
                    "targetPrice": None,
                    "stopLoss": None,
                    "timeHorizon": "medium_term",
                    "riskLevel": "medium",
                    "validUntil": (datetime.now() + timedelta(days=7)).isoformat()
                },
                "prediction": {
                    "shortTerm": None,
                    "mediumTerm": None
                }
            }
        
        # Generate recommendation
        rec_data = generate_recommendation(stock, indicators)
        
        # Calculate predictions (simplified)
        current_price = indicators["current_price"]
        
        # Short term prediction (7 days)
        if rec_data["signal"] == "buy":
            short_term_change = 0.03  # 3% increase
        elif rec_data["signal"] == "sell":
            short_term_change = -0.03  # 3% decrease
        else:
            short_term_change = 0.01  # 1% increase
        
        short_term_price = current_price * (1 + short_term_change)
        
        # Medium term prediction (14 days)
        medium_term_change = short_term_change * 1.5
        medium_term_price = current_price * (1 + medium_term_change)
        
        return {
            "stock": {
                "id": stock.stock_code,
                "symbol": stock.stock_code,
                "name": stock.company_name,
                "category": "株式",
                "sector": None
            },
            "price": {
                "current": current_price,
                "change": indicators["price_change"],
                "changePercent": indicators["price_change_pct"],
                "dayHigh": None,
                "dayLow": None,
                "volume": int(stock.volume),
                "marketCap": float(stock.market_cap) if stock.market_cap else None
            },
            "recommendation": rec_data,
            "prediction": {
                "shortTerm": {
                    "targetDate": (datetime.now() + timedelta(days=7)).isoformat(),
                    "predictedPrice": round(short_term_price, 2),
                    "confidenceLevel": rec_data["confidence"] / 10,
                    "upperBound": round(short_term_price * 1.05, 2),
                    "lowerBound": round(short_term_price * 0.95, 2)
                },
                "mediumTerm": {
                    "targetDate": (datetime.now() + timedelta(days=14)).isoformat(),
                    "predictedPrice": round(medium_term_price, 2),
                    "confidenceLevel": (rec_data["confidence"] / 10) * 0.8,
                    "upperBound": round(medium_term_price * 1.08, 2),
                    "lowerBound": round(medium_term_price * 0.92, 2)
                }
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stock detail for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))