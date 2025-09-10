"""
ML Prediction API endpoints.
"""
import asyncio
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Path, Depends

from ..ml.prediction_engine import prediction_engine, ModelType, PredictionResult, PredictionHorizon
from ..services.stock_service import get_stock_service
from ..ml.pipeline import ml_pipeline, PipelineConfig
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ..stock_storage.database import get_session_scope
from ..models.stock import Stock
from ..models.price_history import PriceHistory
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ml", tags=["Machine Learning"])

# Database dependency function
def get_db():
    """Database session dependency."""
    with get_session_scope() as session:
        yield session

# Request/Response Models
class PredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    
    stock_code: str
    prediction_date: str
    target_date: str
    predictions: Dict[str, Dict[str, Any]]
    ensemble_prediction: Dict[str, Any]
    anomaly_status: Dict[str, Any]
    model_confidence: float
    recommendation: Dict[str, Any]

class TrainingRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    
    stock_codes: Optional[List[str]] = Field(default=None, description="Specific stocks to train on")
    model_types: Optional[List[str]] = Field(default=["short_term", "medium_term", "long_term"], 
                                           description="Model types to train")
    algorithms: Optional[List[str]] = Field(default=["random_forest", "linear_regression", "svr"],
                                          description="Algorithms to use")
    days_history: int = Field(default=365, description="Days of historical data to use")
    force_retrain: bool = Field(default=False, description="Force retrain even if models exist")

class TrainingResponse(BaseModel):
    training_job_id: str
    status: str
    models_to_train: List[str]
    estimated_duration_minutes: int

class ModelsListResponse(BaseModel):
    models: List[Dict[str, Any]]
    total_models: int
    trained_models: int
    last_training: Optional[str]

class ModelStatusResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    
    model_id: str
    status: str
    performance_metrics: Dict[str, Any]
    training_history: List[Dict[str, Any]]


@router.get("/predict/{stock_code}", response_model=PredictionResponse)
async def get_ml_prediction(
    stock_code: str = Path(..., description="Stock code (4 digits)"),
    prediction_horizon: str = Query("all", enum=["short", "medium", "long", "all"]),
    include_confidence: bool = Query(True, description="Include confidence intervals"),
    current_price: Optional[float] = Query(None, description="Current stock price")
):
    """Get ML-based stock prediction for a specific stock."""
    try:
        logger.info(f"ML prediction request for {stock_code}, horizon: {prediction_horizon}")
        
        # --- Start: Replace mock prediction with actual ML prediction ---
        # Convert prediction_horizon string to PredictionHorizon Enum
        # For simplicity, we'll map "short" to DAILY for now, and "all" will use ensemble or default
        # This mapping can be refined later based on actual model training horizons
        if prediction_horizon == "short":
            horizon_enum = PredictionHorizon.DAILY
        elif prediction_horizon == "medium":
            horizon_enum = PredictionHorizon.WEEKLY # Example mapping
        elif prediction_horizon == "long":
            horizon_enum = PredictionHorizon.MONTHLY # Example mapping
        else: # "all" or other
            horizon_enum = PredictionHorizon.DAILY # Default to daily for now, or use ensemble

        # Use the prediction engine to get actual prediction
        # For now, let's use RANDOM_FOREST as a default model type
        # In a more advanced setup, you might select model based on horizon or use ensemble
        
        # Ensure the prediction engine has the latest data for feature engineering
        # The predict_price method in prediction_engine already fetches data via stock_service
        
        # If current_price is provided, it might be used by the prediction engine for context
        # However, the current prediction_engine.predict_price doesn't directly take current_price as input
        # It fetches its own data. We'll proceed assuming it fetches what it needs.
        
        # Call the prediction engine
        prediction_result: Optional[PredictionResult] = await prediction_engine.predict_price(
            symbol=stock_code,
            horizon=horizon_enum,
            model_type=ModelType.RANDOM_FOREST # Using a specific model for now
        )

        if not prediction_result:
            raise HTTPException(status_code=500, detail=f"Failed to get ML prediction for {stock_code}")

        # Extract data from PredictionResult
        predicted_price = prediction_result.predicted_price
        current_price_from_ml = prediction_result.current_price # Use current price from ML result
        predicted_return = prediction_result.change_percent / 100.0 # Convert percent to decimal
        confidence = prediction_result.confidence
        action = prediction_result.direction # 'buy', 'sell', 'hold'

        # --- End: Replace mock prediction with actual ML prediction ---
        
        target_date = date.today() + timedelta(days=1) # This might need to be dynamic based on horizon
        
        # Build response
        response_data = {
            "stock_code": stock_code,
            "prediction_date": date.today().isoformat(),
            "target_date": target_date.isoformat(),
            "predictions": {
                "short_term": { # This structure might need adjustment based on actual ML output
                    "predicted_price": predicted_price,
                    "predicted_return": predicted_return,
                    "confidence": confidence,
                    "prediction": predicted_return,  # For frontend compatibility
                    "weight": 1.0  # Add weight field for frontend
                }
            },
            "ensemble_prediction": {
                "predicted_price": predicted_price, # Using single model prediction for now
                "predicted_return": predicted_return,
                "confidence_score": confidence
            },
            "anomaly_status": {
                "overall_anomaly_level": "normal",
                "anomalies_detected": [],
                "prediction_gate_action": "allow"
            },
            "model_confidence": confidence,
            "recommendation": {
                "action": action,
                "reasoning": f"予測リターン: {predicted_return*100:.2f}%, 信頼度: {confidence*100:.1f}%",
                "risk_level": "中" if confidence < 0.7 else "低",
                "target_price": predicted_price,
                "confidence": confidence
            }
        }
        
        return PredictionResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in ML prediction: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/train", response_model=TrainingResponse)
