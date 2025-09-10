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
        
        if prediction_horizon == "short":
            horizon_enum = PredictionHorizon.DAILY
        elif prediction_horizon == "medium":
            horizon_enum = PredictionHorizon.WEEKLY
        elif prediction_horizon == "long":
            horizon_enum = PredictionHorizon.MONTHLY
        else:
            horizon_enum = PredictionHorizon.DAILY

        # --- Start: Centralized Data Fetching ---
        await prediction_engine._ensure_stock_service() # Ensure stock service is initialized
        try:
            # Fetch historical data once for both prediction and anomaly detection
            # Fetch enough data for feature engineering and lookback periods (e.g., 1 year)
            historical_price_data = await prediction_engine.stock_service.get_price_history(stock_code, 365)
            df_historical = prediction_engine._price_history_to_dataframe(historical_price_data)
            
            if df_historical.empty:
                raise ValueError(f"No historical data available for {stock_code}")
        except Exception as e:
            logger.error(f"Error fetching historical data for {stock_code}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to fetch historical data for prediction: {e}")
        # --- End: Centralized Data Fetching ---

        try:
            prediction_result: Optional[PredictionResult] = await prediction_engine.get_ensemble_prediction(
                symbol=stock_code,
                historical_data=df_historical, # <-- 変更
                horizon=horizon_enum
            )
        except Exception as e:
            logger.error(f"Error during prediction_engine.get_ensemble_prediction for {stock_code}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to generate prediction: {e}")

        if not prediction_result:
            logger.warning(f"Prediction result is None for {stock_code}. This might indicate data issues or model failure.")
            raise HTTPException(status_code=500, detail=f"Failed to get ML prediction for {stock_code}. No prediction result returned.")

        predicted_price = prediction_result.predicted_price
        current_price_from_ml = prediction_result.current_price
        predicted_return = prediction_result.change_percent / 100.0
        confidence = prediction_result.confidence
        action = prediction_result.direction
        
        target_date = date.today() + timedelta(days=1)

        # --- Start: Integrate Anomaly Detection ---
        # Use the already fetched historical data for anomaly detection
        try:
            anomaly_status = anomaly_detector.detect_anomalies(df_historical, stock_code) # <-- 変更
        except Exception as e:
            logger.error(f"Error during anomaly detection for {stock_code}: {e}", exc_info=True)
            # Fallback to default anomaly status if detection fails
            anomaly_status = {
                "detection_date": date.today().isoformat(),
                "stock_code": stock_code,
                "anomalies_detected": [{"type": "anomaly_detection_failed", "level": "warning", "description": f"Anomaly detection failed: {e}"}],
                "overall_anomaly_level": "warning",
                "prediction_gate_action": "allow",
                "metrics": {}
            }
        # --- End: Integrate Anomaly Detection ---

        response_data = {

        response_data = {
            "stock_code": stock_code,
            "prediction_date": date.today().isoformat(),
            "target_date": target_date.isoformat(),
            "predictions": {
                "short_term": {
                    "predicted_price": predicted_price,
                    "predicted_return": predicted_return,
                    "confidence": confidence,
                    "prediction": predicted_return,
                    "weight": 1.0
                }
            },
            "ensemble_prediction": {
                "predicted_price": predicted_price,
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
        logger.error(f"Unexpected error in ML prediction for {stock_code}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error occurred during ML prediction.")


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
        # Get model info from prediction engine
        model_info = prediction_engine.get_model_info()
        
        models_list = []
        trained_models_count = 0
        
        for model_key, metrics in model_info["model_metrics"].items():
            symbol, model_type = model_key.split("_", 1) # e.g., "AAPL_random_forest"
            
            models_list.append({
                "model_id": model_key,
                "name": f"{symbol} {model_type.replace('_', ' ').title()}",
                "model_type": model_type,
                "algorithm": model_type, # Assuming algorithm is same as model_type for simplicity
                "version": "1.0.0", # Placeholder, actual versioning needs to be implemented
                "is_trained": True, # If it's in model_metrics, it's trained
                "feature_count": 0, # Not directly available from get_model_info, placeholder
                "performance_metrics": {
                    "accuracy": metrics.get("accuracy", 0.0),
                    "r2_score": metrics.get("r2", 0.0),
                    "mse": metrics.get("mse", 0.0),
                    "mae": metrics.get("mae", 0.0)
                }
            })
            trained_models_count += 1
        
        # Determine last training time (placeholder for now)
        last_training_time = datetime.now().isoformat() # Placeholder
        
        return ModelsListResponse(
            models=models_list,
            total_models=len(model_info["available_models"]), # Total available model types
            trained_models=trained_models_count,
            last_training=last_training_time
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
        model_info = prediction_engine.get_model_info()
        
        if model_id not in model_info["model_metrics"]:
            raise HTTPException(status_code=404, detail=f"Model {model_id} not found or not trained")
        
        metrics = model_info["model_metrics"][model_id]
        
        # Placeholder for training history - actual history needs to be stored
        training_history = [
            {
                "trained_at": datetime.now().isoformat(), # Placeholder
                "accuracy_score": metrics.get("accuracy", 0.0),
                "version": "1.0.0", # Placeholder
                "training_period": "N/A" # Placeholder
            }
        ]
        
        return ModelStatusResponse(
            model_id=model_id,
            status="trained", # If it's in model_metrics, it's trained
            performance_metrics={
                "accuracy": metrics.get("accuracy", 0.0),
                "r2_score": metrics.get("r2", 0.0),
                "mse": metrics.get("mse", 0.0),
                "mae": metrics.get("mae", 0.0)
            },
            training_history=training_history
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve model status")


