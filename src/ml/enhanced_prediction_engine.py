"""
Enhanced Machine Learning Stock Price Prediction Engine
Improved accuracy through ensemble methods and advanced features
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import joblib
import asyncio

# ML imports
from sklearn.ensemble import (
    RandomForestRegressor, 
    GradientBoostingRegressor,
    VotingRegressor,
    BaggingRegressor
)
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.svm import SVR
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.model_selection import TimeSeriesSplit, GridSearchCV, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.feature_selection import SelectKBest, f_regression, RFE
import warnings
warnings.filterwarnings('ignore')

# Import base classes and stock service
from .prediction_engine import (
    ModelType, PredictionHorizon, PredictionResult, ModelMetrics, FeatureEngine
)
from ..services.stock_service import get_stock_service

logger = logging.getLogger(__name__)

class EnhancedModelType(Enum):
    """Enhanced model types with ensemble methods"""
    RANDOM_FOREST = "random_forest"
    GRADIENT_BOOSTING = "gradient_boosting"
    LINEAR_REGRESSION = "linear_regression"
    RIDGE_REGRESSION = "ridge_regression"
    LASSO_REGRESSION = "lasso_regression"
    ELASTIC_NET = "elastic_net"
    SVR = "svr"
    MLP = "mlp"
    ENSEMBLE_VOTING = "ensemble_voting"
    ENSEMBLE_BAGGING = "ensemble_bagging"
    ENSEMBLE_STACKING = "ensemble_stacking"

@dataclass
class EnhancedModelMetrics:
    """Extended model performance metrics"""
    mse: float
    mae: float
    r2: float
    accuracy: float  # directional accuracy
    sharpe_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    hit_rate: Optional[float] = None
    avg_return: Optional[float] = None
    volatility: Optional[float] = None
    information_ratio: Optional[float] = None

class EnhancedFeatureEngine(FeatureEngine):
    """Enhanced feature engineering with advanced indicators"""
    
    def __init__(self):
        super().__init__()
        self.feature_selector = None
        self.selected_features = []
        
    def create_advanced_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create advanced technical indicators"""
        df = df.copy()
        
        # Base features from parent class
        df = self.create_features(df)
        
        # Fractals and support/resistance
        df['fractal_high'] = self._identify_fractals(df['High'], 'high')
        df['fractal_low'] = self._identify_fractals(df['Low'], 'low')
        
        # Ichimoku Cloud components
        high_9 = df['High'].rolling(window=9).max()
        low_9 = df['Low'].rolling(window=9).min()
        high_26 = df['High'].rolling(window=26).max()
        low_26 = df['Low'].rolling(window=26).min()
        high_52 = df['High'].rolling(window=52).max()
        low_52 = df['Low'].rolling(window=52).min()
        
        df['tenkan_sen'] = (high_9 + low_9) / 2
        df['kijun_sen'] = (high_26 + low_26) / 2
        df['senkou_span_a'] = ((df['tenkan_sen'] + df['kijun_sen']) / 2).shift(26)
        df['senkou_span_b'] = ((high_52 + low_52) / 2).shift(26)
        df['chikou_span'] = df['Close'].shift(-26)
        
        # Price pattern features
        df['doji'] = self._identify_doji(df)
        df['hammer'] = self._identify_hammer(df)
        df['shooting_star'] = self._identify_shooting_star(df)
        
        # Market microstructure features
        df['bid_ask_spread'] = (df['High'] - df['Low']) / df['Close']  # Proxy
        df['tick_rule'] = np.where(df['Close'] > df['Close'].shift(1), 1, 
                                 np.where(df['Close'] < df['Close'].shift(1), -1, 0))
        
        # Regime detection features
        df['volatility_regime'] = self._detect_volatility_regime(df)
        df['trend_regime'] = self._detect_trend_regime(df)
        
        # Cross-sectional features (if market data available)
        df['relative_strength'] = df['returns'] / df['returns'].rolling(window=20).std()
        
        # Seasonal features
        df['day_of_week'] = pd.to_datetime(df.index).dayofweek
        df['month'] = pd.to_datetime(df.index).month
        df['quarter'] = pd.to_datetime(df.index).quarter
        
        # Advanced momentum indicators
        for window in [14, 21, 50]:
            df[f'roc_{window}'] = ((df['Close'] - df['Close'].shift(window)) / df['Close'].shift(window)) * 100
            df[f'trix_{window}'] = df['Close'].ewm(span=window).mean().ewm(span=window).mean().ewm(span=window).mean().pct_change()
        
        # Mean reversion indicators
        df['price_distance_sma20'] = (df['Close'] - df['sma_20']) / df['sma_20']
        df['price_distance_ema12'] = (df['Close'] - df['ema_12']) / df['ema_12']
        
        return df
    
    def _identify_fractals(self, series: pd.Series, fractal_type: str) -> pd.Series:
        """Identify fractal highs and lows"""
        fractals = pd.Series(0, index=series.index)
        
        for i in range(2, len(series) - 2):
            if fractal_type == 'high':
                if (series.iloc[i] > series.iloc[i-1] and 
                    series.iloc[i] > series.iloc[i+1] and
                    series.iloc[i] > series.iloc[i-2] and 
                    series.iloc[i] > series.iloc[i+2]):
                    fractals.iloc[i] = 1
            else:  # low
                if (series.iloc[i] < series.iloc[i-1] and 
                    series.iloc[i] < series.iloc[i+1] and
                    series.iloc[i] < series.iloc[i-2] and 
                    series.iloc[i] < series.iloc[i+2]):
                    fractals.iloc[i] = 1
        
        return fractals
    
    def _identify_doji(self, df: pd.DataFrame) -> pd.Series:
        """Identify doji candlestick patterns"""
        body_size = abs(df['Close'] - df['Open']) / df['Close']
        return (body_size < 0.01).astype(int)
    
    def _identify_hammer(self, df: pd.DataFrame) -> pd.Series:
        """Identify hammer candlestick patterns"""
        body_size = abs(df['Close'] - df['Open'])
        lower_shadow = df[['Open', 'Close']].min(axis=1) - df['Low']
        upper_shadow = df['High'] - df[['Open', 'Close']].max(axis=1)
        
        hammer = (
            (lower_shadow > 2 * body_size) & 
            (upper_shadow < 0.5 * body_size) & 
            (df['Close'] > df['Open'])
        ).astype(int)
        
        return hammer
    
    def _identify_shooting_star(self, df: pd.DataFrame) -> pd.Series:
        """Identify shooting star candlestick patterns"""
        body_size = abs(df['Close'] - df['Open'])
        lower_shadow = df[['Open', 'Close']].min(axis=1) - df['Low']
        upper_shadow = df['High'] - df[['Open', 'Close']].max(axis=1)
        
        shooting_star = (
            (upper_shadow > 2 * body_size) & 
            (lower_shadow < 0.5 * body_size) & 
            (df['Close'] < df['Open'])
        ).astype(int)
        
        return shooting_star
    
    def _detect_volatility_regime(self, df: pd.DataFrame) -> pd.Series:
        """Detect high/low volatility regimes"""
        volatility = df['returns'].rolling(window=20).std()
        vol_threshold = volatility.rolling(window=60).quantile(0.7)
        return (volatility > vol_threshold).astype(int)
    
    def _detect_trend_regime(self, df: pd.DataFrame) -> pd.Series:
        """Detect trending vs mean-reverting regimes"""
        trend_strength = abs(df['Close'].rolling(window=20).mean() - df['Close'].rolling(window=50).mean()) / df['Close']
        trend_threshold = trend_strength.rolling(window=60).quantile(0.7)
        return (trend_strength > trend_threshold).astype(int)
    
    def select_features(self, X: pd.DataFrame, y: pd.Series, k: int = 50) -> Tuple[pd.DataFrame, List[str]]:
        """Advanced feature selection"""
        logger.info(f"Selecting top {k} features from {X.shape[1]} total features")
        
        # Remove constant and highly correlated features
        X_clean = self._remove_constant_features(X)
        X_clean = self._remove_correlated_features(X_clean)
        
        # Statistical feature selection
        selector = SelectKBest(score_func=f_regression, k=min(k, X_clean.shape[1]))
        X_selected = selector.fit_transform(X_clean, y)
        
        # Get selected feature names
        selected_features = X_clean.columns[selector.get_support()].tolist()
        self.selected_features = selected_features
        self.feature_selector = selector
        
        logger.info(f"Selected {len(selected_features)} features: {selected_features[:10]}...")
        
        return pd.DataFrame(X_selected, columns=selected_features, index=X.index), selected_features
    
    def _remove_constant_features(self, X: pd.DataFrame, threshold: float = 0.01) -> pd.DataFrame:
        """Remove features with low variance"""
        return X.loc[:, X.var() > threshold]
    
    def _remove_correlated_features(self, X: pd.DataFrame, threshold: float = 0.95) -> pd.DataFrame:
        """Remove highly correlated features"""
        corr_matrix = X.corr().abs()
        upper_triangle = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
        to_drop = [column for column in upper_triangle.columns if any(upper_triangle[column] > threshold)]
        return X.drop(columns=to_drop)

