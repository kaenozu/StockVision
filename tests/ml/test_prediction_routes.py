"""
Test suite for ML prediction API routes
Tests API endpoints, request/response validation, and error handling
"""

import pytest
import json
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime

from src.main import app
from src.ml.prediction_engine import PredictionResult, ModelMetrics

client = TestClient(app)

@pytest.fixture
def mock_prediction_result():
    """Create mock prediction result"""
    return PredictionResult(
        symbol="AAPL",
        current_price=150.0,
        predicted_price=152.5,
        confidence=0.75,
        direction="up",
        change_percent=1.67,
        horizon="1d",
        model_used="random_forest",
        features_used=["returns", "sma_20", "rsi", "macd", "bb_position"],
        timestamp=datetime(2024, 1, 1, 12, 0, 0),
        metadata={
            "data_points": 252,
            "last_update": "2024-01-01T00:00:00",
            "model_metrics": {
                "mse": 2.5,
                "mae": 1.2,
                "r2": 0.65,
                "accuracy": 0.72,
                "sharpe_ratio": 0.8
            }
        }
    )

@pytest.fixture
def mock_model_metrics():
    """Create mock model metrics"""
    return ModelMetrics(
        mse=2.5,
        mae=1.2,
        r2=0.65,
        accuracy=0.72,
        sharpe_ratio=0.8
    )

