"""
ML Prediction API endpoints.
"""

import logging
import random
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

import tensorflow as tf  # Added this line
from fastapi import (APIRouter, BackgroundTasks, Depends, HTTPException, Path,
                     Query)
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..ml.enhanced_prediction_engine import (EnhancedModelType,
                                             enhanced_prediction_engine)
from ..ml.pipeline import ml_pipeline
from ..ml.prediction_engine import (ModelType, PredictionHorizon,
                                    PredictionResult, prediction_engine)
from ..models.stock import Stock
from ..services.backtester import PredictionBacktester
from ..stock_storage.database import get_session_scope

logger = logging.getLogger(__name__)

# LSTM Predictor import (with fallback)
try:
    from ..ml.lstm_predictor import TENSORFLOW_AVAILABLE, lstm_predictor

    LSTM_ENABLED = TENSORFLOW_AVAILABLE
except ImportError as e:
    logger.warning(f"LSTM predictor not available: {e}")
    lstm_predictor = None
    LSTM_ENABLED = False

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

    stock_codes: Optional[List[str]] = Field(
        default=None, description="Specific stocks to train on"
    )
    model_types: Optional[List[str]] = Field(
        default=["short_term", "medium_term", "long_term"],
        description="Model types to train",
    )
    algorithms: Optional[List[str]] = Field(
        default=["random_forest", "linear_regression", "svr"],
        description="Algorithms to use",
    )
    days_history: int = Field(default=365, description="Days of historical data to use")
    force_retrain: bool = Field(
        default=False, description="Force retrain even if models exist"
    )


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


class ScenarioData(BaseModel):
    scenario_name: str
    probability: float
    predicted_price: float
    predicted_return: float
    description: str
    risk_level: str


class ScenarioBasedPredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    stock_code: str
    current_price: float
    prediction_date: str
    scenarios: List[ScenarioData]
    most_likely_scenario: str
    overall_confidence: float
    recommendation: Dict[str, Any]

class PriceHistoryData(BaseModel):
    date: date
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: int

class EnhancedPredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    stock_code: str
    prediction_date: str
    target_date: str
    predicted_price: float
    predicted_return: float
    confidence: float
    direction: str
    model_type: str
    enhanced_metrics: Dict[str, Any]
    features_used: List[str]
    recommendation: Dict[str, Any]
    price_history: List[PriceHistoryData]


class BacktestRequest(BaseModel):
    """バックテストリクエストモデル"""

    stock_codes: Optional[List[str]] = Field(
        None, description="テスト対象銘柄のリスト（指定なしで全銘柄）"
    )
    test_days: int = Field(30, description="テスト期間（日数）", ge=10, le=100)
    prediction_horizon: int = Field(
        1, description="予想対象日（1=翌日、7=1週間後）", ge=1, le=30
    )


class BacktestResponseItem(BaseModel):
    """個別銘柄のバックテスト結果"""

    stock_code: str
    test_period_days: int
    total_predictions: int
    rmse: float
    mae: float
    mape: float
    directional_accuracy: float
    avg_error: float
    max_error: float
    min_error: float


class BacktestResponse(BaseModel):
    """バックテストレスポンス"""

    request_id: str
    test_summary: Dict[str, Any]
    stock_results: List[BacktestResponseItem]
    overall_metrics: Dict[str, Any]
    generated_at: str


class LSTMPredictionResponse(BaseModel):
    """LSTM予想レスポンス"""

    stock_code: str
    predicted_price: float
    confidence: float
    model_accuracy: float
    current_price: float
    price_change: float
    price_change_percent: float
    technical_indicators: Dict[str, float]
    prediction_date: str
    model_info: Dict[str, Any]


class LSTMTrainRequest(BaseModel):
    """LSTM訓練リクエスト"""

    stock_codes: Optional[List[str]] = Field(
        None, description="訓練対象銘柄（指定なしで全銘柄）"
    )
    force_retrain: bool = Field(False, description="既存モデルを強制的に再訓練")


class LSTMTrainResponse(BaseModel):
    """LSTM訓練レスポンス"""

    trained_models: Dict[str, Dict[str, float]]
    total_trained: int
    training_time: str


