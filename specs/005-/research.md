# Research: 機械学習株価予測システム

## Machine Learning Frameworks for Financial Prediction

**Decision**: scikit-learn + pandas for primary ML pipeline
**Rationale**: 
- Proven reliability in financial applications
- Extensive algorithm selection (Random Forest, SVM, Neural Networks)
- Native time-series support with rolling windows
- Efficient data preprocessing pipeline
- Lightweight for desktop deployment
**Alternatives considered**: 
- TensorFlow/PyTorch: Too heavy for local deployment, overkill for structured data
- XGBoost: Good performance but limited interpretability for investment decisions
- Prophet: Facebook's tool, but too specialized for time-series forecasting only

## Stock Data Features and Engineering

**Decision**: Comprehensive technical + fundamental feature set
**Rationale**:
- Technical indicators: SMA, EMA, RSI, MACD, Bollinger Bands (already implemented)
- Market sentiment: Volume analysis, price volatility, gap analysis
- Cross-stock correlation: Market index comparison, sector performance
- Temporal features: Day of week, month seasonality, market hours
- Target variable: Next-day price movement (classification) + exact price (regression)
**Alternatives considered**:
- Pure technical analysis: Limited predictive power without market context
- News sentiment: Too complex for initial implementation, API costs prohibitive
- Fundamental ratios: Requires earnings data, not available in current Yahoo Finance setup

## Model Architecture Strategy

**Decision**: Ensemble of multiple specialized models
**Rationale**:
- Short-term prediction (1-5 days): Random Forest for non-linear patterns
- Medium-term prediction (1-4 weeks): Linear Regression with regularization
- Long-term prediction (1-3 months): Support Vector Regression for trend following
- Meta-model: Weighted voting based on recent accuracy history
- Model confidence: Prediction interval estimation using ensemble variance
**Alternatives considered**:
- Single deep learning model: Black box approach, difficult to explain investment decisions
- Fixed ensemble weights: Less adaptive to changing market conditions
- Simple averaging: Ignores individual model strengths and weaknesses

## Market Anomaly Detection

**Decision**: Statistical anomaly detection + volatility thresholds
**Rationale**:
- Z-score analysis on price movements (>3 standard deviations = anomaly)
- Rolling volatility calculation (20-day window)
- Volume spike detection (>2x average volume)
- Market-wide correlation breakdown (when individual stocks decouple)
- Automatic model pause during detected anomalies
**Alternatives considered**:
- Isolation Forest: Good for unsupervised detection but computationally expensive
- News-based detection: Requires external APIs and sentiment analysis complexity
- Simple threshold rules: Too rigid for varying market conditions

## Model Persistence and Versioning

**Decision**: joblib serialization with SQLite metadata tracking
**Rationale**:
- joblib: Optimized for numpy/pandas objects, faster than pickle
- Model versioning: Track accuracy degradation over time
- Incremental training: Retrain on new data weekly
- A/B testing: Compare old vs new model performance before switching
- Rollback capability: Keep last 3 model versions for fallback
**Alternatives considered**:
- Cloud storage: Requires internet dependency, against offline requirement
- Database BLOB storage: Inefficient for large model files
- Simple pickle: Slower loading times, no built-in versioning

## Performance Optimization

**Decision**: Multi-level caching + lazy loading strategy
**Rationale**:
- Level 1: In-memory prediction cache (60s TTL)
- Level 2: Preprocessed feature cache (daily refresh) 
- Level 3: Raw data cache (existing Yahoo Finance cache)
- Background training: Train models during market close hours
- Feature parallelization: Concurrent indicator calculation per stock
**Alternatives considered**:
- Real-time everything: Too slow for 5-minute processing requirement
- Pre-compute all predictions: Storage intensive, predictions become stale quickly
- Single-threaded processing: Cannot meet performance goals for 100+ stocks

## Model Evaluation and Accuracy Tracking

**Decision**: Multi-metric evaluation with walk-forward validation
**Rationale**:
- Primary metric: Directional accuracy (buy/sell/hold correctness)
- Secondary metric: Mean Absolute Percentage Error for price prediction
- Profit simulation: Track hypothetical portfolio performance
- Walk-forward validation: Train on historical data, test on future periods
- Confidence intervals: Provide prediction uncertainty ranges
**Alternatives considered**:
- Simple accuracy: Doesn't account for magnitude of errors
- Static train/test split: Doesn't reflect time-series nature of financial data
- Cross-validation: Not appropriate for time-ordered financial data

## Data Quality and Validation

**Decision**: Multi-stage data quality pipeline
**Rationale**:
- Data completeness check: Verify no missing trading days
- Outlier detection: Flag and investigate extreme price movements
- Consistency validation: Ensure OHLC relationships (Open ≤ High, Low ≤ Close, etc.)
- Market holiday handling: Skip predictions on known non-trading days
- Data freshness: Alert if data older than expected trading schedule
**Alternatives considered**:
- Accept all data: Risk of training on erroneous data points
- Manual review: Not scalable for 100+ stocks
- Simple filtering: May remove legitimate extreme market movements

## Integration with Existing System

**Decision**: Extend current StockVision architecture
**Rationale**:
- Reuse existing Yahoo Finance integration and caching
- Add ML prediction service as new FastAPI endpoint
- Enhance existing TradingRecommendation component with ML results
- Preserve current technical analysis as fallback option
- Store ML models alongside existing SQLite database
**Alternatives considered**:
- Complete rewrite: Wasteful of existing working components
- Separate ML microservice: Adds complexity without clear benefits for desktop app
- Replace existing analysis: Current rule-based system provides valuable baseline

## UI/UX Design for ML Predictions

**Decision**: Progressive disclosure with confidence visualization
**Rationale**:
- Main view: Clear buy/sell/hold recommendation with confidence percentage
- Detailed view: Model breakdown (short/medium/long-term predictions)
- Historical view: Track record of predictions vs actual outcomes  
- Explanation view: Feature importance and decision reasoning
- Risk warnings: Prominent display when confidence is low or market anomalies detected
**Alternatives considered**:
- Technical jargon: Too complex for general investors
- Simplified binary: Loses valuable confidence information
- Dashboard overload: Too much information reduces decision-making speed

## Deployment and Maintenance Strategy

**Decision**: Local-first with optional cloud sync
**Rationale**:
- Primary: All models stored and run locally
- Optional: Cloud backup of model performance history
- Auto-update: Download new model improvements during idle time
- Graceful degradation: Fall back to rule-based analysis if ML models fail
- User control: Allow disabling ML predictions if preferred
**Alternatives considered**:
- Cloud-only: Requires constant internet connection
- Manual updates: Users won't maintain models properly
- No fallback: System becomes unusable if ML components fail