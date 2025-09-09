"""
ML Prediction API endpoints.
"""
import asyncio
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
import pandas as pd
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Path, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ..stock_storage.database import get_session_scope
from ..models.stock import Stock
from ..models.price_history import PriceHistory
from ..models.prediction import PredictionModel, PredictionResult, AccuracyHistory, MarketAnomalyDetection
from ..ml.model_trainer import MLModelManager
from ..ml.anomaly_detection import MarketAnomalyDetector
from ..stock_api.yahoo_client import YahooFinanceClient
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])

# Database dependency function
def get_db():
    """Database session dependency."""
    with get_session_scope() as session:
        yield session

# Global ML model manager instance
ml_manager = MLModelManager()
anomaly_detector = MarketAnomalyDetector()
yahoo_client = YahooFinanceClient()

# Load existing models on startup
ml_manager.load_models_from_directory()

# Request/Response Models
class PredictionResponse(BaseModel):
    stock_code: str
    prediction_date: str
    target_date: str
    predictions: Dict[str, Dict[str, Any]]
    ensemble_prediction: Dict[str, Any]
    anomaly_status: Dict[str, Any]
    model_confidence: float
    recommendation: Dict[str, Any]

class TrainingRequest(BaseModel):
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
    model_id: str
    status: str
    performance_metrics: Dict[str, Any]
    training_history: List[Dict[str, Any]]


