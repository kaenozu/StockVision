"""
Price predictions API endpoints for chart display
価格予想チャート表示用APIエンドポイント
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/price-predictions",
    tags=["Price Predictions"],
    responses={404: {"description": "Not found"}},
)

@router.get("/{symbol}")
async def get_price_prediction_chart(
    symbol: str,
    period: str = Query("short", description="Prediction period: short (7 days) or medium (14 days)")
) -> JSONResponse:
    """
    価格予想チャートデータを取得
    
    Args:
        symbol: Stock symbol (e.g., "6594")
        period: Prediction period (short=7 days, medium=14 days)
    
    Returns:
        Chart data in format expected by frontend
    """
    try:
        logger.info(f"Fetching price prediction chart for {symbol}, period: {period}")
        
        # Determine days based on period
        prediction_days = 7 if period == "short" else 14
        history_days = 30  # Show 30 days of historical data
        
        # For now, use sample data to get the API working
        # TODO: Replace with real data fetching once API is stable
        from datetime import date, timedelta
        
        # Generate sample price history based on user's observation
        base_date = date(2025, 8, 15)
        end_date = date(2025, 9, 10) 
        base_price = 2450
        
        price_history = []
        current_date = base_date
        current_price = base_price
        
        # Generate realistic daily price data between 8/15 and 9/10
        while current_date <= end_date:
            # Skip weekends
            if current_date.weekday() < 5:  # Monday = 0, Friday = 4
                # Add some realistic price variation
                daily_change = (hash(str(current_date)) % 201 - 100) / 100  # -1% to +1% daily change
                current_price *= (1 + daily_change * 0.02)  # Scale to reasonable range
                
                price_history.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'close': round(current_price, 1),
                    'open': round(current_price * 0.999, 1),
                    'high': round(current_price * 1.01, 1),
                    'low': round(current_price * 0.99, 1),
                    'volume': 1000000 + (hash(str(current_date)) % 5000000)
                })
            current_date += timedelta(days=1)
        
        if not price_history:
            raise HTTPException(status_code=404, detail=f"No price history generated for {symbol}")
        
        # Generate simple ML prediction (simplified for now)
        # TODO: Replace with actual ML prediction once API is stable
        import random
        
        # Simple mock prediction
        ml_prediction = {
            'predictions': {
                'all': {
                    'change_percent': random.uniform(-3, 5)  # -3% to +5% predicted change
                }
            },
            'confidence': random.uniform(60, 85),
            'signal': 'BUY' if random.random() > 0.5 else 'HOLD'
        }
        
        # Prepare chart data
        chart_data = prepare_chart_data(
            symbol=symbol,
            price_history=price_history,
            ml_prediction=ml_prediction,
            prediction_days=prediction_days
        )
        
        return JSONResponse(content=chart_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating price prediction chart for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def prepare_chart_data(
    symbol: str,
    price_history: List[Dict],
    ml_prediction: Optional[Dict],
    prediction_days: int
) -> Dict[str, Any]:
    """
    Prepare chart data in the format expected by frontend
    """
    try:
        # Sort price history by date
        price_history.sort(key=lambda x: x['date'])
        
        # Extract historical data
        historical_dates = []
        historical_prices = []
        
        for record in price_history:
            date_str = record['date']
            if isinstance(date_str, str):
                historical_dates.append(date_str)
            else:
                historical_dates.append(date_str.strftime('%Y-%m-%d'))
            historical_prices.append(record.get('close', 0))
        
        # Generate future dates for predictions
        if historical_dates:
            last_date = datetime.strptime(historical_dates[-1], '%Y-%m-%d')
            future_dates = []
            for i in range(1, prediction_days + 1):
                future_date = last_date + timedelta(days=i)
                # Skip weekends
                while future_date.weekday() >= 5:  # 5=Saturday, 6=Sunday
                    future_date += timedelta(days=1)
                future_dates.append(future_date.strftime('%Y-%m-%d'))
        else:
            future_dates = []
        
        # Combine dates
        all_dates = historical_dates + future_dates
        
        # Prepare actual prices (historical + None for future)
        actual_prices = historical_prices + [None] * len(future_dates)
        
        # Prepare predicted prices
        predicted_prices = [None] * len(historical_dates)
        upper_bounds = [None] * len(historical_dates)
        lower_bounds = [None] * len(historical_dates)
        
        if ml_prediction and historical_prices:
            last_price = historical_prices[-1]
            
            # Add last historical price as start of prediction
            predicted_prices.append(last_price)
            
            # Generate prediction values
            for i in range(len(future_dates)):
                if ml_prediction:
                    # Use ML prediction with some variation
                    change_percent = ml_prediction.get('predictions', {}).get('all', {}).get('change_percent', 0)
                    daily_change = change_percent / prediction_days
                    predicted_price = last_price * (1 + (daily_change * (i + 1)) / 100)
                    
                    # Add confidence intervals
                    confidence = ml_prediction.get('confidence', 75) / 100
                    margin = predicted_price * (1 - confidence) * 0.1
                    
                    predicted_prices.append(predicted_price)
                    upper_bounds.append(predicted_price + margin)
                    lower_bounds.append(predicted_price - margin)
                else:
                    predicted_prices.append(None)
                    upper_bounds.append(None)
                    lower_bounds.append(None)
        else:
            # No prediction available
            predicted_prices.extend([None] * len(future_dates))
            upper_bounds.extend([None] * len(future_dates))
            lower_bounds.extend([None] * len(future_dates))
        
        # Prepare datasets for Chart.js
        datasets = [
            {
                "label": "実際の価格",
                "data": actual_prices,
                "borderColor": "rgb(75, 192, 192)",
                "backgroundColor": "rgba(75, 192, 192, 0.2)",
                "borderWidth": 2,
                "pointRadius": 3,
                "pointHoverRadius": 5,
                "fill": False
            },
            {
                "label": "予想価格",
                "data": predicted_prices,
                "borderColor": "rgb(255, 99, 132)",
                "backgroundColor": "rgba(255, 99, 132, 0.2)",
                "borderWidth": 2,
                "borderDash": [5, 5],
                "pointRadius": 3,
                "pointHoverRadius": 5,
                "fill": False
            },
            {
                "label": "信頼区間（上限）",
                "data": upper_bounds,
                "borderColor": "rgba(255, 99, 132, 0.3)",
                "backgroundColor": "rgba(255, 99, 132, 0.1)",
                "borderWidth": 1,
                "borderDash": [2, 2],
                "pointRadius": 0,
                "fill": "+1"
            },
            {
                "label": "信頼区間（下限）",
                "data": lower_bounds,
                "borderColor": "rgba(255, 99, 132, 0.3)",
                "backgroundColor": "rgba(255, 99, 132, 0.1)",
                "borderWidth": 1,
                "borderDash": [2, 2],
                "pointRadius": 0,
                "fill": "-1"
            }
        ]
        
        # Prepare trading markers (simplified for now)
        markers = {
            "buy": [],
            "sell": []
        }
        
        # Add buy/sell signals based on ML prediction
        if ml_prediction and ml_prediction.get('signal'):
            signal = ml_prediction['signal']
            if signal == 'BUY' and future_dates:
                markers['buy'].append({
                    "date": future_dates[0],
                    "price": predicted_prices[len(historical_dates) + 1] if len(predicted_prices) > len(historical_dates) else last_price,
                    "reason": "ML予測による買いシグナル"
                })
            elif signal == 'SELL' and future_dates:
                markers['sell'].append({
                    "date": future_dates[0],
                    "price": predicted_prices[len(historical_dates) + 1] if len(predicted_prices) > len(historical_dates) else last_price,
                    "reason": "ML予測による売りシグナル"
                })
        
        return {
            "stock": {
                "id": symbol,
                "symbol": symbol,
                "name": f"Stock {symbol}",
                "category": "unknown"
            },
            "chartData": {
                "labels": all_dates,
                "datasets": datasets
            },
            "markers": markers,
            "chartType": "prediction",
            "generatedAt": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error preparing chart data: {e}")
        raise