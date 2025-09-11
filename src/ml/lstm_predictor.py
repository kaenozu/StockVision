"""
LSTM Neural Network Stock Price Predictor
株価予想用LSTMニューラルネットワーク
"""
import os
import pickle
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
    TENSORFLOW_AVAILABLE = True
    
    # Set TensorFlow log level to reduce output
    tf.get_logger().setLevel('ERROR')
except ImportError:
    TENSORFLOW_AVAILABLE = False
    tf = None

# sklearn imports (always available)
try:
    from sklearn.preprocessing import MinMaxScaler
    from sklearn.metrics import mean_squared_error, mean_absolute_error
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    MinMaxScaler = None

from ..stock_storage.database import get_session_scope
from ..models.price_history import PriceHistory

logger = logging.getLogger(__name__)

@dataclass
class LSTMConfig:
    """LSTM設定パラメータ"""
    sequence_length: int = 60  # 過去60日のデータを使用
    lstm_units: List[int] = None  # LSTM層のユニット数
    dropout_rate: float = 0.2
    batch_size: int = 32
    epochs: int = 100
    validation_split: float = 0.2
    learning_rate: float = 0.001
    early_stopping_patience: int = 10
    reduce_lr_patience: int = 5
    
    def __post_init__(self):
        if self.lstm_units is None:
            self.lstm_units = [50, 50, 25]


@dataclass
class LSTMPredictionResult:
    """LSTM予想結果"""
    stock_code: str
    predicted_price: float
    confidence: float
    model_accuracy: float
    sequence_used: List[float]
    prediction_date: datetime
    technical_indicators: Dict[str, float]


