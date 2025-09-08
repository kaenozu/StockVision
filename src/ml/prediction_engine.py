"""
Machine Learning Stock Price Prediction Engine
Advanced ML models for stock price forecasting
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import joblib
import yfinance as yf

# ML imports
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split, GridSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class ModelType(Enum):
    """Available prediction model types"""
    RANDOM_FOREST = "random_forest"
    GRADIENT_BOOSTING = "gradient_boosting"
    LINEAR_REGRESSION = "linear_regression"
    RIDGE_REGRESSION = "ridge_regression"
    LSTM = "lstm"
    ENSEMBLE = "ensemble"

class PredictionHorizon(Enum):
    """Prediction time horizons"""
    INTRADAY = "1h"
    DAILY = "1d" 
    WEEKLY = "1w"
    MONTHLY = "1m"
    QUARTERLY = "3m"

@dataclass
class PredictionResult:
    """Stock price prediction result"""
    symbol: str
    current_price: float
    predicted_price: float
    confidence: float
    direction: str  # 'up', 'down', 'stable'
    change_percent: float
    horizon: str
    model_used: str
    features_used: List[str]
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class ModelMetrics:
    """Model performance metrics"""
    mse: float
    mae: float
    r2: float
    accuracy: float  # directional accuracy
    sharpe_ratio: Optional[float] = None

class FeatureEngine:
    """Feature engineering for stock prediction"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.price_scaler = MinMaxScaler()
        
    def create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create technical indicators and features"""
        df = df.copy()
        
        # Basic price features
        df['returns'] = df['Close'].pct_change()
        df['log_returns'] = np.log(df['Close'] / df['Close'].shift(1))
        df['price_range'] = (df['High'] - df['Low']) / df['Close']
        df['volume_change'] = df['Volume'].pct_change()
        
        # Moving averages
        for window in [5, 10, 20, 50, 200]:
            df[f'sma_{window}'] = df['Close'].rolling(window=window).mean()
            df[f'close_sma_{window}'] = df['Close'] / df[f'sma_{window}'] - 1
            
        # Exponential moving averages
        for span in [12, 26]:
            df[f'ema_{span}'] = df['Close'].ewm(span=span).mean()
            
        # MACD
        df['macd'] = df['ema_12'] - df['ema_26']
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_histogram'] = df['macd'] - df['macd_signal']
        
        # RSI
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # Bollinger Bands
        df['bb_middle'] = df['Close'].rolling(window=20).mean()
        bb_std = df['Close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        df['bb_position'] = (df['Close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # Stochastic
        low_min = df['Low'].rolling(window=14).min()
        high_max = df['High'].rolling(window=14).max()
        df['stoch_k'] = 100 * (df['Close'] - low_min) / (high_max - low_min)
        df['stoch_d'] = df['stoch_k'].rolling(window=3).mean()
        
        # Williams %R
        df['williams_r'] = -100 * (high_max - df['Close']) / (high_max - low_min)
        
        # Average True Range (ATR)
        df['prev_close'] = df['Close'].shift(1)
        df['tr1'] = df['High'] - df['Low']
        df['tr2'] = abs(df['High'] - df['prev_close'])
        df['tr3'] = abs(df['Low'] - df['prev_close'])
        df['true_range'] = df[['tr1', 'tr2', 'tr3']].max(axis=1)
        df['atr'] = df['true_range'].rolling(window=14).mean()
        
        # Volume indicators
        df['volume_sma'] = df['Volume'].rolling(window=20).mean()
        df['volume_ratio'] = df['Volume'] / df['volume_sma']
        
        # On-Balance Volume
        df['obv'] = (np.sign(df['returns']) * df['Volume']).cumsum()
        df['obv_sma'] = df['obv'].rolling(window=20).mean()
        
        # Price momentum
        for period in [1, 3, 5, 10, 20]:
            df[f'momentum_{period}'] = df['Close'] / df['Close'].shift(period) - 1
            
        # Volatility
        for window in [5, 10, 20]:
            df[f'volatility_{window}'] = df['returns'].rolling(window=window).std()
            
        # Lag features
        for lag in [1, 2, 3, 5]:
            df[f'close_lag_{lag}'] = df['Close'].shift(lag)
            df[f'volume_lag_{lag}'] = df['Volume'].shift(lag)
            df[f'returns_lag_{lag}'] = df['returns'].shift(lag)
            
        # Drop helper columns
        df = df.drop(['prev_close', 'tr1', 'tr2', 'tr3', 'true_range'], axis=1, errors='ignore')
        
        return df
        
    def prepare_features(self, df: pd.DataFrame, target_col: str = 'Close') -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare features and target for training"""
        df_features = self.create_features(df)
        
        # Create target (next day's closing price)
        df_features['target'] = df_features[target_col].shift(-1)
        
        # Remove rows with NaN values
        df_clean = df_features.dropna()
        
        # Separate features and target
        feature_columns = [col for col in df_clean.columns if col not in ['target', 'Open', 'High', 'Low', 'Close', 'Volume']]
        X = df_clean[feature_columns]
        y = df_clean['target']
        
        return X, y