@router.get("/predict/{stock_code}", response_model=PredictionResponse)
async def get_ml_prediction(
    stock_code: str = Path(..., description="Stock code (4 digits)"),
    prediction_horizon: str = Query("all", enum=["short", "medium", "long", "all"]),
    include_confidence: bool = Query(True, description="Include confidence intervals"),
    current_price: Optional[float] = Query(None, description="Current stock price"),
):
    """Get ML-based stock prediction for a specific stock."""
    try:
        logger.info(
            f"ML prediction request for {stock_code}, horizon: {prediction_horizon}"
        )

        if prediction_horizon == "short":
            horizon_enum = PredictionHorizon.DAILY
        elif prediction_horizon == "medium":
            horizon_enum = PredictionHorizon.WEEKLY
        elif prediction_horizon == "long":
            horizon_enum = PredictionHorizon.MONTHLY
        else:
            horizon_enum = PredictionHorizon.DAILY

        try:
            prediction_result: Optional[PredictionResult] = (
                await prediction_engine.predict_price(
                    symbol=stock_code,
                    horizon=horizon_enum,
                    model_type=ModelType.RANDOM_FOREST,
                )
            )
        except Exception as e:
            logger.error(
                f"Error during prediction_engine.predict_price for {stock_code}: {e}",
                exc_info=True,
            )
            raise HTTPException(
                status_code=500, detail=f"Failed to generate prediction: {e}"
            )

        if not prediction_result:
            logger.warning(
                f"Prediction result is None for {stock_code}. This might indicate data issues or model failure."
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get ML prediction for {stock_code}. No prediction result returned.",
            )

        predicted_price = prediction_result.predicted_price
        # current_price_from_ml = prediction_result.current_price # Commented out as it's unused
        predicted_return = prediction_result.change_percent / 100.0
        confidence = prediction_result.confidence
        action = prediction_result.direction

        target_date = date.today() + timedelta(days=1)

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
                    "weight": 1.0,
                }
            },
            "ensemble_prediction": {
                "predicted_price": predicted_price,
                "predicted_return": predicted_return,
                "confidence_score": confidence,
            },
            "anomaly_status": {
                "overall_anomaly_level": "normal",
                "anomalies_detected": [],
                "prediction_gate_action": "allow",
            },
            "model_confidence": confidence,
            "recommendation": {
                "action": action,
                "reasoning": f"予測リターン: {predicted_return * 100:.2f}%, 信頼度: {confidence * 100:.1f}%",
                "risk_level": "中" if confidence < 0.7 else "低",
                "target_price": predicted_price,
                "confidence": confidence,
            },
        }

        return PredictionResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error in ML prediction for {stock_code}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred during ML prediction.",
        )


@router.post("/train", response_model=TrainingResponse)
async def trigger_model_training(
    request: TrainingRequest, background_tasks: BackgroundTasks
):
    """Trigger ML model training process."""
    try:
        logger.info(
            f"Training request received for stock codes: {request.stock_codes}, model types: {request.model_types}"
        )

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
                    logger.info(
                        "No specific stock codes provided for training. Skipping background training for now."
                    )

                logger.info(
                    f"Background training (Job ID: {job_id}) completed successfully."
                )
            except Exception as e:
                logger.error(f"Background training (Job ID: {job_id}) failed: {e}")

        # Add the training task to background tasks
        background_tasks.add_task(
            run_training_pipeline, training_job_id, request.stock_codes
        )

        return TrainingResponse(
            training_job_id=training_job_id,
            status="initiated",
            models_to_train=(
                request.stock_codes if request.stock_codes else ["all_available_models"]
            ),  # Reflect actual request
            estimated_duration_minutes=10,  # Estimate based on pipeline complexity
        )
        # --- End: Replace mock training with actual ML pipeline call ---

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training initiation failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to initiate training: {str(e)}"
        )


