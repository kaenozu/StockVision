"""
Common API types and interfaces for StockVision
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

# === Common Response Types ===


class APIResponse(BaseModel):
    """Base API response model"""

    success: bool = True
    message: str = ""
    timestamp: datetime = Field(default_factory=datetime.now)


class ErrorResponse(APIResponse):
    """Error response model"""

    success: bool = False
    error_code: str
    details: Optional[Dict[str, Any]] = None


# === Stock-related Types ===


class StockPrice(BaseModel):
    """Stock price data model"""

    current: float
    change: float
    changePercent: float
    dayHigh: Optional[float] = None
    dayLow: Optional[float] = None
    volume: int


class StockInfo(BaseModel):
    """Basic stock information"""

    symbol: str
    name: str
    price: StockPrice


# === Recommendation Types ===


class RecommendationSignal(str, Enum):
    """Recommendation signal types"""

    BUY = "buy"
    HOLD = "hold"
    SELL = "sell"


class TechnicalIndicators(BaseModel):
    """Technical analysis indicators"""

    rsi: Optional[float] = None
    sma20: Optional[float] = None
    sma50: Optional[float] = None
    current_price: float
    price_change: float
    price_change_pct: float
    volume_ratio: Optional[float] = None
    price_vs_sma20: Optional[float] = None
    price_vs_sma50: Optional[float] = None


class RecommendationData(BaseModel):
    """Stock recommendation data"""

    symbol: str
    signal: RecommendationSignal
    confidence: float
    reasoning: str
    targetPrice: Optional[float] = None
    stopLoss: Optional[float] = None
    timeHorizon: str = "medium_term"
    riskLevel: str = "medium"
    validUntil: datetime = Field(default_factory=lambda: datetime.now())
    technical_indicators: Optional[TechnicalIndicators] = None


class RecommendedStock(BaseModel):
    """Complete recommended stock information"""

    symbol: str
    name: str
    price: StockPrice
    recommendation: RecommendationData


# === ML Prediction Types ===


class PredictionHorizon(str, Enum):
    """Prediction time horizons"""

    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ModelType(str, Enum):
    """ML model types"""

    RANDOM_FOREST = "random_forest"
    LSTM = "lstm"
    GRU = "gru"
    LINEAR_REGRESSION = "linear_regression"


class PredictionData(BaseModel):
    """ML prediction data"""

    predicted_price: float
    predicted_return: float
    confidence: float
    prediction: float
    weight: float = 1.0


class EnsemblePrediction(BaseModel):
    """Ensemble prediction results"""

    predicted_price: float
    predicted_return: float
    confidence_score: float


class MLPredictionResponse(BaseModel):
    """ML prediction API response"""

    stock_code: str
    prediction_date: str
    target_date: str
    predictions: Dict[str, PredictionData]
    ensemble_prediction: EnsemblePrediction
    anomaly_status: Dict[str, Any]
    risk_assessment: Dict[str, Any]


# === Performance/Metrics Types ===


class PerformanceMetrics(BaseModel):
    """System performance metrics"""

    request_count: int = 0
    average_response_time: float = 0.0
    error_rate: float = 0.0
    slow_requests: int = 0
    cache_hit_rate: float = 0.0


class EndpointMetrics(BaseModel):
    """Per-endpoint performance metrics"""

    endpoint: str
    method: str
    count: int
    avg_time: float
    max_time: float
    min_time: float
    error_count: int


# === Pagination Types ===


class PaginationParams(BaseModel):
    """Pagination parameters"""

    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(20, ge=1, le=100, description="Items per page")


class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""

    items: List[Any]
    total: int
    page: int
    limit: int
    pages: int


# === Utility Functions ===


def create_success_response(data: Any, message: str = "Success") -> Dict[str, Any]:
    """Create standardized success response"""
    return {
        "success": True,
        "message": message,
        "data": data,
        "timestamp": datetime.now().isoformat(),
    }


def create_error_response(
    error_code: str, message: str, details: Optional[Dict] = None
) -> ErrorResponse:
    """Create standardized error response"""
    return ErrorResponse(error_code=error_code, message=message, details=details)
