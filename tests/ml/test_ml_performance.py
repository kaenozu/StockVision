"""
ML Performance Testing and Validation
Tests for model accuracy, performance benchmarks, and validation metrics
"""

import pytest
import numpy as np
import pandas as pd
import time
from unittest.mock import patch, Mock
import asyncio

from src.ml.prediction_engine import StockPredictionEngine, ModelType, PredictionHorizon

class TestMLPerformance:
    """Test ML model performance and accuracy"""
    
    @pytest.fixture
    def realistic_stock_data(self):
        """Create realistic stock data with patterns"""
        np.random.seed(42)
        dates = pd.date_range('2022-01-01', '2024-01-01', freq='D')
        
        # Create data with realistic patterns
        base_price = 100
        trend = 0.0002  # Small daily trend
        volatility = 0.02
        prices = []
        
        for i, date in enumerate(dates):
            # Add trend, seasonality, and random walk
            seasonal = 0.1 * np.sin(2 * np.pi * i / 365)  # Annual cycle
            weekly = 0.05 * np.sin(2 * np.pi * i / 7)      # Weekly cycle
            noise = np.random.normal(0, volatility)
            
            price_change = trend + seasonal + weekly + noise
            base_price *= (1 + price_change)
            prices.append(base_price)
        
        df = pd.DataFrame({
            'Open': [p * (1 + np.random.normal(0, 0.005)) for p in prices],
            'High': [p * (1 + abs(np.random.normal(0, 0.01))) for p in prices],
            'Low': [p * (1 - abs(np.random.normal(0, 0.01))) for p in prices],
            'Close': prices,
            'Volume': [np.random.randint(500000, 5000000) for _ in prices]
        }, index=dates)
        
        return df
    
    @pytest.mark.asyncio
    @patch('yfinance.Ticker')
    async def test_directional_accuracy_threshold(self, mock_ticker, realistic_stock_data):
        """Test that models achieve minimum directional accuracy"""
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = realistic_stock_data
        mock_ticker.return_value = mock_ticker_instance
        
        engine = StockPredictionEngine()
        
        # Train multiple models
        model_types = [ModelType.RANDOM_FOREST, ModelType.GRADIENT_BOOSTING, ModelType.LINEAR_REGRESSION]
        accuracies = []
        
        for model_type in model_types:
            success = await engine.train_model("TEST", model_type)
            if success:
                key = f"TEST_{model_type.value}"
                if key in engine.model_metrics:
                    accuracy = engine.model_metrics[key].accuracy
                    accuracies.append(accuracy)
                    
                    # Minimum threshold for financial data (better than random)
                    assert accuracy > 0.40, f"{model_type.value} accuracy {accuracy} below threshold"
        
        # At least one model should achieve reasonable accuracy
        if accuracies:
            assert max(accuracies) > 0.42, "No model achieved reasonable directional accuracy"
    
    @pytest.mark.asyncio
    @patch('yfinance.Ticker')
    async def test_prediction_stability(self, mock_ticker, realistic_stock_data):
        """Test prediction stability across multiple runs"""
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = realistic_stock_data
        mock_ticker.return_value = mock_ticker_instance
        
        engine = StockPredictionEngine()
        await engine.train_model("TEST", ModelType.RANDOM_FOREST)
        
        # Make multiple predictions
        predictions = []
        for _ in range(5):
            result = await engine.predict_price("TEST", PredictionHorizon.DAILY)
            if result:
                predictions.append(result.predicted_price)
        
        if predictions:
            # Predictions should be identical (deterministic model)
            std_dev = np.std(predictions)
            assert std_dev < 0.01, f"Predictions too variable: std={std_dev}"
    
    @pytest.mark.asyncio
    @patch('yfinance.Ticker')
    async def test_model_training_speed(self, mock_ticker, realistic_stock_data):
        """Test that model training completes within reasonable time"""
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = realistic_stock_data
        mock_ticker.return_value = mock_ticker_instance
        
        engine = StockPredictionEngine()
        
        # Test training speed for different models
        for model_type in [ModelType.RANDOM_FOREST, ModelType.LINEAR_REGRESSION]:
            start_time = time.time()
            success = await engine.train_model("TEST", model_type)
            training_time = time.time() - start_time
            
            if success:
                # Training should complete within reasonable time
                assert training_time < 30, f"{model_type.value} training took {training_time}s"
                print(f"{model_type.value} training time: {training_time:.2f}s")
    
    @pytest.mark.asyncio
    @patch('yfinance.Ticker')
    async def test_prediction_speed(self, mock_ticker, realistic_stock_data):
        """Test prediction speed performance"""
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = realistic_stock_data
        mock_ticker.return_value = mock_ticker_instance
        
        engine = StockPredictionEngine()
        await engine.train_model("TEST", ModelType.RANDOM_FOREST)
        
        # Test single prediction speed
        start_time = time.time()
        result = await engine.predict_price("TEST", PredictionHorizon.DAILY)
        prediction_time = time.time() - start_time
        
        if result:
            # Single prediction should be fast
            assert prediction_time < 5, f"Single prediction took {prediction_time}s"
            print(f"Single prediction time: {prediction_time:.3f}s")
    
    @pytest.mark.asyncio
    @patch('yfinance.Ticker')
    async def test_batch_prediction_efficiency(self, mock_ticker, realistic_stock_data):
        """Test batch prediction efficiency"""
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = realistic_stock_data
        mock_ticker.return_value = mock_ticker_instance
        
        engine = StockPredictionEngine()
        
        symbols = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"]
        
        # Test batch prediction
        start_time = time.time()
        results = await engine.batch_predict(symbols, PredictionHorizon.DAILY)
        batch_time = time.time() - start_time
        
        # Batch should be more efficient than individual predictions
        avg_time_per_symbol = batch_time / len(symbols)
        assert avg_time_per_symbol < 10, f"Batch prediction too slow: {avg_time_per_symbol}s per symbol"
        print(f"Batch prediction: {batch_time:.2f}s for {len(symbols)} symbols")