@router.get("/models", response_model=ModelsListResponse)
async def list_ml_models():
    """List all available ML models with their status."""
    try:
        # Get model info from prediction engine
        model_info = prediction_engine.get_model_info()

        models_list = []
        trained_models_count = 0

        for model_key, metrics in model_info["model_metrics"].items():
            symbol, model_type = model_key.split("_", 1)  # e.g., "AAPL_random_forest"

            models_list.append(
                {
                    "model_id": model_key,
                    "name": f"{symbol} {model_type.replace('_', ' ').title()}",
                    "model_type": model_type,
                    "algorithm": model_type,  # Assuming algorithm is same as model_type for simplicity
                    "version": "1.0.0",  # Placeholder, actual versioning needs to be implemented
                    "is_trained": True,  # If it's in model_metrics, it's trained
                    "feature_count": 0,  # Not directly available from get_model_info, placeholder
                    "performance_metrics": {
                        "accuracy": metrics.get("accuracy", 0.0),
                        "r2_score": metrics.get("r2", 0.0),
                        "mse": metrics.get("mse", 0.0),
                        "mae": metrics.get("mae", 0.0),
                    },
                }
            )
            trained_models_count += 1

        # Determine last training time (placeholder for now)
        last_training_time = datetime.now().isoformat()  # Placeholder

        return ModelsListResponse(
            models=models_list,
            total_models=len(
                model_info["available_models"]
            ),  # Total available model types
            trained_models=trained_models_count,
            last_training=last_training_time,
        )

    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve models")


