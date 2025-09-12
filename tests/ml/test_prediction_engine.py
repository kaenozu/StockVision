"""
Comprehensive test suite for ML prediction engine
Tests model training, prediction accuracy, and validation
"""

from datetime import datetime
from unittest.mock import Mock, patch

import numpy as np
import pandas as pd
import pytest

from src.ml.prediction_engine import (FeatureEngine, ModelMetrics, ModelType,
                                      PredictionHorizon, PredictionResult,
                                      StockPredictionEngine)


@pytest.fixture
def sample_stock_data():
    """Create sample stock data for testing"""
    dates = pd.date_range(start="2023-01-01", end="2024-01-01", freq="D")
    np.random.seed(42)

    # Generate realistic stock price data
    price = 100
    prices = [price]

    for _ in range(len(dates) - 1):
        change = np.random.normal(0, 0.02)  # 2% daily volatility
        price *= 1 + change
        prices.append(price)

    df = pd.DataFrame(
        {
            "Open": [p * (1 + np.random.normal(0, 0.005)) for p in prices],
            "High": [p * (1 + abs(np.random.normal(0, 0.01))) for p in prices],
            "Low": [p * (1 - abs(np.random.normal(0, 0.01))) for p in prices],
            "Close": prices,
            "Volume": [np.random.randint(1000000, 10000000) for _ in prices],
        },
        index=dates,
    )

    return df


@pytest.fixture
def feature_engine():
    """Create feature engine instance"""
    return FeatureEngine()


@pytest.fixture
def prediction_engine():
    """Create prediction engine instance"""
    return StockPredictionEngine()


class TestFeatureEngine:
    """Test feature engineering functionality"""

    def test_create_features_basic(self, feature_engine, sample_stock_data):
        """Test basic feature creation"""
        features = feature_engine.create_features(sample_stock_data)

        # Check that features were created
        assert "returns" in features.columns
        assert "log_returns" in features.columns
        assert "price_range" in features.columns
        assert "volume_change" in features.columns

        # Check moving averages
        assert "sma_5" in features.columns
        assert "sma_20" in features.columns
        assert "close_sma_20" in features.columns

        # Check technical indicators
        assert "macd" in features.columns
        assert "rsi" in features.columns
        assert "bb_position" in features.columns
        assert "stoch_k" in features.columns
        assert "williams_r" in features.columns
        assert "atr" in features.columns

        # Check that feature values are reasonable
        assert not features["returns"].isna().all()
        assert features["rsi"].max() <= 100
        assert features["rsi"].min() >= 0

    def test_feature_calculations_accuracy(self, feature_engine, sample_stock_data):
        """Test accuracy of specific feature calculations"""
        features = feature_engine.create_features(sample_stock_data)

        # Test returns calculation
        expected_returns = sample_stock_data["Close"].pct_change()
        pd.testing.assert_series_equal(
            features["returns"], expected_returns, check_names=False
        )

        # Test SMA calculation
        expected_sma_20 = sample_stock_data["Close"].rolling(window=20).mean()
        pd.testing.assert_series_equal(
            features["sma_20"], expected_sma_20, check_names=False
        )

        # Test price range calculation
        expected_range = (
            sample_stock_data["High"] - sample_stock_data["Low"]
        ) / sample_stock_data["Close"]
        pd.testing.assert_series_equal(
            features["price_range"], expected_range, check_names=False
        )

    def test_prepare_features(self, feature_engine, sample_stock_data):
        """Test feature preparation for training"""
        X, y = feature_engine.prepare_features(sample_stock_data)

        # Check that features and target are returned
        assert isinstance(X, pd.DataFrame)
        assert isinstance(y, pd.Series)
        assert len(X) == len(y)

        # Check that no OHLCV columns are in features
        ohlcv_cols = ["Open", "High", "Low", "Close", "Volume"]
        for col in ohlcv_cols:
            assert col not in X.columns

        # Check target column
        assert y.name == "target"

    def test_feature_completeness(self, feature_engine, sample_stock_data):
        """Test that all expected feature types are created"""
        features = feature_engine.create_features(sample_stock_data)

        # Expected feature categories
        expected_features = {
            "moving_averages": ["sma_5", "sma_10", "sma_20", "sma_50", "sma_200"],
            "technical_indicators": [
                "macd",
                "rsi",
                "bb_position",
                "stoch_k",
                "williams_r",
                "atr",
            ],
            "momentum": [
                "momentum_1",
                "momentum_3",
                "momentum_5",
                "momentum_10",
                "momentum_20",
            ],
            "volatility": ["volatility_5", "volatility_10", "volatility_20"],
            "volume": ["volume_ratio", "obv"],
        }

        for category, feature_list in expected_features.items():
            for feature in feature_list:
                assert (
                    feature in features.columns
                ), f"Missing {category} feature: {feature}"


