"""
Advanced Feature Engineering for Stock Prediction

This module provides advanced feature engineering techniques for stock price prediction,
including technical indicators, fundamental ratios, market sentiment features, and
macroeconomic indicators.
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import talib  # For technical indicators
from sklearn.preprocessing import StandardScaler, MinMaxScaler
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

class AdvancedFeatureEngine:
    """Advanced feature engineering for stock prediction"""
    
    def __init__(self):
        self.scalers = {}
        self.feature_names = []
    
    def create_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create comprehensive technical indicators"""
        df = df.copy()
        
        # Convert column names to uppercase for TA-Lib compatibility
        df.columns = [col.upper() for col in df.columns]
        
        # Price-based indicators
        df['SMA_5'] = talib.SMA(df['CLOSE'], timeperiod=5)
        df['SMA_10'] = talib.SMA(df['CLOSE'], timeperiod=10)
        df['SMA_20'] = talib.SMA(df['CLOSE'], timeperiod=20)
        df['SMA_50'] = talib.SMA(df['CLOSE'], timeperiod=50)
        df['SMA_200'] = talib.SMA(df['CLOSE'], timeperiod=200)
        
        df['EMA_12'] = talib.EMA(df['CLOSE'], timeperiod=12)
        df['EMA_26'] = talib.EMA(df['CLOSE'], timeperiod=26)
        
        # MACD
        df['MACD'], df['MACD_SIGNAL'], df['MACD_HIST'] = talib.MACD(
            df['CLOSE'], fastperiod=12, slowperiod=26, signalperiod=9
        )
        
        # RSI
        df['RSI_14'] = talib.RSI(df['CLOSE'], timeperiod=14)
        df['RSI_7'] = talib.RSI(df['CLOSE'], timeperiod=7)
        
        # Bollinger Bands
        df['BB_UPPER'], df['BB_MIDDLE'], df['BB_LOWER'] = talib.BBANDS(
            df['CLOSE'], timeperiod=20, nbdevup=2, nbdevdn=2
        )
        df['BB_WIDTH'] = (df['BB_UPPER'] - df['BB_LOWER']) / df['BB_MIDDLE']
        df['BB_POSITION'] = (df['CLOSE'] - df['BB_LOWER']) / (df['BB_UPPER'] - df['BB_LOWER'])
        
        # Stochastic Oscillator
        df['STOCH_K'], df['STOCH_D'] = talib.STOCH(
            df['HIGH'], df['LOW'], df['CLOSE'], 
            fastk_period=14, slowk_period=3, slowk_matype=0,
            slowd_period=3, slowd_matype=0
        )
        
        # Williams %R
        df['WILLIAMS_R'] = talib.WILLR(df['HIGH'], df['LOW'], df['CLOSE'], timeperiod=14)
        
        # CCI (Commodity Channel Index)
        df['CCI_14'] = talib.CCI(df['HIGH'], df['LOW'], df['CLOSE'], timeperiod=14)
        
        # ADX (Average Directional Index)
        df['ADX_14'] = talib.ADX(df['HIGH'], df['LOW'], df['CLOSE'], timeperiod=14)
        
        # Aroon
        df['AROON_UP'], df['AROON_DOWN'] = talib.AROON(df['HIGH'], df['LOW'], timeperiod=14)
        df['AROON_OSC'] = df['AROON_UP'] - df['AROON_DOWN']
        
        # Momentum indicators
        df['MOM_10'] = talib.MOM(df['CLOSE'], timeperiod=10)
        df['ROC_10'] = talib.ROC(df['CLOSE'], timeperiod=10)
        
        # Volume indicators
        if 'VOLUME' in df.columns:
            df['OBV'] = talib.OBV(df['CLOSE'], df['VOLUME'])
            df['AD'] = talib.AD(df['HIGH'], df['LOW'], df['CLOSE'], df['VOLUME'])
            df['ADOSC'] = talib.ADOSC(
                df['HIGH'], df['LOW'], df['CLOSE'], df['VOLUME'], 
                fastperiod=3, slowperiod=10
            )
            df['VOLUME_SMA'] = talib.SMA(df['VOLUME'], timeperiod=20)
            df['VOLUME_RATIO'] = df['VOLUME'] / df['VOLUME_SMA']
        
        # Volatility indicators
        df['ATR_14'] = talib.ATR(df['HIGH'], df['LOW'], df['CLOSE'], timeperiod=14)
        df['NATR_14'] = talib.NATR(df['HIGH'], df['LOW'], df['CLOSE'], timeperiod=14)
        
        # Price transformation indicators
        df['HT_TRENDLINE'] = talib.HT_TRENDLINE(df['CLOSE'])
        df['HT_SINE'], df['HT_LEADSINE'] = talib.HT_SINE(df['CLOSE'])
        df['HT_TRENDMODE'] = talib.HT_TRENDMODE(df['CLOSE'])
        
        return df
    
    def create_price_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create price-based features"""
        df = df.copy()
        
        # Basic returns
        df['RETURNS'] = df['CLOSE'].pct_change()
        df['LOG_RETURNS'] = np.log(df['CLOSE'] / df['CLOSE'].shift(1))
        
        # Price ratios
        df['HIGH_LOW_RATIO'] = df['HIGH'] / df['LOW']
        df['OPEN_CLOSE_RATIO'] = df['OPEN'] / df['CLOSE']
        df['PRICE_RANGE'] = (df['HIGH'] - df['LOW']) / df['CLOSE']
        
        # Price position indicators
        df['PRICE_POSITION'] = (df['CLOSE'] - df['LOW']) / (df['HIGH'] - df['LOW'])
        
        # Lagged prices and returns
        for lag in [1, 2, 3, 5, 10]:
            df[f'CLOSE_LAG_{lag}'] = df['CLOSE'].shift(lag)
            df[f'RETURNS_LAG_{lag}'] = df['RETURNS'].shift(lag)
            df[f'VOLUME_LAG_{lag}'] = df['VOLUME'].shift(lag) if 'VOLUME' in df.columns else None
        
        # Rolling statistics
        for window in [5, 10, 20, 50]:
            df[f'ROLLING_MEAN_{window}'] = df['CLOSE'].rolling(window=window).mean()
            df[f'ROLLING_STD_{window}'] = df['CLOSE'].rolling(window=window).std()
            df[f'ROLLING_MIN_{window}'] = df['CLOSE'].rolling(window=window).min()
            df[f'ROLLING_MAX_{window}'] = df['CLOSE'].rolling(window=window).max()
            df[f'ROLLING_SKEW_{window}'] = df['CLOSE'].rolling(window=window).skew()
            df[f'ROLLING_KURT_{window}'] = df['CLOSE'].rolling(window=window).kurt()
            
            # Rolling returns statistics
            df[f'RETURNS_STD_{window}'] = df['RETURNS'].rolling(window=window).std()
            df[f'RETURNS_SKEW_{window}'] = df['RETURNS'].rolling(window=window).skew()
            df[f'RETURNS_KURT_{window}'] = df['RETURNS'].rolling(window=window).kurt()
        
        # Price momentum
        for period in [1, 3, 5, 10, 20]:
            df[f'MOMENTUM_{period}'] = df['CLOSE'] / df['CLOSE'].shift(period) - 1
            df[f'PRICE_CHAN_{period}'] = (
                df['CLOSE'] - df['CLOSE'].rolling(window=period).min()
            ) / (
                df['CLOSE'].rolling(window=period).max() - 
                df['CLOSE'].rolling(window=period).min()
            )
        
        # Volatility features
        df['VOLATILITY_5'] = df['RETURNS'].rolling(window=5).std()
        df['VOLATILITY_10'] = df['RETURNS'].rolling(window=10).std()
        df['VOLATILITY_20'] = df['RETURNS'].rolling(window=20).std()
        df['VOLATILITY_RATIO'] = df['VOLATILITY_20'] / df['VOLATILITY_5']
        
        # Price trend features
        df['PRICE_TREND_5'] = (df['CLOSE'] - df['CLOSE'].shift(5)) / 5
        df['PRICE_TREND_20'] = (df['CLOSE'] - df['CLOSE'].shift(20)) / 20
        df['TREND_RATIO'] = df['PRICE_TREND_5'] / df['PRICE_TREND_20']
        
        return df
    
    def create_pattern_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create candlestick pattern recognition features"""
        df = df.copy()
        
        # Convert column names to uppercase for TA-Lib compatibility
        df.columns = [col.upper() for col in df.columns]
        
        # Two crows
        df['CDL_2CROWS'] = talib.CDL2CROWS(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Three black crows
        df['CDL_3BLACKCROWS'] = talib.CDL3BLACKCROWS(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Three inside up/down
        df['CDL_3INSIDE'] = talib.CDL3INSIDE(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Three-line strike
        df['CDL_3LINESTRIKE'] = talib.CDL3LINESTRIKE(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Three outside up/down
        df['CDL_3OUTSIDE'] = talib.CDL3OUTSIDE(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Three stars in the south
        df['CDL_3STARSINSOUTH'] = talib.CDL3STARSINSOUTH(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Abandoned baby
        df['CDL_ABANDONEDBABY'] = talib.CDLABANDONEDBABY(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Advance block
        df['CDL_ADVANCEBLOCK'] = talib.CDLADVANCEBLOCK(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Belt-hold
        df['CDL_BELTHOLD'] = talib.CDLBELTHOLD(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Breakaway
        df['CDL_BREAKAWAY'] = talib.CDLBREAKAWAY(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Closing marubozu
        df['CDL_CLOSINGMARUBOZU'] = talib.CDLCLOSINGMARUBOZU(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Concealing baby swallow
        df['CDL_CONCEALBABYSWALL'] = talib.CDLCONCEALBABYSWALL(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Counterattack
        df['CDL_COUNTERATTACK'] = talib.CDLCOUNTERATTACK(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Dark cloud cover
        df['CDL_DARKCLOUDCOVER'] = talib.CDLDARKCLOUDCOVER(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Doji
        df['CDL_DOJI'] = talib.CDLDOJI(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Doji star
        df['CDL_DOJISTAR'] = talib.CDLDOJISTAR(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Dragonfly doji
        df['CDL_DRAGONFLYDOJI'] = talib.CDLDRAGONFLYDOJI(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Engulfing pattern
        df['CDL_ENGULFING'] = talib.CDLENGULFING(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Evening doji star
        df['CDL_EVENINGDOJISTAR'] = talib.CDLEVENINGDOJISTAR(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Evening star
        df['CDL_EVENINGSTAR'] = talib.CDLEVENINGSTAR(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Up/down gap side-by-side white lines
        df['CDL_GAPSIDESIDEWHITE'] = talib.CDLGAPSIDESIDEWHITE(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Gravestone doji
        df['CDL_GRAVESTONEDOJI'] = talib.CDLGRAVESTONEDOJI(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Hammer
        df['CDL_HAMMER'] = talib.CDLHAMMER(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Hanging man
        df['CDL_HANGINGMAN'] = talib.CDLHANGINGMAN(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Harami pattern
        df['CDL_HARAMI'] = talib.CDLHARAMI(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Harami cross
        df['CDL_HARAMICROSS'] = talib.CDLHARAMICROSS(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # High-wave candle
        df['CDL_HIGHWAVE'] = talib.CDLHIGHWAVE(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Hikkake pattern
        df['CDL_HIKKAKE'] = talib.CDLHIKKAKE(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Modified hikkake pattern
        df['CDL_HIKKAKEMOD'] = talib.CDLHIKKAKEMOD(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Homing pigeon
        df['CDL_HOMINGPIGEON'] = talib.CDLHOMINGPIGEON(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Identical three crows
        df['CDL_IDENTICAL3CROWS'] = talib.CDLIDENTICAL3CROWS(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # In-neck pattern
        df['CDL_INNECK'] = talib.CDLINNECK(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Inverted hammer
        df['CDL_INVERTEDHAMMER'] = talib.CDLINVERTEDHAMMER(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Kicking
        df['CDL_KICKING'] = talib.CDLKICKING(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Kicking - bull/bear determined by the longer marubozu
        df['CDL_KICKINGBYLENGTH'] = talib.CDLKICKINGBYLENGTH(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Ladder bottom
        df['CDL_LADDERBOTTOM'] = talib.CDLLADDERBOTTOM(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Long legged doji
        df['CDL_LONGLEGGEDDOJI'] = talib.CDLLONGLEGGEDDOJI(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Long line candle
        df['CDL_LONGLINE'] = talib.CDLLONGLINE(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Marubozu
        df['CDL_MARUBOZU'] = talib.CDLMARUBOZU(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Matching low
        df['CDL_MATCHINGLOW'] = talib.CDLMATCHINGLOW(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Mat hold
        df['CDL_MATHOLD'] = talib.CDLMATHOLD(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Morning doji star
        df['CDL_MORNINGDOJISTAR'] = talib.CDLMORNINGDOJISTAR(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Morning star
        df['CDL_MORNINGSTAR'] = talib.CDLMORNINGSTAR(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # On-neck pattern
        df['CDL_ONNECK'] = talib.CDLONNECK(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Piercing pattern
        df['CDL_PIERCING'] = talib.CDLPIERCING(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Rickshaw man
        df['CDL_RICKSHAWMAN'] = talib.CDLRICKSHAWMAN(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Rising/falling three methods
        df['CDL_RISEFALL3METHODS'] = talib.CDLRISEFALL3METHODS(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Separating lines
        df['CDL_SEPARATINGLINES'] = talib.CDLSEPARATINGLINES(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Shooting star
        df['CDL_SHOOTINGSTAR'] = talib.CDLSHOOTINGSTAR(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Short line candle
        df['CDL_SHORTLINE'] = talib.CDLSHORTLINE(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Spinning top
        df['CDL_SPINNINGTOP'] = talib.CDLSPINNINGTOP(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Stalled pattern
        df['CDL_STALLEDPATTERN'] = talib.CDLSTALLEDPATTERN(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Stick sandwich
        df['CDL_STICKSANDWICH'] = talib.CDLSTICKSANDWICH(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Takuri (dragonfly doji with very long lower shadow)
        df['CDL_TAKURI'] = talib.CDLTAKURI(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Tasuki gap
        df['CDL_TASUKIGAP'] = talib.CDLTASUKIGAP(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Thrusting pattern
        df['CDL_THRUSTING'] = talib.CDLTHRUSTING(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Tristar pattern
        df['CDL_TRISTAR'] = talib.CDLTRISTAR(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Unique 3 river
        df['CDL_UNIQUE3RIVER'] = talib.CDLUNIQUE3RIVER(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Upside gap two crows
        df['CDL_UPSIDEGAP2CROWS'] = talib.CDLUPSIDEGAP2CROWS(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        # Upside/downside gap three methods
        df['CDL_XSIDEGAP3METHODS'] = talib.CDLXSIDEGAP3METHODS(df['OPEN'], df['HIGH'], df['LOW'], df['CLOSE'])
        
        return df
    
    def create_fundamental_features(self, df: pd.DataFrame, fundamental_data: Optional[Dict] = None) -> pd.DataFrame:
        """Create fundamental analysis features (placeholder)"""
        df = df.copy()
        
        # This would typically integrate with a fundamental data source
        # For now, we'll create some placeholder features
        
        # Price-to-earnings ratio (placeholder)
        df['PE_RATIO'] = np.random.uniform(10, 30, len(df))
        
        # Price-to-book ratio (placeholder)
        df['PB_RATIO'] = np.random.uniform(1, 5, len(df))
        
        # Debt-to-equity ratio (placeholder)
        df['DEBT_EQUITY'] = np.random.uniform(0.1, 2.0, len(df))
        
        # Return on equity (placeholder)
        df['ROE'] = np.random.uniform(0.05, 0.25, len(df))
        
        # Return on assets (placeholder)
        df['ROA'] = np.random.uniform(0.02, 0.15, len(df))
        
        # Dividend yield (placeholder)
        df['DIVIDEND_YIELD'] = np.random.uniform(0, 0.1, len(df))
        
        # Earnings per share growth (placeholder)
        df['EPS_GROWTH'] = np.random.uniform(-0.1, 0.3, len(df))
        
        # Revenue growth (placeholder)
        df['REVENUE_GROWTH'] = np.random.uniform(-0.05, 0.2, len(df))
        
        return df
    
    def create_market_features(self, df: pd.DataFrame, market_data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """Create market-wide features (placeholder)"""
        df = df.copy()
        
        # Market return (placeholder)
        df['MARKET_RETURN'] = np.random.normal(0.0005, 0.02, len(df))
        
        # Market volatility (placeholder)
        df['MARKET_VOLATILITY'] = np.random.uniform(0.1, 0.4, len(df))
        
        # Sector return (placeholder)
        df['SECTOR_RETURN'] = np.random.normal(0.0003, 0.015, len(df))
        
        # Beta (placeholder)
        df['BETA'] = np.random.uniform(0.5, 2.0, len(df))
        
        # Alpha (placeholder)
        df['ALPHA'] = np.random.normal(0, 0.01, len(df))
        
        return df
    
    def create_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create time-based features"""
        df = df.copy()
        
        # Extract date components
        if isinstance(df.index, pd.DatetimeIndex):
            df['YEAR'] = df.index.year
            df['MONTH'] = df.index.month
            df['DAY'] = df.index.day
            df['DAY_OF_WEEK'] = df.index.dayofweek
            df['DAY_OF_YEAR'] = df.index.dayofyear
            df['WEEK_OF_YEAR'] = df.index.isocalendar().week
            df['QUARTER'] = df.index.quarter
            
            # Cyclical encoding
            df['MONTH_SIN'] = np.sin(2 * np.pi * df['MONTH'] / 12)
            df['MONTH_COS'] = np.cos(2 * np.pi * df['MONTH'] / 12)
            df['DAY_OF_WEEK_SIN'] = np.sin(2 * np.pi * df['DAY_OF_WEEK'] / 7)
            df['DAY_OF_WEEK_COS'] = np.cos(2 * np.pi * df['DAY_OF_WEEK'] / 7)
            
        return df
    
    def create_all_features(
        self, 
        df: pd.DataFrame, 
        fundamental_data: Optional[Dict] = None,
        market_data: Optional[pd.DataFrame] = None
    ) -> pd.DataFrame:
        """Create all features"""
        df = df.copy()
        
        logger.info("Creating technical indicators...")
        df = self.create_technical_indicators(df)
        
        logger.info("Creating price features...")
        df = self.create_price_features(df)
        
        logger.info("Creating pattern features...")
        df = self.create_pattern_features(df)
        
        logger.info("Creating fundamental features...")
        df = self.create_fundamental_features(df, fundamental_data)
        
        logger.info("Creating market features...")
        df = self.create_market_features(df, market_data)
        
        logger.info("Creating time features...")
        df = self.create_time_features(df)
        
        # Store feature names
        self.feature_names = [col for col in df.columns if col not in ['OPEN', 'HIGH', 'LOW', 'CLOSE', 'VOLUME']]
        
        logger.info(f"Created {len(self.feature_names)} features")
        return df
    
    def prepare_features_for_training(
        self, 
        df: pd.DataFrame, 
        target_col: str = 'CLOSE',
        sequence_length: int = 60
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare features for training with sequence creation"""
        # Remove non-feature columns
        feature_columns = [col for col in df.columns if col not in ['OPEN', 'HIGH', 'LOW', 'CLOSE', 'VOLUME']]
        df_features = df[feature_columns]
        
        # Handle missing values
        df_features = df_features.fillna(method='ffill').fillna(method='bfill')
        df_features = df_features.fillna(0)
        
        # Create sequences
        X, y = [], []
        data = df_features.values
        target = df[target_col].values
        
        for i in range(sequence_length, len(data)):
            X.append(data[i-sequence_length:i])
            y.append(target[i])
        
        X = np.array(X)
        y = np.array(y)
        
        return X, y
    
    def scale_features(self, X: np.ndarray, fit: bool = True) -> np.ndarray:
        """Scale features using StandardScaler"""
        if fit or 'features' not in self.scalers:
            self.scalers['features'] = StandardScaler()
            return self.scalers['features'].fit_transform(X)
        else:
            return self.scalers['features'].transform(X)
    
    def get_feature_importance(self, model, feature_names: List[str]) -> pd.DataFrame:
        """Get feature importance from model"""
        if hasattr(model, 'feature_importances_'):
            importance = model.feature_importances_
            feature_importance = pd.DataFrame({
                'feature': feature_names,
                'importance': importance
            }).sort_values('importance', ascending=False)
            return feature_importance
        else:
            logger.warning("Model does not have feature_importances_ attribute")
            return pd.DataFrame()

# Global advanced feature engine instance
advanced_feature_engine = AdvancedFeatureEngine()