@router.get("/models/{model_id}", response_model=ModelStatusResponse)
async def get_model_status(
    model_id: str = Path(..., description="Model identifier"),
    db: Session = Depends(get_db),
):
    """Get detailed status and metrics for a specific model."""
    try:
        model_info = prediction_engine.get_model_info()

        if model_id not in model_info["model_metrics"]:
            raise HTTPException(
                status_code=404, detail=f"Model {model_id} not found or not trained"
            )

        metrics = model_info["model_metrics"][model_id]

        # Placeholder for training history - actual history needs to be stored
        training_history = [
            {
                "trained_at": datetime.now().isoformat(),  # Placeholder
                "accuracy_score": metrics.get("accuracy", 0.0),
                "version": "1.0.0",  # Placeholder
                "training_period": "N/A",  # Placeholder
            }
        ]

        return ModelStatusResponse(
            model_id=model_id,
            status="trained",  # If it's in model_metrics, it's trained
            performance_metrics={
                "accuracy": metrics.get("accuracy", 0.0),
                "r2_score": metrics.get("r2", 0.0),
                "mse": metrics.get("mse", 0.0),
                "mae": metrics.get("mae", 0.0),
            },
            training_history=training_history,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve model status")


@router.get("/scenarios/{stock_code}", response_model=ScenarioBasedPredictionResponse)
async def get_scenario_predictions(
    stock_code: str = Path(..., description="Stock code (4 digits)"),
    prediction_days: int = Query(7, ge=1, le=30, description="予測期間（日数）"),
    current_price: Optional[float] = Query(None, description="Current stock price"),
):
    """シナリオベースの価格予測を取得します。楽観的・現実的・悲観的シナリオとそれぞれの確率を返します。"""
    try:
        logger.info(f"Scenario prediction request for {stock_code}, days: {prediction_days}")

        # Get prediction from the enhanced engine
        prediction_response = await get_enhanced_ml_prediction(
            stock_code=stock_code,
            model_type="ensemble_voting",
            optimize_params=True,
            period="2y"
        )

        if not prediction_response:
            raise HTTPException(status_code=500, detail="Failed to get prediction for scenario generation.")

        # Extract values from the prediction
        predicted_price = prediction_response.predicted_price
        confidence = prediction_response.confidence
        current_price = (await get_stock_service().get_current_price(stock_code)).current_price

        # Define scenarios based on the prediction and confidence
        realistic_price = predicted_price
        
        # Use confidence to determine the range for optimistic and pessimistic scenarios
        # A higher confidence leads to a smaller range
        price_range = predicted_price * (1 - confidence) * 0.5 
        
        optimistic_price = predicted_price + price_range
        pessimistic_price = predicted_price - price_range

        realistic_return = (realistic_price - current_price) / current_price if current_price > 0 else 0
        optimistic_return = (optimistic_price - current_price) / current_price if current_price > 0 else 0
        pessimistic_return = (pessimistic_price - current_price) / current_price if current_price > 0 else 0

        # Probabilities based on confidence
        realistic_prob = confidence
        optimistic_prob = (1 - confidence) / 2
        pessimistic_prob = (1 - confidence) / 2

        scenarios = [
            ScenarioData(
                scenario_name="楽観的",
                probability=round(optimistic_prob, 3),
                predicted_price=round(optimistic_price, 2),
                predicted_return=round(optimistic_return, 4),
                description="モデルの信頼区間に基づく楽観的なシナリオ",
                risk_level="高"
            ),
            ScenarioData(
                scenario_name="現実的",
                probability=round(realistic_prob, 3),
                predicted_price=round(realistic_price, 2),
                predicted_return=round(realistic_return, 4),
                description="MLモデルによる最も可能性の高い予測",
                risk_level="中"
            ),
            ScenarioData(
                scenario_name="悲観的",
                probability=round(pessimistic_prob, 3),
                predicted_price=round(pessimistic_price, 2),
                predicted_return=round(pessimistic_return, 4),
                description="モデルの信頼区間に基づく悲観的なシナリオ",
                risk_level="高"
            )
        ]

        # Determine most likely scenario
        most_likely = max(scenarios, key=lambda s: s.probability)

        # Overall confidence
        overall_confidence = confidence

        # Recommendation
        recommendation = prediction_response.recommendation
        scenarios = [
            ScenarioData(
                scenario_name="楽観的",
                probability=round(optimistic_prob, 3),
                predicted_price=round(optimistic_price, 2),
                predicted_return=round(optimistic_return, 4),
                description="モデルの信頼区間に基づく楽観的なシナリオ",
                risk_level="高"
            ),
            ScenarioData(
                scenario_name="現実的",
                probability=round(realistic_prob, 3),
                predicted_price=round(realistic_price, 2),
                predicted_return=round(realistic_return, 4),
<<<<<<< HEAD
                description="現在の市場状況が継続する最も可能性の高いシナリオ",
                risk_level="中",
=======
                description="MLモデルによる最も可能性の高い予測",
                risk_level="中"
>>>>>>> origin/main
            ),
            ScenarioData(
                scenario_name="悲観的",
                probability=round(pessimistic_prob, 3),
                predicted_price=round(pessimistic_price, 2),
                predicted_return=round(pessimistic_return, 4),
<<<<<<< HEAD
                description=f"{prediction_days}日後に株価が大幅下落する可能性",
                risk_level="高",
            ),
        ]

        # 最も可能性の高いシナリオを決定
        most_likely = max(scenarios, key=lambda s: s.probability)

        # 総合信頼度（現実的シナリオの確率に基づく）
        overall_confidence = realistic_prob * 0.8 + 0.2  # 0.2-1.0の範囲

        # 推奨アクションの決定
        expected_return = (
            optimistic_return * extreme_prob
            + realistic_return * realistic_prob
            + pessimistic_return * extreme_prob
        )

        if expected_return > 0.03:
            action = "buy"
            action_jp = "買い"
        elif expected_return < -0.03:
            action = "sell"
            action_jp = "売り"
        else:
            action = "hold"
            action_jp = "保有"

        recommendation = {
            "action": action,
            "action_jp": action_jp,
            "expected_return": round(expected_return, 4),
            "reasoning": f"期待リターン: {expected_return*100:.2f}%, 最有力シナリオ: {most_likely.scenario_name} ({most_likely.probability*100:.1f}%)",
            "risk_assessment": f"ボラティリティ: {'高' if base_volatility > 0.025 else '中' if base_volatility > 0.015 else '低'}",
            "confidence": round(overall_confidence, 3),
        }
=======
                description="モデルの信頼区間に基づく悲観的なシナリオ",
                risk_level="高"
            )
        ]

        # Determine most likely scenario
        most_likely = max(scenarios, key=lambda s: s.probability)

        # Overall confidence
        overall_confidence = confidence

        # Recommendation
        recommendation = prediction_response.recommendation