class TestPredictionEndpoints:
    """Test prediction API endpoints"""
    
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_predict_stock_price_success(self, mock_engine, mock_prediction_result):
        """Test successful stock price prediction"""
        mock_engine.predict_price = AsyncMock(return_value=mock_prediction_result)
        
        response = client.post("/ml/predict", json={
            "symbol": "AAPL",
            "horizon": "1d",
            "model_type": "random_forest"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["symbol"] == "AAPL"
        assert data["prediction"]["current_price"] == 150.0
        assert data["prediction"]["predicted_price"] == 152.5
        assert data["prediction"]["direction"] == "up"
        assert data["prediction"]["confidence"] == 0.75
        assert data["prediction"]["model_used"] == "random_forest"
        
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_predict_stock_price_failure(self, mock_engine):
        """Test failed stock price prediction"""
        mock_engine.predict_price = AsyncMock(return_value=None)
        
        response = client.post("/ml/predict", json={
            "symbol": "INVALID",
            "horizon": "1d",
            "model_type": "random_forest"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is False
        assert data["symbol"] == "INVALID"
        assert data["prediction"] is None
        assert "error" in data
        
    def test_predict_invalid_parameters(self):
        """Test prediction with invalid parameters"""
        # Invalid horizon
        response = client.post("/ml/predict", json={
            "symbol": "AAPL",
            "horizon": "invalid",
            "model_type": "random_forest"
        })
        assert response.status_code == 400
        
        # Invalid model type
        response = client.post("/ml/predict", json={
            "symbol": "AAPL",
            "horizon": "1d",
            "model_type": "invalid_model"
        })
        assert response.status_code == 400
        
    def test_predict_missing_symbol(self):
        """Test prediction without required symbol"""
        response = client.post("/ml/predict", json={
            "horizon": "1d",
            "model_type": "random_forest"
        })
        assert response.status_code == 422  # Validation error
        
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_batch_predict_success(self, mock_engine, mock_prediction_result):
        """Test successful batch prediction"""
        # Create multiple results
        results = []
        for symbol in ["AAPL", "GOOGL", "MSFT"]:
            result = mock_prediction_result
            result.symbol = symbol
            results.append(result)
            
        mock_engine.batch_predict = AsyncMock(return_value=results)
        
        response = client.post("/ml/predict/batch", json={
            "symbols": ["AAPL", "GOOGL", "MSFT"],
            "horizon": "1d",
            "model_type": "random_forest"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert len(data["predictions"]) == 3
        assert data["total_processed"] == 3
        assert len(data["failed_symbols"]) == 0
        
        # Check individual predictions
        symbols = [p["symbol"] for p in data["predictions"]]
        assert "AAPL" in symbols
        assert "GOOGL" in symbols
        assert "MSFT" in symbols
        
    def test_batch_predict_too_many_symbols(self):
        """Test batch prediction with too many symbols"""
        symbols = [f"STOCK{i}" for i in range(51)]  # 51 symbols (over limit)
        
        response = client.post("/ml/predict/batch", json={
            "symbols": symbols,
            "horizon": "1d",
            "model_type": "random_forest"
        })
        
        assert response.status_code == 400
        assert "Maximum 50 symbols" in response.json()["detail"]
        
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_ensemble_prediction_success(self, mock_engine, mock_prediction_result):
        """Test successful ensemble prediction"""
        # Modify result for ensemble
        ensemble_result = mock_prediction_result
        ensemble_result.model_used = "ensemble"
        ensemble_result.features_used = ["ensemble_of_models"]
        ensemble_result.metadata = {
            "models_used": 3,
            "individual_predictions": [150.5, 151.2, 153.1],
            "individual_confidences": [0.7, 0.8, 0.6],
            "weights": [0.35, 0.4, 0.25]
        }
        
        mock_engine.get_ensemble_prediction = AsyncMock(return_value=ensemble_result)
        
        response = client.post("/ml/predict/ensemble?symbol=AAPL&horizon=1d")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["symbol"] == "AAPL"
        assert data["prediction"]["model_used"] == "ensemble"
        assert "models_used" in data["prediction"]["metadata"]
        
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_ensemble_prediction_failure(self, mock_engine):
        """Test failed ensemble prediction"""
        mock_engine.get_ensemble_prediction = AsyncMock(return_value=None)
        
        response = client.post("/ml/predict/ensemble?symbol=INVALID&horizon=1d")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is False
        assert "error" in data

class TestTrainingEndpoints:
    """Test model training API endpoints"""
    
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_train_model_success(self, mock_engine):
        """Test successful model training"""
        mock_engine.train_model = AsyncMock(return_value=True)
        
        response = client.post("/ml/train", json={
            "symbol": "AAPL",
            "model_type": "random_forest",
            "period": "2y"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["symbol"] == "AAPL"
        assert data["model_type"] == "random_forest"
        assert data["period"] == "2y"
        assert data["status"] == "training_in_progress"
        
    def test_train_model_invalid_type(self):
        """Test training with invalid model type"""
        response = client.post("/ml/train", json={
            "symbol": "AAPL",
            "model_type": "invalid_model",
            "period": "2y"
        })
        
        assert response.status_code == 400
        assert "Invalid model type" in response.json()["detail"]
        
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_batch_train_models(self, mock_engine):
        """Test batch model training"""
        mock_engine.train_model = AsyncMock(return_value=True)
        
        symbols = ["AAPL", "GOOGL", "MSFT"]
        response = client.post(f"/ml/train/batch?symbols={','.join(symbols)}&model_type=random_forest&period=1y")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert len(data["symbols"]) == 3
        assert data["model_type"] == "random_forest"
        assert data["period"] == "1y"
        assert data["status"] == "training_in_progress"
        
    def test_batch_train_too_many_symbols(self):
        """Test batch training with too many symbols"""
        symbols = [f"STOCK{i}" for i in range(21)]  # 21 symbols (over limit)
        symbols_str = ",".join(symbols)
        
        response = client.post(f"/ml/train/batch?symbols={symbols_str}")
        
        assert response.status_code == 400
        assert "Maximum 20 symbols" in response.json()["detail"]

class TestModelInfoEndpoints:
    """Test model information API endpoints"""
    
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_get_model_info(self, mock_engine):
        """Test getting model information"""
        mock_info = {
            "trained_symbols": ["AAPL", "GOOGL", "MSFT"],
            "available_models": ["random_forest", "gradient_boosting", "linear_regression"],
            "model_metrics": {
                "AAPL_random_forest": {
                    "mse": 2.5,
                    "mae": 1.2,
                    "r2": 0.65,
                    "accuracy": 0.72,
                    "sharpe_ratio": 0.8
                }
            },
            "total_models": 3
        }
        
        mock_engine.get_model_info.return_value = mock_info
        
        response = client.get("/ml/models/info")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "model_info" in data
        assert "available_model_types" in data
        assert "available_horizons" in data
        assert len(data["model_info"]["trained_symbols"]) == 3
        
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_get_model_metrics_success(self, mock_engine, mock_model_metrics):
        """Test getting model metrics for specific symbol"""
        mock_engine.model_metrics = {"AAPL_random_forest": mock_model_metrics}
        
        response = client.get("/ml/models/AAPL/metrics?model_type=random_forest")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["symbol"] == "AAPL"
        assert data["model_type"] == "random_forest"
        assert "metrics" in data
        assert "interpretation" in data
        
        metrics = data["metrics"]
        assert metrics["mse"] == 2.5
        assert metrics["mae"] == 1.2
        assert metrics["r2_score"] == 0.65
        assert metrics["directional_accuracy"] == 0.72
        
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_get_model_metrics_not_found(self, mock_engine):
        """Test getting metrics for non-existent model"""
        mock_engine.model_metrics = {}
        
        response = client.get("/ml/models/NONEXISTENT/metrics")
        
        assert response.status_code == 404
        assert "No metrics found" in response.json()["detail"]
        
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_retrain_models(self, mock_engine):
        """Test model retraining"""
        mock_engine.trained_symbols = {"AAPL", "GOOGL"}
        mock_engine.retrain_models = AsyncMock()
        
        response = client.post("/ml/models/retrain?symbols=AAPL,GOOGL")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert len(data["symbols"]) == 2
        assert data["status"] == "retraining_in_progress"

class TestSpecialEndpoints:
    """Test special prediction endpoints"""
    
    def test_backtest_model(self):
        """Test model backtesting endpoint"""
        response = client.get("/ml/backtest/AAPL?model_type=random_forest&days_back=30")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["symbol"] == "AAPL"
        assert data["model_type"] == "random_forest"
        assert data["backtest_period"] == "30 days"
        assert "results" in data
        assert "note" in data  # Currently in development
        
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_predict_popular_stocks(self, mock_engine, mock_prediction_result):
        """Test predicting popular stocks"""
        # Create results for popular stocks
        popular_symbols = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"]
        results = []
        
        for symbol in popular_symbols:
            result = mock_prediction_result
            result.symbol = symbol
            results.append(result)
            
        mock_engine.batch_predict = AsyncMock(return_value=results)
        
        response = client.get("/ml/predict/popular")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "predictions" in data
        assert data["total_symbols"] == len(results)
        
        # Check that results are sorted by confidence (highest first)
        confidences = [p["confidence"] for p in data["predictions"]]
        assert confidences == sorted(confidences, reverse=True)

class TestErrorHandling:
    """Test error handling and edge cases"""
    
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_prediction_engine_exception(self, mock_engine):
        """Test handling of prediction engine exceptions"""
        mock_engine.predict_price = AsyncMock(side_effect=Exception("Engine error"))
        
        response = client.post("/ml/predict", json={
            "symbol": "AAPL",
            "horizon": "1d",
            "model_type": "random_forest"
        })
        
        assert response.status_code == 500
        assert "Engine error" in response.json()["detail"]
        
    @patch('src.routers.prediction_routes.prediction_engine')
    def test_batch_prediction_partial_failure(self, mock_engine, mock_prediction_result):
        """Test batch prediction with partial failures"""
        # Only return results for some symbols
        results = [mock_prediction_result]  # Only AAPL succeeds
        results[0].symbol = "AAPL"
        
        mock_engine.batch_predict = AsyncMock(return_value=results)
        
        response = client.post("/ml/predict/batch", json={
            "symbols": ["AAPL", "GOOGL", "INVALID"],
            "horizon": "1d",
            "model_type": "random_forest"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert len(data["predictions"]) == 1  # Only AAPL
        assert len(data["failed_symbols"]) == 2  # GOOGL and INVALID failed
        assert data["total_processed"] == 3
        
    def test_malformed_request_body(self):
        """Test handling of malformed request bodies"""
        response = client.post("/ml/predict", data="invalid json")
        assert response.status_code == 422
        
    def test_missing_required_fields(self):
        """Test handling of missing required fields"""
        response = client.post("/ml/predict", json={
            "horizon": "1d"
            # Missing required 'symbol' field
        })
        assert response.status_code == 422

class TestInputValidation:
    """Test input validation and sanitization"""
    
    def test_symbol_case_insensitive(self):
        """Test that symbols are converted to uppercase"""
        with patch('src.routers.prediction_routes.prediction_engine') as mock_engine:
            mock_engine.predict_price = AsyncMock(return_value=None)
            
            response = client.post("/ml/predict", json={
                "symbol": "aapl",  # lowercase
                "horizon": "1d",
                "model_type": "random_forest"
            })
            
            # Should call with uppercase symbol
            mock_engine.predict_price.assert_called_once()
            args, kwargs = mock_engine.predict_price.call_args
            assert kwargs["symbol"] == "AAPL"
            
    def test_valid_horizons(self):
        """Test all valid prediction horizons"""
        valid_horizons = ["1h", "1d", "1w", "1m", "3m"]
        
        with patch('src.routers.prediction_routes.prediction_engine') as mock_engine:
            mock_engine.predict_price = AsyncMock(return_value=None)
            
            for horizon in valid_horizons:
                response = client.post("/ml/predict", json={
                    "symbol": "AAPL",
                    "horizon": horizon,
                    "model_type": "random_forest"
                })
                assert response.status_code == 200
                
    def test_valid_model_types(self):
        """Test all valid model types"""
        valid_models = ["random_forest", "gradient_boosting", "linear_regression", "ridge_regression"]
        
        with patch('src.routers.prediction_routes.prediction_engine') as mock_engine:
            mock_engine.predict_price = AsyncMock(return_value=None)
            
            for model_type in valid_models:
                response = client.post("/ml/predict", json={
                    "symbol": "AAPL",
                    "horizon": "1d",
                    "model_type": model_type
                })
                assert response.status_code == 200

if __name__ == "__main__":
    pytest.main([__file__, "-v"])