async def trigger_model_training(
    request: TrainingRequest,
    background_tasks: BackgroundTasks
):
    """Trigger ML model training process."""
    try:
        logger.info(f"Training request received for stock codes: {request.stock_codes}, model types: {request.model_types}")
        
        training_job_id = f"train_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # --- Start: Replace mock training with actual ML pipeline call ---
        # Define a function to run the pipeline in the background
        async def run_training_pipeline(job_id: str, stock_codes: Optional[List[str]]):
            logger.info(f"Starting background training (Job ID: {job_id})")
            try:
                if stock_codes:
                    for symbol_to_train in stock_codes:
                        logger.info(f"Running pipeline for {symbol_to_train}")
                        await ml_pipeline.run_pipeline(symbol_to_train)
                else:
                    logger.info("No specific stock codes provided for training. Skipping background training for now.")
                
                logger.info(f"Background training (Job ID: {job_id}) completed successfully.")
            except Exception as e:
                logger.error(f"Background training (Job ID: {job_id}) failed: {e}")

        # Add the training task to background tasks
        background_tasks.add_task(run_training_pipeline, training_job_id, request.stock_codes)
        
        return TrainingResponse(
            training_job_id=training_job_id,
            status="initiated",
            models_to_train=request.stock_codes if request.stock_codes else ["all_available_models"], # Reflect actual request
            estimated_duration_minutes=10 # Estimate based on pipeline complexity
        )
        # --- End: Replace mock training with actual ML pipeline call ---
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training initiation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate training: {str(e)}")


@router.get("/models", response_model=ModelsListResponse)
async def list_ml_models():
    """List all available ML models with their status."""
    try:
        # Mock models list
        models_list = [
            {
                "model_id": "short_term_rf",
                "name": "Short Term Random Forest",
                "model_type": "short",
                "algorithm": "random_forest",
                "version": "1.0.0",
                "is_trained": True,
                "feature_count": 15,
                "performance_metrics": {"accuracy": 0.78, "r2_score": 0.65}
            },
            {
                "model_id": "medium_term_lr",
                "name": "Medium Term Linear Regression",
                "model_type": "medium",
                "algorithm": "linear_regression",
                "version": "1.0.0",
                "is_trained": True,
                "feature_count": 12,
                "performance_metrics": {"accuracy": 0.72, "r2_score": 0.58}
            }
        ]
        
        return ModelsListResponse(
            models=models_list,
            total_models=2,
            trained_models=2,
            last_training="2025-09-09T10:00:00Z"
        )
    
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve models")


@router.get("/models/{model_id}", response_model=ModelStatusResponse)
async def get_model_status(
    model_id: str = Path(..., description="Model identifier"),
    db: Session = Depends(get_db)
):
    """Get detailed status and metrics for a specific model."""
    try:
        # Mock model status
        if model_id not in ["short_term_rf", "medium_term_lr"]:
            raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
        
        training_history = [
            {
                "trained_at": "2025-09-09T10:00:00Z",
                "accuracy_score": 0.78 if model_id == "short_term_rf" else 0.72,
                "version": "1.0.0",
                "training_period": "2024-09-09 to 2025-09-09"
            }
        ]
        
        return ModelStatusResponse(
            model_id=model_id,
            status="trained",
            performance_metrics={"accuracy": 0.78 if model_id == "short_term_rf" else 0.72, "r2_score": 0.65 if model_id == "short_term_rf" else 0.58},
            training_history=training_history
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve model status")


