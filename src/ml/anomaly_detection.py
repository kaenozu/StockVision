"""
Market anomaly detection for stock prediction gating.
"""

import logging
from datetime import date
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class MarketAnomalyDetector:
    """Detect market anomalies that should gate ML predictions."""

    def __init__(self, lookback_days: int = 60, volatility_threshold: float = 2.0):
        """
        Initialize anomaly detector.

        Args:
            lookback_days: Days of history to use for baseline calculation
            volatility_threshold: Z-score threshold for volatility anomalies
        """
        self.lookback_days = lookback_days
        self.volatility_threshold = volatility_threshold
        self.baseline_stats = {}

    def detect_anomalies(
        self, stock_data: pd.DataFrame, stock_code: str = None
    ) -> Dict[str, Any]:
        """
        Detect various types of market anomalies.

        Args:
            stock_data: Historical stock price data
            stock_code: Stock symbol (optional, for stock-specific analysis)

        Returns:
            Anomaly detection results
        """
        logger.info(f"Detecting anomalies for {stock_code or 'market data'}")

        # Ensure data is sorted by date
        data = stock_data.sort_values("date").copy()

        # Calculate baseline statistics
        self._calculate_baseline(data)

        anomalies = {
            "detection_date": date.today().isoformat(),
            "stock_code": stock_code,
            "anomalies_detected": [],
            "overall_anomaly_level": "normal",
            "prediction_gate_action": "allow",
            "metrics": {},
        }

        # Price volatility anomaly
        volatility_anomaly = self._detect_volatility_anomaly(data)
        if volatility_anomaly:
            anomalies["anomalies_detected"].append(volatility_anomaly)

        # Price gap anomaly
        gap_anomaly = self._detect_price_gap_anomaly(data)
        if gap_anomaly:
            anomalies["anomalies_detected"].append(gap_anomaly)

        # Volume anomaly
        volume_anomaly = self._detect_volume_anomaly(data)
        if volume_anomaly:
            anomalies["anomalies_detected"].append(volume_anomaly)

        # Price movement anomaly
        movement_anomaly = self._detect_price_movement_anomaly(data)
        if movement_anomaly:
            anomalies["anomalies_detected"].append(movement_anomaly)

        # Trend reversal anomaly
        reversal_anomaly = self._detect_trend_reversal_anomaly(data)
        if reversal_anomaly:
            anomalies["anomalies_detected"].append(reversal_anomaly)

        # Market structure anomaly (if market-wide data available)
        if stock_code is None:  # Market-wide analysis
            structure_anomaly = self._detect_market_structure_anomaly(data)
            if structure_anomaly:
                anomalies["anomalies_detected"].append(structure_anomaly)

        # Determine overall anomaly level
        anomalies["overall_anomaly_level"] = self._calculate_overall_anomaly_level(
            anomalies["anomalies_detected"]
        )

        # Determine prediction gating action
        anomalies["prediction_gate_action"] = self._determine_gate_action(
            anomalies["overall_anomaly_level"], anomalies["anomalies_detected"]
        )

        # Add current metrics for reference
        anomalies["metrics"] = self._get_current_metrics(data)

        logger.info(
            f"Anomaly detection completed. Level: {anomalies['overall_anomaly_level']}, "
            f"Action: {anomalies['prediction_gate_action']}"
        )

        return anomalies

    def _calculate_baseline(self, data: pd.DataFrame):
        """Calculate baseline statistics for anomaly detection."""
        if len(data) < self.lookback_days:
            logger.warning(
                f"Insufficient data for baseline calculation: {len(data)} days"
            )
            return

        # Use last N days for baseline
        baseline_data = data.tail(self.lookback_days).copy()

        # Calculate returns
        baseline_data["returns"] = baseline_data["close"].pct_change()
        baseline_data["log_returns"] = np.log(
            baseline_data["close"] / baseline_data["close"].shift(1)
        )

        # Price statistics
        self.baseline_stats["price_mean"] = baseline_data["close"].mean()
        self.baseline_stats["price_std"] = baseline_data["close"].std()

        # Return statistics
        self.baseline_stats["return_mean"] = baseline_data["returns"].mean()
        self.baseline_stats["return_std"] = baseline_data["returns"].std()
        self.baseline_stats["return_skewness"] = baseline_data["returns"].skew()
        self.baseline_stats["return_kurtosis"] = baseline_data["returns"].kurtosis()

        # Volatility statistics
        baseline_data["volatility"] = baseline_data["returns"].rolling(
            window=20
        ).std() * np.sqrt(252)
        self.baseline_stats["volatility_mean"] = baseline_data["volatility"].mean()
        self.baseline_stats["volatility_std"] = baseline_data["volatility"].std()

        # Volume statistics
        self.baseline_stats["volume_mean"] = baseline_data["volume"].mean()
        self.baseline_stats["volume_std"] = baseline_data["volume"].std()

        # Gap statistics (overnight price changes)
        baseline_data["gap"] = (
            baseline_data["open"] - baseline_data["close"].shift(1)
        ) / baseline_data["close"].shift(1)
        self.baseline_stats["gap_mean"] = baseline_data["gap"].mean()
        self.baseline_stats["gap_std"] = baseline_data["gap"].std()

    def _detect_volatility_anomaly(
        self, data: pd.DataFrame
    ) -> Optional[Dict[str, Any]]:
        """Detect abnormal volatility spikes."""
        if len(data) < 20:
            return None

        # Calculate recent volatility
        data = data.copy()
        data["returns"] = data["close"].pct_change()
        recent_volatility = data["returns"].tail(20).std() * np.sqrt(252)

        if "volatility_mean" not in self.baseline_stats:
            return None

        # Z-score calculation
        volatility_z_score = (
            recent_volatility - self.baseline_stats["volatility_mean"]
        ) / (self.baseline_stats["volatility_std"] + 1e-8)

        if abs(volatility_z_score) > self.volatility_threshold:
            anomaly_level = "high" if abs(volatility_z_score) > 3.0 else "medium"

            return {
                "type": "volatility_spike",
                "level": anomaly_level,
                "metrics": {
                    "current_volatility": float(recent_volatility),
                    "baseline_volatility": float(
                        self.baseline_stats["volatility_mean"]
                    ),
                    "z_score": float(volatility_z_score),
                },
                "description": f"Volatility spike detected (Z-score: {volatility_z_score:.2f})",
                "impact": "Prediction accuracy may be reduced during high volatility periods",
            }

        return None

    def _detect_price_gap_anomaly(self, data: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Detect abnormal price gaps (overnight changes)."""
        if len(data) < 5:
            return None

        # Calculate most recent gap
        latest_data = data.tail(2)
        if len(latest_data) < 2:
            return None

        current_gap = (
            latest_data["open"].iloc[-1] - latest_data["close"].iloc[-2]
        ) / latest_data["close"].iloc[-2]

        if "gap_std" not in self.baseline_stats or self.baseline_stats["gap_std"] == 0:
            return None

        # Z-score for gap size
        gap_z_score = (
            current_gap - self.baseline_stats["gap_mean"]
        ) / self.baseline_stats["gap_std"]

        if abs(gap_z_score) > 2.0:  # 2 standard deviations
            anomaly_level = "high" if abs(gap_z_score) > 3.0 else "medium"
            gap_direction = "up" if current_gap > 0 else "down"

            return {
                "type": f"price_gap_{gap_direction}",
                "level": anomaly_level,
                "metrics": {
                    "gap_percentage": float(current_gap * 100),
                    "gap_z_score": float(gap_z_score),
                    "baseline_gap_mean": float(self.baseline_stats["gap_mean"] * 100),
                },
                "description": f"Large price gap detected: {current_gap*100:.2f}% (Z-score: {gap_z_score:.2f})",
                "impact": "Gap events may indicate fundamental changes not captured by technical models",
            }

        return None

    def _detect_volume_anomaly(self, data: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Detect abnormal trading volume."""
        if len(data) < 5:
            return None

        recent_volume = data["volume"].tail(5).mean()

        if (
            "volume_std" not in self.baseline_stats
            or self.baseline_stats["volume_std"] == 0
        ):
            return None

        # Z-score for volume
        volume_z_score = (
            recent_volume - self.baseline_stats["volume_mean"]
        ) / self.baseline_stats["volume_std"]

        if volume_z_score > 2.0:  # Unusually high volume
            anomaly_level = "high" if volume_z_score > 3.0 else "medium"

            return {
                "type": "volume_spike",
                "level": anomaly_level,
                "metrics": {
                    "current_volume": int(recent_volume),
                    "baseline_volume": int(self.baseline_stats["volume_mean"]),
                    "volume_ratio": float(
                        recent_volume / self.baseline_stats["volume_mean"]
                    ),
                    "z_score": float(volume_z_score),
                },
                "description": f"Volume spike detected: {volume_z_score:.2f}x normal volume",
                "impact": "High volume may indicate news events or institutional activity",
            }

        return None

    def _detect_price_movement_anomaly(
        self, data: pd.DataFrame
    ) -> Optional[Dict[str, Any]]:
        """Detect abnormal price movements."""
        if len(data) < 5:
            return None

        # Recent price changes
        data = data.copy()
        data["returns"] = data["close"].pct_change()
        recent_returns = data["returns"].tail(5)

        if (
            "return_std" not in self.baseline_stats
            or self.baseline_stats["return_std"] == 0
        ):
            return None

        # Check for consecutive large moves
        large_moves = abs(recent_returns) > (2 * self.baseline_stats["return_std"])
        consecutive_moves = large_moves.sum()

        # Check for single very large move
        max_recent_return = abs(recent_returns).max()
        max_z_score = max_recent_return / self.baseline_stats["return_std"]

        if consecutive_moves >= 3 or max_z_score > 3.0:
            anomaly_level = (
                "high" if (consecutive_moves >= 4 or max_z_score > 4.0) else "medium"
            )

            return {
                "type": "abnormal_price_movement",
                "level": anomaly_level,
                "metrics": {
                    "consecutive_large_moves": int(consecutive_moves),
                    "max_return_z_score": float(max_z_score),
                    "recent_returns": [
                        float(r) for r in recent_returns if not np.isnan(r)
                    ],
                },
                "description": "Abnormal price movement pattern detected",
                "impact": "Unusual price patterns may indicate model assumptions are invalid",
            }

        return None

    def _detect_trend_reversal_anomaly(
        self, data: pd.DataFrame
    ) -> Optional[Dict[str, Any]]:
        """Detect sudden trend reversals."""
        if len(data) < 20:
            return None

        # Calculate recent trends
        recent_20d = data.tail(20).copy()
        recent_5d = data.tail(5).copy()

        # Linear regression slopes (trend strength)
        def calculate_trend(prices):
            if len(prices) < 3:
                return 0
            x = np.arange(len(prices))
            return np.polyfit(x, prices, 1)[0]

        trend_20d = calculate_trend(recent_20d["close"])
        trend_5d = calculate_trend(recent_5d["close"])

        # Detect reversal (opposite signs with significant magnitude)
        if trend_20d * trend_5d < 0 and abs(trend_5d) > abs(trend_20d) * 1.5:
            reversal_strength = abs(trend_5d) / (abs(trend_20d) + 1e-8)
            anomaly_level = "high" if reversal_strength > 3.0 else "medium"

            return {
                "type": "trend_reversal",
                "level": anomaly_level,
                "metrics": {
                    "long_term_trend": float(trend_20d),
                    "short_term_trend": float(trend_5d),
                    "reversal_strength": float(reversal_strength),
                },
                "description": f"Trend reversal detected (strength: {reversal_strength:.2f})",
                "impact": "Trend reversals may invalidate momentum-based predictions",
            }

        return None

    def _detect_market_structure_anomaly(
        self, data: pd.DataFrame
    ) -> Optional[Dict[str, Any]]:
        """Detect market-wide structural anomalies."""
        if len(data) < 30:
            return None

        # Market efficiency metrics
        data = data.copy()
        data["returns"] = data["close"].pct_change()

        # Hurst exponent (measure of market efficiency)
        returns = data["returns"].dropna().tail(30)
        if len(returns) < 20:
            return None

        try:
            hurst_exponent = self._calculate_hurst_exponent(returns.values)

            # Normal market: Hurst ≈ 0.5, trending: > 0.5, mean-reverting: < 0.5
            if hurst_exponent < 0.3 or hurst_exponent > 0.7:
                anomaly_level = "medium"
                market_regime = "trending" if hurst_exponent > 0.5 else "mean_reverting"

                return {
                    "type": f"market_structure_{market_regime}",
                    "level": anomaly_level,
                    "metrics": {
                        "hurst_exponent": float(hurst_exponent),
                        "market_regime": market_regime,
                    },
                    "description": f"Market structure anomaly: {market_regime} regime (H={hurst_exponent:.3f})",
                    "impact": f"Models may need adjustment for {market_regime} market conditions",
                }

        except Exception as e:
            logger.warning(f"Failed to calculate Hurst exponent: {e}")

        return None

    def _calculate_hurst_exponent(
        self, returns: np.ndarray, max_lag: int = 10
    ) -> float:
        """Calculate Hurst exponent using R/S analysis."""
        n = len(returns)
        if n < max_lag * 2:
            max_lag = n // 2

        rs_values = []
        lag_values = range(2, max_lag + 1)

        for lag in lag_values:
            # Split series into subsequences of length lag
            subsequences = [returns[i : i + lag] for i in range(0, n - lag + 1, lag)]
            subsequences = [seq for seq in subsequences if len(seq) == lag]

            if len(subsequences) < 2:
                continue

            rs_sum = 0
            for seq in subsequences:
                mean_seq = np.mean(seq)
                cumulative_deviations = np.cumsum(seq - mean_seq)
                R = np.max(cumulative_deviations) - np.min(cumulative_deviations)
                S = np.std(seq)
                if S > 0:
                    rs_sum += R / S

            rs_values.append(rs_sum / len(subsequences))

        if len(rs_values) < 3:
            return 0.5  # Default to random walk

        # Linear regression of log(R/S) vs log(lag)
        log_lags = np.log(list(lag_values)[: len(rs_values)])
        log_rs = np.log(rs_values)

        hurst_exponent = np.polyfit(log_lags, log_rs, 1)[0]
        return np.clip(hurst_exponent, 0.0, 1.0)

    def _calculate_overall_anomaly_level(self, anomalies: List[Dict[str, Any]]) -> str:
        """Calculate overall anomaly level from individual anomalies."""
        if not anomalies:
            return "normal"

        high_count = sum(1 for a in anomalies if a["level"] == "high")
        medium_count = sum(1 for a in anomalies if a["level"] == "medium")

        if high_count >= 2 or (high_count >= 1 and medium_count >= 2):
            return "critical"
        elif high_count >= 1 or medium_count >= 3:
            return "high"
        elif medium_count >= 1:
            return "medium"
        else:
            return "low"

    def _determine_gate_action(
        self, overall_level: str, anomalies: List[Dict[str, Any]]
    ) -> str:
        """Determine what action to take for ML predictions."""
        if overall_level == "critical":
            return "block"
        elif overall_level == "high":
            # Check if any anomaly specifically affects prediction models
            model_affecting_types = [
                "volatility_spike",
                "trend_reversal",
                "market_structure_trending",
            ]
            has_model_affecting = any(
                a["type"] in model_affecting_types for a in anomalies
            )
            return "suspend" if has_model_affecting else "warning"
        elif overall_level == "medium":
            return "warning"
        else:
            return "allow"

    def _get_current_metrics(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Get current market metrics for context."""
        if len(data) < 5:
            return {}

        recent_data = data.tail(5)
        current_data = data.tail(1)

        metrics = {
            "current_price": float(current_data["close"].iloc[0]),
            "current_volume": int(current_data["volume"].iloc[0]),
            "5d_volatility": float(
                recent_data["close"].pct_change().std() * np.sqrt(252)
            ),
            "5d_return": float(
                (recent_data["close"].iloc[-1] / recent_data["close"].iloc[0] - 1)
            ),
        }

        if self.baseline_stats:
            metrics.update(
                {
                    "price_vs_baseline": float(
                        metrics["current_price"] / self.baseline_stats["price_mean"]
                    ),
                    "volume_vs_baseline": float(
                        metrics["current_volume"] / self.baseline_stats["volume_mean"]
                    ),
                    "volatility_vs_baseline": float(
                        metrics["5d_volatility"]
                        / self.baseline_stats["volatility_mean"]
                    ),
                }
            )

        return metrics
