"""
Stock Price Prediction API

This module provides a FastAPI-based REST API for stock price predictions
using machine learning models. It includes endpoints for single and batch
predictions, model management, and performance metrics.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel, Field
import yfinance as yf
import pandas as pd

# Local imports
from .prediction_engine import StockPredictionEngine, PredictionResult, ModelType, PredictionHorizon
from .lstm_gru_models import LSTMGRUPredictionEngine
from .pipeline import MLPipeline, PipelineResult
from ..services.cache import CacheManager

logger = logging.getLogger(__name__)

# Pydantic models for API requests/responses
class PredictionRequest(BaseModel):
    """Request model for single stock prediction"""
    symbol: str = Field(..., example="AAPL", description="Stock symbol")
    horizon: str = Field(default="1d", example="1d", description="Prediction horizon")
    model_type: str = Field(default="random_forest", example="random_forest", description="Model type to use")

class BatchPredictionRequest(BaseModel):
    """Request model for batch predictions"""
    symbols: List[str] = Field(..., example=["AAPL", "GOOGL", "MSFT"], description="List of stock symbols")
    horizon: str = Field(default="1d", example="1d", description="Prediction horizon")
    model_type: str = Field(default="random_forest", example="random_forest", description="Model type to use")

class PredictionResponse(BaseModel):
    """Response model for predictions"""
    symbol: str
    current_price: float
    predicted_price: float
    confidence: float
    direction: str
    change_percent: float
    horizon: str
    model_used: str
    features_used: List[str]
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None

class BatchPredictionResponse(BaseModel):
    """Response model for batch predictions"""
    predictions: List[PredictionResponse]
    timestamp: str

class ModelInfoResponse(BaseModel):
    """Response model for model information"""
    trained_symbols: List[str]
    available_models: List[str]
    model_metrics: Dict[str, Dict[str, float]]
    total_models: int

class PipelineStatusResponse(BaseModel):
    """Response model for pipeline status"""
    symbol: str
    status: str  # "running", "completed", "failed"
    progress: Optional[float] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Global instances
prediction_engine = StockPredictionEngine()
lstm_gru_engine = LSTMGRUPredictionEngine()
ml_pipeline = MLPipeline()
cache_manager = CacheManager()

# FastAPI app
app = FastAPI(
    title="Stock Price Prediction API",
    description="API for machine learning-based stock price predictions",
    version="1.0.0"
)

# Pipeline status tracking
pipeline_status: Dict[str, PipelineStatusResponse] = {}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/predict", response_model=PredictionResponse)
async def predict_stock_price(request: PredictionRequest):
    """Get stock price prediction for a single symbol"""
    try:
        # Check cache first
        cache_key = f"prediction_{request.symbol}_{request.horizon}_{request.model_type}"
        cached_result = cache_manager.get(cache_key)
        if cached_result:
            logger.info(f"Returning cached prediction for {request.symbol}")
            return cached_result
        
        # Convert horizon string to enum
        try:
            horizon = PredictionHorizon(request.horizon)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid horizon: {request.horizon}")
        
        # Convert model type string to enum
        try:
            model_type = ModelType(request.model_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid model type: {request.model_type}")
        
        # Get prediction
        prediction = await prediction_engine.predict_price(
            request.symbol, 
            horizon, 
            model_type
        )
        
        if not prediction:
            raise HTTPException(status_code=404, detail=f"Failed to get prediction for {request.symbol}")
        
        # Convert to response model
        response = PredictionResponse(
            symbol=prediction.symbol,
            current_price=prediction.current_price,
            predicted_price=prediction.predicted_price,
            confidence=prediction.confidence,
            direction=prediction.direction,
            change_percent=prediction.change_percent,
            horizon=prediction.horizon,
            model_used=prediction.model_used,
            features_used=prediction.features_used,
            timestamp=prediction.timestamp.isoformat(),
            metadata=prediction.metadata
        )
        
        # Cache result
        cache_manager.set(cache_key, response, ttl=300)  # Cache for 5 minutes
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error predicting price for {request.symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch_stock_prices(request: BatchPredictionRequest):
    """Get stock price predictions for multiple symbols"""
    try:
        # Convert horizon string to enum
        try:
            horizon = PredictionHorizon(request.horizon)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid horizon: {request.horizon}")
        
        # Convert model type string to enum
        try:
            model_type = ModelType(request.model_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid model type: {request.model_type}")
        
        # Get batch predictions
        predictions = await prediction_engine.batch_predict(
            request.symbols, 
            horizon, 
            model_type
        )
        
        if not predictions:
            raise HTTPException(status_code=404, detail="Failed to get predictions")
        
        # Convert to response models
        response_predictions = [
            PredictionResponse(
                symbol=pred.symbol,
                current_price=pred.current_price,
                predicted_price=pred.predicted_price,
                confidence=pred.confidence,
                direction=pred.direction,
                change_percent=pred.change_percent,
                horizon=pred.horizon,
                model_used=pred.model_used,
                features_used=pred.features_used,
                timestamp=pred.timestamp.isoformat(),
                metadata=pred.metadata
            )
            for pred in predictions
        ]
        
        return BatchPredictionResponse(
            predictions=response_predictions,
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error predicting batch prices: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/predict/ensemble/{symbol}", response_model=PredictionResponse)
async def predict_ensemble_price(symbol: str, horizon: str = "1d"):
    """Get ensemble prediction using multiple models"""
    try:
        # Check cache first
        cache_key = f"ensemble_prediction_{symbol}_{horizon}"
        cached_result = cache_manager.get(cache_key)
        if cached_result:
            logger.info(f"Returning cached ensemble prediction for {symbol}")
            return cached_result
        
        # Convert horizon string to enum
        try:
            pred_horizon = PredictionHorizon(horizon)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid horizon: {horizon}")
        
        # Get ensemble prediction
        prediction = await prediction_engine.get_ensemble_prediction(symbol, pred_horizon)
        
        if not prediction:
            raise HTTPException(status_code=404, detail=f"Failed to get ensemble prediction for {symbol}")
        
        # Convert to response model
        response = PredictionResponse(
            symbol=prediction.symbol,
            current_price=prediction.current_price,
            predicted_price=prediction.predicted_price,
            confidence=prediction.confidence,
            direction=prediction.direction,
            change_percent=prediction.change_percent,
            horizon=prediction.horizon,
            model_used=prediction.model_used,
            features_used=prediction.features_used,
            timestamp=prediction.timestamp.isoformat(),
            metadata=prediction.metadata
        )
        
        # Cache result
        cache_manager.set(cache_key, response, ttl=300)  # Cache for 5 minutes
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting ensemble prediction for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/models/train")
async def train_model(symbol: str, model_type: str = "random_forest", period: str = "2y"):
    """Train a prediction model for a symbol"""
    try:
        # Convert model type string to enum
        try:
            model_enum = ModelType(model_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid model type: {model_type}")
        
        # Train model
        success = await prediction_engine.train_model(symbol, model_enum, period)
        
        if success:
            return {"message": f"Model trained successfully for {symbol}", "symbol": symbol}
        else:
            raise HTTPException(status_code=500, detail=f"Failed to train model for {symbol}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error training model for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/models/info", response_model=ModelInfoResponse)
async def get_model_info():
    """Get information about trained models"""
    try:
        info = prediction_engine.get_model_info()
        return ModelInfoResponse(**info)
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/pipeline/run/{symbol}")
async def run_pipeline(symbol: str, background_tasks: BackgroundTasks):
    """Run the complete ML pipeline for a symbol"""
    try:
        # Check if pipeline is already running
        if symbol in pipeline_status and pipeline_status[symbol].status == "running":
            raise HTTPException(status_code=400, detail=f"Pipeline already running for {symbol}")
        
        # Update status
        pipeline_status[symbol] = PipelineStatusResponse(
            symbol=symbol,
            status="running",
            progress=0.0
        )
        
        # Run pipeline in background
        background_tasks.add_task(_run_pipeline_background, symbol)
        
        return {"message": f"Pipeline started for {symbol}", "symbol": symbol}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting pipeline for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def _run_pipeline_background(symbol: str):
    """Background task to run pipeline"""
    try:
        # Run pipeline
        result = await ml_pipeline.run_pipeline(symbol)
        
        # Update status
        pipeline_status[symbol] = PipelineStatusResponse(
            symbol=symbol,
            status="completed",
            result={
                "best_model": result.best_model,
                "total_models": len(result.all_results),
                "training_time": result.training_summary.get("total_time", 0)
            }
        )
        
    except Exception as e:
        logger.error(f"Error running pipeline for {symbol}: {e}")
        pipeline_status[symbol] = PipelineStatusResponse(
            symbol=symbol,
            status="failed",
            error=str(e)
        )

@app.get("/pipeline/status/{symbol}", response_model=PipelineStatusResponse)
async def get_pipeline_status(symbol: str):
    """Get pipeline status for a symbol"""
    if symbol not in pipeline_status:
        raise HTTPException(status_code=404, detail=f"No pipeline status found for {symbol}")
    
    return pipeline_status[symbol]

@app.get("/pipeline/results/{symbol}", response_model=Dict[str, Any])
async def get_pipeline_results(symbol: str):
    """Get pipeline results for a symbol"""
    try:
        # Check if results exist
        if symbol not in ml_pipeline.results:
            raise HTTPException(status_code=404, detail=f"No pipeline results found for {symbol}")
        
        # Get result
        result = ml_pipeline.results[symbol]
        
        # Convert to dict
        result_dict = {
            "symbol": result.symbol,
            "best_model": result.best_model,
            "all_results": [
                {
                    "model_name": r.model_name,
                    "metrics": r.metrics,
                    "training_time": r.training_time
                }
                for r in result.all_results
            ],
            "ensemble_weights": result.ensemble_weights,
            "training_summary": result.training_summary
        }
        
        return result_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting pipeline results for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/models/retrain")
async def retrain_models(symbols: Optional[List[str]] = None):
    """Retrain models for symbols"""
    try:
        await prediction_engine.retrain_models(symbols)
        return {"message": "Models retrained successfully"}
    except Exception as e:
        logger.error(f"Error retraining models: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/models/save")
async def save_models(filepath: str):
    """Save trained models to disk"""
    try:
        prediction_engine.save_models(filepath)
        return {"message": f"Models saved to {filepath}"}
    except Exception as e:
        logger.error(f"Error saving models: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/models/load")
async def load_models(filepath: str):
    """Load trained models from disk"""
    try:
        prediction_engine.load_models(filepath)
        return {"message": f"Models loaded from {filepath}"}
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Error handlers
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    """Generic exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return {"error": "Internal server error", "message": str(exc)}

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    logger.info("Stock Prediction API starting up...")
    # Initialize any required resources here

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    logger.info("Stock Prediction API shutting down...")
    # Cleanup any resources here

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)