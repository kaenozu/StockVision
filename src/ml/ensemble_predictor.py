"""
軽量MLアンサンブル予想エンジン - Random Forest + SVM
"""

import logging
import os
import pickle
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

from ..models.price_history import PriceHistory
from ..stock_storage.database import get_session_scope

logger = logging.getLogger(__name__)


@dataclass
class EnsemblePredictionResult:
    """アンサンブル予想結果"""

    stock_code: str
    predicted_price: float
    confidence: float
    model_accuracy: float
    technical_indicators: Dict[str, float]
    prediction_date: datetime
    feature_importance: Dict[str, float]


class EnsemblePredictor:
    """Random Forest + SVM アンサンブル予想エンジン"""

    def __init__(self, lookback_days: int = 20):
        self.lookback_days = lookback_days
        self.models: Dict[str, Dict] = {}  # 銘柄別モデル
        self.scalers: Dict[str, StandardScaler] = {}
        self.model_metrics: Dict[str, Dict] = {}
        self.models_dir = "data/models/ensemble"

        # モデル保存ディレクトリを作成
        os.makedirs(self.models_dir, exist_ok=True)

    def calculate_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """技術指標を計算"""
        # 基本移動平均
        df["sma_5"] = df["close"].rolling(window=5).mean()
        df["sma_10"] = df["close"].rolling(window=10).mean()
        df["sma_20"] = df["close"].rolling(window=20).mean()

        # ボリンジャーバンド
        bb_std = df["close"].rolling(window=20).std()
        df["bb_upper"] = df["sma_20"] + (bb_std * 2)
        df["bb_lower"] = df["sma_20"] - (bb_std * 2)
        df["bb_ratio"] = (df["close"] - df["bb_lower"]) / (
            df["bb_upper"] - df["bb_lower"]
        )

        # RSI
        delta = df["close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df["rsi"] = 100 - (100 / (1 + rs))

        # MACD
        ema_12 = df["close"].ewm(span=12).mean()
        ema_26 = df["close"].ewm(span=26).mean()
        df["macd"] = ema_12 - ema_26
        df["macd_signal"] = df["macd"].ewm(span=9).mean()
        df["macd_histogram"] = df["macd"] - df["macd_signal"]

        # 価格変動率
        df["price_change_1d"] = df["close"].pct_change()
        df["price_change_5d"] = df["close"].pct_change(5)
        df["price_change_10d"] = df["close"].pct_change(10)

        # ボリューム指標
        df["volume_sma"] = df["volume"].rolling(window=20).mean()
        df["volume_ratio"] = df["volume"] / df["volume_sma"]

        # 高値・安値関連
        df["high_low_ratio"] = df["high"] / df["low"]
        df["close_high_ratio"] = df["close"] / df["high"]
        df["close_low_ratio"] = df["close"] / df["low"]

        return df

    def prepare_features(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """特徴量とターゲット（次の日の終値）を準備"""
        # 技術指標を計算
        df = self.calculate_technical_indicators(df)

        # 特徴量を選択
        feature_columns = [
            "sma_5",
            "sma_10",
            "sma_20",
            "bb_upper",
            "bb_lower",
            "bb_ratio",
            "rsi",
            "macd",
            "macd_signal",
            "macd_histogram",
            "price_change_1d",
            "price_change_5d",
            "price_change_10d",
            "volume_ratio",
            "high_low_ratio",
            "close_high_ratio",
            "close_low_ratio",
        ]

        # NaN値を前方埋め・後方埋めで処理
        df = df[feature_columns + ["close"]].ffill().bfill()

        # 特徴量行列作成（過去N日分）
        features_list = []
        targets = []

        for i in range(self.lookback_days, len(df) - 1):
            # 過去N日分の特徴量
            feature_window = (
                df[feature_columns].iloc[i - self.lookback_days : i].values.flatten()
            )
            features_list.append(feature_window)

            # 翌日の終値をターゲット
            targets.append(df["close"].iloc[i + 1])

        return np.array(features_list), np.array(targets)

    def train_model(
        self, stock_code: str, force_retrain: bool = False
    ) -> Dict[str, float]:
        """アンサンブルモデルを訓練"""
        model_path = os.path.join(self.models_dir, f"{stock_code}_ensemble.pkl")
        scaler_path = os.path.join(self.models_dir, f"{stock_code}_scaler.pkl")

        # 既存モデルがある場合はスキップ
        if not force_retrain and os.path.exists(model_path):
            logger.info(f"Loading existing model for {stock_code}")
            try:
                with open(model_path, "rb") as f:
                    self.models[stock_code] = pickle.load(f)
                with open(scaler_path, "rb") as f:
                    self.scalers[stock_code] = pickle.load(f)
                return self.model_metrics.get(
                    stock_code, {"accuracy": 0.6, "mae": 50.0}
                )
            except Exception as e:
                logger.warning(f"Failed to load existing model for {stock_code}: {e}")

        logger.info(f"Training ensemble model for {stock_code}")

        # データを取得
        with get_session_scope() as session:
            price_history = (
                session.query(PriceHistory)
                .filter(PriceHistory.stock_code == stock_code)
                .order_by(PriceHistory.date.desc())
                .limit(500)
                .all()
            )

            if len(price_history) < self.lookback_days + 50:
                raise ValueError(
                    f"Insufficient data for {stock_code}. Need at least {self.lookback_days + 50} days."
                )

            # 時系列順に並び替え
            price_history.reverse()

            # データフレームに変換
            df = pd.DataFrame(
                [
                    {
                        "date": record.date,
                        "open": float(record.open_price),
                        "high": float(record.high_price),
                        "low": float(record.low_price),
                        "close": float(record.close_price),
                        "volume": int(record.volume),
                    }
                    for record in price_history
                ]
            )

        # 特徴量とターゲットを準備
        X, y = self.prepare_features(df)

        if len(X) < 50:
            raise ValueError(f"Not enough samples for training: {len(X)}")

        # 訓練・テストデータ分割
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, shuffle=False
        )

        # スケーリング
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Random Forest モデル
        rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
        )

        # SVM モデル
        svm_model = SVR(kernel="rbf", C=100.0, gamma="scale")

        # モデル訓練
        rf_model.fit(X_train_scaled, y_train)
        svm_model.fit(X_train_scaled, y_train)

        # 予測
        # rf_pred_train = rf_model.predict(X_train_scaled) # Commented out as it's unused
        rf_pred_test = rf_model.predict(X_test_scaled)

        # svm_pred_train = svm_model.predict(X_train_scaled) # Commented out as it's unused
        svm_pred_test = svm_model.predict(X_test_scaled)

        # アンサンブル予測（加重平均）
        rf_weight = 0.6  # Random Forestの重み
        svm_weight = 0.4  # SVMの重み

        ensemble_pred_test = rf_weight * rf_pred_test + svm_weight * svm_pred_test

        # 精度評価
        mse = mean_squared_error(y_test, ensemble_pred_test)
        mae = mean_absolute_error(y_test, ensemble_pred_test)
        rmse = np.sqrt(mse)

        # 方向性精度を計算
        actual_direction = np.sign(np.diff(y_test))
        pred_direction = np.sign(np.diff(ensemble_pred_test))
        directional_accuracy = np.mean(actual_direction == pred_direction)

        # メトリクス保存
        metrics = {
            "mse": float(mse),
            "mae": float(mae),
            "rmse": float(rmse),
            "accuracy": float(directional_accuracy),
        }

        # 特徴重要度（Random Forestから取得）
        feature_names = [f"feature_{i}" for i in range(X.shape[1])]
        feature_importance = dict(zip(feature_names, rf_model.feature_importances_))

        # モデルとスケーラーを保存
        model_data = {
            "rf_model": rf_model,
            "svm_model": svm_model,
            "rf_weight": rf_weight,
            "svm_weight": svm_weight,
            "feature_importance": feature_importance,
        }

        self.models[stock_code] = model_data
        self.scalers[stock_code] = scaler
        self.model_metrics[stock_code] = metrics

        # ファイルに保存
        with open(model_path, "wb") as f:
            pickle.dump(model_data, f)
        with open(scaler_path, "wb") as f:
            pickle.dump(scaler, f)

        logger.info(
            f"Ensemble model trained for {stock_code}: "
            f"RMSE={rmse:.2f}, MAE={mae:.2f}, Dir Accuracy={directional_accuracy:.1%}"
        )

        return metrics

    def predict(self, stock_code: str) -> EnsemblePredictionResult:
        """株価予想を実行"""
        if stock_code not in self.models:
            logger.info(f"Training model for {stock_code} (first prediction)")
            self.train_model(stock_code)

        model_data = self.models[stock_code]
        scaler = self.scalers[stock_code]

        # 最新データを取得
        with get_session_scope() as session:
            recent_data = (
                session.query(PriceHistory)
                .filter(PriceHistory.stock_code == stock_code)
                .order_by(PriceHistory.date.desc())
                .limit(self.lookback_days + 20)
                .all()
            )

            recent_data.reverse()  # 時系列順に並び替え

            # データフレームに変換
            df = pd.DataFrame(
                [
                    {
                        "date": record.date,
                        "open": float(record.open_price),
                        "high": float(record.high_price),
                        "low": float(record.low_price),
                        "close": float(record.close_price),
                        "volume": int(record.volume),
                    }
                    for record in recent_data
                ]
            )

        # 技術指標を計算
        df = self.calculate_technical_indicators(df)

        # 特徴量を準備
        feature_columns = [
            "sma_5",
            "sma_10",
            "sma_20",
            "bb_upper",
            "bb_lower",
            "bb_ratio",
            "rsi",
            "macd",
            "macd_signal",
            "macd_histogram",
            "price_change_1d",
            "price_change_5d",
            "price_change_10d",
            "volume_ratio",
            "high_low_ratio",
            "close_high_ratio",
            "close_low_ratio",
        ]

        # NaN値処理
        df = df[feature_columns + ["close"]].ffill().bfill()

        # 最新の特徴量ウィンドウ
        latest_features = (
            df[feature_columns].iloc[-self.lookback_days :].values.flatten()
        )
        latest_features = latest_features.reshape(1, -1)

        # スケーリング
        latest_features_scaled = scaler.transform(latest_features)

        # 予測実行
        rf_pred = model_data["rf_model"].predict(latest_features_scaled)[0]
        svm_pred = model_data["svm_model"].predict(latest_features_scaled)[0]

        # アンサンブル予測
        predicted_price = (
            model_data["rf_weight"] * rf_pred + model_data["svm_weight"] * svm_pred
        )

        # 技術指標を計算
        current_price = float(recent_data[-1].close_price)
        technical_indicators = {
            "current_price": current_price,
            "sma_20": (
                float(df["sma_20"].iloc[-1])
                if not pd.isna(df["sma_20"].iloc[-1])
                else current_price
            ),
            "rsi": (
                float(df["rsi"].iloc[-1]) if not pd.isna(df["rsi"].iloc[-1]) else 50.0
            ),
            "macd": (
                float(df["macd"].iloc[-1]) if not pd.isna(df["macd"].iloc[-1]) else 0.0
            ),
            "bb_ratio": (
                float(df["bb_ratio"].iloc[-1])
                if not pd.isna(df["bb_ratio"].iloc[-1])
                else 0.5
            ),
        }

        # 信頼度計算（モデル精度ベース）
        model_accuracy = self.model_metrics.get(stock_code, {}).get("accuracy", 0.6)
        confidence = min(0.95, max(0.5, model_accuracy))

        return EnsemblePredictionResult(
            stock_code=stock_code,
            predicted_price=max(0, predicted_price),  # 負の価格を防ぐ
            confidence=confidence,
            model_accuracy=model_accuracy,
            technical_indicators=technical_indicators,
            prediction_date=datetime.now(),
            feature_importance=model_data.get("feature_importance", {}),
        )

    def get_model_info(self, stock_code: str) -> Dict[str, Any]:
        """モデル情報を取得"""
        if stock_code not in self.models:
            return {"trained": False, "metrics": {}}

        return {
            "trained": True,
            "metrics": self.model_metrics.get(stock_code, {}),
            "feature_importance": self.models[stock_code].get("feature_importance", {}),
            "config": {
                "lookback_days": self.lookback_days,
                "rf_weight": self.models[stock_code].get("rf_weight", 0.6),
                "svm_weight": self.models[stock_code].get("svm_weight", 0.4),
            },
        }


# グローバルインスタンス
ensemble_predictor = EnsemblePredictor()