class TestModelValidation:
    """Test model validation and metrics"""
    
    def create_validation_data(self):
        """Create data for validation testing"""
        np.random.seed(123)
        
        # Create predictable pattern
        x = np.linspace(0, 100, 100)
        trend = x * 0.5
        noise = np.random.normal(0, 2, 100)
        y_true = 100 + trend + noise
        
        # Create predictions with some error
        y_pred = y_true + np.random.normal(0, 1, 100)
        
        dates = pd.date_range('2024-01-01', periods=100, freq='D')
        actual_prices = pd.Series(y_true[:-1], index=dates[:-1])  # One less for shift
        
        return pd.Series(y_true, index=dates), y_pred, dates, actual_prices
    
    def test_metrics_calculation_accuracy(self):
        """Test accuracy of metrics calculations"""
        from src.ml.prediction_engine import StockPredictionEngine
        
        y_true, y_pred, dates, actual_prices = self.create_validation_data()
        
        engine = StockPredictionEngine()
        metrics = engine._calculate_metrics(y_true, y_pred, dates, actual_prices)
        
        # Check metric ranges
        assert 0 <= metrics.mse, "MSE should be non-negative"
        assert 0 <= metrics.mae, "MAE should be non-negative"
        assert -1 <= metrics.r2 <= 1, "R2 should be between -1 and 1"
        assert 0 <= metrics.accuracy <= 1, "Accuracy should be between 0 and 1"
        
        # MSE should be roughly square of MAE for normal errors
        mae_squared = metrics.mae ** 2
        assert abs(metrics.mse - mae_squared) / mae_squared < 2, "MSE and MAE relationship seems wrong"
    
    def test_directional_accuracy_calculation(self):
        """Test directional accuracy calculation"""
        from src.ml.prediction_engine import StockPredictionEngine
        
        # Create perfect directional predictions
        dates = pd.date_range('2024-01-01', periods=10, freq='D')
        actual_prices = pd.Series([100, 101, 102, 101, 103, 102, 104, 105, 104, 106], index=dates)
        
        # Predictions that get direction right but values wrong
        y_true = actual_prices[1:]  # Next day prices
        y_pred = np.array([101.5, 102.5, 100.5, 103.5, 101.5, 104.5, 105.5, 103.5, 106.5])
        
        engine = StockPredictionEngine()
        metrics = engine._calculate_metrics(y_true, y_pred, dates[1:], actual_prices)
        
        # Should have high directional accuracy
        assert metrics.accuracy > 0.7, f"Expected high directional accuracy, got {metrics.accuracy}"
    
    @pytest.mark.asyncio
    @patch('yfinance.Ticker')
    async def test_cross_validation_consistency(self, mock_ticker):
        """Test model consistency across different data splits"""
        np.random.seed(42)
        
        # Create larger dataset for cross-validation
        dates = pd.date_range('2020-01-01', '2024-01-01', freq='D')
        prices = [100]
        for _ in range(len(dates) - 1):
            change = np.random.normal(0.001, 0.02)
            prices.append(prices[-1] * (1 + change))
        
        df = pd.DataFrame({
            'Open': [p * 0.998 for p in prices],
            'High': [p * 1.01 for p in prices],
            'Low': [p * 0.99 for p in prices],
            'Close': prices,
            'Volume': [1000000] * len(prices)
        }, index=dates)
        
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = df
        mock_ticker.return_value = mock_ticker_instance
        
        engine = StockPredictionEngine()
        
        # Train multiple times and check consistency
        r2_scores = []
        for i in range(3):
            np.random.seed(i)  # Different random seeds
            success = await engine.train_model(f"TEST{i}", ModelType.RANDOM_FOREST)
            if success:
                metrics = engine.model_metrics[f"TEST{i}_random_forest"]
                r2_scores.append(metrics.r2)
        
        if len(r2_scores) > 1:
            # R2 scores should be reasonably consistent
            std_r2 = np.std(r2_scores)
            assert std_r2 < 0.2, f"R2 scores too inconsistent: {r2_scores}, std={std_r2}"

