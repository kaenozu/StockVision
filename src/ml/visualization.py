"""
Prediction Accuracy Visualization

This module provides comprehensive visualization tools for analyzing
stock price prediction model performance, including accuracy metrics,
feature importance, and backtesting results.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
import warnings
warnings.filterwarnings('ignore')

# Set style for matplotlib
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

logger = logging.getLogger(__name__)

@dataclass
class VisualizationConfig:
    """Configuration for visualization"""
    figure_size: Tuple[int, int] = (12, 8)
    dpi: int = 100
    style: str = "seaborn-v0_8"
    color_palette: str = "husl"
    theme: str = "light"  # "light" or "dark"

class PredictionVisualizer:
    """Visualizer for prediction model performance"""
    
    def __init__(self, config: Optional[VisualizationConfig] = None):
        self.config = config or VisualizationConfig()
        self._setup_style()
    
    def _setup_style(self):
        """Setup visualization style"""
        plt.style.use(self.config.style)
        sns.set_palette(self.config.color_palette)
        
        # Set dark theme if specified
        if self.config.theme == "dark":
            plt.style.use('dark_background')
    
    def plot_prediction_accuracy(
        self, 
        actual_values: np.ndarray, 
        predicted_values: np.ndarray, 
        title: str = "Prediction Accuracy",
        save_path: Optional[str] = None
    ) -> plt.Figure:
        """Plot prediction accuracy with scatter plot and regression line"""
        try:
            fig, ax = plt.subplots(figsize=self.config.figure_size, dpi=self.config.dpi)
            
            # Scatter plot
            ax.scatter(actual_values, predicted_values, alpha=0.6, label='Predictions')
            
            # Perfect prediction line
            min_val = min(min(actual_values), min(predicted_values))
            max_val = max(max(actual_values), max(predicted_values))
            ax.plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2, label='Perfect Prediction')
            
            # Regression line
            z = np.polyfit(actual_values, predicted_values, 1)
            p = np.poly1d(z)
            ax.plot(actual_values, p(actual_values), "b--", alpha=0.8, linewidth=2, label=f'Regression (y={z[0]:.2f}x+{z[1]:.2f})')
            
            # Metrics
            mse = np.mean((actual_values - predicted_values) ** 2)
            mae = np.mean(np.abs(actual_values - predicted_values))
            r2 = 1 - (np.sum((actual_values - predicted_values) ** 2) / 
                     np.sum((actual_values - np.mean(actual_values)) ** 2))
            
            # Labels and title
            ax.set_xlabel('Actual Values')
            ax.set_ylabel('Predicted Values')
            ax.set_title(f'{title}\nMSE: {mse:.4f}, MAE: {mae:.4f}, R²: {r2:.4f}')
            ax.legend()
            ax.grid(True, alpha=0.3)
            
            # Add text box with metrics
            textstr = f'MSE: {mse:.4f}\nMAE: {mae:.4f}\nR²: {r2:.4f}'
            props = dict(boxstyle='round', facecolor='wheat', alpha=0.5)
            ax.text(0.05, 0.95, textstr, transform=ax.transAxes, fontsize=10,
                    verticalalignment='top', bbox=props)
            
            plt.tight_layout()
            
            if save_path:
                plt.savefig(save_path, dpi=self.config.dpi, bbox_inches='tight')
                logger.info(f"Accuracy plot saved to {save_path}")
            
            return fig
            
        except Exception as e:
            logger.error(f"Error plotting prediction accuracy: {e}")
            raise
    
    def plot_time_series_predictions(
        self,
        timestamps: List[datetime],
        actual_values: np.ndarray,
        predicted_values: np.ndarray,
        title: str = "Time Series Predictions",
        save_path: Optional[str] = None
    ) -> plt.Figure:
        """Plot actual vs predicted values over time"""
        try:
            fig, ax = plt.subplots(figsize=self.config.figure_size, dpi=self.config.dpi)
            
            # Plot actual and predicted values
            ax.plot(timestamps, actual_values, label='Actual', linewidth=2, alpha=0.8)
            ax.plot(timestamps, predicted_values, label='Predicted', linewidth=2, alpha=0.8)
            
            # Fill between for confidence interval (if available)
            # This would require confidence intervals from the model
            
            # Labels and title
            ax.set_xlabel('Date')
            ax.set_ylabel('Price')
            ax.set_title(title)
            ax.legend()
            ax.grid(True, alpha=0.3)
            
            # Rotate x-axis labels for better readability
            plt.setp(ax.get_xticklabels(), rotation=45, ha="right")
            
            plt.tight_layout()
            
            if save_path:
                plt.savefig(save_path, dpi=self.config.dpi, bbox_inches='tight')
                logger.info(f"Time series plot saved to {save_path}")
            
            return fig
            
        except Exception as e:
            logger.error(f"Error plotting time series predictions: {e}")
            raise
    
    def plot_feature_importance(
        self,
        feature_importance: Dict[str, float],
        top_n: int = 20,
        title: str = "Feature Importance",
        save_path: Optional[str] = None
    ) -> plt.Figure:
        """Plot feature importance"""
        try:
            # Sort features by importance
            sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
            top_features = sorted_features[:top_n]
            
            # Separate feature names and importance values
            features, importance = zip(*top_features)
            
            # Create horizontal bar plot
            fig, ax = plt.subplots(figsize=self.config.figure_size, dpi=self.config.dpi)
            y_pos = np.arange(len(features))
            
            bars = ax.barh(y_pos, importance, align='center', alpha=0.8)
            ax.set_yticks(y_pos)
            ax.set_yticklabels(features)
            ax.invert_yaxis()  # Top features at the top
            ax.set_xlabel('Importance')
            ax.set_title(title)
            ax.grid(True, alpha=0.3)
            
            # Add value labels on bars
            for i, (bar, imp) in enumerate(zip(bars, importance)):
                ax.text(bar.get_width() + 0.001, bar.get_y() + bar.get_height()/2,
                        f'{imp:.3f}', ha='left', va='center', fontsize=8)
            
            plt.tight_layout()
            
            if save_path:
                plt.savefig(save_path, dpi=self.config.dpi, bbox_inches='tight')
                logger.info(f"Feature importance plot saved to {save_path}")
            
            return fig
            
        except Exception as e:
            logger.error(f"Error plotting feature importance: {e}")
            raise
    
    def plot_model_comparison(
        self,
        model_metrics: Dict[str, Dict[str, float]],
        metric: str = "r2",
        title: str = "Model Comparison",
        save_path: Optional[str] = None
    ) -> plt.Figure:
        """Plot model comparison"""
        try:
            # Extract model names and metric values
            models = list(model_metrics.keys())
            values = [metrics.get(metric, 0) for metrics in model_metrics.values()]
            
            # Create bar plot
            fig, ax = plt.subplots(figsize=self.config.figure_size, dpi=self.config.dpi)
            bars = ax.bar(models, values, alpha=0.8)
            
            # Color bars based on performance
            colors = plt.cm.RdYlGn(np.interp(values, [min(values), max(values)], [0, 1]))
            for bar, color in zip(bars, colors):
                bar.set_color(color)
            
            # Labels and title
            ax.set_xlabel('Models')
            ax.set_ylabel(metric.upper())
            ax.set_title(title)
            ax.grid(True, alpha=0.3)
            
            # Rotate x-axis labels
            plt.setp(ax.get_xticklabels(), rotation=45, ha="right")
            
            # Add value labels on bars
            for bar, value in zip(bars, values):
                ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                        f'{value:.3f}', ha='center', va='bottom', fontsize=9)
            
            plt.tight_layout()
            
            if save_path:
                plt.savefig(save_path, dpi=self.config.dpi, bbox_inches='tight')
                logger.info(f"Model comparison plot saved to {save_path}")
            
            return fig
            
        except Exception as e:
            logger.error(f"Error plotting model comparison: {e}")
            raise
    
    def plot_prediction_errors(
        self,
        actual_values: np.ndarray,
        predicted_values: np.ndarray,
        title: str = "Prediction Errors Distribution",
        save_path: Optional[str] = None
    ) -> plt.Figure:
        """Plot distribution of prediction errors"""
        try:
            # Calculate errors
            errors = predicted_values - actual_values
            
            # Create figure with subplots
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=self.config.figure_size, dpi=self.config.dpi)
            
            # Histogram of errors
            ax1.hist(errors, bins=50, alpha=0.7, edgecolor='black')
            ax1.set_xlabel('Prediction Error')
            ax1.set_ylabel('Frequency')
            ax1.set_title(f'{title} - Histogram')
            ax1.grid(True, alpha=0.3)
            
            # Q-Q plot
            from scipy import stats
            stats.probplot(errors, dist="norm", plot=ax2)
            ax2.set_title(f'{title} - Q-Q Plot')
            ax2.grid(True, alpha=0.3)
            
            plt.tight_layout()
            
            if save_path:
                plt.savefig(save_path, dpi=self.config.dpi, bbox_inches='tight')
                logger.info(f"Prediction errors plot saved to {save_path}")
            
            return fig
            
        except Exception as e:
            logger.error(f"Error plotting prediction errors: {e}")
            raise
    
    def plot_backtest_results(
        self,
        portfolio_values: List[Tuple[datetime, float]],
        benchmark_values: Optional[List[Tuple[datetime, float]]] = None,
        title: str = "Backtest Results",
        save_path: Optional[str] = None
    ) -> plt.Figure:
        """Plot backtest results"""
        try:
            # Convert to DataFrame
            portfolio_df = pd.DataFrame(portfolio_values, columns=['timestamp', 'value'])
            portfolio_df.set_index('timestamp', inplace=True)
            
            # Calculate returns
            portfolio_returns = portfolio_df['value'].pct_change().dropna()
            
            # Create figure with subplots
            fig, axes = plt.subplots(2, 2, figsize=(15, 10), dpi=self.config.dpi)
            fig.suptitle(title, fontsize=16)
            
            # Portfolio value over time
            axes[0, 0].plot(portfolio_df.index, portfolio_df['value'])
            axes[0, 0].set_title('Portfolio Value Over Time')
            axes[0, 0].set_ylabel('Portfolio Value')
            axes[0, 0].grid(True, alpha=0.3)
            
            # Returns distribution
            axes[0, 1].hist(portfolio_returns, bins=50, alpha=0.7, edgecolor='black')
            axes[0, 1].set_title('Returns Distribution')
            axes[0, 1].set_xlabel('Returns')
            axes[0, 1].set_ylabel('Frequency')
            axes[0, 1].grid(True, alpha=0.3)
            
            # Cumulative returns
            cumulative_returns = (1 + portfolio_returns).cumprod()
            axes[1, 0].plot(cumulative_returns.index, cumulative_returns)
            axes[1, 0].set_title('Cumulative Returns')
            axes[1, 0].set_ylabel('Cumulative Returns')
            axes[1, 0].grid(True, alpha=0.3)
            
            # Drawdown
            rolling_max = portfolio_df['value'].expanding().max()
            drawdown = (portfolio_df['value'] - rolling_max) / rolling_max
            axes[1, 1].plot(drawdown.index, drawdown)
            axes[1, 1].set_title('Drawdown')
            axes[1, 1].set_ylabel('Drawdown')
            axes[1, 1].grid(True, alpha=0.3)
            
            plt.tight_layout()
            
            if save_path:
                plt.savefig(save_path, dpi=self.config.dpi, bbox_inches='tight')
                logger.info(f"Backtest results plot saved to {save_path}")
            
            return fig
            
        except Exception as e:
            logger.error(f"Error plotting backtest results: {e}")
            raise
    
    def create_interactive_dashboard(
        self,
        data: Dict[str, Any],
        save_path: Optional[str] = None
    ) -> go.Figure:
        """Create interactive dashboard using Plotly"""
        try:
            # Create subplots
            fig = make_subplots(
                rows=2, cols=2,
                subplot_titles=('Prediction Accuracy', 'Feature Importance', 'Model Comparison', 'Returns Distribution'),
                specs=[[{"secondary_y": False}, {"secondary_y": False}],
                       [{"secondary_y": False}, {"secondary_y": False}]]
            )
            
            # Add traces for each subplot
            # This is a simplified example - you would need to adapt based on your data structure
            
            # Example: Scatter plot for prediction accuracy
            if 'actual_values' in data and 'predicted_values' in data:
                fig.add_trace(
                    go.Scatter(
                        x=data['actual_values'],
                        y=data['predicted_values'],
                        mode='markers',
                        name='Predictions',
                        marker=dict(size=8, opacity=0.6)
                    ),
                    row=1, col=1
                )
                
                # Add perfect prediction line
                min_val = min(min(data['actual_values']), min(data['predicted_values']))
                max_val = max(max(data['actual_values']), max(data['predicted_values']))
                fig.add_trace(
                    go.Scatter(
                        x=[min_val, max_val],
                        y=[min_val, max_val],
                        mode='lines',
                        name='Perfect Prediction',
                        line=dict(color='red', dash='dash')
                    ),
                    row=1, col=1
                )
            
            # Example: Bar chart for feature importance
            if 'feature_importance' in data:
                features = list(data['feature_importance'].keys())[:10]  # Top 10
                importance = list(data['feature_importance'].values())[:10]
                
                fig.add_trace(
                    go.Bar(
                        x=importance,
                        y=features,
                        orientation='h',
                        name='Feature Importance'
                    ),
                    row=1, col=2
                )
            
            # Example: Bar chart for model comparison
            if 'model_metrics' in data:
                models = list(data['model_metrics'].keys())
                r2_scores = [data['model_metrics'][model].get('r2', 0) for model in models]
                
                fig.add_trace(
                    go.Bar(
                        x=models,
                        y=r2_scores,
                        name='R² Scores'
                    ),
                    row=2, col=1
                )
            
            # Example: Histogram for returns distribution
            if 'returns' in data:
                fig.add_trace(
                    go.Histogram(
                        x=data['returns'],
                        name='Returns Distribution',
                        nbinsx=50
                    ),
                    row=2, col=2
                )
            
            # Update layout
            fig.update_layout(
                title_text="Stock Prediction Dashboard",
                showlegend=True,
                height=800
            )
            
            # Update axes labels
            fig.update_xaxes(title_text="Actual Values", row=1, col=1)
            fig.update_yaxes(title_text="Predicted Values", row=1, col=1)
            
            fig.update_xaxes(title_text="Importance", row=1, col=2)
            fig.update_yaxes(title_text="Features", row=1, col=2)
            
            fig.update_xaxes(title_text="Models", row=2, col=1)
            fig.update_yaxes(title_text="R² Score", row=2, col=1)
            
            fig.update_xaxes(title_text="Returns", row=2, col=2)
            fig.update_yaxes(title_text="Frequency", row=2, col=2)
            
            if save_path:
                fig.write_html(save_path)
                logger.info(f"Interactive dashboard saved to {save_path}")
            
            return fig
            
        except Exception as e:
            logger.error(f"Error creating interactive dashboard: {e}")
            raise
    
    def plot_rolling_metrics(
        self,
        timestamps: List[datetime],
        metrics: Dict[str, List[float]],
        title: str = "Rolling Metrics",
        save_path: Optional[str] = None
    ) -> plt.Figure:
        """Plot rolling metrics over time"""
        try:
            fig, ax = plt.subplots(figsize=self.config.figure_size, dpi=self.config.dpi)
            
            # Plot each metric
            for metric_name, values in metrics.items():
                ax.plot(timestamps, values, label=metric_name, linewidth=2, alpha=0.8)
            
            # Labels and title
            ax.set_xlabel('Date')
            ax.set_ylabel('Metric Value')
            ax.set_title(title)
            ax.legend()
            ax.grid(True, alpha=0.3)
            
            # Rotate x-axis labels
            plt.setp(ax.get_xticklabels(), rotation=45, ha="right")
            
            plt.tight_layout()
            
            if save_path:
                plt.savefig(save_path, dpi=self.config.dpi, bbox_inches='tight')
                logger.info(f"Rolling metrics plot saved to {save_path}")
            
            return fig
            
        except Exception as e:
            logger.error(f"Error plotting rolling metrics: {e}")
            raise
    
    def generate_report(
        self,
        data: Dict[str, Any],
        save_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate comprehensive visualization report"""
        try:
            report = {}
            
            # Create various plots
            plots = {}
            
            # Prediction accuracy plot
            if 'actual_values' in data and 'predicted_values' in data:
                fig = self.plot_prediction_accuracy(
                    data['actual_values'],
                    data['predicted_values'],
                    "Prediction Accuracy"
                )
                plots['accuracy'] = fig
            
            # Feature importance plot
            if 'feature_importance' in data:
                fig = self.plot_feature_importance(
                    data['feature_importance'],
                    title="Feature Importance"
                )
                plots['feature_importance'] = fig
            
            # Model comparison plot
            if 'model_metrics' in data:
                fig = self.plot_model_comparison(
                    data['model_metrics'],
                    title="Model Comparison"
                )
                plots['model_comparison'] = fig
            
            # Time series predictions plot
            if 'timestamps' in data and 'actual_values' in data and 'predicted_values' in data:
                fig = self.plot_time_series_predictions(
                    data['timestamps'],
                    data['actual_values'],
                    data['predicted_values'],
                    "Time Series Predictions"
                )
                plots['time_series'] = fig
            
            # Prediction errors plot
            if 'actual_values' in data and 'predicted_values' in data:
                fig = self.plot_prediction_errors(
                    data['actual_values'],
                    data['predicted_values'],
                    "Prediction Errors Distribution"
                )
                plots['prediction_errors'] = fig
            
            # Backtest results plot
            if 'portfolio_values' in data:
                fig = self.plot_backtest_results(
                    data['portfolio_values'],
                    title="Backtest Results"
                )
                plots['backtest_results'] = fig
            
            # Save plots if path provided
            if save_path and plots:
                import os
                report_dir = os.path.join(save_path, "prediction_report")
                os.makedirs(report_dir, exist_ok=True)
                
                for plot_name, fig in plots.items():
                    plot_path = os.path.join(report_dir, f"{plot_name}.png")
                    fig.savefig(plot_path, dpi=self.config.dpi, bbox_inches='tight')
                
                # Create interactive dashboard
                dashboard_path = os.path.join(report_dir, "dashboard.html")
                self.create_interactive_dashboard(data, dashboard_path)
                
                logger.info(f"Visualization report saved to {report_dir}")
            
            report['plots'] = plots
            report['timestamp'] = datetime.now().isoformat()
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating visualization report: {e}")
            raise

