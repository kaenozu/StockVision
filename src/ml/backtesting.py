"""
Backtesting Framework for Stock Prediction Models

This module provides a comprehensive backtesting framework for evaluating
stock prediction models with realistic market conditions and risk management.
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Optional, Tuple, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import matplotlib.pyplot as plt
import seaborn as sns

logger = logging.getLogger(__name__)

class TradeDirection(Enum):
    """Trade direction"""
    LONG = "long"
    SHORT = "short"

class OrderType(Enum):
    """Order types"""
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"

@dataclass
class Trade:
    """Trade record"""
    timestamp: datetime
    symbol: str
    direction: TradeDirection
    quantity: float
    price: float
    order_type: OrderType
    commission: float = 0.0
    slippage: float = 0.0

@dataclass
class Position:
    """Current position"""
    symbol: str
    direction: TradeDirection
    quantity: float
    entry_price: float
    entry_timestamp: datetime
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

@dataclass
class Portfolio:
    """Portfolio state"""
    cash: float
    positions: Dict[str, Position]
    trades: List[Trade]
    value_history: List[Tuple[datetime, float]]
    max_drawdown: float = 0.0
    sharpe_ratio: float = 0.0

@dataclass
class BacktestConfig:
    """Backtest configuration"""
    initial_capital: float = 100000.0
    commission_rate: float = 0.001  # 0.1%
    slippage_rate: float = 0.0005   # 0.05%
    risk_per_trade: float = 0.02    # 2% of capital per trade
    max_positions: int = 10
    stop_loss_pct: float = 0.05     # 5%
    take_profit_pct: float = 0.10   # 10%
    enable_shorting: bool = False
    transaction_cost_model: str = "fixed"  # "fixed" or "variable"

@dataclass
class BacktestResult:
    """Backtest result"""
    total_return: float
    annual_return: float
    volatility: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    avg_win: float
    avg_loss: float
    max_consecutive_wins: int
    max_consecutive_losses: int
    portfolio_values: List[Tuple[datetime, float]]
    trades: List[Trade]
    positions: List[Position]
    metrics: Dict[str, Any]

class BacktestingEngine:
    """Backtesting engine for stock prediction models"""
    
    def __init__(self, config: BacktestConfig):
        self.config = config
        self.portfolio = Portfolio(
            cash=config.initial_capital,
            positions={},
            trades=[],
            value_history=[(datetime.now(), config.initial_capital)]
        )
        self.historical_data = {}
        self.predictions = {}
        self.current_timestamp = None
        self.metrics = {}
        
    def load_historical_data(self, symbol: str, data: pd.DataFrame):
        """Load historical price data"""
        self.historical_data[symbol] = data.sort_index()
        logger.info(f"Loaded historical data for {symbol}: {len(data)} records")
    
    def load_predictions(self, symbol: str, predictions: pd.DataFrame):
        """Load model predictions"""
        self.predictions[symbol] = predictions.sort_index()
        logger.info(f"Loaded predictions for {symbol}: {len(predictions)} records")
    
    def run_backtest(
        self, 
        symbols: List[str],
        strategy_function: Callable,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> BacktestResult:
        """Run backtest"""
        try:
            # Determine date range
            if not start_date or not end_date:
                all_dates = []
                for symbol in symbols:
                    if symbol in self.historical_data:
                        all_dates.extend(self.historical_data[symbol].index)
                if all_dates:
                    start_date = min(all_dates) if not start_date else start_date
                    end_date = max(all_dates) if not end_date else end_date
            
            logger.info(f"Running backtest from {start_date} to {end_date}")
            
            # Get all timestamps in the date range
            timestamps = self._get_backtest_timestamps(symbols, start_date, end_date)
            
            # Run simulation
            for timestamp in timestamps:
                self.current_timestamp = timestamp
                # Update market data
                market_data = self._get_market_data(symbols, timestamp)
                
                # Update portfolio value
                self._update_portfolio_value(market_data)
                
                # Apply risk management
                self._apply_risk_management(market_data)
                
                # Execute strategy
                strategy_function(self, symbols, market_data, timestamp)
            
            # Calculate final metrics
            result = self._calculate_metrics()
            logger.info("Backtest completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Backtest failed: {e}")
            raise
    
    def _get_backtest_timestamps(self, symbols: List[str], start_date: datetime, end_date: datetime) -> List[datetime]:
        """Get all timestamps for backtest period"""
        all_timestamps = set()
        for symbol in symbols:
            if symbol in self.historical_data:
                symbol_data = self.historical_data[symbol]
                mask = (symbol_data.index >= start_date) & (symbol_data.index <= end_date)
                all_timestamps.update(symbol_data[mask].index)
        return sorted(list(all_timestamps))
    
    def _get_market_data(self, symbols: List[str], timestamp: datetime) -> Dict[str, pd.Series]:
        """Get market data for a specific timestamp"""
        market_data = {}
        for symbol in symbols:
            if symbol in self.historical_data:
                symbol_data = self.historical_data[symbol]
                if timestamp in symbol_data.index:
                    market_data[symbol] = symbol_data.loc[timestamp]
        return market_data
    
    def _update_portfolio_value(self, market_data: Dict[str, pd.Series]):
        """Update portfolio value based on current market prices"""
        total_value = self.portfolio.cash
        
        # Calculate value of positions
        for symbol, position in self.portfolio.positions.items():
            if symbol in market_data:
                current_price = market_data[symbol]['CLOSE']
                if position.direction == TradeDirection.LONG:
                    position_value = position.quantity * current_price
                else:  # SHORT
                    position_value = position.quantity * (2 * position.entry_price - current_price)
                total_value += position_value
        
        # Record portfolio value
        self.portfolio.value_history.append((self.current_timestamp, total_value))
    
    def _apply_risk_management(self, market_data: Dict[str, pd.Series]):
        """Apply risk management rules"""
        for symbol, position in list(self.portfolio.positions.items()):
            if symbol in market_data:
                current_price = market_data[symbol]['CLOSE']
                
                # Check stop loss
                if position.stop_loss:
                    if (position.direction == TradeDirection.LONG and current_price <= position.stop_loss) or \
                       (position.direction == TradeDirection.SHORT and current_price >= position.stop_loss):
                        self.close_position(symbol, current_price, OrderType.MARKET)
                        continue
                
                # Check take profit
                if position.take_profit:
                    if (position.direction == TradeDirection.LONG and current_price >= position.take_profit) or \
                       (position.direction == TradeDirection.SHORT and current_price <= position.take_profit):
                        self.close_position(symbol, current_price, OrderType.MARKET)
    
    def open_position(
        self, 
        symbol: str, 
        direction: TradeDirection, 
        price: float, 
        order_type: OrderType = OrderType.MARKET,
        quantity: Optional[float] = None
    ):
        """Open a new position"""
        try:
            # Check if we can open position
            if len(self.portfolio.positions) >= self.config.max_positions:
                logger.warning("Maximum positions reached")
                return
            
            # Calculate position size
            if quantity is None:
                risk_amount = self.portfolio.cash * self.config.risk_per_trade
                quantity = risk_amount / (price * self.config.stop_loss_pct)
            
            # Check if we have enough cash
            cost = quantity * price
            commission = cost * self.config.commission_rate
            total_cost = cost + commission
            
            if total_cost > self.portfolio.cash:
                logger.warning("Not enough cash to open position")
                return
            
            # Execute trade
            trade = Trade(
                timestamp=self.current_timestamp,
                symbol=symbol,
                direction=direction,
                quantity=quantity,
                price=price,
                order_type=order_type,
                commission=commission,
                slippage=price * self.config.slippage_rate
            )
            
            # Update portfolio
            self.portfolio.cash -= total_cost
            self.portfolio.trades.append(trade)
            
            # Set stop loss and take profit
            if direction == TradeDirection.LONG:
                stop_loss = price * (1 - self.config.stop_loss_pct)
                take_profit = price * (1 + self.config.take_profit_pct)
            else:  # SHORT
                stop_loss = price * (1 + self.config.stop_loss_pct)
                take_profit = price * (1 - self.config.take_profit_pct)
            
            position = Position(
                symbol=symbol,
                direction=direction,
                quantity=quantity,
                entry_price=price,
                entry_timestamp=self.current_timestamp,
                stop_loss=stop_loss,
                take_profit=take_profit
            )
            
            self.portfolio.positions[symbol] = position
            logger.info(f"Opened {direction.value} position for {symbol}: {quantity} shares at {price}")
            
        except Exception as e:
            logger.error(f"Failed to open position for {symbol}: {e}")
    
    def close_position(
        self, 
        symbol: str, 
        price: float, 
        order_type: OrderType = OrderType.MARKET
    ):
        """Close an existing position"""
        try:
            if symbol not in self.portfolio.positions:
                logger.warning(f"No position found for {symbol}")
                return
            
            position = self.portfolio.positions[symbol]
            
            # Calculate proceeds
            if position.direction == TradeDirection.LONG:
                proceeds = position.quantity * price
            else:  # SHORT
                proceeds = position.quantity * (2 * position.entry_price - price)
            
            # Calculate costs
            commission = proceeds * self.config.commission_rate
            slippage = price * self.config.slippage_rate * position.quantity
            total_proceeds = proceeds - commission - slippage
            
            # Execute trade
            trade = Trade(
                timestamp=self.current_timestamp,
                symbol=symbol,
                direction=TradeDirection.SHORT if position.direction == TradeDirection.LONG else TradeDirection.LONG,
                quantity=position.quantity,
                price=price,
                order_type=order_type,
                commission=commission,
                slippage=slippage
            )
            
            # Update portfolio
            self.portfolio.cash += total_proceeds
            self.portfolio.trades.append(trade)
            del self.portfolio.positions[symbol]
            
            logger.info(f"Closed {position.direction.value} position for {symbol}: {position.quantity} shares at {price}")
            
        except Exception as e:
            logger.error(f"Failed to close position for {symbol}: {e}")
    
    def _calculate_metrics(self) -> BacktestResult:
        """Calculate backtest metrics"""
        if len(self.portfolio.value_history) < 2:
            raise ValueError("Not enough data to calculate metrics")
        
        # Convert value history to DataFrame
        value_df = pd.DataFrame(self.portfolio.value_history, columns=['timestamp', 'value'])
        value_df.set_index('timestamp', inplace=True)
        
        # Calculate returns
        returns = value_df['value'].pct_change().dropna()
        
        # Basic metrics
        total_return = (value_df['value'].iloc[-1] / value_df['value'].iloc[0]) - 1
        annual_return = (1 + total_return) ** (252 / len(returns)) - 1
        volatility = returns.std() * np.sqrt(252)
        sharpe_ratio = annual_return / volatility if volatility > 0 else 0
        
        # Drawdown
        rolling_max = value_df['value'].expanding().max()
        drawdown = (value_df['value'] - rolling_max) / rolling_max
        max_drawdown = drawdown.min()
        
        # Trade metrics
        winning_trades = []
        losing_trades = []
        
        for i in range(1, len(self.portfolio.trades), 2):  # Pair entry and exit trades
            if i < len(self.portfolio.trades):
                entry_trade = self.portfolio.trades[i-1]
                exit_trade = self.portfolio.trades[i]
                
                # Calculate profit/loss
                if entry_trade.direction == TradeDirection.LONG:
                    pnl = (exit_trade.price - entry_trade.price) * entry_trade.quantity
                else:  # SHORT
                    pnl = (entry_trade.price - exit_trade.price) * entry_trade.quantity
                
                if pnl > 0:
                    winning_trades.append(pnl)
                else:
                    losing_trades.append(pnl)
        
        total_trades = len(winning_trades) + len(losing_trades)
        win_rate = len(winning_trades) / total_trades if total_trades > 0 else 0
        avg_win = np.mean(winning_trades) if winning_trades else 0
        avg_loss = np.mean(losing_trades) if losing_trades else 0
        profit_factor = sum(winning_trades) / abs(sum(losing_trades)) if losing_trades else float('inf')
        
        # Consecutive wins/losses
        max_consecutive_wins = 0
        max_consecutive_losses = 0
        current_wins = 0
        current_losses = 0
        
        for pnl in winning_trades + losing_trades:
            if pnl > 0:
                current_wins += 1
                current_losses = 0
                max_consecutive_wins = max(max_consecutive_wins, current_wins)
            else:
                current_losses += 1
                current_wins = 0
                max_consecutive_losses = max(max_consecutive_losses, current_losses)
        
        # Update portfolio metrics
        self.portfolio.max_drawdown = max_drawdown
        self.portfolio.sharpe_ratio = sharpe_ratio
        
        metrics = {
            'total_return': total_return,
            'annual_return': annual_return,
            'volatility': volatility,
            'sharpe_ratio': sharpe_ratio,
            'max_drawdown': max_drawdown,
            'win_rate': win_rate,
            'profit_factor': profit_factor,
            'total_trades': total_trades,
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'max_consecutive_wins': max_consecutive_wins,
            'max_consecutive_losses': max_consecutive_losses
        }
        
        return BacktestResult(
            total_return=total_return,
            annual_return=annual_return,
            volatility=volatility,
            sharpe_ratio=sharpe_ratio,
            max_drawdown=max_drawdown,
            win_rate=win_rate,
            profit_factor=profit_factor,
            total_trades=total_trades,
            winning_trades=len(winning_trades),
            losing_trades=len(losing_trades),
            avg_win=avg_win,
            avg_loss=avg_loss,
            max_consecutive_wins=max_consecutive_wins,
            max_consecutive_losses=max_consecutive_losses,
            portfolio_values=self.portfolio.value_history,
            trades=self.portfolio.trades,
            positions=list(self.portfolio.positions.values()),
            metrics=metrics
        )
    
    def plot_results(self, result: BacktestResult):
        """Plot backtest results"""
        try:
            # Create figure with subplots
            fig, axes = plt.subplots(2, 2, figsize=(15, 10))
            fig.suptitle('Backtest Results', fontsize=16)
            
            # Portfolio value over time
            value_df = pd.DataFrame(result.portfolio_values, columns=['timestamp', 'value'])
            value_df.set_index('timestamp', inplace=True)
            axes[0, 0].plot(value_df.index, value_df['value'])
            axes[0, 0].set_title('Portfolio Value Over Time')
            axes[0, 0].set_ylabel('Portfolio Value')
            
            # Drawdown
            rolling_max = value_df['value'].expanding().max()
            drawdown = (value_df['value'] - rolling_max) / rolling_max
            axes[0, 1].plot(drawdown.index, drawdown)
            axes[0, 1].set_title('Drawdown')
            axes[0, 1].set_ylabel('Drawdown')
            
            # Returns distribution
            returns = value_df['value'].pct_change().dropna()
            axes[1, 0].hist(returns, bins=50, alpha=0.7)
            axes[1, 0].set_title('Returns Distribution')
            axes[1, 0].set_xlabel('Returns')
            axes[1, 0].set_ylabel('Frequency')
            
            # Cumulative returns
            cumulative_returns = (1 + returns).cumprod()
            axes[1, 1].plot(cumulative_returns.index, cumulative_returns)
            axes[1, 1].set_title('Cumulative Returns')
            axes[1, 1].set_ylabel('Cumulative Returns')
            
            plt.tight_layout()
            plt.show()
            
        except Exception as e:
            logger.error(f"Failed to plot results: {e}")
    
    def get_portfolio_summary(self) -> Dict[str, Any]:
        """Get portfolio summary"""
        current_value = self.portfolio.value_history[-1][1] if self.portfolio.value_history else self.config.initial_capital
        total_return = (current_value / self.config.initial_capital) - 1
        
        return {
            'current_value': current_value,
            'cash': self.portfolio.cash,
            'positions_count': len(self.portfolio.positions),
            'total_return': total_return,
            'total_trades': len(self.portfolio.trades),
            'max_drawdown': self.portfolio.max_drawdown,
            'sharpe_ratio': self.portfolio.sharpe_ratio
        }

# Example strategy function
def example_strategy(
    engine: BacktestingEngine, 
    symbols: List[str], 
    market_data: Dict[str, pd.Series], 
    timestamp: datetime
):
    """Example strategy implementation"""
    for symbol in symbols:
        if symbol in market_data and symbol in engine.predictions:
            # Get prediction for current timestamp
            pred_data = engine.predictions[symbol]
            if timestamp in pred_data.index:
                prediction = pred_data.loc[timestamp]
                
                # Simple strategy: Buy if prediction is positive, sell if negative
                current_price = market_data[symbol]['CLOSE']
                
                if prediction['predicted_price'] > current_price * 1.01:  # 1% threshold
                    # Buy signal
                    if symbol not in engine.portfolio.positions:
                        engine.open_position(symbol, TradeDirection.LONG, current_price)
                elif prediction['predicted_price'] < current_price * 0.99:  # 1% threshold
                    # Sell signal
                    if symbol in engine.portfolio.positions:
                        engine.close_position(symbol, current_price)

# Global backtesting engine instance
backtesting_engine = BacktestingEngine(BacktestConfig())