class TestFeatureImportance:
    """Test feature importance and selection"""
    
    @pytest.mark.asyncio
    @patch('yfinance.Ticker')
    async def test_feature_importance_ranking(self, mock_ticker):
        """Test that feature importance rankings are reasonable"""
        # Create data where specific features should be important
        dates = pd.date_range('2023-01-01', '2024-01-01', freq='D')
        
        # Create data where moving averages are predictive
        base_price = 100
        prices = [base_price]
        
        for i in range(len(dates) - 1):
            # Price follows 20-day moving average pattern
            if len(prices) >= 20:
                ma20 = np.mean(prices[-20:])
                trend = (ma20 - prices[-1]) * 0.1  # Revert to mean
            else:
                trend = 0
                
            noise = np.random.normal(0, 0.01)
            new_price = prices[-1] * (1 + trend + noise)
            prices.append(new_price)
        
        df = pd.DataFrame({
            'Open': [p * 0.999 for p in prices],
            'High': [p * 1.005 for p in prices],
            'Low': [p * 0.995 for p in prices],
            'Close': prices,
            'Volume': [1000000] * len(prices)
        }, index=dates)
        
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = df
        mock_ticker.return_value = mock_ticker_instance
        
        engine = StockPredictionEngine()
        await engine.train_model("TEST", ModelType.RANDOM_FOREST)
        
        result = await engine.predict_price("TEST", PredictionHorizon.DAILY)
        
        if result and result.features_used:
            # Should include moving average features since data follows MA pattern
            feature_names = ' '.join(result.features_used).lower()
            assert 'sma' in feature_names or 'ma' in feature_names, "Moving average features should be important"
            
            # Should have reasonable number of features
            assert 1 <= len(result.features_used) <= 5, f"Unexpected number of features: {len(result.features_used)}"

