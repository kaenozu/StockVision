# Data Model: 機械学習株価予測システム

## Core Entities

### PredictionModel
**Purpose**: Represents trained machine learning models
```python
class PredictionModel:
    id: int                          # Primary key
    name: str                        # Model identifier (e.g., "random_forest_short_term")
    model_type: str                  # "short_term" | "medium_term" | "long_term"
    algorithm: str                   # "random_forest" | "linear_regression" | "svr"
    version: str                     # Semantic versioning (1.0.0)
    accuracy_score: float            # Latest accuracy percentage (0.0-1.0)
    training_data_start: date        # Training period start
    training_data_end: date          # Training period end  
    created_at: datetime             # Model creation timestamp
    last_trained: datetime           # Last training execution
    model_file_path: str             # Path to serialized model file
    feature_names: List[str]         # List of input features
    is_active: bool                  # Whether model is currently used
    performance_metrics: dict        # JSON with detailed metrics
```

**Validation Rules**:
- accuracy_score must be between 0.0 and 1.0
- model_file_path must exist and be readable
- Only one model per (model_type, algorithm) can be active
- version must follow semantic versioning pattern

**State Transitions**:
- training → trained → active → retired
- active → retraining → trained → active

### PredictionResult  
**Purpose**: Stores individual prediction outcomes
```python
class PredictionResult:
    id: int                          # Primary key
    stock_code: str                  # Stock symbol (e.g., "7203")
    model_id: int                    # Foreign key to PredictionModel
    prediction_date: date            # When prediction was made
    target_date: date                # What date the prediction is for
    predicted_price: float           # Predicted stock price
    predicted_action: str            # "buy" | "sell" | "hold"
    confidence_score: float          # Confidence percentage (0.0-1.0)
    actual_price: float              # Actual price (null until target_date)
    actual_action: str               # Actual optimal action (null until evaluated)
    accuracy_flag: bool              # Whether prediction was correct (null until evaluated)
    error_percentage: float          # Absolute percentage error (null until evaluated)
    features_used: dict              # JSON snapshot of input features
    created_at: datetime             # Record creation timestamp
```

**Validation Rules**:
- prediction_date must be <= target_date
- confidence_score between 0.0 and 1.0
- predicted_action in ["buy", "sell", "hold"]
- actual_price/actual_action/accuracy_flag remain null until evaluation

**Relationships**:
- Many PredictionResult → One PredictionModel
- One PredictionResult → One Stock (via stock_code)

### TrainingDataset
**Purpose**: Manages training data quality and versions
```python
class TrainingDataset:
    id: int                          # Primary key
    stock_code: str                  # Stock symbol
    data_start_date: date            # Dataset start date
    data_end_date: date              # Dataset end date
    total_records: int               # Number of data points
    missing_records: int             # Number of missing/incomplete records
    quality_score: float             # Data quality percentage (0.0-1.0)
    feature_columns: List[str]       # List of feature column names
    target_columns: List[str]        # List of target column names
    last_updated: datetime           # Last data refresh
    data_file_path: str              # Path to processed dataset file
    validation_errors: dict          # JSON with data quality issues
```

**Validation Rules**:
- data_start_date < data_end_date
- total_records >= missing_records
- quality_score = (total_records - missing_records) / total_records
- feature_columns must not be empty
- data_file_path must exist and be readable

### AccuracyHistory
**Purpose**: Tracks prediction performance over time
```python
class AccuracyHistory:
    id: int                          # Primary key
    model_id: int                    # Foreign key to PredictionModel
    evaluation_date: date            # When accuracy was calculated
    total_predictions: int           # Number of predictions evaluated
    correct_predictions: int         # Number of correct predictions
    accuracy_percentage: float       # correct_predictions / total_predictions * 100
    avg_error_percentage: float      # Average absolute error for price predictions
    profit_simulation: float         # Hypothetical profit if following recommendations
    precision_buy: float             # Precision for "buy" predictions
    precision_sell: float            # Precision for "sell" predictions
    precision_hold: float            # Precision for "hold" predictions
    recall_buy: float                # Recall for "buy" predictions
    recall_sell: float               # Recall for "sell" predictions
    recall_hold: float               # Recall for "hold" predictions
    f1_score: float                  # Overall F1 score
    evaluation_period_days: int      # Number of days evaluated
```

**Validation Rules**:
- correct_predictions <= total_predictions
- accuracy_percentage = (correct_predictions / total_predictions) * 100
- All precision/recall/f1_score values between 0.0 and 1.0
- evaluation_period_days > 0

### MarketAnomalyDetection
**Purpose**: Identifies unusual market conditions
```python
class MarketAnomalyDetection:
    id: int                          # Primary key
    detection_date: date             # When anomaly was detected
    anomaly_type: str                # "high_volatility" | "volume_spike" | "correlation_breakdown" | "gap_event"
    severity_level: str              # "low" | "medium" | "high" | "critical"
    affected_stocks: List[str]       # List of stock codes affected
    detection_metrics: dict          # JSON with specific anomaly measurements
    model_pause_recommended: bool    # Whether to pause predictions
    resolution_date: date            # When anomaly condition resolved (null if ongoing)
    notes: str                       # Additional context or explanation
    created_at: datetime             # Detection timestamp
```