>>>>>>> origin/main

        return ScenarioBasedPredictionResponse(
            stock_code=stock_code,
            current_price=round(current_price, 2),
            prediction_date=date.today().isoformat(),
            scenarios=scenarios,
            most_likely_scenario=most_likely.scenario_name,
            overall_confidence=round(overall_confidence, 3),
            recommendation=recommendation,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in scenario prediction: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/enhanced-predict/{stock_code}", response_model=EnhancedPredictionResponse)
async def get_enhanced_ml_prediction(
    stock_code: str = Path(..., description="Stock code (4 digits)"),
    model_type: str = Query("ensemble_voting", description="Enhanced model type"),
    optimize_params: bool = Query(True, description="Optimize hyperparameters"),
    period: str = Query("2y", description="Training data period"),
):
    """Get enhanced ML prediction with improved accuracy and advanced features."""
    try:
        logger.info(
            f"Enhanced ML prediction request for {stock_code}, model: {model_type}"
        )

        # Map string to enum
        try:
            model_type_enum = EnhancedModelType(model_type.lower())
        except ValueError:
            logger.warning(f"Invalid model type {model_type}, using ensemble_voting")
            model_type_enum = EnhancedModelType.ENSEMBLE_VOTING

        # Train enhanced model
        metrics = await enhanced_prediction_engine.train_enhanced_model(
            symbol=stock_code,
            model_type=model_type_enum,
            period=period,
            optimize_hyperparams=optimize_params,
        )

        if not metrics:
            logger.error(f"Failed to train enhanced model for {stock_code}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to train enhanced model for {stock_code}",
            )

        # Get model details
        model_key = f"{stock_code}_{model_type_enum.value}"
        model_info = enhanced_prediction_engine.models.get(model_key, {})

        # Get current price
        await enhanced_prediction_engine._ensure_stock_service()
        stock_service = enhanced_prediction_engine.stock_service

        try:
            current_price_info = await stock_service.get_current_price(stock_code)
            current_price = current_price_info["current_price"]
        except Exception as e:
            logger.warning(f"Could not get current price for {stock_code}: {e}")
            current_price = 0

        # Make prediction for tomorrow
        try:
            price_history = await stock_service.get_price_history(stock_code, 365)
            df = enhanced_prediction_engine._price_history_to_dataframe(price_history)

            if df.empty:
                raise HTTPException(status_code=400, detail="No price data available")

            # Create features for the latest day
            df_features = (
                enhanced_prediction_engine.feature_engine.create_advanced_features(df)
            )

            # Use selected features if available
            if isinstance(model_info, dict) and "features" in model_info:
                feature_columns = model_info["features"]
            else:
                # Fallback to basic features
                feature_columns = [
                    col
                    for col in df_features.columns
                    if col not in ["Open", "High", "Low", "Close", "Volume"]
                ]

            # Get the latest features
            latest_features = df_features[feature_columns].iloc[-1:]

            # Remove any remaining NaN values
            latest_features = latest_features.fillna(latest_features.mean()).fillna(0)

            # Scale features if scaler is available
            if isinstance(model_info, dict) and "scaler" in model_info:
                features_scaled = model_info["scaler"].transform(latest_features)
            else:
                features_scaled = latest_features.values

            # Make prediction
            if isinstance(model_info, dict) and "model" in model_info:
                predicted_price = model_info["model"].predict(features_scaled)[0]
            else:
                # Fallback prediction
                predicted_price = current_price * 1.01  # Small positive prediction

            # Calculate metrics
            predicted_return = (
                (predicted_price - current_price) / current_price
                if current_price > 0
                else 0
            )
            direction = (
                "up"
                if predicted_return > 0.01
                else "down" if predicted_return < -0.01 else "stable"
            )
            confidence = min(
                max(metrics.accuracy, 0.5), 1.0
            )  # Ensure reasonable confidence range

        except Exception as e:
            logger.error(f"Prediction error for {stock_code}: {e}")
            # Provide fallback values
            predicted_price = current_price * 1.001
            predicted_return = 0.001
            direction = "stable"
            confidence = 0.6
            feature_columns = ["basic_features"]

        # Generate recommendation
        if predicted_return > 0.03 and confidence > 0.7:
            action = "buy"
            reasoning = (
                f"高信頼度({confidence:.1%})で{predicted_return:.2%}の上昇を予測"
            )
        elif predicted_return < -0.03 and confidence > 0.7:
            action = "sell"
            reasoning = (
                f"高信頼度({confidence:.1%})で{predicted_return:.2%}の下落を予測"
            )
        else:
            action = "hold"
            reasoning = (
                f"中程度の変動予測({predicted_return:.2%})、信頼度{confidence:.1%}"
            )

        recommendation = {
            "action": action,
            "reasoning": reasoning,
            "confidence": confidence,
            "expected_return": predicted_return,
        }

        # Enhanced metrics for response
        enhanced_metrics_dict = {
            "r2_score": metrics.r2,
            "directional_accuracy": metrics.accuracy,
            "mean_absolute_error": metrics.mae,
            "sharpe_ratio": metrics.sharpe_ratio,
            "hit_rate": metrics.hit_rate,
            "max_drawdown": metrics.max_drawdown,
            "volatility": metrics.volatility,
            "information_ratio": metrics.information_ratio,
        }

        target_date = date.today() + timedelta(days=1)
<<<<<<< HEAD
=======
        
        # Get price history
        price_history_data = await stock_service.get_price_history(stock_code, 365)
>>>>>>> origin/main

        return EnhancedPredictionResponse(
            stock_code=stock_code,
            prediction_date=date.today().isoformat(),
            target_date=target_date.isoformat(),
            predicted_price=round(predicted_price, 2),
            predicted_return=round(predicted_return, 4),
            confidence=round(confidence, 3),
            direction=direction,
            model_type=model_type_enum.value,
            enhanced_metrics=enhanced_metrics_dict,
            features_used=feature_columns[:10] if len(feature_columns) > 10 else feature_columns,
            recommendation=recommendation,
            price_history=price_history_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enhanced prediction error for {stock_code}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Enhanced prediction failed: {str(e)}"
        )


@router.post("/backtest", response_model=BacktestResponse)
async def run_prediction_backtest(request: BacktestRequest):
    """予想システムのバックテストを実行して精度を評価します。"""
    try:
        logger.info(
            f"バックテスト開始: 銘柄数={len(request.stock_codes) if request.stock_codes else 'ALL'}, "
            f"期間={request.test_days}日, 予想対象={request.prediction_horizon}日後"
        )

        request_id = f"backtest_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        backtester = PredictionBacktester()

        # テスト対象銘柄の決定
        test_stocks = request.stock_codes
        if not test_stocks:
            # 全銘柄から有効なデータを持つ銘柄を取得
            with get_session_scope() as db:
                stocks = db.query(Stock).limit(20).all()  # 処理時間を考慮して最大20銘柄
                test_stocks = [stock.stock_code for stock in stocks]

        # 複数銘柄のバックテストを実行
        try:
            backtest_results = backtester.run_multi_stock_backtest(
                stock_codes=test_stocks,
                test_days=request.test_days,
                prediction_horizon=request.prediction_horizon,
            )
        except Exception as e:
            logger.error(f"バックテスト実行エラー: {e}")
            raise HTTPException(status_code=500, detail=f"バックテスト実行エラー: {e}")

        if not backtest_results:
            raise HTTPException(
                status_code=404, detail="バックテスト結果が取得できませんでした"
            )

        # レスポンス用のデータを構築
        stock_results = []
        for stock_code, result in backtest_results.items():
            stock_results.append(
                BacktestResponseItem(
                    stock_code=result.stock_code,
                    test_period_days=result.test_period_days,
                    total_predictions=result.total_predictions,
                    rmse=result.rmse,
                    mae=result.mae,
                    mape=result.mape,
                    directional_accuracy=result.directional_accuracy,
                    avg_error=result.avg_error,
                    max_error=result.max_error,
                    min_error=result.min_error,
                )
            )

        # 統合レポートを生成
        summary_report = backtester.generate_summary_report(backtest_results)

        # 全体的なメトリクス計算
        overall_metrics = {
            "tested_stocks": len(backtest_results),
            "successful_stocks": len(
                [r for r in backtest_results.values() if r.total_predictions > 0]
            ),
            "total_predictions": sum(
                r.total_predictions for r in backtest_results.values()
            ),
            "average_directional_accuracy": summary_report.get(
                "average_directional_accuracy", 0
            ),
            "average_rmse": summary_report.get("average_rmse", 0),
            "average_mae": summary_report.get("average_mae", 0),
            "average_mape": summary_report.get("average_mape", 0),
            "performance_breakdown": summary_report.get("performance_distribution", {}),
            "best_performers": {
                "by_accuracy": (
                    summary_report.get("best_stock", {}).get(
                        "by_directional", ["N/A", None]
                    )[0]
                    if summary_report.get("best_stock")
                    else "N/A"
                ),
                "by_rmse": (
                    summary_report.get("best_stock", {}).get("by_rmse", ["N/A", None])[
                        0
                    ]
                    if summary_report.get("best_stock")
                    else "N/A"
                ),
            },
            "worst_performers": {
                "by_accuracy": (
                    summary_report.get("worst_stock", {}).get(
                        "by_directional", ["N/A", None]
                    )[0]
                    if summary_report.get("worst_stock")
                    else "N/A"
                ),
                "by_rmse": (
                    summary_report.get("worst_stock", {}).get("by_rmse", ["N/A", None])[
                        0
                    ]
                    if summary_report.get("worst_stock")
                    else "N/A"
                ),
            },
        }

        test_summary = {
            "test_configuration": {
                "test_period_days": request.test_days,
                "prediction_horizon_days": request.prediction_horizon,
                "tested_stock_count": len(test_stocks),
            },
            "execution_info": {
                "started_at": datetime.now().isoformat(),
                "status": "completed",
                "processing_time_seconds": "N/A",  # 実際の処理時間計測は後で実装
            },
            "data_quality": {
                "stocks_with_sufficient_data": len(backtest_results),
                "stocks_skipped": len(test_stocks) - len(backtest_results),
                "average_predictions_per_stock": (
                    sum(r.total_predictions for r in backtest_results.values())
                    / len(backtest_results)
                    if backtest_results
                    else 0
                ),
            },
        }

        response = BacktestResponse(
            request_id=request_id,
            test_summary=test_summary,
            stock_results=stock_results,
            overall_metrics=overall_metrics,
            generated_at=datetime.now().isoformat(),
        )

        logger.info(
            f"バックテスト完了: ID={request_id}, "
            f"テスト銘柄数={len(backtest_results)}, "
            f"平均方向性精度={overall_metrics['average_directional_accuracy']:.1f}%"
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"バックテストAPIエラー: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"バックテスト処理中にエラーが発生しました: {str(e)}",
        )


@router.get("/backtest/{stock_code}", response_model=BacktestResponseItem)
async def run_single_stock_backtest(
    stock_code: str = Path(..., description="銘柄コード"),
    test_days: int = Query(30, description="テスト期間（日数）", ge=10, le=100),
    prediction_horizon: int = Query(1, description="予想対象日（1=翌日）", ge=1, le=30),
):
    """単一銘柄の詳細なバックテストを実行します。"""
    try:
        logger.info(f"単一銘柄バックテスト開始: {stock_code}, 期間={test_days}日")

        backtester = PredictionBacktester()

        try:
            result = backtester.run_backtest(
                stock_code=stock_code,
                test_days=test_days,
                prediction_horizon=prediction_horizon,
            )
        except Exception as e:
            logger.error(f"銘柄 {stock_code} のバックテスト実行エラー: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"銘柄 {stock_code} のバックテストに失敗しました: {e}",
            )

        response = BacktestResponseItem(
            stock_code=result.stock_code,
            test_period_days=result.test_period_days,
            total_predictions=result.total_predictions,
            rmse=result.rmse,
            mae=result.mae,
            mape=result.mape,
            directional_accuracy=result.directional_accuracy,
            avg_error=result.avg_error,
            max_error=result.max_error,
            min_error=result.min_error,
        )

        logger.info(
            f"単一銘柄バックテスト完了: {stock_code}, "
            f"方向性精度={result.directional_accuracy:.1f}%, "
            f"予想数={result.total_predictions}"
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"単一銘柄バックテストAPIエラー: {e}")
        raise HTTPException(status_code=500, detail=f"バックテスト処理エラー: {str(e)}")


@router.get("/lstm-predict/{stock_code}", response_model=LSTMPredictionResponse)
async def get_lstm_prediction(
    stock_code: str = Path(..., description="銘柄コード"),
    days_ahead: int = Query(1, description="何日先を予想するか", ge=1, le=7),
):
    """LSTM深層学習による高精度な株価予想を取得します。"""
    if not LSTM_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="LSTM prediction is not available. TensorFlow is not installed.",
        )

    try:
        logger.info(
            f"LSTM prediction request for {stock_code}, days_ahead: {days_ahead}"
        )

        # LSTM予想を実行
        result = lstm_predictor.predict(stock_code, days_ahead)

        # 現在価格を取得
        current_price = result.technical_indicators.get("current_price", 0)
        price_change = result.predicted_price - current_price
        price_change_percent = (
            (price_change / current_price * 100) if current_price > 0 else 0
        )

        # モデル情報を取得
        model_info = lstm_predictor.get_model_info(stock_code)

        response = LSTMPredictionResponse(
            stock_code=result.stock_code,
            predicted_price=round(result.predicted_price, 2),
            confidence=round(result.confidence, 3),
            model_accuracy=round(result.model_accuracy, 3),
            current_price=round(current_price, 2),
            price_change=round(price_change, 2),
            price_change_percent=round(price_change_percent, 2),
            technical_indicators=result.technical_indicators,
            prediction_date=result.prediction_date.isoformat(),
            model_info=model_info,
        )

        logger.info(
            f"LSTM prediction completed for {stock_code}: "
            f"Price {result.predicted_price:.2f}, Confidence {result.confidence:.1%}"
        )

        return response

    except Exception as e:
        logger.error(f"LSTM prediction error for {stock_code}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LSTM prediction failed: {str(e)}")