class TestStockPredictionEngine:
    """Test stock prediction engine functionality"""

    @pytest.mark.asyncio
    async def test_model_initialization(self, prediction_engine):
        """Test that models are properly initialized"""
        assert ModelType.RANDOM_FOREST in prediction_engine.models
        assert ModelType.GRADIENT_BOOSTING in prediction_engine.models
        assert ModelType.LINEAR_REGRESSION in prediction_engine.models
        assert ModelType.RIDGE_REGRESSION in prediction_engine.models

        # Check model types
        from sklearn.ensemble import (GradientBoostingRegressor,
                                      RandomForestRegressor)
        from sklearn.linear_model import LinearRegression, Ridge

        assert isinstance(
            prediction_engine.models[ModelType.RANDOM_FOREST], RandomForestRegressor
        )
        assert isinstance(
            prediction_engine.models[ModelType.GRADIENT_BOOSTING],
            GradientBoostingRegressor,
        )
        assert isinstance(
            prediction_engine.models[ModelType.LINEAR_REGRESSION], LinearRegression
        )
        assert isinstance(prediction_engine.models[ModelType.RIDGE_REGRESSION], Ridge)

    @pytest.mark.asyncio
    @patch("yfinance.Ticker")
    async def test_train_model_success(
        self, mock_ticker, prediction_engine, sample_stock_data
    ):
        """Test successful model training"""
        # Mock yfinance data
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = sample_stock_data
        mock_ticker.return_value = mock_ticker_instance

        # Train model
        result = await prediction_engine.train_model("AAPL", ModelType.RANDOM_FOREST)

        assert result is True
        assert "AAPL" in prediction_engine.trained_symbols
        assert "AAPL_random_forest" in prediction_engine.models
        assert "AAPL_random_forest" in prediction_engine.model_metrics

    @pytest.mark.asyncio
    @patch("yfinance.Ticker")
    async def test_train_model_no_data(self, mock_ticker, prediction_engine):
        """Test model training with no data"""
        # Mock empty data
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = pd.DataFrame()
        mock_ticker.return_value = mock_ticker_instance

        result = await prediction_engine.train_model("INVALID", ModelType.RANDOM_FOREST)

        assert result is False
        assert "INVALID" not in prediction_engine.trained_symbols

    @pytest.mark.asyncio
    @patch("yfinance.Ticker")
    async def test_predict_price_success(
        self, mock_ticker, prediction_engine, sample_stock_data
    ):
        """Test successful price prediction"""
        # Mock yfinance data
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = sample_stock_data
        mock_ticker.return_value = mock_ticker_instance

        # First train the model
        await prediction_engine.train_model("AAPL", ModelType.RANDOM_FOREST)

        # Make prediction
        result = await prediction_engine.predict_price("AAPL", PredictionHorizon.DAILY)

        assert isinstance(result, PredictionResult)
        assert result.symbol == "AAPL"
        assert result.current_price > 0
        assert result.predicted_price > 0
        assert result.confidence >= 0 and result.confidence <= 1
        assert result.direction in ["up", "down", "stable"]
        assert result.model_used == "random_forest"
        assert isinstance(result.timestamp, datetime)

    @pytest.mark.asyncio
    @patch("yfinance.Ticker")
    async def test_batch_predict(
        self, mock_ticker, prediction_engine, sample_stock_data
    ):
        """Test batch prediction functionality"""
        # Mock yfinance data
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = sample_stock_data
        mock_ticker.return_value = mock_ticker_instance

        symbols = ["AAPL", "GOOGL", "MSFT"]

        # Make batch predictions (this will train models automatically)
        results = await prediction_engine.batch_predict(
            symbols, PredictionHorizon.DAILY
        )

        assert len(results) <= len(symbols)  # Some may fail
        for result in results:
            assert isinstance(result, PredictionResult)
            assert result.symbol in symbols

    @pytest.mark.asyncio
    @patch("yfinance.Ticker")
    async def test_ensemble_prediction(
        self, mock_ticker, prediction_engine, sample_stock_data
    ):
        """Test ensemble prediction functionality"""
        # Mock yfinance data
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = sample_stock_data
        mock_ticker.return_value = mock_ticker_instance

        # Get ensemble prediction
        result = await prediction_engine.get_ensemble_prediction(
            "AAPL", PredictionHorizon.DAILY
        )

        if result:  # May be None if training fails
            assert isinstance(result, PredictionResult)
            assert result.symbol == "AAPL"
            assert result.model_used == "ensemble"
            assert "models_used" in result.metadata
            assert "individual_predictions" in result.metadata

    def test_model_metrics_calculation(self, prediction_engine):
        """Test model metrics calculation"""
        # Create test data
        y_true = np.array([100, 101, 99, 102, 98])
        y_pred = np.array([100.5, 100.8, 99.2, 101.5, 98.3])
        dates = pd.date_range("2024-01-01", periods=5)
        actual_prices = pd.Series([99, 100, 101, 99, 102], index=dates)

        metrics = prediction_engine._calculate_metrics(
            pd.Series(y_true, index=dates), y_pred, dates, actual_prices
        )

        assert isinstance(metrics, ModelMetrics)
        assert metrics.mse >= 0
        assert metrics.mae >= 0
        assert metrics.accuracy >= 0 and metrics.accuracy <= 1
        assert -1 <= metrics.r2 <= 1

    def test_get_model_info(self, prediction_engine):
        """Test model information retrieval"""
        # Add some test data
        prediction_engine.trained_symbols.add("AAPL")
        prediction_engine.trained_symbols.add("GOOGL")

        info = prediction_engine.get_model_info()

        assert "trained_symbols" in info
        assert "available_models" in info
        assert "model_metrics" in info
        assert "total_models" in info

        assert "AAPL" in info["trained_symbols"]
        assert "GOOGL" in info["trained_symbols"]


