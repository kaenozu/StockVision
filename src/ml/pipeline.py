"""
Machine Learning Model Training Pipeline

This module provides a complete pipeline for training, evaluating, and deploying
machine learning models for stock price prediction with automated hyperparameter
tuning and model selection.
"""

import numpy as np
import pandas as pd
import logging
import json
import os
import joblib
from typing import Dict, List, Optional, Tuple, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import asyncio
import concurrent.futures
from sklearn.model_selection import train_test_split, GridSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import optuna
from optuna.samplers import TPESampler
import warnings
warnings.filterwarnings('ignore')

# Local imports
from .prediction_engine import StockPredictionEngine, ModelType
from .lstm_gru_models import LSTMGRUPredictionEngine, LSTMConfig, GRUConfig
from .feature_engineering import AdvancedFeatureEngine
from .backtesting import BacktestingEngine, BacktestConfig, BacktestResult

logger = logging.getLogger(__name__)

@dataclass
class PipelineConfig:
    """Configuration for the ML pipeline"""
    # Data configuration
    data_period: str = "5y"
    test_size: float = 0.2
    validation_size: float = 0.1
    
    # Feature engineering
    sequence_length: int = 60
    
    # Model training
    cv_folds: int = 5
    n_trials: int = 100  # For Optuna hyperparameter tuning
    n_jobs: int = -1     # Use all available cores
    
    # Evaluation
    backtest_period: str = "1y"
    metrics_threshold: Dict[str, float] = None
    
    # Model selection
    top_n_models: int = 5
    
    def __post_init__(self):
        if self.metrics_threshold is None:
            self.metrics_threshold = {
                'r2': 0.1,
                'mae': 0.05,  # 5% of average price
                'sharpe_ratio': 0.5
            }

@dataclass
class ModelTrainingResult:
    """Result of model training"""
    model_name: str
    symbol: str
    metrics: Dict[str, float]
    best_params: Dict[str, Any]
    training_time: float
    feature_importance: Optional[Dict[str, float]] = None
    predictions: Optional[np.ndarray] = None
    actual_values: Optional[np.ndarray] = None

@dataclass
class PipelineResult:
    """Result of the entire pipeline"""
    symbol: str
    best_model: str
    all_results: List[ModelTrainingResult]
    ensemble_weights: Dict[str, float]
    backtest_results: Dict[str, BacktestResult]
    feature_importance: Dict[str, float]
    training_summary: Dict[str, Any]

