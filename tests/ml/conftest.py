"""
ML testing configuration and fixtures
Shared test fixtures for ML testing
"""

import os
import tempfile
from datetime import datetime
from unittest.mock import Mock, patch

import numpy as np
import pandas as pd
import pytest

# Test configuration


# Note: Using pytest-asyncio's built-in event_loop fixture instead of custom one


@pytest.fixture
def sample_market_data():
    """Generate sample market data for testing"""
    np.random.seed(42)

    start_date = datetime(2023, 1, 1)
    end_date = datetime(2024, 1, 1)
    dates = pd.date_range(start_date, end_date, freq="D")

    # Generate realistic OHLCV data
    base_price = 100.0
    prices = []
    volumes = []

    for i, date in enumerate(dates):
        # Add some realistic patterns
        trend = 0.0001 * i  # Slight upward trend
        volatility = 0.02
        daily_return = np.random.normal(trend, volatility)

        # Weekend effect (lower volatility)
        if date.weekday() >= 5:
            daily_return *= 0.5

        base_price *= 1 + daily_return
        prices.append(base_price)

        # Volume with some correlation to price movement
        base_volume = 1000000
        volume_factor = 1 + abs(daily_return) * 2  # Higher volume on big moves
        volumes.append(int(base_volume * volume_factor * np.random.uniform(0.8, 1.2)))

    # Generate OHLC from close prices
    opens = [prices[0]] + prices[:-1]  # Open is previous close
    highs = [p * (1 + abs(np.random.normal(0, 0.01))) for p in prices]
    lows = [p * (1 - abs(np.random.normal(0, 0.01))) for p in prices]

    df = pd.DataFrame(
        {"Open": opens, "High": highs, "Low": lows, "Close": prices, "Volume": volumes},
        index=dates,
    )

    return df


@pytest.fixture
def trending_market_data():
    """Generate trending market data for testing"""
    np.random.seed(123)

    dates = pd.date_range("2023-01-01", "2024-01-01", freq="D")
    base_price = 100.0
    trend_strength = 0.0005  # 0.05% daily trend

    prices = []
    for i in range(len(dates)):
        trend = trend_strength * i
        noise = np.random.normal(0, 0.015)
        base_price *= 1 + trend + noise
        prices.append(base_price)

    df = pd.DataFrame(
        {
            "Open": [p * 0.999 for p in prices],
            "High": [p * 1.01 for p in prices],
            "Low": [p * 0.99 for p in prices],
            "Close": prices,
            "Volume": [np.random.randint(800000, 1200000) for _ in prices],
        },
        index=dates,
    )

    return df


@pytest.fixture
def volatile_market_data():
    """Generate highly volatile market data for testing"""
    np.random.seed(456)

    dates = pd.date_range("2023-01-01", "2024-01-01", freq="D")
    base_price = 100.0
    high_volatility = 0.05  # 5% daily volatility

    prices = []
    for _ in range(len(dates)):
        daily_return = np.random.normal(0, high_volatility)
        base_price *= 1 + daily_return
        prices.append(base_price)

    df = pd.DataFrame(
        {
            "Open": [p * (1 + np.random.normal(0, 0.01)) for p in prices],
            "High": [p * (1 + abs(np.random.normal(0, 0.02))) for p in prices],
            "Low": [p * (1 - abs(np.random.normal(0, 0.02))) for p in prices],
            "Close": prices,
            "Volume": [np.random.randint(500000, 2000000) for _ in prices],
        },
        index=dates,
    )

    return df


@pytest.fixture
def mock_yfinance_success():
    """Mock yfinance for successful data retrieval"""

    def _mock_yfinance(data):
        with patch("yfinance.Ticker") as mock_ticker:
            mock_instance = Mock()
            mock_instance.history.return_value = data
            mock_ticker.return_value = mock_instance
            yield mock_ticker

    return _mock_yfinance


@pytest.fixture
def mock_yfinance_failure():
    """Mock yfinance for failed data retrieval"""
    with patch("yfinance.Ticker") as mock_ticker:
        mock_instance = Mock()
        mock_instance.history.return_value = pd.DataFrame()  # Empty dataframe
        mock_ticker.return_value = mock_instance
        yield mock_ticker


@pytest.fixture
def temp_model_storage():
    """Create temporary storage for model testing"""
    temp_dir = tempfile.mkdtemp()
    temp_file = os.path.join(temp_dir, "test_models.joblib")

    yield temp_file

    # Cleanup
    if os.path.exists(temp_file):
        os.remove(temp_file)
    os.rmdir(temp_dir)