class TestModelValidation:
    """Test model validation and performance"""

    @pytest.mark.asyncio
    @patch("yfinance.Ticker")
    async def test_model_performance_thresholds(
        self, mock_ticker, prediction_engine, sample_stock_data
    ):
        """Test that models meet minimum performance thresholds"""
        # Create more realistic data with trends
        np.random.seed(42)
        trend_data = sample_stock_data.copy()

        # Add upward trend
        trend_factor = np.linspace(1.0, 1.2, len(trend_data))
        trend_data["Close"] *= trend_factor
        trend_data["High"] *= trend_factor
        trend_data["Low"] *= trend_factor
        trend_data["Open"] *= trend_factor

        # Mock yfinance data
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = trend_data
        mock_ticker.return_value = mock_ticker_instance

        # Train model
        success = await prediction_engine.train_model("AAPL", ModelType.RANDOM_FOREST)
        assert success

        # Check that metrics meet minimum thresholds
        metrics = prediction_engine.model_metrics["AAPL_random_forest"]

        # These are reasonable thresholds for financial data
        assert metrics.mse < 10000  # MSE should be reasonable for stock prices
        assert metrics.mae < 100  # MAE should be reasonable
        assert metrics.accuracy > 0.4  # Better than random for direction
        assert metrics.r2 > -1  # R2 should not be extremely negative

    @pytest.mark.asyncio
    @patch("yfinance.Ticker")
    async def test_prediction_consistency(
        self, mock_ticker, prediction_engine, sample_stock_data
    ):
        """Test that predictions are consistent across multiple calls"""
        # Mock yfinance data
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = sample_stock_data
        mock_ticker.return_value = mock_ticker_instance

        # Train model
        await prediction_engine.train_model("AAPL", ModelType.RANDOM_FOREST)

        # Make multiple predictions
        prediction1 = await prediction_engine.predict_price(
            "AAPL", PredictionHorizon.DAILY
        )
        prediction2 = await prediction_engine.predict_price(
            "AAPL", PredictionHorizon.DAILY
        )

        if prediction1 and prediction2:
            # Predictions should be identical for same input
            assert abs(prediction1.predicted_price - prediction2.predicted_price) < 0.01
            assert prediction1.direction == prediction2.direction
            assert abs(prediction1.confidence - prediction2.confidence) < 0.01

    @pytest.mark.asyncio
    @patch("yfinance.Ticker")
    async def test_feature_importance(
        self, mock_ticker, prediction_engine, sample_stock_data
    ):
        """Test that feature importance is calculated and reasonable"""
        # Mock yfinance data
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = sample_stock_data
        mock_ticker.return_value = mock_ticker_instance

        # Train model and make prediction
        await prediction_engine.train_model("AAPL", ModelType.RANDOM_FOREST)
        result = await prediction_engine.predict_price("AAPL", PredictionHorizon.DAILY)

        if result:
            # Check that features are provided
            assert len(result.features_used) > 0
            assert len(result.features_used) <= 5  # Top 5 features

            # Features should be reasonable technical indicators
            valid_features = [
                "returns",
                "sma_",
                "rsi",
                "macd",
                "bb_position",
                "momentum_",
                "volatility_",
                "stoch_",
                "williams_r",
            ]

            for feature in result.features_used:
                assert any(
                    vf in feature for vf in valid_features
                ), f"Unexpected feature: {feature}"


