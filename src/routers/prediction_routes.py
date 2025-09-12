"""
Machine Learning Prediction API Routes
Stock price prediction endpoints
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel, Field

from ..ml.prediction_engine import ModelType, PredictionHorizon, prediction_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ml", tags=["machine-learning"])


# Pydantic models
class PredictionRequest(BaseModel):
    symbol: str = Field(..., description="Stock symbol to predict")
    horizon: str = Field(
        default="1d", description="Prediction horizon (1h, 1d, 1w, 1m, 3m)"
    )
    model_type: str = Field(default="random_forest", description="ML model to use")


class BatchPredictionRequest(BaseModel):
    symbols: List[str] = Field(..., description="List of stock symbols")
    horizon: str = Field(default="1d", description="Prediction horizon")
    model_type: str = Field(default="random_forest", description="ML model to use")


class TrainingRequest(BaseModel):
    symbol: str = Field(..., description="Stock symbol to train")
    model_type: str = Field(default="random_forest", description="ML model type")
    period: str = Field(default="2y", description="Training data period")


class PredictionResponse(BaseModel):
    success: bool
    symbol: str
    prediction: Optional[Dict[str, Any]]
    error: Optional[str] = None


class BatchPredictionResponse(BaseModel):
    success: bool
    predictions: List[Dict[str, Any]]
    failed_symbols: List[str]
    total_processed: int


@router.post("/predict", response_model=PredictionResponse)
async def predict_stock_price(request: PredictionRequest):
    """
    Predict stock price using machine learning

    Returns prediction with confidence score and direction
    """
    try:
        # Validate inputs
        try:
            horizon = PredictionHorizon(request.horizon)
            model_type = ModelType(request.model_type)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid parameter: {e}")

        symbol = request.symbol.upper()

        # Get prediction
        result = await prediction_engine.predict_price(
            symbol=symbol, horizon=horizon, model_type=model_type
        )

        if result:
            return PredictionResponse(
                success=True,
                symbol=symbol,
                prediction={
                    "current_price": result.current_price,
                    "predicted_price": result.predicted_price,
                    "change_percent": result.change_percent,
                    "direction": result.direction,
                    "confidence": result.confidence,
                    "horizon": result.horizon,
                    "model_used": result.model_used,
                    "features_used": result.features_used,
                    "timestamp": result.timestamp.isoformat(),
                    "metadata": result.metadata,
                },
            )
        else:
            return PredictionResponse(
                success=False,
                symbol=symbol,
                prediction=None,
                error="Failed to generate prediction",
            )

    except Exception as e:
        logger.error(f"Prediction error for {request.symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def batch_predict_prices(request: BatchPredictionRequest):
    """
    Predict prices for multiple stocks in batch

    More efficient than individual requests for multiple symbols
    """
    try:
        # Validate inputs
        try:
            horizon = PredictionHorizon(request.horizon)
            model_type = ModelType(request.model_type)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid parameter: {e}")

        symbols = [s.upper() for s in request.symbols]

        # Limit batch size to prevent rate limiting
        if len(symbols) > 5:
            raise HTTPException(
                status_code=400,
                detail="Maximum 5 symbols per batch to prevent rate limiting",
            )

        # Get predictions
        results = await prediction_engine.batch_predict(
            symbols=symbols, horizon=horizon, model_type=model_type
        )

        # Format response
        predictions = []
        successful_symbols = set()

        for result in results:
            predictions.append(
                {
                    "symbol": result.symbol,
                    "current_price": result.current_price,
                    "predicted_price": result.predicted_price,
                    "change_percent": result.change_percent,
                    "direction": result.direction,
                    "confidence": result.confidence,
                    "horizon": result.horizon,
                    "model_used": result.model_used,
                    "timestamp": result.timestamp.isoformat(),
                }
            )
            successful_symbols.add(result.symbol)

        failed_symbols = [s for s in symbols if s not in successful_symbols]

        return BatchPredictionResponse(
            success=True,
            predictions=predictions,
            failed_symbols=failed_symbols,
            total_processed=len(symbols),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/ensemble")
async def predict_ensemble(
    symbol: str = Query(..., description="Stock symbol"),
    horizon: str = Query(default="1d", description="Prediction horizon"),
):
    """
    Get ensemble prediction using multiple ML models

    Combines predictions from multiple models for better accuracy
    """
    try:
        # Validate inputs
        try:
            horizon_enum = PredictionHorizon(horizon)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid horizon")

        symbol = symbol.upper()

        # Get ensemble prediction
        result = await prediction_engine.get_ensemble_prediction(
            symbol=symbol, horizon=horizon_enum
        )

        if result:
            return {
                "success": True,
                "symbol": symbol,
                "prediction": {
                    "current_price": result.current_price,
                    "predicted_price": result.predicted_price,
                    "change_percent": result.change_percent,
                    "direction": result.direction,
                    "confidence": result.confidence,
                    "horizon": result.horizon,
                    "model_used": result.model_used,
                    "timestamp": result.timestamp.isoformat(),
                    "metadata": result.metadata,
                },
            }
        else:
            return {
                "success": False,
                "symbol": symbol,
                "error": "Failed to generate ensemble prediction",
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ensemble prediction error for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train", response_model=Dict[str, Any])
async def train_model(request: TrainingRequest, background_tasks: BackgroundTasks):
    """
    Train ML model for a specific symbol

    Training runs in background and may take several minutes
    """
    try:
        # Validate inputs
        try:
            model_type = ModelType(request.model_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid model type")

        symbol = request.symbol.upper()

        # Start training in background
        background_tasks.add_task(
            prediction_engine.train_model,
            symbol=symbol,
            model_type=model_type,
            period=request.period,
        )

        return {
            "success": True,
            "message": f"Training started for {symbol}",
            "symbol": symbol,
            "model_type": request.model_type,
            "period": request.period,
            "status": "training_in_progress",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training initiation error for {request.symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train/batch")
async def batch_train_models(
    symbols: List[str] = Query(..., description="Symbols to train"),
    model_type: str = Query(default="random_forest", description="Model type"),
    period: str = Query(default="2y", description="Training period"),
    background_tasks: BackgroundTasks = None,
):
    """
    Train models for multiple symbols in batch

    All training runs in background
    """
    try:
        # Validate inputs
        try:
            model_type_enum = ModelType(model_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid model type")

        symbols = [s.upper() for s in symbols]

        # Limit batch size to prevent rate limiting
        if len(symbols) > 3:
            raise HTTPException(
                status_code=400,
                detail="Maximum 3 symbols per batch training to prevent rate limiting",
            )

        # Start training for each symbol
        for symbol in symbols:
            background_tasks.add_task(
                prediction_engine.train_model,
                symbol=symbol,
                model_type=model_type_enum,
                period=period,
            )

        return {
            "success": True,
            "message": f"Batch training started for {len(symbols)} symbols",
            "symbols": symbols,
            "model_type": model_type,
            "period": period,
            "status": "training_in_progress",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/info")
async def get_model_info():
    """
    Get information about trained models

    Returns available models, metrics, and training status
    """
    try:
        info = prediction_engine.get_model_info()

        return {
            "success": True,
            "model_info": info,
            "available_model_types": [model.value for model in ModelType],
            "available_horizons": [horizon.value for horizon in PredictionHorizon],
            "timestamp": "2024-01-01T00:00:00Z",  # Would be current time
        }

    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{symbol}/metrics")
async def get_model_metrics(
    symbol: str,
    model_type: str = Query(default="random_forest", description="Model type"),
):
    """
    Get performance metrics for a specific model

    Returns accuracy, error rates, and other performance indicators
    """
    try:
        symbol = symbol.upper()
        model_key = f"{symbol}_{model_type}"

        if model_key not in prediction_engine.model_metrics:
            raise HTTPException(
                status_code=404, detail=f"No metrics found for {symbol} {model_type}"
            )

        metrics = prediction_engine.model_metrics[model_key]

        return {
            "success": True,
            "symbol": symbol,
            "model_type": model_type,
            "metrics": {
                "mse": metrics.mse,
                "mae": metrics.mae,
                "r2_score": metrics.r2,
                "directional_accuracy": metrics.accuracy,
                "sharpe_ratio": metrics.sharpe_ratio,
            },
            "interpretation": {
                "r2_score": "Higher is better (max 1.0)",
                "directional_accuracy": "Percentage of correct direction predictions",
                "mae": "Mean Absolute Error in price prediction",
                "mse": "Mean Squared Error (penalizes large errors more)",
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting metrics for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/retrain")
async def retrain_models(
    symbols: Optional[List[str]] = Query(
        None, description="Symbols to retrain (all if empty)"
    ),
    background_tasks: BackgroundTasks = None,
):
    """
    Retrain existing models with fresh data

    Updates models with latest market data
    """
    try:
        # Start retraining in background
        background_tasks.add_task(
            prediction_engine.retrain_models,
            symbols=[s.upper() for s in symbols] if symbols else None,
        )

        symbols_to_retrain = symbols or list(prediction_engine.trained_symbols)

        return {
            "success": True,
            "message": f"Retraining started for {len(symbols_to_retrain)} symbols",
            "symbols": symbols_to_retrain,
            "status": "retraining_in_progress",
        }

    except Exception as e:
        logger.error(f"Retraining error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/backtest/{symbol}")
async def backtest_model(
    symbol: str,
    model_type: str = Query(default="random_forest", description="Model type"),
    days_back: int = Query(default=30, description="Days to backtest"),
):
    """
    Backtest model performance over historical data

    Shows how predictions would have performed in the past
    """
    try:
        # This would implement backtesting logic
        # For now, return a placeholder response

        symbol = symbol.upper()

        return {
            "success": True,
            "symbol": symbol,
            "model_type": model_type,
            "backtest_period": f"{days_back} days",
            "results": {
                "total_predictions": days_back,
                "correct_direction": int(days_back * 0.65),  # Placeholder
                "accuracy": 65.0,
                "average_error": 2.3,
                "best_prediction": {"date": "2024-01-15", "error": 0.1},
                "worst_prediction": {"date": "2024-01-08", "error": 8.5},
            },
            "note": "Backtesting feature in development",
        }

    except Exception as e:
        logger.error(f"Backtesting error for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predict/popular")
async def predict_popular_stocks():
    """
    Get predictions for popular stocks

    Returns predictions for commonly traded stocks
    """
    try:
        # Reduced popular symbols to prevent rate limiting
        popular_symbols = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"]

        # Get predictions for popular stocks
        results = await prediction_engine.batch_predict(
            symbols=popular_symbols,
            horizon=PredictionHorizon.DAILY,
            model_type=ModelType.RANDOM_FOREST,
        )

        predictions = []
        for result in results:
            predictions.append(
                {
                    "symbol": result.symbol,
                    "current_price": result.current_price,
                    "predicted_price": result.predicted_price,
                    "change_percent": result.change_percent,
                    "direction": result.direction,
                    "confidence": result.confidence,
                }
            )

        # Sort by confidence
        predictions.sort(key=lambda x: x["confidence"], reverse=True)

        return {
            "success": True,
            "predictions": predictions,
            "total_symbols": len(predictions),
            "timestamp": "2024-01-01T00:00:00Z",  # Would be current time
        }

    except Exception as e:
        logger.error(f"Error getting popular stock predictions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