@router.post("/lstm-train", response_model=LSTMTrainResponse)
async def train_lstm_models(request: LSTMTrainRequest):
    """LSTM予想モデルの訓練を実行します。"""
    if not LSTM_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="LSTM training is not available. TensorFlow is not installed.",
        )

    try:
        start_time = datetime.now()
        logger.info(
            f"LSTM training request: {request.stock_codes}, force_retrain={request.force_retrain}"
        )

        # 訓練対象銘柄を決定
        if request.stock_codes:
            target_stocks = request.stock_codes
        else:
            # 全銘柄から適当に選択（処理時間を考慮）
            with get_session_scope() as db:
                stocks = db.query(Stock).limit(5).all()  # 最大5銘柄
                target_stocks = [stock.stock_code for stock in stocks]

        trained_models = {}
        successful_trainings = 0

        for stock_code in target_stocks:
            try:
                logger.info(f"Training LSTM model for {stock_code}")
                metrics = lstm_predictor.train_model(
                    stock_code, force_retrain=request.force_retrain
                )
                trained_models[stock_code] = metrics
                successful_trainings += 1
                logger.info(f"Successfully trained LSTM model for {stock_code}")
            except Exception as e:
                logger.error(f"Failed to train LSTM model for {stock_code}: {e}")
                trained_models[stock_code] = {"error": str(e)}

        end_time = datetime.now()
        training_duration = end_time - start_time

        response = LSTMTrainResponse(
            trained_models=trained_models,
            total_trained=successful_trainings,
            training_time=f"{training_duration.total_seconds():.1f} seconds",
        )

        logger.info(
            f"LSTM training completed: {successful_trainings}/{len(target_stocks)} models trained"
        )
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LSTM training error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"LSTM training failed: {str(e)}")