class LSTMStockPredictor:
    """LSTM株価予想エンジン"""
    
    def __init__(self, config: Optional[LSTMConfig] = None):
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is not installed. Please install with: pip install tensorflow")
        
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn is not installed. Please install with: pip install scikit-learn")
            
        self.config = config or LSTMConfig()
        self.models: Dict[str, Any] = {}  # 銘柄別モデル
        self.scalers: Dict[str, MinMaxScaler] = {}  # 銘柄別スケーラー
        self.model_metrics: Dict[str, Dict] = {}  # モデル精度指標
        self.models_dir = "data/models/lstm"
        
        # モデル保存ディレクトリを作成
        os.makedirs(self.models_dir, exist_ok=True)
        
        # TensorFlowログレベル設定（エラー発生時はスキップ）
        try:
            tf.get_logger().setLevel('ERROR')
        except:
            pass
        
    def create_sequences(self, data: np.ndarray, seq_length: int) -> Tuple[np.ndarray, np.ndarray]:
        """時系列データをLSTM用のシーケンスに変換"""
        X, y = [], []
        for i in range(seq_length, len(data)):
            X.append(data[i-seq_length:i])
            # 終値のみをターゲットとする（インデックス0が終値）
            y.append(data[i, 0])  
        return np.array(X), np.array(y)
    
    def prepare_data(self, stock_code: str, days: int = 1000) -> Tuple[np.ndarray, np.ndarray, MinMaxScaler]:
        """株価データを準備・前処理"""
        with get_session_scope() as session:
            # 過去のデータを取得
            price_history = session.query(PriceHistory).filter(
                PriceHistory.stock_code == stock_code
            ).order_by(PriceHistory.date.desc()).limit(days).all()
            
            if len(price_history) < self.config.sequence_length + 50:
                raise ValueError(f"Insufficient data for {stock_code}. Need at least {self.config.sequence_length + 50} days.")
            
            # 時系列順に並び替え
            price_history.reverse()
            
            # データフレームに変換
            df = pd.DataFrame([{
                'date': record.date,
                'open': float(record.open_price),
                'high': float(record.high_price),
                'low': float(record.low_price),
                'close': float(record.close_price),
                'volume': int(record.volume)
            } for record in price_history])
            
            # 技術指標を追加
            df = self.add_technical_indicators(df)
            
            # 強化された特徴量を選択
            feature_columns = [
                'close', 'open', 'high', 'low', 'volume',
                'sma_5', 'sma_10', 'sma_20', 'sma_50',
                'ema_12', 'ema_26',
                'bb_upper', 'bb_lower', 'bb_ratio',
                'rsi_7', 'rsi_14', 'rsi_21',
                'macd', 'macd_signal', 'macd_histogram',
                'stoch_k', 'stoch_d',
                'cci', 'williams_r', 'atr',
                'roc_10', 'roc_20',
                'volume_ratio', 'price_volume',
                'high_low_ratio', 'close_position'
            ]
            features = df[feature_columns].ffill().bfill()
            
            # スケーリング
            scaler = MinMaxScaler()
            scaled_data = scaler.fit_transform(features)
            
            # シーケンス作成
            X, y = self.create_sequences(scaled_data, self.config.sequence_length)
            
            return X, y, scaler
    
    def add_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """強化された技術指標を追加"""
        # Simple Moving Averages (複数期間)
        df['sma_5'] = df['close'].rolling(window=5).mean()
        df['sma_10'] = df['close'].rolling(window=10).mean()
        df['sma_20'] = df['close'].rolling(window=20).mean()
        df['sma_50'] = df['close'].rolling(window=50).mean()
        
        # Exponential Moving Averages
        df['ema_12'] = df['close'].ewm(span=12).mean()
        df['ema_26'] = df['close'].ewm(span=26).mean()
        
        # Bollinger Bands
        df['bb_std'] = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['sma_20'] + (df['bb_std'] * 2)
        df['bb_lower'] = df['sma_20'] - (df['bb_std'] * 2)
        df['bb_ratio'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # RSI (複数期間)
        for period in [7, 14, 21]:
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
            rs = gain / loss
            df[f'rsi_{period}'] = 100 - (100 / (1 + rs))
        
        # MACD and Signal
        df['macd'] = df['ema_12'] - df['ema_26']
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_histogram'] = df['macd'] - df['macd_signal']
        
        # Stochastic Oscillator (%K, %D)
        low_14 = df['low'].rolling(window=14).min()
        high_14 = df['high'].rolling(window=14).max()
        df['stoch_k'] = 100 * ((df['close'] - low_14) / (high_14 - low_14))
        df['stoch_d'] = df['stoch_k'].rolling(window=3).mean()
        
        # Commodity Channel Index (CCI)
        typical_price = (df['high'] + df['low'] + df['close']) / 3
        sma_tp = typical_price.rolling(window=20).mean()
        mad = typical_price.rolling(window=20).apply(lambda x: np.abs(x - x.mean()).mean())
        df['cci'] = (typical_price - sma_tp) / (0.015 * mad)
        
        # Williams %R
        high_14 = df['high'].rolling(window=14).max()
        low_14 = df['low'].rolling(window=14).min()
        df['williams_r'] = -100 * ((high_14 - df['close']) / (high_14 - low_14))
        
        # Average True Range (ATR) - ボラティリティ指標
        tr1 = df['high'] - df['low']
        tr2 = abs(df['high'] - df['close'].shift())
        tr3 = abs(df['low'] - df['close'].shift())
        true_range = np.maximum(tr1, np.maximum(tr2, tr3))
        df['atr'] = true_range.rolling(window=14).mean()
        
        # Price Rate of Change (ROC)
        df['roc_10'] = ((df['close'] - df['close'].shift(10)) / df['close'].shift(10)) * 100
        df['roc_20'] = ((df['close'] - df['close'].shift(20)) / df['close'].shift(20)) * 100
        
        # Volume indicators
        df['volume_sma'] = df['volume'].rolling(window=20).mean()
        df['volume_ratio'] = df['volume'] / df['volume_sma']
        df['price_volume'] = df['close'] * df['volume']  # 価格×出来高
        
        # Price position indicators
        df['high_low_ratio'] = df['high'] / df['low']
        df['close_position'] = (df['close'] - df['low']) / (df['high'] - df['low'])
        
        return df
    
    def build_model(self, input_shape: Tuple[int, int]) -> Any:
        """LSTMモデルを構築"""
        model = Sequential([
            # 第1LSTM層
            LSTM(self.config.lstm_units[0], 
                 return_sequences=True, 
                 input_shape=input_shape),
            BatchNormalization(),
            Dropout(self.config.dropout_rate),
            
            # 第2LSTM層
            LSTM(self.config.lstm_units[1], 
                 return_sequences=True),
            BatchNormalization(),
            Dropout(self.config.dropout_rate),
            
            # 第3LSTM層
            LSTM(self.config.lstm_units[2], 
                 return_sequences=False),
            BatchNormalization(),
            Dropout(self.config.dropout_rate),
            
            # 密結合層
            Dense(25, activation='relu'),
            BatchNormalization(),
            Dropout(self.config.dropout_rate),
            
            Dense(1, activation='linear')  # 回帰問題
        ])
        
        # コンパイル
        model.compile(
            optimizer=Adam(learning_rate=self.config.learning_rate),
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def train_model(self, stock_code: str, force_retrain: bool = False) -> Dict[str, float]:
        """LSTMモデルをトレーニング"""
        model_path = os.path.join(self.models_dir, f"{stock_code}_lstm.h5")
        scaler_path = os.path.join(self.models_dir, f"{stock_code}_scaler.pkl")
        
        # 既存モデルがある場合はスキップ（force_retrainがFalseの場合）
        if not force_retrain and os.path.exists(model_path):
            logger.info(f"Loading existing model for {stock_code}")
            try:
                self.models[stock_code] = keras.models.load_model(model_path)
                with open(scaler_path, 'rb') as f:
                    self.scalers[stock_code] = pickle.load(f)
                return self.model_metrics.get(stock_code, {"accuracy": 0.6, "mae": 50.0})
            except Exception as e:
                logger.warning(f"Failed to load existing model for {stock_code}: {e}")
        
        logger.info(f"Training LSTM model for {stock_code}")
        
        # データ準備
        X, y, scaler = self.prepare_data(stock_code)
        
        # 訓練・テストデータ分割
        train_size = int(len(X) * (1 - self.config.validation_split))
        X_train, X_test = X[:train_size], X[train_size:]
        y_train, y_test = y[:train_size], y[train_size:]
        
        # モデル構築
        model = self.build_model((X.shape[1], X.shape[2]))
        
        # コールバック設定
        callbacks = [
            EarlyStopping(
                monitor='val_loss',
                patience=self.config.early_stopping_patience,
                restore_best_weights=True
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=self.config.reduce_lr_patience,
                min_lr=1e-7
            )
        ]
        
        # 訓練
        history = model.fit(
            X_train, y_train,
            batch_size=self.config.batch_size,
            epochs=self.config.epochs,
            validation_data=(X_test, y_test),
            callbacks=callbacks,
            verbose=0
        )
        
        # テストデータで評価
        y_pred = model.predict(X_test)
        # y_predを1次元に変換（終値予想のみ）
        y_pred = y_pred.flatten()
        y_test = y_test.flatten()
        
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        
        # 方向性精度を計算
        directional_accuracy = self.calculate_directional_accuracy(y_test, y_pred)
        
        # メトリクス保存
        metrics = {
            "mse": float(mse),
            "mae": float(mae),
            "accuracy": float(directional_accuracy),
            "train_loss": float(min(history.history['loss'])),
            "val_loss": float(min(history.history['val_loss']))
        }
        
        self.model_metrics[stock_code] = metrics
        self.models[stock_code] = model
        self.scalers[stock_code] = scaler
        
        # モデル保存
        model.save(model_path)
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
        
        logger.info(f"LSTM model trained for {stock_code}: Accuracy={directional_accuracy:.1%}, MAE={mae:.2f}")
        
        return metrics
    
    def calculate_directional_accuracy(self, y_true: np.ndarray, y_pred: np.ndarray) -> float:
        """方向性精度を計算"""
        if len(y_true) <= 1:
            return 0.5
        
        # 前日比の方向を計算
        true_direction = np.sign(np.diff(y_true.flatten()))
        pred_direction = np.sign(np.diff(y_pred.flatten()))
        
        # 方向が一致する割合を計算
        accuracy = np.mean(true_direction == pred_direction)
        return accuracy
    
    def predict(self, stock_code: str, days_ahead: int = 1) -> LSTMPredictionResult:
        """株価予想を実行"""
        if stock_code not in self.models:
            logger.info(f"Training model for {stock_code} (first prediction)")
            self.train_model(stock_code)
        
        model = self.models[stock_code]
        scaler = self.scalers[stock_code]
        
        # 最新データを取得
        with get_session_scope() as session:
            recent_data = session.query(PriceHistory).filter(
                PriceHistory.stock_code == stock_code
            ).order_by(PriceHistory.date.desc()).limit(self.config.sequence_length + 20).all()
            
            recent_data.reverse()  # 時系列順に並び替え
            
            # データフレームに変換
            df = pd.DataFrame([{
                'date': record.date,
                'open': float(record.open_price),
                'high': float(record.high_price),
                'low': float(record.low_price),
                'close': float(record.close_price),
                'volume': int(record.volume)
            } for record in recent_data])
            
            # 技術指標を追加
            df = self.add_technical_indicators(df)
            
            # 特徴量を準備（訓練時と同じセット）
            feature_columns = [
                'close', 'open', 'high', 'low', 'volume',
                'sma_5', 'sma_10', 'sma_20', 'sma_50',
                'ema_12', 'ema_26',
                'bb_upper', 'bb_lower', 'bb_ratio',
                'rsi_7', 'rsi_14', 'rsi_21',
                'macd', 'macd_signal', 'macd_histogram',
                'stoch_k', 'stoch_d',
                'cci', 'williams_r', 'atr',
                'roc_10', 'roc_20',
                'volume_ratio', 'price_volume',
                'high_low_ratio', 'close_position'
            ]
            features = df[feature_columns].ffill().bfill()
            
            # スケーリング
            scaled_data = scaler.transform(features)
            
            # 最新のシーケンスを取得
            latest_sequence = scaled_data[-self.config.sequence_length:].reshape(1, self.config.sequence_length, -1)
            
            # 予想実行
            prediction_scaled = model.predict(latest_sequence, verbose=0)
            
            # 逆スケーリング（終値のインデックスは0）
            prediction_full = np.zeros((1, len(feature_columns)))
            prediction_full[0, 0] = prediction_scaled[0, 0]  # 終値の予想値を設定
            prediction_original = scaler.inverse_transform(prediction_full)
            predicted_price = prediction_original[0, 0]
            
            # 技術指標を計算
            current_price = float(recent_data[-1].close_price)
            technical_indicators = {
                'current_price': current_price,
                'sma_20': float(df['sma_20'].iloc[-1]) if not pd.isna(df['sma_20'].iloc[-1]) else current_price,
                'rsi': float(df['rsi_14'].iloc[-1]) if not pd.isna(df['rsi_14'].iloc[-1]) else 50.0,
                'macd': float(df['macd'].iloc[-1]) if not pd.isna(df['macd'].iloc[-1]) else 0.0
            }
            
            # 信頼度を計算（モデル精度ベース）
            model_accuracy = self.model_metrics.get(stock_code, {}).get('accuracy', 0.6)
            confidence = min(0.95, max(0.5, model_accuracy))
            
            return LSTMPredictionResult(
                stock_code=stock_code,
                predicted_price=max(0, predicted_price),  # 負の価格を防ぐ
                confidence=confidence,
                model_accuracy=model_accuracy,
                sequence_used=scaled_data[-10:, 0].tolist(),  # 最新10日の終値（スケール済み）
                prediction_date=datetime.now(),
                technical_indicators=technical_indicators
            )
    
    def get_model_info(self, stock_code: str) -> Dict[str, Any]:
        """モデル情報を取得"""
        if stock_code not in self.models:
            return {"trained": False, "metrics": {}}
        
        return {
            "trained": True,
            "metrics": self.model_metrics.get(stock_code, {}),
            "config": {
                "sequence_length": self.config.sequence_length,
                "lstm_units": self.config.lstm_units,
                "dropout_rate": self.config.dropout_rate
            }
        }


# グローバルインスタンス（条件付き作成）
lstm_predictor = None
if TENSORFLOW_AVAILABLE and SKLEARN_AVAILABLE:
    try:
        lstm_predictor = LSTMStockPredictor()
    except Exception as e:
        logger.warning(f"Failed to create LSTM predictor instance: {e}")
        lstm_predictor = None