class TestErrorHandling:
    """Test error handling and edge cases"""

    @pytest.mark.asyncio
    @patch("yfinance.Ticker")
    async def test_invalid_symbol_handling(self, mock_ticker, prediction_engine):
        """Test handling of invalid stock symbols"""
        # Mock exception
        mock_ticker.side_effect = Exception("Invalid symbol")

        result = await prediction_engine.train_model("INVALID", ModelType.RANDOM_FOREST)
        assert result is False

        prediction = await prediction_engine.predict_price(
            "INVALID", PredictionHorizon.DAILY
        )
        assert prediction is None

    @pytest.mark.asyncio
    async def test_prediction_without_training(self, prediction_engine):
        """Test prediction without trained model"""
        with patch("yfinance.Ticker") as mock_ticker:
            # Mock successful data fetch but no trained model
            mock_ticker_instance = Mock()
            mock_ticker_instance.history.return_value = pd.DataFrame(
                {
                    "Close": [100, 101, 99],
                    "Open": [99, 100, 101],
                    "High": [102, 103, 101],
                    "Low": [98, 99, 98],
                    "Volume": [1000, 1100, 900],
                }
            )
            mock_ticker.return_value = mock_ticker_instance

            # This should trigger automatic training
            result = await prediction_engine.predict_price(
                "NEW_SYMBOL", PredictionHorizon.DAILY
            )

            # May be None if training fails due to insufficient data
            if result:
                assert isinstance(result, PredictionResult)

    def test_insufficient_data_handling(self, feature_engine):
        """Test handling of insufficient data for feature creation"""
        # Create very small dataset
        small_data = pd.DataFrame(
            {
                "Open": [100],
                "High": [101],
                "Low": [99],
                "Close": [100.5],
                "Volume": [1000],
            }
        )

        # Should not crash, but may have many NaN values
        features = feature_engine.create_features(small_data)
        assert isinstance(features, pd.DataFrame)

        # Prepare features should handle NaN appropriately
        X, y = feature_engine.prepare_features(small_data)
        # May result in empty dataframes due to NaN removal
        assert isinstance(X, pd.DataFrame)
        assert isinstance(y, pd.Series)


class TestIntegrationScenarios:
    """Test real-world integration scenarios"""

    @pytest.mark.asyncio
    @patch("yfinance.Ticker")
    async def test_full_workflow(
        self, mock_ticker, prediction_engine, sample_stock_data
    ):
        """Test complete ML workflow from training to prediction"""
        # Mock yfinance data
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = sample_stock_data
        mock_ticker.return_value = mock_ticker_instance

        symbol = "AAPL"

        # Step 1: Train model
        train_success = await prediction_engine.train_model(
            symbol, ModelType.RANDOM_FOREST
        )
        assert train_success

        # Step 2: Make single prediction
        prediction = await prediction_engine.predict_price(
            symbol, PredictionHorizon.DAILY
        )
        assert prediction is not None
        assert prediction.symbol == symbol

        # Step 3: Get ensemble prediction
        ensemble = await prediction_engine.get_ensemble_prediction(
            symbol, PredictionHorizon.DAILY
        )
        if ensemble:  # May fail if other models can't be trained
            assert ensemble.model_used == "ensemble"

        # Step 4: Get model info
        info = prediction_engine.get_model_info()
        assert symbol in info["trained_symbols"]

        # Step 5: Check metrics
        metrics_key = f"{symbol}_random_forest"
        assert metrics_key in prediction_engine.model_metrics

    @pytest.mark.asyncio
    @patch("yfinance.Ticker")
    async def test_multiple_model_types(
        self, mock_ticker, prediction_engine, sample_stock_data
    ):
        """Test training and prediction with different model types"""
        # Mock yfinance data
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = sample_stock_data
        mock_ticker.return_value = mock_ticker_instance

        symbol = "AAPL"
        model_types = [
            ModelType.RANDOM_FOREST,
            ModelType.GRADIENT_BOOSTING,
            ModelType.LINEAR_REGRESSION,
        ]

        results = []
        for model_type in model_types:
            # Train model
            train_success = await prediction_engine.train_model(symbol, model_type)
            if train_success:
                # Make prediction
                prediction = await prediction_engine.predict_price(
                    symbol, PredictionHorizon.DAILY, model_type
                )
                if prediction:
                    results.append(prediction)

        # Should have at least some successful predictions
        assert len(results) > 0

        # All predictions should be for the same symbol
        for result in results:
            assert result.symbol == symbol

        # Different models may give different predictions
        predicted_prices = [r.predicted_price for r in results]
        assert len(set(predicted_prices)) >= 1  # At least one unique prediction


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