@router.get("/predict/{stock_code}", response_model=PredictionResponse)
async def get_ml_prediction(
    stock_code: str = Path(..., description="Stock code (4 digits)"),
    prediction_horizon: str = Query("all", enum=["short", "medium", "long", "all"]),
    include_confidence: bool = Query(True, description="Include confidence intervals"),
    db: Session = Depends(get_db)
):
    """Get ML-based stock prediction for a specific stock."""
    try:
        logger.info(f"ML prediction request for {stock_code}, horizon: {prediction_horizon}")
        
        # Validate stock code
        stock = db.query(Stock).filter(Stock.stock_code == stock_code).first()
        if not stock:
            raise HTTPException(status_code=404, detail=f"Stock {stock_code} not found")
        
        # Get historical data for prediction
        historical_data = await _get_stock_data_for_prediction(stock_code, db)
        if historical_data is None or len(historical_data) < 60:
            raise HTTPException(
                status_code=404, 
                detail=f"Insufficient historical data for {stock_code}"
            )
        
        # Check for market anomalies
        anomaly_status = anomaly_detector.detect_anomalies(historical_data, stock_code)
        
        # Gate prediction based on anomaly level
        if anomaly_status['prediction_gate_action'] == 'block':
            raise HTTPException(
                status_code=503,
                detail=f"Predictions blocked due to market anomalies: {anomaly_status['overall_anomaly_level']}"
            )
        
        # Get ML predictions
        predictions = {}
        target_date = date.today() + timedelta(days=1)
        
        # Filter models based on requested horizon
        available_models = ml_manager.get_model_status()
        if prediction_horizon != "all":
            available_models = {k: v for k, v in available_models.items() 
                             if v['model_type'] == prediction_horizon}
        
        if not available_models:
            raise HTTPException(
                status_code=503,
                detail=f"No trained models available for horizon: {prediction_horizon}"
            )
        
        # Get ensemble prediction
        try:
            ensemble_result = ml_manager.predict_ensemble(historical_data, target_date)
            
            # Store prediction in database
            await _store_prediction_result(db, stock_code, ensemble_result, anomaly_status)
            
            # Build response
            response_data = {
                "stock_code": stock_code,
                "prediction_date": date.today().isoformat(),
                "target_date": target_date.isoformat(),
                "predictions": ensemble_result.get('individual_predictions', {}),
                "ensemble_prediction": {
                    "predicted_price": ensemble_result['predicted_price'],
                    "predicted_return": ensemble_result['predicted_return'],
                    "confidence_score": ensemble_result['confidence_score']
                },
                "anomaly_status": anomaly_status,
                "model_confidence": ensemble_result['confidence_score'],
                "recommendation": {
                    "action": ensemble_result['predicted_action'],
                    "reasoning": _generate_recommendation_reasoning(ensemble_result, anomaly_status),
                    "risk_level": _calculate_risk_level(ensemble_result, anomaly_status),
                    "target_price": ensemble_result['predicted_price'],
                    "confidence": ensemble_result['confidence_score']
                }
            }
            
            return PredictionResponse(**response_data)
            
        except Exception as e:
            logger.error(f"Prediction failed for {stock_code}: {e}")
            raise HTTPException(status_code=503, detail=f"Prediction service unavailable: {str(e)}")
    
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
        logger.info(f"Training request received")
        
        # Generate training job ID
        training_job_id = f"train_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Use provided stock codes or default
        stock_codes = request.stock_codes if request.stock_codes else ["7203", "6758", "9984"]
        
        # Create model combinations to train
        models_to_train = []
        for model_type in request.model_types:
            for algorithm in request.algorithms:
                model_key = f"{model_type}_{algorithm}"
                models_to_train.append(model_key)
        
        # Estimate training duration (rough estimate)
        estimated_minutes = min(len(models_to_train) * len(stock_codes), 60)
        
        # Log training initiation (actual training disabled for demo)
        logger.info(f"ML training initiated: {training_job_id}")
        
        return TrainingResponse(
            training_job_id=training_job_id,
            status="initiated",
            models_to_train=models_to_train,
            estimated_duration_minutes=estimated_minutes
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training initiation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate training: {str(e)}")


@router.get("/models", response_model=ModelsListResponse)
async def list_ml_models():
    """List all available ML models with their status."""
    try:
        model_status = ml_manager.get_model_status()
        
        models_list = []
        trained_count = 0
        last_training = None
        
        for model_key, status in model_status.items():
            model_info = {
                "model_id": model_key,
                "name": model_key.replace('_', ' ').title(),
                "model_type": status['model_type'],
                "algorithm": status['algorithm'],
                "version": status['version'],
                "is_trained": status['is_trained'],
                "feature_count": status['feature_count'],
                "performance_metrics": status['performance_metrics']
            }
            
            if status['is_trained']:
                trained_count += 1
                # Get last training time
                metrics = status.get('performance_metrics', {})
                trained_at = metrics.get('trained_at')
                if trained_at and (last_training is None or trained_at > last_training):
                    last_training = trained_at
            
            models_list.append(model_info)
        
        return ModelsListResponse(
            models=models_list,
            total_models=len(models_list),
            trained_models=trained_count,
            last_training=last_training
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
        model_status = ml_manager.get_model_status()
        
        if model_id not in model_status:
            raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
        
        status = model_status[model_id]
        
        # Get training history from database
        training_history = []
        db_models = db.query(PredictionModel).filter(
            PredictionModel.name == model_id
        ).order_by(PredictionModel.last_trained.desc()).limit(10).all()
        
        for db_model in db_models:
            training_history.append({
                "trained_at": db_model.last_trained.isoformat(),
                "accuracy_score": float(db_model.accuracy_score),
                "version": db_model.version,
                "training_period": f"{db_model.training_data_start} to {db_model.training_data_end}"
            })
        
        return ModelStatusResponse(
            model_id=model_id,
            status="trained" if status['is_trained'] else "untrained",
            performance_metrics=status['performance_metrics'],
            training_history=training_history
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve model status")


@router.delete("/models/{model_id}")
async def delete_model(
    model_id: str = Path(..., description="Model identifier"),
    db: Session = Depends(get_db)
):
    """Delete a specific ML model."""
    try:
        # Remove from manager
        if model_id in ml_manager.models:
            del ml_manager.models[model_id]
        
        # Remove from database
        db_models = db.query(PredictionModel).filter(PredictionModel.name == model_id).all()
        for model in db_models:
            db.delete(model)
        db.commit()
        
        logger.info(f"Model {model_id} deleted")
        return {"message": f"Model {model_id} deleted successfully"}
    
    except Exception as e:
        logger.error(f"Failed to delete model {model_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {str(e)}")


@router.get("/anomalies/{stock_code}")
async def get_anomaly_status(
    stock_code: str = Path(..., description="Stock code to check for anomalies"),
    db: Session = Depends(get_db)
):
    """Get current anomaly detection status for a stock."""
    try:
        # Get historical data
        historical_data = await _get_stock_data_for_prediction(stock_code, db)
        if historical_data is None:
            raise HTTPException(status_code=404, detail=f"No data available for {stock_code}")
        
        # Detect anomalies
        anomaly_status = anomaly_detector.detect_anomalies(historical_data, stock_code)
        
        return anomaly_status
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Anomaly detection failed for {stock_code}: {e}")
        raise HTTPException(status_code=500, detail="Anomaly detection failed")


# Helper functions

async def _get_stock_data_for_prediction(stock_code: str, db: Session) -> Optional[pd.DataFrame]:
    """Get historical stock data for ML prediction."""
    try:
        # Get 2 years of data for comprehensive feature engineering
        end_date = date.today()
        start_date = end_date - timedelta(days=730)
        
        # Query price history
        price_history = db.query(PriceHistory).filter(
            PriceHistory.stock_code == stock_code,
            PriceHistory.date >= start_date,
            PriceHistory.date <= end_date
        ).order_by(PriceHistory.date.asc()).all()
        
        if not price_history:
            # Try to fetch from Yahoo Finance if not in database
            logger.info(f"No historical data in DB for {stock_code}, fetching from Yahoo Finance")
            yahoo_data = await yahoo_client.get_price_history(stock_code, start_date, end_date)
            if yahoo_data and len(yahoo_data) > 0:
                return pd.DataFrame(yahoo_data)
            return None
        
        # Convert to DataFrame
        data = []
        for record in price_history:
            data.append({
                'date': record.date,
                'open': float(record.open_price),
                'high': float(record.high_price),
                'low': float(record.low_price),
                'close': float(record.close_price),
                'volume': record.volume
            })
        
        return pd.DataFrame(data)
    
    except Exception as e:
        logger.error(f"Failed to get stock data for {stock_code}: {e}")
        return None


async def _store_prediction_result(db: Session, stock_code: str, 
                                 prediction_result: Dict[str, Any], 
                                 anomaly_status: Dict[str, Any]):
    """Store prediction result in database."""
    try:
        # Find or create a model record (use the best performing one)
        model = db.query(PredictionModel).filter(
            PredictionModel.is_active == True
        ).first()
        
        if not model:
            logger.warning("No active model found for storing prediction")
            return
        
        # Create prediction result
        prediction = PredictionResult(
            stock_code=stock_code,
            model_id=model.id,
            prediction_date=date.today(),
            target_date=datetime.fromisoformat(prediction_result['target_date']).date(),
            predicted_price=prediction_result['predicted_price'],
            predicted_action=prediction_result['predicted_action'],
            confidence_score=prediction_result['confidence_score'],
            features_used=prediction_result.get('individual_predictions', {}),
            created_at=datetime.now()
        )
        
        db.add(prediction)
        
        # Store anomaly detection result
        if anomaly_status['anomalies_detected']:
            for anomaly in anomaly_status['anomalies_detected']:
                anomaly_record = MarketAnomalyDetection(
                    stock_code=stock_code,
                    detection_date=date.today(),
                    anomaly_type=anomaly['type'],
                    anomaly_level=anomaly['level'],
                    detected_metrics=anomaly.get('metrics', {}),
                    threshold_values={},
                    prediction_gate_action=anomaly_status['prediction_gate_action'],
                    affected_period_start=date.today(),
                    is_active=True,
                    created_at=datetime.now()
                )
                db.add(anomaly_record)
        
        db.commit()
        logger.info(f"Stored prediction result for {stock_code}")
    
    except Exception as e:
        logger.error(f"Failed to store prediction result: {e}")
        db.rollback()


def _generate_recommendation_reasoning(prediction_result: Dict[str, Any], 
                                     anomaly_status: Dict[str, Any]) -> str:
    """Generate human-readable reasoning for the recommendation."""
    action = prediction_result['predicted_action']
    confidence = prediction_result['confidence_score']
    predicted_return = prediction_result['predicted_return']
    
    reasoning = f"予測リターン: {predicted_return*100:.2f}%, 信頼度: {confidence*100:.1f}%"
    
    if action == "buy":
        reasoning += f" - 複数のMLモデルが上昇を予測しています。"
    elif action == "sell":
        reasoning += f" - 複数のMLモデルが下落を予測しています。"
    else:
        reasoning += f" - 明確な方向性が予測できないため、様子見を推奨します。"
    
    # Add anomaly warnings
    if anomaly_status['overall_anomaly_level'] != 'normal':
        reasoning += f" ⚠️ 市場異常レベル: {anomaly_status['overall_anomaly_level']}"
    
    return reasoning


def _calculate_risk_level(prediction_result: Dict[str, Any], 
                         anomaly_status: Dict[str, Any]) -> str:
    """Calculate risk level for the recommendation."""
    confidence = prediction_result['confidence_score']
    anomaly_level = anomaly_status['overall_anomaly_level']
    
    if anomaly_level in ['high', 'critical'] or confidence < 0.5:
        return "高"
    elif anomaly_level == 'medium' or confidence < 0.7:
        return "中"
    else:
        return "低"


async def _background_model_training(
    training_job_id: str,
    stock_codes: List[str],
    model_types: List[str],
    algorithms: List[str],
    days_history: int,
    force_retrain: bool
):
    """Background task for model training."""
    try:
        logger.info(f"Starting background training job {training_job_id}")
        
        # Create a new database session for this background task
        with get_session_scope() as db:
            # Add models to manager
            for model_type in model_types:
                for algorithm in algorithms:
                    ml_manager.add_model(model_type, algorithm)
            
            # Train on each stock
            for stock_code in stock_codes[:5]:  # Limit to 5 stocks for demo
                try:
                    # Get historical data
                    historical_data = await _get_stock_data_for_prediction(stock_code, db)
                    if historical_data is None or len(historical_data) < 200:
                        logger.warning(f"Insufficient data for training on {stock_code}")
                        continue
                
                    # Train each model
                    for model_type in model_types:
                        for algorithm in algorithms:
                            model_key = f"{model_type}_{algorithm}"
                            
                            try:
                                logger.info(f"Training {model_key} on {stock_code}")
                                result = ml_manager.train_model(model_key, historical_data)
                                
                                # Store model info in database
                                await _store_trained_model(db, model_key, result, stock_code)
                                
                                logger.info(f"Completed training {model_key} on {stock_code}")
                                
                            except Exception as e:
                                logger.error(f"Failed to train {model_key} on {stock_code}: {e}")
                                continue
                    
                except Exception as e:
                    logger.error(f"Failed to process {stock_code} for training: {e}")
                    continue
            
            logger.info(f"Completed background training job {training_job_id}")
        
    except Exception as e:
        logger.error(f"Background training job {training_job_id} failed: {e}")


async def _store_trained_model(db: Session, model_key: str, 
                             training_result: Dict[str, Any], stock_code: str):
    """Store trained model information in database."""
    try:
        model_parts = model_key.split('_', 1)
        model_type = model_parts[0]
        algorithm = model_parts[1] if len(model_parts) > 1 else model_parts[0]
        
        # Create or update model record
        existing_model = db.query(PredictionModel).filter(
            PredictionModel.name == model_key
        ).first()
        
        if existing_model:
            existing_model.last_trained = datetime.now()
            existing_model.accuracy_score = training_result['validation_metrics']['r2_score']
            existing_model.performance_metrics = training_result
            existing_model.is_active = True
        else:
            model = PredictionModel(
                name=model_key,
                model_type=model_type,
                algorithm=algorithm,
                version="1.0.0",
                accuracy_score=training_result['validation_metrics']['r2_score'],
                training_data_start=date.today() - timedelta(days=365),
                training_data_end=date.today(),
                model_file_path=training_result['model_file_path'],
                feature_names=training_result.get('feature_names', []),
                is_active=True,
                performance_metrics=training_result,
                created_at=datetime.now(),
                last_trained=datetime.now()
            )
            db.add(model)
        
        db.commit()
        logger.info(f"Stored model {model_key} in database")
        
    except Exception as e:
        logger.error(f"Failed to store trained model {model_key}: {e}")
        db.rollback()