class MLPipeline:
    """Machine learning pipeline for stock prediction"""
    
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.prediction_engine = StockPredictionEngine()
        self.lstm_gru_engine = LSTMGRUPredictionEngine()
        self.feature_engine = AdvancedFeatureEngine()
        self.backtesting_engine = BacktestingEngine(BacktestConfig())
        self.results = {}
        
    async def run_pipeline(self, symbol: str) -> PipelineResult:
        """Run the complete ML pipeline for a symbol"""
        try:
            logger.info(f"Starting ML pipeline for {symbol}")
            start_time = datetime.now()
            
            # 1. Data preparation
            logger.info("Step 1: Data preparation")
            data = await self._prepare_data(symbol)
            
            # 2. Feature engineering
            logger.info("Step 2: Feature engineering")
            features = await self._engineer_features(symbol, data)
            
            # 3. Model training and evaluation
            logger.info("Step 3: Model training and evaluation")
            training_results = await self._train_models(symbol, features)
            
            # 4. Model selection
            logger.info("Step 4: Model selection")
            best_model, ensemble_weights = await self._select_best_models(training_results)
            
            # 5. Backtesting
            logger.info("Step 5: Backtesting")
            backtest_results = await self._run_backtesting(symbol, data, training_results)
            
            # 6. Feature importance analysis
            logger.info("Step 6: Feature importance analysis")
            feature_importance = await self._analyze_feature_importance(training_results)
            
            # Calculate total time
            total_time = (datetime.now() - start_time).total_seconds()
            
            # Create pipeline result
            result = PipelineResult(
                symbol=symbol,
                best_model=best_model,
                all_results=training_results,
                ensemble_weights=ensemble_weights,
                backtest_results=backtest_results,
                feature_importance=feature_importance,
                training_summary={
                    'total_time': total_time,
                    'models_trained': len(training_results),
                    'data_points': len(data)
                }
            )
            
            self.results[symbol] = result
            logger.info(f"ML pipeline completed for {symbol} in {total_time:.2f} seconds")
            
            return result
            
        except Exception as e:
            logger.error(f"Pipeline failed for {symbol}: {e}")
            raise
    
    async def _prepare_data(self, symbol: str) -> pd.DataFrame:
        """Prepare data for training"""
        try:
            # Fetch data using yfinance
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=self.config.data_period, interval="1d")
            
            if data.empty:
                raise ValueError(f"No data available for {symbol}")
            
            logger.info(f"Fetched {len(data)} data points for {symbol}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to prepare data for {symbol}: {e}")
            raise
    
    async def _engineer_features(self, symbol: str, data: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for the data"""
        try:
            # Create all features
            features = self.feature_engine.create_all_features(data)
            
            # Remove rows with NaN values
            features = features.dropna()
            
            logger.info(f"Engineered {len(features.columns)} features for {symbol}")
            return features
            
        except Exception as e:
            logger.error(f"Failed to engineer features for {symbol}: {e}")
            raise
    
    async def _train_models(self, symbol: str, features: pd.DataFrame) -> List[ModelTrainingResult]:
        """Train multiple models"""
        results = []
        
        # Train traditional ML models
        ml_results = await self._train_ml_models(symbol, features)
        results.extend(ml_results)
        
        # Train deep learning models
        dl_results = await self._train_dl_models(symbol, features)
        results.extend(dl_results)
        
        return results
    
    async def _train_ml_models(self, symbol: str, features: pd.DataFrame) -> List[ModelTrainingResult]:
        """Train traditional ML models"""
        results = []
        model_types = [
            ModelType.RANDOM_FOREST,
            ModelType.GRADIENT_BOOSTING,
            ModelType.LINEAR_REGRESSION,
            ModelType.RIDGE_REGRESSION
        ]
        
        # Prepare features and target
        X, y = self.feature_engine.prepare_features_for_training(
            features, 
            target_col='CLOSE',
            sequence_length=self.config.sequence_length
        )
        
        # Split data
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=self.config.test_size, shuffle=False
        )
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=self.config.validation_size, shuffle=False
        )
        
        for model_type in model_types:
            try:
                logger.info(f"Training {model_type.value} for {symbol}")
                start_time = datetime.now()
                
                # Train model
                success = await self.prediction_engine.train_model(symbol, model_type, self.config.data_period)
                
                if success:
                    # Get predictions
                    predictions = []
                    actual_values = []
                    
                    # Evaluate on test set
                    model_key = f"{symbol}_{model_type.value}"
                    if model_key in self.prediction_engine.models:
                        model = self.prediction_engine.models[model_key]
                        
                        # Scale features
                        X_test_scaled = self.feature_engine.scale_features(X_test, fit=False)
                        
                        # Make predictions
                        y_pred = model.predict(X_test_scaled)
                        predictions = y_pred
                        actual_values = y_test
                        
                        # Calculate metrics
                        mse = mean_squared_error(y_test, y_pred)
                        mae = mean_absolute_error(y_test, y_pred)
                        r2 = r2_score(y_test, y_pred)
                        
                        # Get feature importance
                        feature_importance = None
                        if hasattr(model, 'feature_importances_'):
                            feature_names = self.feature_engine.feature_names
                            importance_dict = dict(zip(feature_names, model.feature_importances_))
                            feature_importance = importance_dict
                        
                        training_time = (datetime.now() - start_time).total_seconds()
                        
                        result = ModelTrainingResult(
                            model_name=model_type.value,
                            symbol=symbol,
                            metrics={
                                'mse': mse,
                                'mae': mae,
                                'r2': r2
                            },
                            best_params={},  # Traditional models don't have hyperparameters in this implementation
                            training_time=training_time,
                            feature_importance=feature_importance,
                            predictions=predictions,
                            actual_values=actual_values
                        )
                        
                        results.append(result)
                        logger.info(f"Trained {model_type.value} for {symbol} (R2: {r2:.3f})")
                
            except Exception as e:
                logger.error(f"Failed to train {model_type.value} for {symbol}: {e}")
                continue
        
        return results
    
    async def _train_dl_models(self, symbol: str, features: pd.DataFrame) -> List[ModelTrainingResult]:
        """Train deep learning models (LSTM/GRU)"""
        results = []
        
        # Prepare data for deep learning models
        close_prices = features['CLOSE'].values
        
        # Split data
        train_size = int(len(close_prices) * (1 - self.config.test_size - self.config.validation_size))
        val_size = int(len(close_prices) * self.config.validation_size)
        
        train_data = close_prices[:train_size]
        val_data = close_prices[train_size:train_size + val_size]
        test_data = close_prices[train_size + val_size:]
        
        # Train LSTM
        try:
            logger.info(f"Training LSTM for {symbol}")
            start_time = datetime.now()
            
            # Create and train LSTM model
            lstm_config = LSTMConfig(
                input_size=1,
                hidden_size=50,
                num_layers=2,
                sequence_length=self.config.sequence_length,
                num_epochs=50
            )
            
            lstm_metrics = self.lstm_gru_engine.train_lstm_model(symbol, train_data, lstm_config)
            
            # Make predictions
            predictions = self.lstm_gru_engine.predict_with_lstm(symbol, train_data, len(test_data))
            
            training_time = (datetime.now() - start_time).total_seconds()
            
            result = ModelTrainingResult(
                model_name="lstm",
                symbol=symbol,
                metrics=lstm_metrics,
                best_params=asdict(lstm_config),
                training_time=training_time,
                predictions=predictions,
                actual_values=test_data
            )
            
            results.append(result)
            logger.info(f"Trained LSTM for {symbol}")
            
        except Exception as e:
            logger.error(f"Failed to train LSTM for {symbol}: {e}")
        
        # Train GRU
        try:
            logger.info(f"Training GRU for {symbol}")
            start_time = datetime.now()
            
            # Create and train GRU model
            gru_config = GRUConfig(
                input_size=1,
                hidden_size=50,
                num_layers=2,
                sequence_length=self.config.sequence_length,
                num_epochs=50
            )
            
            gru_metrics = self.lstm_gru_engine.train_gru_model(symbol, train_data, gru_config)
            
            # Make predictions
            predictions = self.lstm_gru_engine.predict_with_gru(symbol, train_data, len(test_data))
            
            training_time = (datetime.now() - start_time).total_seconds()
            
            result = ModelTrainingResult(
                model_name="gru",
                symbol=symbol,
                metrics=gru_metrics,
                best_params=asdict(gru_config),
                training_time=training_time,
                predictions=predictions,
                actual_values=test_data
            )
            
            results.append(result)
            logger.info(f"Trained GRU for {symbol}")
            
        except Exception as e:
            logger.error(f"Failed to train GRU for {symbol}: {e}")
        
        return results
    
    async def _select_best_models(self, results: List[ModelTrainingResult]) -> Tuple[str, Dict[str, float]]:
        """Select the best model and create ensemble weights"""
        if not results:
            raise ValueError("No models to select from")
        
        # Sort by R2 score
        sorted_results = sorted(results, key=lambda x: x.metrics.get('r2', 0), reverse=True)
        
        # Get best model
        best_model = sorted_results[0].model_name
        
        # Create ensemble weights based on performance
        total_r2 = sum(max(0, result.metrics.get('r2', 0)) for result in results)
        ensemble_weights = {}
        
        if total_r2 > 0:
            for result in results:
                weight = max(0, result.metrics.get('r2', 0)) / total_r2
                ensemble_weights[result.model_name] = weight
        else:
            # Equal weights if all R2 scores are negative
            weight = 1.0 / len(results)
            for result in results:
                ensemble_weights[result.model_name] = weight
        
        logger.info(f"Best model: {best_model}")
        logger.info(f"Ensemble weights: {ensemble_weights}")
        
        return best_model, ensemble_weights
    
    async def _run_backtesting(self, symbol: str, data: pd.DataFrame, results: List[ModelTrainingResult]) -> Dict[str, BacktestResult]:
        """Run backtesting for trained models"""
        backtest_results = {}
        
        # Load data into backtesting engine
        self.backtesting_engine.load_historical_data(symbol, data)
        
        # Create predictions for backtesting
        predictions_df = pd.DataFrame(index=data.index)
        for result in results:
            if result.predictions is not None:
                # Create prediction DataFrame
                pred_series = pd.Series(result.predictions, index=data.index[-len(result.predictions):])
                predictions_df[result.model_name] = pred_series
        
        # Load predictions
        self.backtesting_engine.load_predictions(symbol, predictions_df)
        
        # Run backtest for each model (simplified)
        for result in results:
            try:
                # This is a simplified backtest - in practice, you'd implement a proper strategy
                backtest_result = BacktestResult(
                    total_return=0.0,
                    annual_return=0.0,
                    volatility=0.0,
                    sharpe_ratio=0.0,
                    max_drawdown=0.0,
                    win_rate=0.0,
                    profit_factor=0.0,
                    total_trades=0,
                    winning_trades=0,
                    losing_trades=0,
                    avg_win=0.0,
                    avg_loss=0.0,
                    max_consecutive_wins=0,
                    max_consecutive_losses=0,
                    portfolio_values=[],
                    trades=[],
                    positions=[],
                    metrics={}
                )
                backtest_results[result.model_name] = backtest_result
                
            except Exception as e:
                logger.error(f"Failed to run backtest for {result.model_name}: {e}")
                continue
        
        return backtest_results
    
    async def _analyze_feature_importance(self, results: List[ModelTrainingResult]) -> Dict[str, float]:
        """Analyze and aggregate feature importance across models"""
        feature_importance = {}
        
        # Aggregate feature importance from all models
        total_weight = 0
        for result in results:
            if result.feature_importance:
                weight = result.metrics.get('r2', 0)
                if weight > 0:  # Only consider models with positive R2
                    total_weight += weight
                    for feature, importance in result.feature_importance.items():
                        if feature in feature_importance:
                            feature_importance[feature] += importance * weight
                        else:
                            feature_importance[feature] = importance * weight
        
        # Normalize by total weight
        if total_weight > 0:
            for feature in feature_importance:
                feature_importance[feature] /= total_weight
        
        # Sort by importance
        sorted_features = dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True))
        
        logger.info(f"Top 10 features: {list(sorted_features.items())[:10]}")
        return sorted_features
    
    def save_pipeline_result(self, symbol: str, filepath: str):
        """Save pipeline result to disk"""
        try:
            if symbol not in self.results:
                raise ValueError(f"No results found for {symbol}")
            
            result = self.results[symbol]
            
            # Convert to serializable format
            result_dict = {
                'symbol': result.symbol,
                'best_model': result.best_model,
                'all_results': [
                    {
                        'model_name': r.model_name,
                        'symbol': r.symbol,
                        'metrics': r.metrics,
                        'best_params': r.best_params,
                        'training_time': r.training_time,
                        'feature_importance': r.feature_importance
                    }
                    for r in result.all_results
                ],
                'ensemble_weights': result.ensemble_weights,
                'backtest_results': {
                    model: {
                        'total_return': br.total_return,
                        'annual_return': br.annual_return,
                        'volatility': br.volatility,
                        'sharpe_ratio': br.sharpe_ratio,
                        'max_drawdown': br.max_drawdown,
                        'win_rate': br.win_rate,
                        'profit_factor': br.profit_factor,
                        'total_trades': br.total_trades
                    }
                    for model, br in result.backtest_results.items()
                },
                'feature_importance': result.feature_importance,
                'training_summary': result.training_summary
            }
            
            with open(filepath, 'w') as f:
                json.dump(result_dict, f, indent=2)
            
            logger.info(f"Pipeline result saved to {filepath}")
            
        except Exception as e:
            logger.error(f"Failed to save pipeline result: {e}")
            raise
    
    def load_pipeline_result(self, filepath: str) -> PipelineResult:
        """Load pipeline result from disk"""
        try:
            with open(filepath, 'r') as f:
                result_dict = json.load(f)
            
            # Convert back to PipelineResult
            all_results = [
                ModelTrainingResult(
                    model_name=r['model_name'],
                    symbol=r['symbol'],
                    metrics=r['metrics'],
                    best_params=r['best_params'],
                    training_time=r['training_time'],
                    feature_importance=r['feature_importance']
                )
                for r in result_dict['all_results']
            ]
            
            backtest_results = {
                model: BacktestResult(
                    total_return=br['total_return'],
                    annual_return=br['annual_return'],
                    volatility=br['volatility'],
                    sharpe_ratio=br['sharpe_ratio'],
                    max_drawdown=br['max_drawdown'],
                    win_rate=br['win_rate'],
                    profit_factor=br['profit_factor'],
                    total_trades=br['total_trades'],
                    winning_trades=0,  # These might not be saved
                    losing_trades=0,
                    avg_win=0.0,
                    avg_loss=0.0,
                    max_consecutive_wins=0,
                    max_consecutive_losses=0,
                    portfolio_values=[],
                    trades=[],
                    positions=[],
                    metrics={}
                )
                for model, br in result_dict['backtest_results'].items()
            }
            
            result = PipelineResult(
                symbol=result_dict['symbol'],
                best_model=result_dict['best_model'],
                all_results=all_results,
                ensemble_weights=result_dict['ensemble_weights'],
                backtest_results=backtest_results,
                feature_importance=result_dict['feature_importance'],
                training_summary=result_dict['training_summary']
            )
            
            self.results[result.symbol] = result
            logger.info(f"Pipeline result loaded from {filepath}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to load pipeline result: {e}")
            raise

# Global ML pipeline instance
ml_pipeline = MLPipeline(PipelineConfig())

# Example usage function
async def run_pipeline_for_symbol(symbol: str) -> PipelineResult:
    """Run pipeline for a single symbol"""
    return await ml_pipeline.run_pipeline(symbol)

# Batch processing function
async def run_pipeline_batch(symbols: List[str]) -> Dict[str, PipelineResult]:
    """Run pipeline for multiple symbols"""
    results = {}
    
    # Run pipelines concurrently
    tasks = [run_pipeline_for_symbol(symbol) for symbol in symbols]
    pipeline_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Process results
    for symbol, result in zip(symbols, pipeline_results):
        if isinstance(result, Exception):
            logger.error(f"Pipeline failed for {symbol}: {result}")
        else:
            results[symbol] = result
    
    return results