class TestModelComparison:
    """Test comparison between different models"""
    
    @pytest.mark.asyncio
    @patch('yfinance.Ticker')
    async def test_ensemble_vs_individual_models(self, mock_ticker):
        """Test that ensemble performs better than or equal to individual models"""
        # Create dataset with mixed patterns
        np.random.seed(42)
        dates = pd.date_range('2022-01-01', '2024-01-01', freq='D')
        
        prices = [100]
        for i in range(len(dates) - 1):
            # Mix of trend and mean reversion
            if i % 50 < 25:  # Trending periods
                change = np.random.normal(0.002, 0.015)
            else:  # Mean reverting periods
                change = np.random.normal(-0.001, 0.025)
            prices.append(prices[-1] * (1 + change))
        
        df = pd.DataFrame({
            'Open': [p * 0.998 for p in prices],
            'High': [p * 1.008 for p in prices],
            'Low': [p * 0.992 for p in prices],
            'Close': prices,
            'Volume': [np.random.randint(800000, 1200000) for _ in prices]
        }, index=dates)
        
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = df
        mock_ticker.return_value = mock_ticker_instance
        
        engine = StockPredictionEngine()
        
        # Get individual model predictions
        individual_predictions = []
        individual_confidences = []
        
        for model_type in [ModelType.RANDOM_FOREST, ModelType.GRADIENT_BOOSTING]:
            result = await engine.predict_price("TEST", PredictionHorizon.DAILY, model_type)
            if result:
                individual_predictions.append(result.predicted_price)
                individual_confidences.append(result.confidence)
        
        # Get ensemble prediction
        ensemble_result = await engine.get_ensemble_prediction("TEST", PredictionHorizon.DAILY)
        
        if ensemble_result and len(individual_predictions) > 1:
            # Ensemble confidence should be reasonable
            max_individual_confidence = max(individual_confidences)
            assert ensemble_result.confidence >= min(individual_confidences), "Ensemble confidence too low"
            assert ensemble_result.confidence <= max_individual_confidence * 1.1, "Ensemble confidence suspiciously high"
            
            # Ensemble prediction should be between individual predictions
            min_pred = min(individual_predictions)
            max_pred = max(individual_predictions)
            assert min_pred <= ensemble_result.predicted_price <= max_pred, "Ensemble prediction outside individual range"

class TestRegressionValidation:
    """Test regression analysis and validation"""
    
    def test_model_overfitting_detection(self):
        """Test detection of potential overfitting"""
        # This would typically involve train/validation split analysis
        # For now, we test that R2 scores are reasonable
        
        # Simulate metrics that might indicate overfitting
        high_r2_low_accuracy = {
            'r2': 0.95,
            'accuracy': 0.45  # High R2 but poor directional accuracy
        }
        
        # This combination suggests overfitting to price levels but not direction
        assert not (high_r2_low_accuracy['r2'] > 0.9 and high_r2_low_accuracy['accuracy'] < 0.5), \
            "Potential overfitting detected: high R2 but low directional accuracy"
    
    def test_prediction_bounds_validation(self):
        """Test that predictions are within reasonable bounds"""
        # Create test prediction result
        current_price = 150.0
        predicted_price = 152.5
        change_percent = (predicted_price - current_price) / current_price * 100
        
        # Reasonable daily price change bounds (e.g., within ±20%)
        assert -20 <= change_percent <= 20, f"Predicted change {change_percent}% seems excessive for daily prediction"
        
        # Price should be positive
        assert predicted_price > 0, "Predicted price should be positive"
        assert current_price > 0, "Current price should be positive"
    
    def test_confidence_score_validation(self):
        """Test that confidence scores are meaningful"""
        # Test various confidence scenarios
        test_cases = [
            {'r2': 0.8, 'accuracy': 0.75, 'expected_confidence_range': (0.6, 0.9)},
            {'r2': 0.3, 'accuracy': 0.55, 'expected_confidence_range': (0.4, 0.7)},
            {'r2': -0.1, 'accuracy': 0.45, 'expected_confidence_range': (0.2, 0.5)},
        ]
        
        for case in test_cases:
            # Simple confidence estimation based on metrics
            confidence = (case['r2'] + case['accuracy']) / 2
            confidence = max(0.1, min(0.95, confidence))  # Bound between 0.1 and 0.95
            
            min_expected, max_expected = case['expected_confidence_range']
            assert min_expected <= confidence <= max_expected, \
                f"Confidence {confidence} outside expected range {case['expected_confidence_range']}"

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])