@router.get("/lstm-status", response_model=Dict[str, Any])
async def get_lstm_status():
    """LSTM予想システムの状態を取得します。"""
    if not LSTM_ENABLED:
        return {
            "enabled": False,
            "error": "TensorFlow is not installed",
            "trained_models": 0,
            "available_stocks": [],
        }

    try:
        # 訓練済みモデル数を取得
        trained_models = len(lstm_predictor.models)

        # 利用可能な銘柄を取得
        with get_session_scope() as db:
            stocks = db.query(Stock).all()
            available_stocks = [
                stock.stock_code for stock in stocks[:20]
            ]  # 最大20銘柄表示

        # モデルメトリクス情報
        model_metrics = {
            stock_code: metrics
            for stock_code, metrics in lstm_predictor.model_metrics.items()
        }

        return {
            "enabled": True,
            "tensorflow_version": tf.__version__ if tf else "Unknown",
            "trained_models": trained_models,
            "available_stocks": available_stocks,
            "model_metrics": model_metrics,
            "config": {
                "sequence_length": lstm_predictor.config.sequence_length,
                "lstm_units": lstm_predictor.config.lstm_units,
                "dropout_rate": lstm_predictor.config.dropout_rate,
                "batch_size": lstm_predictor.config.batch_size,
            },
        }

    except Exception as e:
        logger.error(f"LSTM status check error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get LSTM status: {str(e)}"
        )