**Validation Rules**:
- anomaly_type in ["high_volatility", "volume_spike", "correlation_breakdown", "gap_event"]
- severity_level in ["low", "medium", "high", "critical"]  
- detection_date <= resolution_date (if resolution_date is not null)
- affected_stocks must not be empty

### ModelPerformanceLog
**Purpose**: Detailed performance tracking for model monitoring
```python
class ModelPerformanceLog:
    id: int                          # Primary key
    model_id: int                    # Foreign key to PredictionModel
    log_date: datetime               # Performance measurement timestamp
    operation_type: str              # "training" | "prediction" | "evaluation"
    execution_time_seconds: float    # How long operation took
    memory_usage_mb: float           # Peak memory usage during operation
    cpu_usage_percent: float         # Average CPU usage during operation
    records_processed: int           # Number of data records processed
    success: bool                    # Whether operation completed successfully
    error_message: str               # Error details if success=False
    system_metrics: dict             # JSON with additional system info
```

**Validation Rules**:
- operation_type in ["training", "prediction", "evaluation"]
- execution_time_seconds >= 0.0
- memory_usage_mb >= 0.0  
- cpu_usage_percent between 0.0 and 100.0
- records_processed >= 0

## Entity Relationships

```
PredictionModel (1) ←→ (Many) PredictionResult
PredictionModel (1) ←→ (Many) AccuracyHistory  
PredictionModel (1) ←→ (Many) ModelPerformanceLog
Stock (1) ←→ (Many) PredictionResult
Stock (1) ←→ (Many) TrainingDataset
```

## Feature Schema

### Input Features for ML Models
```python
class StockFeatures:
    # Basic OHLCV
    open_price: float
    high_price: float  
    low_price: float
    close_price: float
    volume: int
    
    # Technical Indicators (existing)
    sma_5: float
    sma_20: float
    sma_50: float
    ema_12: float
    ema_26: float
    rsi: float
    macd: float
    macd_signal: float
    bollinger_upper: float
    bollinger_lower: float
    
    # Additional Technical Features
    price_change_1d: float           # 1-day price change percentage
    price_change_5d: float           # 5-day price change percentage  
    volatility_10d: float            # 10-day rolling volatility
    volume_ratio: float              # Current volume / 20-day average volume
    gap_percentage: float            # Opening gap from previous close
    
    # Market Context
    market_index_change: float       # Nikkei/DOW change percentage same day
    sector_performance: float        # Sector ETF performance
    correlation_to_market: float     # 30-day correlation coefficient
    
    # Temporal Features  
    day_of_week: int                 # 1=Monday, 5=Friday
    month_of_year: int               # 1=January, 12=December
    is_month_end: bool               # Last 3 trading days of month
    is_earnings_season: bool         # Estimated earnings announcement proximity
```

### Target Variables
```python
class PredictionTargets:
    # Classification Target
    next_day_action: str             # "buy" | "sell" | "hold" based on 2%+ movement
    
    # Regression Targets  
    next_day_price: float            # Actual next day closing price
    next_5day_price: float           # 5-day ahead closing price
    next_20day_price: float          # 20-day ahead closing price
    
    # Risk Metrics
    max_drawdown_5d: float           # Maximum loss within next 5 days
    profit_potential_5d: float       # Maximum gain within next 5 days
```

## Data Storage Strategy

### File System Layout
```
models/
├── active/                          # Currently deployed models
│   ├── short_term_rf_v1.2.1.joblib
│   ├── medium_term_lr_v1.1.0.joblib
│   └── long_term_svr_v1.0.3.joblib
├── archive/                         # Retired model versions
└── training_data/                   # Processed datasets
    ├── features_2024_Q1.parquet
    ├── features_2024_Q2.parquet  
    └── labels_2024_Q1.parquet
```

### Database Indices
```sql
-- Performance optimization indices
CREATE INDEX idx_prediction_stock_date ON PredictionResult(stock_code, prediction_date);
CREATE INDEX idx_model_active ON PredictionModel(is_active, model_type);
CREATE INDEX idx_accuracy_model_date ON AccuracyHistory(model_id, evaluation_date);
CREATE INDEX idx_anomaly_date_severity ON MarketAnomalyDetection(detection_date, severity_level);
```

## Data Migration Strategy

### Version 1.0.0 → 1.1.0
1. Add new columns to existing tables
2. Populate feature_names for existing PredictionModel records  
3. Migrate existing prediction accuracy data to new AccuracyHistory format
4. Create indices for performance optimization

### Data Retention Policy
- PredictionResult: Keep 2 years of predictions
- AccuracyHistory: Keep all historical accuracy data (critical for model improvement)
- ModelPerformanceLog: Keep 6 months of performance logs
- MarketAnomalyDetection: Keep all anomaly data (rare events, valuable for analysis)
- TrainingDataset: Keep metadata, archive actual data files older than 1 year