# Global prediction visualizer instance
prediction_visualizer = PredictionVisualizer()

# Example usage functions
def create_sample_visualizations():
    """Create sample visualizations for demonstration"""
    try:
        # Generate sample data
        np.random.seed(42)
        n_samples = 1000
        
        # Actual vs predicted values
        actual = np.random.normal(100, 20, n_samples)
        noise = np.random.normal(0, 5, n_samples)
        predicted = actual + noise
        
        # Feature importance (sample)
        feature_importance = {
            'SMA_20': 0.15,
            'RSI_14': 0.12,
            'MACD': 0.10,
            'VOLUME_RATIO': 0.08,
            'BB_WIDTH': 0.07,
            'ATR_14': 0.06,
            'MOMENTUM_10': 0.05,
            'STOCH_K': 0.04,
            'ROC_10': 0.03,
            'OBV': 0.03,
            'AD': 0.02,
            'HT_TRENDLINE': 0.02,
            'WILLIAMS_R': 0.02,
            'CCI_14': 0.02,
            'ADX_14': 0.02,
            'AROON_OSC': 0.02,
            'VOLATILITY_20': 0.01,
            'PRICE_POSITION': 0.01,
            'HIGH_LOW_RATIO': 0.01,
            'OPEN_CLOSE_RATIO': 0.01
        }
        
        # Model metrics (sample)
        model_metrics = {
            'Random Forest': {'r2': 0.85, 'mse': 25.3, 'mae': 3.2},
            'Gradient Boosting': {'r2': 0.82, 'mse': 28.7, 'mae': 3.5},
            'Linear Regression': {'r2': 0.78, 'mse': 32.1, 'mae': 4.1},
            'Ridge Regression': {'r2': 0.79, 'mse': 31.2, 'mae': 3.9},
            'LSTM': {'r2': 0.88, 'mse': 22.1, 'mae': 2.8},
            'GRU': {'r2': 0.86, 'mse': 24.5, 'mae': 3.0}
        }
        
        # Create visualizations
        visualizer = PredictionVisualizer()
        
        # Prediction accuracy
        fig1 = visualizer.plot_prediction_accuracy(actual, predicted, "Sample Prediction Accuracy")
        plt.show()
        
        # Feature importance
        fig2 = visualizer.plot_feature_importance(feature_importance, title="Sample Feature Importance")
        plt.show()
        
        # Model comparison
        fig3 = visualizer.plot_model_comparison(model_metrics, title="Sample Model Comparison")
        plt.show()
        
        # Interactive dashboard data
        dashboard_data = {
            'actual_values': actual[:100],  # Sample for dashboard
            'predicted_values': predicted[:100],
            'feature_importance': feature_importance,
            'model_metrics': model_metrics,
            'returns': np.random.normal(0.001, 0.02, 252)  # Sample daily returns
        }
        
        # Interactive dashboard
        fig4 = visualizer.create_interactive_dashboard(dashboard_data)
        fig4.show()
        
        print("Sample visualizations created successfully!")
        
    except Exception as e:
        logger.error(f"Error creating sample visualizations: {e}")
        raise

if __name__ == "__main__":
    # Run sample visualizations
    create_sample_visualizations()