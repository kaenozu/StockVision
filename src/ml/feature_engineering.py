"""
Feature engineering for stock prediction ML models.
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
try:
    import talib
    TALIB_AVAILABLE = True
except ImportError:
    TALIB_AVAILABLE = False
    print("Warning: TA-Lib not available. Using simplified technical indicators.")
import logging

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Stock data feature engineering for machine learning models."""
    
    def __init__(self, lookback_days: int = 60):
        """
        Initialize feature engineer.
        
        Args:
            lookback_days: Number of historical days to use for feature calculation
        """
        self.lookback_days = lookback_days
        
    def create_features(self, price_data: pd.DataFrame) -> pd.DataFrame:
        """
        Create comprehensive feature set from price data.
        
        Args:
            price_data: DataFrame with columns [date, open, high, low, close, volume]
        
        Returns:
            DataFrame with engineered features
        """
        logger.info(f"Creating features for {len(price_data)} data points")
        
        df = price_data.copy()
        df = df.sort_values('date')
        
        # Ensure required columns exist
        required_cols = ['open', 'high', 'low', 'close', 'volume']
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Required column '{col}' not found in price_data")
        
        # Technical indicators
        df = self._add_technical_indicators(df)
        
        # Price-based features
        df = self._add_price_features(df)
        
        # Volume-based features
        df = self._add_volume_features(df)
        
        # Temporal features
        df = self._add_temporal_features(df)
        
        # Market structure features
        df = self._add_market_structure_features(df)
        
        # Volatility features
        df = self._add_volatility_features(df)
        
        # Target variables
        df = self._add_target_variables(df)
        
        # Remove rows with insufficient history
        df = df.iloc[self.lookback_days:].copy()
        
        logger.info(f"Created {len(df.columns)} features for {len(df)} samples")
        
        return df
    
    def _add_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add technical analysis indicators."""
        close = df['close'].values
        high = df['high'].values
        low = df['low'].values
        volume = df['volume'].values
        
        if TALIB_AVAILABLE:
            # Use TA-Lib for technical indicators
            self._add_talib_indicators(df, close, high, low, volume)
        else:
            # Use simplified pandas-based indicators
            self._add_simple_indicators(df)
        
        return df
    
    def _add_talib_indicators(self, df: pd.DataFrame, close, high, low, volume):
        """Add TA-Lib based technical indicators."""
        # Moving averages
        df['sma_5'] = talib.SMA(close, timeperiod=5)
        df['sma_10'] = talib.SMA(close, timeperiod=10)
        df['sma_20'] = talib.SMA(close, timeperiod=20)
        df['sma_50'] = talib.SMA(close, timeperiod=50)
        df['ema_12'] = talib.EMA(close, timeperiod=12)
        df['ema_26'] = talib.EMA(close, timeperiod=26)
        
        # MACD
        macd, macd_signal, macd_hist = talib.MACD(close, fastperiod=12, slowperiod=26, signalperiod=9)
        df['macd'] = macd
        df['macd_signal'] = macd_signal
        df['macd_histogram'] = macd_hist
        
        # RSI
        df['rsi_14'] = talib.RSI(close, timeperiod=14)
        df['rsi_30'] = talib.RSI(close, timeperiod=30)
        
        # Bollinger Bands
        upper, middle, lower = talib.BBANDS(close, timeperiod=20, nbdevup=2, nbdevdn=2)
        df['bb_upper'] = upper
        df['bb_middle'] = middle
        df['bb_lower'] = lower
        df['bb_width'] = (upper - lower) / middle
        df['bb_position'] = (close - lower) / (upper - lower)
        
        # Stochastic
        df['stoch_k'], df['stoch_d'] = talib.STOCH(high, low, close, fastk_period=14, slowk_period=3, slowd_period=3)
        
        # Williams %R
        df['williams_r'] = talib.WILLR(high, low, close, timeperiod=14)
        
        # Average Directional Index
        df['adx'] = talib.ADX(high, low, close, timeperiod=14)
        
        # Commodity Channel Index
        df['cci'] = talib.CCI(high, low, close, timeperiod=14)
        
        # Volume indicators
        df['obv'] = talib.OBV(close, volume)
        df['ad_line'] = talib.AD(high, low, close, volume)
        
        return df
    
    def _add_price_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add price-based features."""
        # Price ratios
        df['high_low_ratio'] = df['high'] / df['low']
        df['close_open_ratio'] = df['close'] / df['open']
        df['close_high_ratio'] = df['close'] / df['high']
        df['close_low_ratio'] = df['close'] / df['low']
        
        # Price changes
        df['price_change'] = df['close'].pct_change()
        df['price_change_2d'] = df['close'].pct_change(periods=2)
        df['price_change_5d'] = df['close'].pct_change(periods=5)
        df['price_change_10d'] = df['close'].pct_change(periods=10)
        
        # Price position relative to recent range
        df['price_position_5d'] = self._calculate_price_position(df['close'], 5)
        df['price_position_10d'] = self._calculate_price_position(df['close'], 10)
        df['price_position_20d'] = self._calculate_price_position(df['close'], 20)
        
        # Gap analysis
        df['gap'] = (df['open'] - df['close'].shift(1)) / df['close'].shift(1)
        df['gap_filled'] = ((df['high'] >= df['close'].shift(1)) & (df['gap'] < 0)) | \
                          ((df['low'] <= df['close'].shift(1)) & (df['gap'] > 0))
        
        # Typical Price
        df['typical_price'] = (df['high'] + df['low'] + df['close']) / 3
        
        return df
    
    def _add_volume_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add volume-based features."""
        # Volume ratios
        df['volume_sma_20'] = df['volume'].rolling(window=20).mean()
        df['volume_ratio'] = df['volume'] / df['volume_sma_20']
        
        # Volume-price relationship
        df['vwap'] = (df['typical_price'] * df['volume']).rolling(window=20).sum() / \
                    df['volume'].rolling(window=20).sum()
        df['price_volume_trend'] = ((df['close'] - df['close'].shift(1)) / df['close'].shift(1)) * \
                                  (df['volume'] / df['volume'].rolling(window=20).mean())
        
        # Volume momentum
        df['volume_change'] = df['volume'].pct_change()
        df['volume_change_5d'] = df['volume'].pct_change(periods=5)
        
        return df
    
    def _add_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add time-based features."""
        df['date'] = pd.to_datetime(df['date'])
        
        # Day of week effect
        df['day_of_week'] = df['date'].dt.dayofweek
        df['is_monday'] = (df['day_of_week'] == 0).astype(int)
        df['is_friday'] = (df['day_of_week'] == 4).astype(int)
        
        # Month effect
        df['month'] = df['date'].dt.month
        df['is_january'] = (df['month'] == 1).astype(int)
        df['is_december'] = (df['month'] == 12).astype(int)
        
        # Quarter effect
        df['quarter'] = df['date'].dt.quarter
        
        # Market patterns
        df['days_since_last_friday'] = df.apply(
            lambda row: (row['date'].weekday() + 3) % 7 if row['date'].weekday() < 5 else 0, axis=1
        )
        
        return df
    
    def _add_market_structure_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add market structure features."""
        # Support and resistance levels
        df['support_20d'] = df['low'].rolling(window=20).min()
        df['resistance_20d'] = df['high'].rolling(window=20).max()
        df['support_distance'] = (df['close'] - df['support_20d']) / df['close']
        df['resistance_distance'] = (df['resistance_20d'] - df['close']) / df['close']
        
        # Trend features
        df['trend_5d'] = self._calculate_trend(df['close'], 5)
        df['trend_10d'] = self._calculate_trend(df['close'], 10)
        df['trend_20d'] = self._calculate_trend(df['close'], 20)
        
        # Price patterns
        df['higher_high'] = ((df['high'] > df['high'].shift(1)) & 
                           (df['high'].shift(1) > df['high'].shift(2))).astype(int)
        df['lower_low'] = ((df['low'] < df['low'].shift(1)) & 
                         (df['low'].shift(1) < df['low'].shift(2))).astype(int)
        
        return df
    
    def _add_volatility_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add volatility-based features."""
        # Historical volatility
        df['volatility_5d'] = df['price_change'].rolling(window=5).std() * np.sqrt(252)
        df['volatility_10d'] = df['price_change'].rolling(window=10).std() * np.sqrt(252)
        df['volatility_20d'] = df['price_change'].rolling(window=20).std() * np.sqrt(252)
        
        # True Range and ATR
        df['true_range'] = np.maximum(
            df['high'] - df['low'],
            np.maximum(
                np.abs(df['high'] - df['close'].shift(1)),
                np.abs(df['low'] - df['close'].shift(1))
            )
        )
        df['atr_14'] = df['true_range'].rolling(window=14).mean()
        df['atr_ratio'] = df['true_range'] / df['atr_14']
        
        # Volatility regime
        df['volatility_regime'] = (df['volatility_20d'] > df['volatility_20d'].rolling(window=60).mean()).astype(int)
        
        return df
    
    def _add_target_variables(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add target variables for prediction."""
        # Next day price change (classification target)
        df['target_direction'] = np.where(df['close'].shift(-1) > df['close'], 1, 0)
        
        # Next day exact price (regression target)
        df['target_price'] = df['close'].shift(-1)
        
        # Next day returns
        df['target_return'] = df['close'].shift(-1) / df['close'] - 1
        
        # Multi-day targets
        df['target_return_3d'] = df['close'].shift(-3) / df['close'] - 1
        df['target_return_5d'] = df['close'].shift(-5) / df['close'] - 1
        df['target_return_10d'] = df['close'].shift(-10) / df['close'] - 1
        
        return df
    
    def _calculate_price_position(self, prices: pd.Series, window: int) -> pd.Series:
        """Calculate price position within recent range (0-1)."""
        rolling_min = prices.rolling(window=window).min()
        rolling_max = prices.rolling(window=window).max()
        return (prices - rolling_min) / (rolling_max - rolling_min)
    
    def _calculate_trend(self, prices: pd.Series, window: int) -> pd.Series:
        """Calculate trend strength using linear regression slope."""
        def slope(y):
            if len(y) < 2:
                return 0
            x = np.arange(len(y))
            return np.polyfit(x, y, 1)[0]
        
        return prices.rolling(window=window).apply(slope, raw=False)
    
    def get_feature_names(self, include_targets: bool = False) -> List[str]:
        """Get list of feature names created by this engineer."""
        features = [
            # Technical indicators
            'sma_5', 'sma_10', 'sma_20', 'sma_50', 'ema_12', 'ema_26',
            'macd', 'macd_signal', 'macd_histogram',
            'rsi_14', 'rsi_30',
            'bb_upper', 'bb_middle', 'bb_lower', 'bb_width', 'bb_position',
            'stoch_k', 'stoch_d', 'williams_r', 'adx', 'cci',
            'obv', 'ad_line',
            
            # Price features
            'high_low_ratio', 'close_open_ratio', 'close_high_ratio', 'close_low_ratio',
            'price_change', 'price_change_2d', 'price_change_5d', 'price_change_10d',
            'price_position_5d', 'price_position_10d', 'price_position_20d',
            'gap', 'gap_filled', 'typical_price',
            
            # Volume features
            'volume_sma_20', 'volume_ratio', 'vwap', 'price_volume_trend',
            'volume_change', 'volume_change_5d',
            
            # Temporal features
            'day_of_week', 'is_monday', 'is_friday', 'month', 'is_january', 'is_december',
            'quarter', 'days_since_last_friday',
            
            # Market structure
            'support_20d', 'resistance_20d', 'support_distance', 'resistance_distance',
            'trend_5d', 'trend_10d', 'trend_20d', 'higher_high', 'lower_low',
            
            # Volatility
            'volatility_5d', 'volatility_10d', 'volatility_20d',
            'true_range', 'atr_14', 'atr_ratio', 'volatility_regime'
        ]
        
        if include_targets:
            features.extend([
                'target_direction', 'target_price', 'target_return',
                'target_return_3d', 'target_return_5d', 'target_return_10d'
            ])
        
        return features
    
    def validate_features(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validate feature quality and return statistics."""
        validation_results = {
            'total_features': len([col for col in df.columns if col not in ['date', 'open', 'high', 'low', 'close', 'volume']]),
            'total_samples': len(df),
            'missing_values': {},
            'infinite_values': {},
            'feature_ranges': {},
            'quality_score': 0.0
        }
        
        feature_names = self.get_feature_names(include_targets=True)
        
        for feature in feature_names:
            if feature in df.columns:
                # Check for missing values
                missing_count = df[feature].isna().sum()
                validation_results['missing_values'][feature] = missing_count
                
                # Check for infinite values
                if df[feature].dtype in ['float64', 'int64']:
                    infinite_count = np.isinf(df[feature]).sum()
                    validation_results['infinite_values'][feature] = infinite_count
                    
                    # Feature range
                    if not df[feature].isna().all():
                        validation_results['feature_ranges'][feature] = {
                            'min': float(df[feature].min()),
                            'max': float(df[feature].max()),
                            'mean': float(df[feature].mean()),
                            'std': float(df[feature].std())
                        }
        
        # Calculate overall quality score
        total_cells = len(df) * len(feature_names)
        total_missing = sum(validation_results['missing_values'].values())
        total_infinite = sum(validation_results['infinite_values'].values())
        validation_results['quality_score'] = 1.0 - (total_missing + total_infinite) / total_cells
        
        return validation_results
    
    def _add_simple_indicators(self, df: pd.DataFrame):
        """Add simplified technical indicators without TA-Lib."""
        # Simple moving averages
        df['sma_5'] = df['close'].rolling(window=5).mean()
        df['sma_10'] = df['close'].rolling(window=10).mean()
        df['sma_20'] = df['close'].rolling(window=20).mean()
        df['sma_50'] = df['close'].rolling(window=50).mean()
        
        # Simple exponential moving averages
        df['ema_12'] = df['close'].ewm(span=12).mean()
        df['ema_26'] = df['close'].ewm(span=26).mean()
        
        # Simple MACD
        df['macd'] = df['ema_12'] - df['ema_26']
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_histogram'] = df['macd'] - df['macd_signal']
        
        # Simple RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi_14'] = 100 - (100 / (1 + rs))
        df['rsi_30'] = df['close'].rolling(window=30).apply(lambda x: self._simple_rsi(x), raw=False)
        
        # Simple Bollinger Bands
        df['bb_middle'] = df['close'].rolling(window=20).mean()
        bb_std = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']
        df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # Fill remaining indicators with basic values
        df['stoch_k'] = ((df['close'] - df['low'].rolling(14).min()) / 
                        (df['high'].rolling(14).max() - df['low'].rolling(14).min())) * 100
        df['stoch_d'] = df['stoch_k'].rolling(3).mean()
        df['williams_r'] = ((df['high'].rolling(14).max() - df['close']) / 
                           (df['high'].rolling(14).max() - df['low'].rolling(14).min())) * -100
        df['adx'] = 50  # Placeholder
        df['cci'] = ((df['close'] - df['close'].rolling(14).mean()) / 
                    (0.015 * df['close'].rolling(14).std()))
        df['obv'] = (df['volume'] * np.where(df['close'] > df['close'].shift(1), 1, -1)).cumsum()
        df['ad_line'] = df['volume'] * ((df['close'] - df['low']) - (df['high'] - df['close'])) / (df['high'] - df['low'])
        
        return df
    
    def _simple_rsi(self, prices):
        """Calculate simple RSI for a price series."""
        if len(prices) < 2:
            return 50
        delta = prices.diff()
        gain = delta.where(delta > 0, 0).mean()
        loss = (-delta.where(delta < 0, 0)).mean()
        if loss == 0:
            return 100
        rs = gain / loss
        return 100 - (100 / (1 + rs))