@pytest.fixture
def ml_test_config():
    """Configuration for ML tests"""
    return {
        "min_accuracy_threshold": 0.45,
        "max_training_time": 30,  # seconds
        "max_prediction_time": 5,  # seconds
        "reasonable_price_change_limit": 20,  # percent
        "min_confidence": 0.1,
        "max_confidence": 0.95,
        "test_symbols": ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"],
        "model_types_to_test": [
            "random_forest",
            "gradient_boosting",
            "linear_regression",
        ],
        "horizons_to_test": ["1h", "1d", "1w", "1m"],
    }


@pytest.fixture
def performance_monitor():
    """Monitor performance metrics during tests"""

    class PerformanceMonitor:
        def __init__(self):
            self.metrics = {}
            self.start_times = {}

        def start_timing(self, operation):
            self.start_times[operation] = datetime.now()

        def end_timing(self, operation):
            if operation in self.start_times:
                duration = (
                    datetime.now() - self.start_times[operation]
                ).total_seconds()
                self.metrics[operation] = duration
                return duration
            return None

        def get_metrics(self):
            return self.metrics.copy()

        def assert_timing(self, operation, max_time):
            assert operation in self.metrics, f"No timing data for {operation}"
            actual_time = self.metrics[operation]
            assert (
                actual_time <= max_time
            ), f"{operation} took {actual_time}s, expected <= {max_time}s"

    return PerformanceMonitor()


# Test markers
pytest.mark.slow = pytest.mark.slow  # For slow tests
pytest.mark.integration = pytest.mark.integration  # For integration tests
pytest.mark.performance = pytest.mark.performance  # For performance tests

# Skip conditions
skip_if_no_network = pytest.mark.skipif(
    os.getenv("SKIP_NETWORK_TESTS") == "1", reason="Network tests disabled"
)

skip_if_slow = pytest.mark.skipif(
    os.getenv("SKIP_SLOW_TESTS") == "1", reason="Slow tests disabled"
)


# Test data validation
def validate_ohlcv_data(df):
    """Validate OHLCV data structure"""
    required_columns = ["Open", "High", "Low", "Close", "Volume"]
    assert all(
        col in df.columns for col in required_columns
    ), "Missing required OHLCV columns"

    # Basic sanity checks
    assert len(df) > 0, "Data should not be empty"
    assert (df["High"] >= df["Low"]).all(), "High should be >= Low"
    assert (df["High"] >= df["Open"]).all(), "High should be >= Open"
    assert (df["High"] >= df["Close"]).all(), "High should be >= Close"
    assert (df["Low"] <= df["Open"]).all(), "Low should be <= Open"
    assert (df["Low"] <= df["Close"]).all(), "Low should be <= Close"
    assert (df["Volume"] >= 0).all(), "Volume should be non-negative"
    assert df["Close"].notna().all(), "Close prices should not be NaN"

    return True


# Custom assertions
def assert_prediction_result(result):
    """Assert prediction result is valid"""
    assert result is not None, "Prediction result should not be None"
    assert hasattr(result, "symbol"), "Result should have symbol"
    assert hasattr(result, "current_price"), "Result should have current_price"
    assert hasattr(result, "predicted_price"), "Result should have predicted_price"
    assert hasattr(result, "confidence"), "Result should have confidence"
    assert hasattr(result, "direction"), "Result should have direction"

    # Value validation
    assert result.current_price > 0, "Current price should be positive"
    assert result.predicted_price > 0, "Predicted price should be positive"
    assert 0 <= result.confidence <= 1, "Confidence should be between 0 and 1"
    assert result.direction in [
        "up",
        "down",
        "stable",
    ], f"Invalid direction: {result.direction}"
    assert isinstance(result.symbol, str), "Symbol should be string"
    assert len(result.symbol) > 0, "Symbol should not be empty"


def assert_model_metrics(metrics):
    """Assert model metrics are valid"""
    assert metrics is not None, "Metrics should not be None"
    assert hasattr(metrics, "mse"), "Metrics should have MSE"
    assert hasattr(metrics, "mae"), "Metrics should have MAE"
    assert hasattr(metrics, "r2"), "Metrics should have R2"
    assert hasattr(metrics, "accuracy"), "Metrics should have accuracy"

    # Value validation
    assert metrics.mse >= 0, "MSE should be non-negative"
    assert metrics.mae >= 0, "MAE should be non-negative"
    assert 0 <= metrics.accuracy <= 1, "Accuracy should be between 0 and 1"
    # R2 can be negative, so no lower bound check
