"""
Machine learning model training and prediction for stock prediction system.
"""

import logging
import os
from datetime import date, datetime, timedelta
from typing import Any, Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

from .feature_engineering import FeatureEngineer

logger = logging.getLogger(__name__)


class StockMLModel:
    """Individual ML model for stock prediction."""

    def __init__(self, model_type: str, algorithm: str, version: str = "1.0.0"):
        """
        Initialize ML model.

        Args:
            model_type: "short_term", "medium_term", or "long_term"
            algorithm: "random_forest", "linear_regression", or "svr"
            version: Model version (semantic versioning)
        """
        self.model_type = model_type
        self.algorithm = algorithm
        self.version = version
        self.name = f"{algorithm}_{model_type}"

        self.model = None
        self.scaler = None
        self.feature_names = []
        self.is_trained = False
        self.performance_metrics = {}

        self._initialize_model()

    def _initialize_model(self):
        """Initialize the underlying ML model based on algorithm."""
        if self.algorithm == "random_forest":
            if self.model_type == "short_term":
                # Optimized for 1-5 day predictions
                self.model = RandomForestRegressor(
                    n_estimators=200,
                    max_depth=15,
                    min_samples_split=5,
                    min_samples_leaf=2,
                    random_state=42,
                    n_jobs=-1,
                )
            else:
                # For medium/long term
                self.model = RandomForestRegressor(
                    n_estimators=150,
                    max_depth=12,
                    min_samples_split=10,
                    min_samples_leaf=5,
                    random_state=42,
                    n_jobs=-1,
                )

        elif self.algorithm == "linear_regression":
            # Ridge regression for regularization
            if self.model_type == "long_term":
                self.model = Ridge(alpha=1.0)
            else:
                self.model = Ridge(alpha=0.5)

        elif self.algorithm == "svr":
            # Support Vector Regression
            if self.model_type == "short_term":
                self.model = SVR(kernel="rbf", C=100, gamma="scale", epsilon=0.01)
            else:
                self.model = SVR(kernel="rbf", C=10, gamma="scale", epsilon=0.1)

        else:
            raise ValueError(f"Unsupported algorithm: {self.algorithm}")

        # Initialize scaler for feature normalization
        self.scaler = StandardScaler()

    def train(
        self, X: pd.DataFrame, y: pd.Series, validation_split: float = 0.2
    ) -> Dict[str, Any]:
        """
        Train the model on provided data.

        Args:
            X: Feature matrix
            y: Target values
            validation_split: Fraction of data to use for validation

        Returns:
            Training results and metrics
        """
        logger.info(
            f"Training {self.name} model with {len(X)} samples and {X.shape[1]} features"
        )

        # Store feature names
        self.feature_names = list(X.columns)

        # Remove any infinite or NaN values
        X_clean = X.replace([np.inf, -np.inf], np.nan).fillna(0)
        y_clean = y.fillna(y.mean())

        # Time-based split to avoid data leakage
        split_idx = int(len(X_clean) * (1 - validation_split))
        X_train, X_val = X_clean[:split_idx], X_clean[split_idx:]
        y_train, y_val = y_clean[:split_idx], y_clean[split_idx:]

        # Fit scaler on training data only
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)

        # Train model
        train_start = datetime.now()
        self.model.fit(X_train_scaled, y_train)
        train_duration = datetime.now() - train_start

        # Predictions and metrics
        y_train_pred = self.model.predict(X_train_scaled)
        y_val_pred = self.model.predict(X_val_scaled)

        # Calculate metrics
        train_metrics = self._calculate_metrics(y_train, y_train_pred)
        val_metrics = self._calculate_metrics(y_val, y_val_pred)

        # Store performance metrics
        self.performance_metrics = {
            "train_metrics": train_metrics,
            "validation_metrics": val_metrics,
            "feature_count": len(self.feature_names),
            "training_samples": len(X_train),
            "validation_samples": len(X_val),
            "training_duration_seconds": train_duration.total_seconds(),
            "trained_at": datetime.now().isoformat(),
        }

        # Feature importance (if available)
        if hasattr(self.model, "feature_importances_"):
            feature_importance = dict(
                zip(self.feature_names, self.model.feature_importances_)
            )
            self.performance_metrics["feature_importance"] = dict(
                sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[
                    :20
                ]
            )

        self.is_trained = True
        logger.info(
            f"Model training completed. Validation R²: {val_metrics['r2_score']:.4f}"
        )

        return self.performance_metrics

    def predict(self, X: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Make predictions using the trained model.

        Args:
            X: Feature matrix

        Returns:
            Tuple of (predictions, confidence_scores)
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")

        # Ensure feature consistency
        missing_features = set(self.feature_names) - set(X.columns)
        if missing_features:
            logger.warning(
                f"Missing features: {missing_features}. Adding with zero values."
            )
            for feature in missing_features:
                X[feature] = 0

        # Reorder columns to match training
        X_ordered = X[self.feature_names].copy()

        # Clean and scale features
        X_clean = X_ordered.replace([np.inf, -np.inf], np.nan).fillna(0)
        X_scaled = self.scaler.transform(X_clean)

        # Make predictions
        predictions = self.model.predict(X_scaled)

        # Calculate confidence scores
        confidence_scores = self._calculate_confidence(X_scaled, predictions)

        return predictions, confidence_scores

    def _calculate_confidence(
        self, X_scaled: np.ndarray, predictions: np.ndarray
    ) -> np.ndarray:
        """Calculate confidence scores for predictions."""
        if self.algorithm == "random_forest":
            # Use prediction variance across trees
            tree_predictions = np.array(
                [tree.predict(X_scaled) for tree in self.model.estimators_]
            )
            prediction_std = np.std(tree_predictions, axis=0)
            # Convert to confidence (higher std = lower confidence)
            max_std = np.max(prediction_std) if len(prediction_std) > 0 else 1.0
            confidence = 1.0 - (prediction_std / (max_std + 1e-8))

        elif self.algorithm in ["linear_regression", "svr"]:
            # For linear models, use distance from training data centroid as proxy
            if hasattr(self, "_training_centroid"):
                distances = np.linalg.norm(X_scaled - self._training_centroid, axis=1)
                max_distance = np.max(distances) if len(distances) > 0 else 1.0
                confidence = 1.0 - (distances / (max_distance + 1e-8))
            else:
                confidence = np.full(len(predictions), 0.7)  # Default confidence

        else:
            confidence = np.full(len(predictions), 0.5)  # Default confidence

        # Ensure confidence is between 0 and 1
        confidence = np.clip(confidence, 0.1, 0.95)

        return confidence

    def _calculate_metrics(
        self, y_true: np.ndarray, y_pred: np.ndarray
    ) -> Dict[str, float]:
        """Calculate regression metrics."""
        return {
            "mae": float(mean_absolute_error(y_true, y_pred)),
            "mse": float(mean_squared_error(y_true, y_pred)),
            "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
            "r2_score": float(r2_score(y_true, y_pred)),
            "mean_absolute_percentage_error": float(
                np.mean(np.abs((y_true - y_pred) / y_true)) * 100
            ),
        }

    def save_model(self, file_path: str) -> bool:
        """Save trained model to disk."""
        try:
            if not self.is_trained:
                raise ValueError("Cannot save untrained model")

            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            model_data = {
                "model": self.model,
                "scaler": self.scaler,
                "feature_names": self.feature_names,
                "model_type": self.model_type,
                "algorithm": self.algorithm,
                "version": self.version,
                "performance_metrics": self.performance_metrics,
                "is_trained": self.is_trained,
            }

            joblib.dump(model_data, file_path)
            logger.info(f"Model saved to {file_path}")
            return True

        except Exception as e:
            logger.error(f"Failed to save model: {e}")
            return False

    def load_model(self, file_path: str) -> bool:
        """Load trained model from disk."""
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Model file not found: {file_path}")

            model_data = joblib.load(file_path)

            self.model = model_data["model"]
            self.scaler = model_data["scaler"]
            self.feature_names = model_data["feature_names"]
            self.model_type = model_data["model_type"]
            self.algorithm = model_data["algorithm"]
            self.version = model_data["version"]
            self.performance_metrics = model_data["performance_metrics"]
            self.is_trained = model_data["is_trained"]

            logger.info(f"Model loaded from {file_path}")
            return True

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False


class MLModelManager:
    """Manager for multiple ML models and ensemble predictions."""

    def __init__(self, models_dir: str = "data/models"):
        """
        Initialize model manager.

        Args:
            models_dir: Directory to store trained models
        """
        self.models_dir = models_dir
        self.models: Dict[str, StockMLModel] = {}
        self.feature_engineer = FeatureEngineer()

        os.makedirs(self.models_dir, exist_ok=True)

    def add_model(self, model_type: str, algorithm: str) -> str:
        """Add a new model to the ensemble."""
        model = StockMLModel(model_type, algorithm)
        model_key = f"{model_type}_{algorithm}"
        self.models[model_key] = model
        logger.info(f"Added model: {model_key}")
        return model_key

    def train_model(
        self, model_key: str, stock_data: pd.DataFrame, target_horizon_days: int = 1
    ) -> Dict[str, Any]:
        """
        Train a specific model.

        Args:
            model_key: Model identifier
            stock_data: Historical stock data
            target_horizon_days: Days ahead to predict

        Returns:
            Training results
        """
        if model_key not in self.models:
            raise ValueError(f"Model not found: {model_key}")

        model = self.models[model_key]

        # Create features
        featured_data = self.feature_engineer.create_features(stock_data)

        # Select appropriate target variable
        if target_horizon_days == 1:
            target_col = "target_return"
        elif target_horizon_days <= 5:
            target_col = (
                "target_return_3d" if target_horizon_days <= 3 else "target_return_5d"
            )
        else:
            target_col = "target_return_10d"

        # Prepare training data
        feature_names = self.feature_engineer.get_feature_names()
        X = featured_data[feature_names].copy()
        y = featured_data[target_col].copy()

        # Remove rows with missing targets
        valid_mask = ~(X.isna().all(axis=1) | y.isna())
        X = X[valid_mask]
        y = y[valid_mask]

        if len(X) < 50:
            raise ValueError(f"Insufficient training data: {len(X)} samples")

        # Train model
        results = model.train(X, y)

        # Save model
        model_file = os.path.join(
            self.models_dir, f"{model_key}_v{model.version}.joblib"
        )
        model.save_model(model_file)
        results["model_file_path"] = model_file

        logger.info(f"Model {model_key} trained successfully")
        return results

    def predict_ensemble(
        self, stock_data: pd.DataFrame, target_date: date = None
    ) -> Dict[str, Any]:
        """
        Make ensemble predictions using all trained models.

        Args:
            stock_data: Recent stock data for prediction
            target_date: Date to predict for (default: tomorrow)

        Returns:
            Ensemble prediction results
        """
        if target_date is None:
            target_date = date.today() + timedelta(days=1)

        # Create features
        featured_data = self.feature_engineer.create_features(stock_data)
        if len(featured_data) == 0:
            raise ValueError("No valid feature data for prediction")

        # Use most recent data point
        latest_features = featured_data.iloc[-1:]
        feature_names = self.feature_engineer.get_feature_names()
        X = latest_features[feature_names]

        predictions = {}
        confidences = {}
        weights = {}

        # Get predictions from all trained models
        for model_key, model in self.models.items():
            if model.is_trained:
                try:
                    pred, conf = model.predict(X)
                    predictions[model_key] = pred[0]
                    confidences[model_key] = conf[0]

                    # Weight based on recent validation performance
                    val_r2 = model.performance_metrics.get(
                        "validation_metrics", {}
                    ).get("r2_score", 0.5)
                    weights[model_key] = max(val_r2, 0.1)  # Minimum weight of 0.1

                except Exception as e:
                    logger.warning(f"Prediction failed for {model_key}: {e}")

        if not predictions:
            raise ValueError("No trained models available for prediction")

        # Calculate weighted ensemble prediction
        total_weight = sum(weights.values())
        weighted_prediction = (
            sum(pred * weights[key] for key, pred in predictions.items()) / total_weight
        )
        weighted_confidence = (
            sum(conf * weights[key] for key, conf in confidences.items()) / total_weight
        )

        # Determine trading action based on prediction
        if weighted_prediction > 0.02:  # >2% expected return
            action = "buy"
        elif weighted_prediction < -0.02:  # <-2% expected return
            action = "sell"
        else:
            action = "hold"

        # Calculate predicted price
        current_price = stock_data["close"].iloc[-1]
        predicted_price = current_price * (1 + weighted_prediction)

        return {
            "predicted_price": float(predicted_price),
            "predicted_return": float(weighted_prediction),
            "predicted_action": action,
            "confidence_score": float(weighted_confidence),
            "individual_predictions": {
                key: {
                    "prediction": float(pred),
                    "confidence": float(confidences[key]),
                    "weight": float(weights[key] / total_weight),
                }
                for key, pred in predictions.items()
            },
            "target_date": target_date.isoformat(),
            "prediction_date": date.today().isoformat(),
            "models_used": list(predictions.keys()),
        }

    def load_models_from_directory(self) -> Dict[str, bool]:
        """Load all available models from the models directory."""
        results = {}

        for filename in os.listdir(self.models_dir):
            if filename.endswith(".joblib"):
                try:
                    # Parse model key from filename
                    model_key = filename.replace(".joblib", "").rsplit("_v", 1)[0]

                    # Create model instance if not exists
                    if model_key not in self.models:
                        parts = model_key.split("_")
                        if len(parts) >= 2:
                            model_type = parts[0]
                            algorithm = "_".join(parts[1:])
                            self.add_model(model_type, algorithm)

                    # Load model
                    file_path = os.path.join(self.models_dir, filename)
                    results[model_key] = self.models[model_key].load_model(file_path)

                except Exception as e:
                    logger.error(f"Failed to load model {filename}: {e}")
                    results[filename] = False

        return results

    def get_model_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all models."""
        status = {}
        for model_key, model in self.models.items():
            status[model_key] = {
                "is_trained": model.is_trained,
                "model_type": model.model_type,
                "algorithm": model.algorithm,
                "version": model.version,
                "feature_count": len(model.feature_names) if model.feature_names else 0,
                "performance_metrics": model.performance_metrics,
            }
        return status