class StockPredictionEngine:
    """Main stock price prediction engine"""
    
    def __init__(self):
        self.models = {}
        self.feature_engine = FeatureEngine()
        self.model_metrics = {}
        self.trained_symbols = set()
        
        # Initialize models
        self._initialize_models()
        
    def _initialize_models(self):
        """Initialize ML models"""
        self.models = {
            ModelType.RANDOM_FOREST: RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            ),
            ModelType.GRADIENT_BOOSTING: GradientBoostingRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=6,
                random_state=42
            ),
            ModelType.LINEAR_REGRESSION: LinearRegression(),
            ModelType.RIDGE_REGRESSION: Ridge(alpha=1.0)
        }
        
    async def train_model(
        self, 
        symbol: str, 
        model_type: ModelType = ModelType.RANDOM_FOREST,
        period: str = "2y"
    ) -> bool:
        """Train prediction model for a symbol"""
        try:
            logger.info(f"Training {model_type.value} model for {symbol}")
            
            # Fetch data
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval="1d")
            
            if df.empty:
                logger.error(f"No data available for {symbol}")
                return False
                
            # Prepare features
            X, y = self.feature_engine.prepare_features(df)
            
            if X.empty:
                logger.error(f"No features generated for {symbol}")
                return False
                
            # Split data (time series split)
            tscv = TimeSeriesSplit(n_splits=5)
            split_idx = list(tscv.split(X))[-1]  # Use last split
            train_idx, test_idx = split_idx
            
            X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
            y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
            
            # Scale features
            X_train_scaled = self.feature_engine.scaler.fit_transform(X_train)
            X_test_scaled = self.feature_engine.scaler.transform(X_test)
            
            # Train model
            model = self.models[model_type]
            model.fit(X_train_scaled, y_train)
            
            # Evaluate model
            y_pred = model.predict(X_test_scaled)
            metrics = self._calculate_metrics(y_test, y_pred, X_test.index, df.loc[X_test.index, 'Close'])
            
            # Store model and metrics
            model_key = f"{symbol}_{model_type.value}"
            self.models[model_key] = model
            self.model_metrics[model_key] = metrics
            self.trained_symbols.add(symbol)
            
            logger.info(f"Model trained for {symbol}. R2: {metrics.r2:.3f}, Accuracy: {metrics.accuracy:.3f}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to train model for {symbol}: {e}")
            return False
            
    async def predict_price(
        self,
        symbol: str,
        horizon: PredictionHorizon = PredictionHorizon.DAILY,
        model_type: ModelType = ModelType.RANDOM_FOREST
    ) -> Optional[PredictionResult]:
        """Predict stock price for given horizon"""
        try:
            model_key = f"{symbol}_{model_type.value}"
            
            # Check if model exists
            if model_key not in self.models:
                logger.warning(f"No trained model for {symbol}. Training new model...")
                success = await self.train_model(symbol, model_type)
                if not success:
                    return None
                    
            model = self.models[model_key]
            
            # Get recent data
            ticker = yf.Ticker(symbol)
            df = ticker.history(period="1y", interval="1d")
            
            if df.empty:
                logger.error(f"No recent data for {symbol}")
                return None
                
            # Prepare features for latest data point
            df_features = self.feature_engine.create_features(df)
            latest_data = df_features.iloc[-1:]
            
            # Remove non-feature columns
            feature_columns = [col for col in df_features.columns 
                             if col not in ['Open', 'High', 'Low', 'Close', 'Volume']]
            X_latest = latest_data[feature_columns]
            
            # Handle NaN values
            X_latest = X_latest.fillna(X_latest.mean())
            
            # Scale features
            X_latest_scaled = self.feature_engine.scaler.transform(X_latest)
            
            # Make prediction
            predicted_price = model.predict(X_latest_scaled)[0]
            current_price = df['Close'].iloc[-1]
            
            # Calculate confidence and direction
            change_percent = (predicted_price - current_price) / current_price * 100
            direction = 'up' if change_percent > 0.5 else 'down' if change_percent < -0.5 else 'stable'
            
            # Get model metrics for confidence
            metrics = self.model_metrics.get(model_key)
            confidence = metrics.accuracy if metrics else 0.5
            
            # Get feature importance
            if hasattr(model, 'feature_importances_'):
                feature_importance = dict(zip(feature_columns, model.feature_importances_))
                top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:5]
                features_used = [f[0] for f in top_features]
            else:
                features_used = feature_columns[:5]
                
            result = PredictionResult(
                symbol=symbol,
                current_price=float(current_price),
                predicted_price=float(predicted_price),
                confidence=float(confidence),
                direction=direction,
                change_percent=float(change_percent),
                horizon=horizon.value,
                model_used=model_type.value,
                features_used=features_used,
                timestamp=datetime.now(),
                metadata={
                    'data_points': len(df),
                    'last_update': df.index[-1].isoformat(),
                    'model_metrics': asdict(metrics) if metrics else None
                }
            )
            
            logger.info(f"Prediction for {symbol}: {predicted_price:.2f} ({change_percent:+.2f}%)")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to predict price for {symbol}: {e}")
            return None
            
    async def batch_predict(
        self, 
        symbols: List[str],
        horizon: PredictionHorizon = PredictionHorizon.DAILY,
        model_type: ModelType = ModelType.RANDOM_FOREST
    ) -> List[PredictionResult]:
        """Predict prices for multiple symbols"""
        results = []
        
        for symbol in symbols:
            try:
                result = await self.predict_price(symbol, horizon, model_type)
                if result:
                    results.append(result)
            except Exception as e:
                logger.error(f"Failed to predict for {symbol}: {e}")
                continue
                
        return results
        
    async def get_ensemble_prediction(
        self,
        symbol: str,
        horizon: PredictionHorizon = PredictionHorizon.DAILY
    ) -> Optional[PredictionResult]:
        """Get ensemble prediction using multiple models"""
        try:
            predictions = []
            confidences = []
            
            # Get predictions from different models
            for model_type in [ModelType.RANDOM_FOREST, ModelType.GRADIENT_BOOSTING, ModelType.RIDGE_REGRESSION]:
                try:
                    pred = await self.predict_price(symbol, horizon, model_type)
                    if pred:
                        predictions.append(pred.predicted_price)
                        confidences.append(pred.confidence)
                except Exception as e:
                    logger.warning(f"Failed to get {model_type.value} prediction: {e}")
                    continue
                    
            if not predictions:
                return None
                
            # Calculate weighted average
            weights = np.array(confidences)
            weights = weights / weights.sum()
            
            ensemble_price = np.average(predictions, weights=weights)
            ensemble_confidence = np.mean(confidences)
            
            # Get current price for comparison
            ticker = yf.Ticker(symbol)
            current_data = ticker.history(period="1d", interval="1d")
            current_price = current_data['Close'].iloc[-1]
            
            change_percent = (ensemble_price - current_price) / current_price * 100
            direction = 'up' if change_percent > 0.5 else 'down' if change_percent < -0.5 else 'stable'
            
            result = PredictionResult(
                symbol=symbol,
                current_price=float(current_price),
                predicted_price=float(ensemble_price),
                confidence=float(ensemble_confidence),
                direction=direction,
                change_percent=float(change_percent),
                horizon=horizon.value,
                model_used="ensemble",
                features_used=["ensemble_of_models"],
                timestamp=datetime.now(),
                metadata={
                    'models_used': len(predictions),
                    'individual_predictions': predictions,
                    'individual_confidences': confidences,
                    'weights': weights.tolist()
                }
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get ensemble prediction for {symbol}: {e}")
            return None
            
    def _calculate_metrics(self, y_true, y_pred, dates, actual_prices) -> ModelMetrics:
        """Calculate model performance metrics"""
        # Basic regression metrics
        mse = mean_squared_error(y_true, y_pred)
        mae = mean_absolute_error(y_true, y_pred)
        r2 = r2_score(y_true, y_pred)
        
        # Directional accuracy
        actual_directions = np.sign(y_true - actual_prices.shift(1).loc[y_true.index])
        predicted_directions = np.sign(y_pred - actual_prices.shift(1).loc[y_true.index])
        accuracy = np.mean(actual_directions == predicted_directions)
        
        # Calculate returns-based Sharpe ratio (simplified)
        try:
            predicted_returns = (y_pred - actual_prices.loc[y_true.index]) / actual_prices.loc[y_true.index]
            sharpe_ratio = np.mean(predicted_returns) / np.std(predicted_returns) if np.std(predicted_returns) > 0 else 0
        except:
            sharpe_ratio = None
            
        return ModelMetrics(
            mse=mse,
            mae=mae,
            r2=r2,
            accuracy=accuracy,
            sharpe_ratio=sharpe_ratio
        )
        
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about trained models"""
        return {
            "trained_symbols": list(self.trained_symbols),
            "available_models": [model_type.value for model_type in ModelType],
            "model_metrics": {
                key: asdict(metrics) for key, metrics in self.model_metrics.items()
            },
            "total_models": len([k for k in self.models.keys() if '_' in k])  # Count symbol-specific models
        }
        
    async def retrain_models(self, symbols: Optional[List[str]] = None):
        """Retrain models for symbols (or all if none specified)"""
        symbols_to_train = symbols or list(self.trained_symbols)
        
        for symbol in symbols_to_train:
            try:
                await self.train_model(symbol)
                logger.info(f"Retrained model for {symbol}")
            except Exception as e:
                logger.error(f"Failed to retrain model for {symbol}: {e}")
                
    def save_models(self, filepath: str):
        """Save trained models to disk"""
        try:
            model_data = {
                'models': self.models,
                'metrics': self.model_metrics,
                'trained_symbols': self.trained_symbols,
                'scaler': self.feature_engine.scaler,
                'timestamp': datetime.now().isoformat()
            }
            
            joblib.dump(model_data, filepath)
            logger.info(f"Models saved to {filepath}")
            
        except Exception as e:
            logger.error(f"Failed to save models: {e}")
            
    def load_models(self, filepath: str):
        """Load trained models from disk"""
        try:
            model_data = joblib.load(filepath)
            
            self.models = model_data['models']
            self.model_metrics = model_data['metrics']
            self.trained_symbols = model_data['trained_symbols']
            self.feature_engine.scaler = model_data['scaler']
            
            logger.info(f"Models loaded from {filepath}")
            
        except Exception as e:
            logger.error(f"Failed to load models: {e}")

# Global prediction engine instance
prediction_engine = StockPredictionEngine()