class EnhancedStockPredictionEngine:
    """Enhanced stock prediction engine with ensemble methods"""
    
    def __init__(self):
        self.models = {}
        self.feature_engine = EnhancedFeatureEngine()
        self.model_metrics = {}
        self.trained_symbols = set()
        self.stock_service = None
        self.best_params = {}
        
        # Initialize enhanced models
        self._initialize_enhanced_models()
    
    async def _ensure_stock_service(self):
        """Ensure stock service is initialized"""
        if self.stock_service is None:
            self.stock_service = await get_stock_service()
    
    def _initialize_enhanced_models(self):
        """Initialize enhanced models with better hyperparameters"""
        self.models = {
            EnhancedModelType.RANDOM_FOREST: RandomForestRegressor(
                n_estimators=200,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ),
            EnhancedModelType.GRADIENT_BOOSTING: GradientBoostingRegressor(
                n_estimators=200,
                learning_rate=0.1,
                max_depth=6,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            ),
            EnhancedModelType.LINEAR_REGRESSION: LinearRegression(),
            EnhancedModelType.RIDGE_REGRESSION: Ridge(alpha=1.0),
            EnhancedModelType.LASSO_REGRESSION: Lasso(alpha=0.1),
            EnhancedModelType.ELASTIC_NET: ElasticNet(alpha=0.1, l1_ratio=0.5),
            EnhancedModelType.SVR: SVR(kernel='rbf', C=1.0, gamma='scale'),
            EnhancedModelType.MLP: MLPRegressor(
                hidden_layer_sizes=(100, 50),
                learning_rate_init=0.001,
                max_iter=500,
                early_stopping=True,
                random_state=42
            )
        }
    
    def _create_ensemble_models(self) -> Dict[EnhancedModelType, Any]:
        """Create ensemble models"""
        # Voting ensemble
        voting_ensemble = VotingRegressor([
            ('rf', self.models[EnhancedModelType.RANDOM_FOREST]),
            ('gb', self.models[EnhancedModelType.GRADIENT_BOOSTING]),
            ('ridge', self.models[EnhancedModelType.RIDGE_REGRESSION])
        ])
        
        # Bagging ensemble
        bagging_ensemble = BaggingRegressor(
            base_estimator=self.models[EnhancedModelType.RANDOM_FOREST],
            n_estimators=10,
            random_state=42,
            n_jobs=-1
        )
        
        return {
            EnhancedModelType.ENSEMBLE_VOTING: voting_ensemble,
            EnhancedModelType.ENSEMBLE_BAGGING: bagging_ensemble
        }
    
    def _optimize_hyperparameters(self, model_type: EnhancedModelType, X: np.ndarray, y: np.ndarray) -> Any:
        """Optimize model hyperparameters using grid search"""
        logger.info(f"Optimizing hyperparameters for {model_type.value}")
        
        param_grids = {
            EnhancedModelType.RANDOM_FOREST: {
                'n_estimators': [100, 200],
                'max_depth': [8, 10, 12],
                'min_samples_split': [5, 10],
                'min_samples_leaf': [2, 4]
            },
            EnhancedModelType.GRADIENT_BOOSTING: {
                'n_estimators': [100, 200],
                'learning_rate': [0.05, 0.1, 0.15],
                'max_depth': [4, 6, 8],
                'min_samples_split': [5, 10]
            },
            EnhancedModelType.SVR: {
                'C': [0.1, 1, 10],
                'gamma': ['scale', 'auto'],
                'kernel': ['rbf', 'poly']
            }
        }
        
        if model_type not in param_grids:
            return self.models[model_type]
        
        # Use TimeSeriesSplit for cross-validation
        tscv = TimeSeriesSplit(n_splits=3)
        
        try:
            grid_search = GridSearchCV(
                self.models[model_type],
                param_grids[model_type],
                cv=tscv,
                scoring='neg_mean_squared_error',
                n_jobs=-1,
                verbose=0
            )
            
            grid_search.fit(X, y)
            self.best_params[model_type] = grid_search.best_params_
            logger.info(f"Best params for {model_type.value}: {grid_search.best_params_}")
            
            return grid_search.best_estimator_
            
        except Exception as e:
            logger.warning(f"Hyperparameter optimization failed for {model_type.value}: {e}")
            return self.models[model_type]
    
    def _calculate_enhanced_metrics(self, y_true: np.ndarray, y_pred: np.ndarray, 
                                   dates: pd.Index, prices: pd.Series) -> EnhancedModelMetrics:
        """Calculate enhanced performance metrics"""
        # Basic metrics
        mse = mean_squared_error(y_true, y_pred)
        mae = mean_absolute_error(y_true, y_pred)
        r2 = r2_score(y_true, y_pred)
        
        # Directional accuracy
        actual_direction = np.sign(y_true - prices.shift(1).loc[dates].values)
        predicted_direction = np.sign(y_pred - prices.shift(1).loc[dates].values)
        accuracy = np.mean(actual_direction == predicted_direction)
        
        # Financial metrics
        returns = (y_pred - prices.shift(1).loc[dates].values) / prices.shift(1).loc[dates].values
        returns = returns[~np.isnan(returns)]
        
        if len(returns) > 0:
            avg_return = np.mean(returns)
            volatility = np.std(returns)
            sharpe_ratio = avg_return / volatility if volatility > 0 else 0
            
            # Maximum drawdown
            cumulative_returns = (1 + returns).cumprod()
            running_max = cumulative_returns.expanding().max()
            drawdown = (cumulative_returns - running_max) / running_max
            max_drawdown = drawdown.min()
            
            # Hit rate
            hit_rate = np.mean(returns > 0)
            
            # Information ratio (excess return per unit of tracking error)
            benchmark_return = np.mean(prices.pct_change().loc[dates])
            excess_returns = returns - benchmark_return
            tracking_error = np.std(excess_returns)
            information_ratio = np.mean(excess_returns) / tracking_error if tracking_error > 0 else 0
        else:
            avg_return = volatility = sharpe_ratio = max_drawdown = hit_rate = information_ratio = None
        
        return EnhancedModelMetrics(
            mse=mse,
            mae=mae,
            r2=r2,
            accuracy=accuracy,
            sharpe_ratio=sharpe_ratio,
            max_drawdown=max_drawdown,
            hit_rate=hit_rate,
            avg_return=avg_return,
            volatility=volatility,
            information_ratio=information_ratio
        )
    
    async def train_enhanced_model(
        self, 
        symbol: str, 
        model_type: EnhancedModelType = EnhancedModelType.ENSEMBLE_VOTING,
        period: str = "2y",
        optimize_hyperparams: bool = True
    ) -> Optional[EnhancedModelMetrics]:
        """Train enhanced prediction model"""
        try:
            logger.info(f"Training enhanced {model_type.value} model for {symbol}")
            
            # Ensure stock service is available
            await self._ensure_stock_service()
            
            # Fetch data
            days = self._convert_period_to_days(period)
            try:
                price_history = await self.stock_service.get_price_history(symbol, days)
                df = self._price_history_to_dataframe(price_history)
            except Exception as e:
                logger.error(f"Failed to get price history for {symbol}: {e}")
                return None
            
            if df.empty:
                logger.error(f"No data available for {symbol}")
                return None
            
            # Create advanced features
            df_features = self.feature_engine.create_advanced_features(df)
            
            # Prepare target
            df_features['target'] = df_features['Close'].shift(-1)
            df_clean = df_features.dropna()
            
            # Separate features and target
            feature_columns = [col for col in df_clean.columns 
                             if col not in ['target', 'Open', 'High', 'Low', 'Close', 'Volume']]
            X = df_clean[feature_columns]
            y = df_clean['target']
            
            if X.empty:
                logger.error(f"No features generated for {symbol}")
                return None
            
            # Feature selection
            X_selected, selected_features = self.feature_engine.select_features(X, y, k=50)
            
            # Time series split
            tscv = TimeSeriesSplit(n_splits=5)
            split_idx = list(tscv.split(X_selected))[-1]
            train_idx, test_idx = split_idx
            
            X_train = X_selected.iloc[train_idx]
            X_test = X_selected.iloc[test_idx]
            y_train = y.iloc[train_idx]
            y_test = y.iloc[test_idx]
            
            # Scale features
            scaler = RobustScaler()  # More robust to outliers
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Create ensemble models if needed
            if model_type in [EnhancedModelType.ENSEMBLE_VOTING, EnhancedModelType.ENSEMBLE_BAGGING]:
                ensemble_models = self._create_ensemble_models()
                model = ensemble_models[model_type]
            else:
                # Optimize hyperparameters if requested
                if optimize_hyperparams and model_type in [
                    EnhancedModelType.RANDOM_FOREST, 
                    EnhancedModelType.GRADIENT_BOOSTING, 
                    EnhancedModelType.SVR
                ]:
                    model = self._optimize_hyperparameters(model_type, X_train_scaled, y_train)
                else:
                    model = self.models[model_type]
            
            # Train model
            model.fit(X_train_scaled, y_train)
            
            # Evaluate model
            y_pred = model.predict(X_test_scaled)
            metrics = self._calculate_enhanced_metrics(
                y_test.values, y_pred, X_test.index, df_clean.loc[X_test.index, 'Close']
            )
            
            # Store model and related objects
            model_key = f"{symbol}_{model_type.value}"
            self.models[model_key] = {
                'model': model,
                'scaler': scaler,
                'features': selected_features,
                'feature_selector': self.feature_engine.feature_selector
            }
            self.model_metrics[model_key] = metrics
            self.trained_symbols.add(symbol)
            
            logger.info(f"Enhanced model trained for {symbol}. R2: {metrics.r2:.3f}, "
                       f"Accuracy: {metrics.accuracy:.3f}, Sharpe: {metrics.sharpe_ratio:.3f}")
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to train enhanced model for {symbol}: {e}")
            return None
    
    def _convert_period_to_days(self, period: str) -> int:
        """Convert period string to days"""
        if period.endswith('y'):
            return int(period[:-1]) * 365
        elif period.endswith('m'):
            return int(period[:-1]) * 30
        elif period.endswith('d'):
            return int(period[:-1])
        else:
            return 730  # default 2 years
    
    def _price_history_to_dataframe(self, price_history: List[Dict]) -> pd.DataFrame:
        """Convert price history to DataFrame"""
        if not price_history:
            return pd.DataFrame()
        
        df = pd.DataFrame(price_history)
        df['date'] = pd.to_datetime(df['date'])
        df.set_index('date', inplace=True)
        df.rename(columns={
            'open': 'Open',
            'high': 'High', 
            'low': 'Low',
            'close': 'Close',
            'volume': 'Volume'
        }, inplace=True)
        
        return df.sort_index()
    
    async def predict_price(
        self,
        symbol: str,
        model_type: EnhancedModelType = EnhancedModelType.ENSEMBLE_VOTING,
        optimize_params: bool = True,
        period: str = "2y"
    ) -> Optional[Dict]:
        """Enhanced price prediction"""
        try:
            # Train model if not exists
            model_key = f"{symbol}_{model_type.value}"
            
            if model_key not in self.models:
                logger.info(f"Training enhanced model for {symbol}")
                await self.train_enhanced_model(symbol, model_type, period, optimize_params)
                
                if model_key not in self.models:
                    logger.error(f"Failed to train model for {symbol}")
                    return None
            
            # Get model and related objects
            model_data = self.models[model_key]
            model = model_data['model']
            scaler = model_data['scaler']
            selected_features = model_data['features']
            
            # Get recent data for prediction
            await self._ensure_stock_service()
            
            try:
                price_history = await self.stock_service.get_price_history(symbol, 100)
                df = self._price_history_to_dataframe(price_history)
            except Exception as e:
                logger.error(f"Failed to get recent data for {symbol}: {e}")
                return None
            
            if df.empty:
                logger.error(f"No recent data available for {symbol}")
                return None
            
            # Create features
            df_features = self.feature_engine.create_advanced_features(df)
            
            # Select features used during training
            X_latest = df_features[selected_features].iloc[-1:].values
            
            # Scale features
            X_latest_scaled = scaler.transform(X_latest)
            
            # Make prediction
            predicted_price = model.predict(X_latest_scaled)[0]
            current_price = df['Close'].iloc[-1]
            
            # Calculate prediction details
            change = predicted_price - current_price
            change_percent = (change / current_price) * 100
            
            # Get model metrics
            metrics = self.model_metrics.get(model_key)
            
            return {
                'symbol': symbol,
                'current_price': float(current_price),
                'predicted_price': float(predicted_price),
                'change': float(change),
                'change_percent': float(change_percent),
                'confidence': float(metrics.accuracy) if metrics else 0.0,
                'model_type': model_type.value,
                'model_metrics': {
                    'r2_score': float(metrics.r2) if metrics else 0.0,
                    'accuracy': float(metrics.accuracy) if metrics else 0.0,
                    'sharpe_ratio': float(metrics.sharpe_ratio) if metrics else 0.0,
                    'max_drawdown': float(metrics.max_drawdown) if metrics else 0.0,
                    'hit_rate': float(metrics.hit_rate) if metrics else 0.0
                } if metrics else {}
            }
            
        except Exception as e:
            logger.error(f"Failed to predict price for {symbol}: {e}")
            return None

# Global instance
enhanced_prediction_engine = EnhancedStockPredictionEngine()