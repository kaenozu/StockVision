"""
LSTM/GRU Time Series Prediction Models

This module implements LSTM and GRU neural network models for stock price prediction.
These models are better suited for sequential data than traditional ML models.
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

@dataclass
class LSTMConfig:
    """Configuration for LSTM model"""
    input_size: int = 1
    hidden_size: int = 50
    num_layers: int = 2
    output_size: int = 1
    dropout: float = 0.2
    learning_rate: float = 0.001
    num_epochs: int = 100
    batch_size: int = 32
    sequence_length: int = 60  # Number of time steps to look back
    bidirectional: bool = False

@dataclass
class GRUConfig:
    """Configuration for GRU model"""
    input_size: int = 1
    hidden_size: int = 50
    num_layers: int = 2
    output_size: int = 1
    dropout: float = 0.2
    learning_rate: float = 0.001
    num_epochs: int = 100
    batch_size: int = 32
    sequence_length: int = 60
    bidirectional: bool = False

class LSTMModel(nn.Module):
    """LSTM model for time series prediction"""
    
    def __init__(self, config: LSTMConfig):
        super(LSTMModel, self).__init__()
        self.config = config
        
        # LSTM layers
        self.lstm = nn.LSTM(
            input_size=config.input_size,
            hidden_size=config.hidden_size,
            num_layers=config.num_layers,
            dropout=config.dropout,
            bidirectional=config.bidirectional,
            batch_first=True
        )
        
        # Fully connected layer
        lstm_output_size = config.hidden_size * 2 if config.bidirectional else config.hidden_size
        self.fc = nn.Linear(lstm_output_size, config.output_size)
        
    def forward(self, x):
        # LSTM forward pass
        lstm_out, _ = self.lstm(x)
        
        # Use output from the last time step
        output = self.fc(lstm_out[:, -1, :])
        return output

class GRUModel(nn.Module):
    """GRU model for time series prediction"""
    
    def __init__(self, config: GRUConfig):
        super(GRUModel, self).__init__()
        self.config = config
        
        # GRU layers
        self.gru = nn.GRU(
            input_size=config.input_size,
            hidden_size=config.hidden_size,
            num_layers=config.num_layers,
            dropout=config.dropout,
            bidirectional=config.bidirectional,
            batch_first=True
        )
        
        # Fully connected layer
        gru_output_size = config.hidden_size * 2 if config.bidirectional else config.hidden_size
        self.fc = nn.Linear(gru_output_size, config.output_size)
        
    def forward(self, x):
        # GRU forward pass
        gru_out, _ = self.gru(x)
        
        # Use output from the last time step
        output = self.fc(gru_out[:, -1, :])
        return output

class TimeSeriesDataProcessor:
    """Process time series data for neural network models"""
    
    def __init__(self, sequence_length: int = 60):
        self.sequence_length = sequence_length
        self.scaler = None
    
    def create_sequences(self, data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Create sequences for time series prediction"""
        X, y = [], []
        
        for i in range(self.sequence_length, len(data)):
            X.append(data[i-self.sequence_length:i])
            y.append(data[i])
        
        return np.array(X), np.array(y)
    
    def normalize_data(self, data: np.ndarray) -> np.ndarray:
        """Normalize data using min-max scaling"""
        if self.scaler is None:
            self.scaler = MinMaxScaler()
            return self.scaler.fit_transform(data.reshape(-1, 1)).flatten()
        else:
            return self.scaler.transform(data.reshape(-1, 1)).flatten()
    
    def inverse_normalize(self, data: np.ndarray) -> np.ndarray:
        """Inverse normalize data"""
        if self.scaler is not None:
            return self.scaler.inverse_transform(data.reshape(-1, 1)).flatten()
        return data

class LSTMGRUPredictionEngine:
    """Prediction engine using LSTM/GRU models"""
    
    def __init__(self):
        self.lstm_models = {}
        self.gru_models = {}
        self.data_processors = {}
        self.model_configs = {}
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
    
    def create_lstm_model(self, symbol: str, config: Optional[LSTMConfig] = None) -> LSTMModel:
        """Create and initialize LSTM model for a symbol"""
        if config is None:
            config = LSTMConfig()
        
        model = LSTMModel(config)
        model.to(self.device)
        self.lstm_models[symbol] = model
        self.model_configs[f"{symbol}_lstm"] = config
        self.data_processors[symbol] = TimeSeriesDataProcessor(config.sequence_length)
        
        logger.info(f"Created LSTM model for {symbol} with config: {config}")
        return model
    
    def create_gru_model(self, symbol: str, config: Optional[GRUConfig] = None) -> GRUModel:
        """Create and initialize GRU model for a symbol"""
        if config is None:
            config = GRUConfig()
        
        model = GRUModel(config)
        model.to(self.device)
        self.gru_models[symbol] = model
        self.model_configs[f"{symbol}_gru"] = config
        self.data_processors[symbol] = TimeSeriesDataProcessor(config.sequence_length)
        
        logger.info(f"Created GRU model for {symbol} with config: {config}")
        return model
    
    def train_lstm_model(
        self, 
        symbol: str, 
        data: np.ndarray, 
        config: Optional[LSTMConfig] = None
    ) -> Dict[str, Any]:
        """Train LSTM model for a symbol"""
        try:
            # Create model if it doesn't exist
            if symbol not in self.lstm_models:
                self.create_lstm_model(symbol, config)
            
            model = self.lstm_models[symbol]
            processor = self.data_processors[symbol]
            model_config = self.model_configs[f"{symbol}_lstm"]
            
            # Normalize data
            normalized_data = processor.normalize_data(data)
            
            # Create sequences
            X, y = processor.create_sequences(normalized_data)
            
            if len(X) == 0:
                raise ValueError("Not enough data to create sequences")
            
            # Convert to PyTorch tensors
            X_tensor = torch.FloatTensor(X).unsqueeze(-1).to(self.device)
            y_tensor = torch.FloatTensor(y).to(self.device)
            
            # Create data loader
            dataset = TensorDataset(X_tensor, y_tensor)
            dataloader = DataLoader(dataset, batch_size=model_config.batch_size, shuffle=True)
            
            # Define loss function and optimizer
            criterion = nn.MSELoss()
            optimizer = optim.Adam(model.parameters(), lr=model_config.learning_rate)
            
            # Training loop
            model.train()
            train_losses = []
            
            for epoch in range(model_config.num_epochs):
                epoch_loss = 0.0
                for batch_X, batch_y in dataloader:
                    # Forward pass
                    outputs = model(batch_X)
                    loss = criterion(outputs.squeeze(), batch_y)
                    
                    # Backward pass
                    optimizer.zero_grad()
                    loss.backward()
                    optimizer.step()
                    
                    epoch_loss += loss.item()
                
                avg_loss = epoch_loss / len(dataloader)
                train_losses.append(avg_loss)
                
                if (epoch + 1) % 20 == 0:
                    logger.info(f"LSTM {symbol} - Epoch [{epoch+1}/{model_config.num_epochs}], Loss: {avg_loss:.6f}")
            
            # Calculate final metrics
            model.eval()
            with torch.no_grad():
                predictions = model(X_tensor).squeeze()
                mse = torch.mean((predictions - y_tensor) ** 2).item()
                mae = torch.mean(torch.abs(predictions - y_tensor)).item()
            
            logger.info(f"LSTM model trained for {symbol}. Final MSE: {mse:.6f}, MAE: {mae:.6f}")
            
            return {
                "mse": mse,
                "mae": mae,
                "final_loss": train_losses[-1],
                "loss_history": train_losses,
                "epochs": model_config.num_epochs
            }
            
        except Exception as e:
            logger.error(f"Failed to train LSTM model for {symbol}: {e}")
            raise
    
    def train_gru_model(
        self, 
        symbol: str, 
        data: np.ndarray, 
        config: Optional[GRUConfig] = None
    ) -> Dict[str, Any]:
        """Train GRU model for a symbol"""
        try:
            # Create model if it doesn't exist
            if symbol not in self.gru_models:
                self.create_gru_model(symbol, config)
            
            model = self.gru_models[symbol]
            processor = self.data_processors[symbol]
            model_config = self.model_configs[f"{symbol}_gru"]
            
            # Normalize data
            normalized_data = processor.normalize_data(data)
            
            # Create sequences
            X, y = processor.create_sequences(normalized_data)
            
            if len(X) == 0:
                raise ValueError("Not enough data to create sequences")
            
            # Convert to PyTorch tensors
            X_tensor = torch.FloatTensor(X).unsqueeze(-1).to(self.device)
            y_tensor = torch.FloatTensor(y).to(self.device)
            
            # Create data loader
            dataset = TensorDataset(X_tensor, y_tensor)
            dataloader = DataLoader(dataset, batch_size=model_config.batch_size, shuffle=True)
            
            # Define loss function and optimizer
            criterion = nn.MSELoss()
            optimizer = optim.Adam(model.parameters(), lr=model_config.learning_rate)
            
            # Training loop
            model.train()
            train_losses = []
            
            for epoch in range(model_config.num_epochs):
                epoch_loss = 0.0
                for batch_X, batch_y in dataloader:
                    # Forward pass
                    outputs = model(batch_X)
                    loss = criterion(outputs.squeeze(), batch_y)
                    
                    # Backward pass
                    optimizer.zero_grad()
                    loss.backward()
                    optimizer.step()
                    
                    epoch_loss += loss.item()
                
                avg_loss = epoch_loss / len(dataloader)
                train_losses.append(avg_loss)
                
                if (epoch + 1) % 20 == 0:
                    logger.info(f"GRU {symbol} - Epoch [{epoch+1}/{model_config.num_epochs}], Loss: {avg_loss:.6f}")
            
            # Calculate final metrics
            model.eval()
            with torch.no_grad():
                predictions = model(X_tensor).squeeze()
                mse = torch.mean((predictions - y_tensor) ** 2).item()
                mae = torch.mean(torch.abs(predictions - y_tensor)).item()
            
            logger.info(f"GRU model trained for {symbol}. Final MSE: {mse:.6f}, MAE: {mae:.6f}")
            
            return {
                "mse": mse,
                "mae": mae,
                "final_loss": train_losses[-1],
                "loss_history": train_losses,
                "epochs": model_config.num_epochs
            }
            
        except Exception as e:
            logger.error(f"Failed to train GRU model for {symbol}: {e}")
            raise
    
    def predict_with_lstm(self, symbol: str, data: np.ndarray, steps: int = 1) -> np.ndarray:
        """Make predictions using LSTM model"""
        try:
            if symbol not in self.lstm_models:
                raise ValueError(f"No LSTM model found for {symbol}")
            
            model = self.lstm_models[symbol]
            processor = self.data_processors[symbol]
            model_config = self.model_configs[f"{symbol}_lstm"]
            
            # Normalize input data
            normalized_data = processor.normalize_data(data)
            
            # Take the last sequence_length points
            input_sequence = normalized_data[-model_config.sequence_length:]
            input_tensor = torch.FloatTensor(input_sequence).unsqueeze(0).unsqueeze(-1).to(self.device)
            
            model.eval()
            predictions = []
            
            with torch.no_grad():
                current_input = input_tensor
                
                for _ in range(steps):
                    # Make prediction
                    pred = model(current_input)
                    pred_value = pred.item()
                    predictions.append(pred_value)
                    
                    # Update input for next prediction (sliding window approach)
                    new_input = torch.cat([
                        current_input[:, 1:, :], 
                        torch.FloatTensor([[[pred_value]]]).to(self.device)
                    ], dim=1)
                    current_input = new_input
            
            # Convert predictions back to original scale
            predictions_array = np.array(predictions)
            final_predictions = processor.inverse_normalize(predictions_array)
            
            return final_predictions
            
        except Exception as e:
            logger.error(f"Failed to predict with LSTM model for {symbol}: {e}")
            raise
    
    def predict_with_gru(self, symbol: str, data: np.ndarray, steps: int = 1) -> np.ndarray:
        """Make predictions using GRU model"""
        try:
            if symbol not in self.gru_models:
                raise ValueError(f"No GRU model found for {symbol}")
            
            model = self.gru_models[symbol]
            processor = self.data_processors[symbol]
            model_config = self.model_configs[f"{symbol}_gru"]
            
            # Normalize input data
            normalized_data = processor.normalize_data(data)
            
            # Take the last sequence_length points
            input_sequence = normalized_data[-model_config.sequence_length:]
            input_tensor = torch.FloatTensor(input_sequence).unsqueeze(0).unsqueeze(-1).to(self.device)
            
            model.eval()
            predictions = []
            
            with torch.no_grad():
                current_input = input_tensor
                
                for _ in range(steps):
                    # Make prediction
                    pred = model(current_input)
                    pred_value = pred.item()
                    predictions.append(pred_value)
                    
                    # Update input for next prediction (sliding window approach)
                    new_input = torch.cat([
                        current_input[:, 1:, :], 
                        torch.FloatTensor([[[pred_value]]]).to(self.device)
                    ], dim=1)
                    current_input = new_input
            
            # Convert predictions back to original scale
            predictions_array = np.array(predictions)
            final_predictions = processor.inverse_normalize(predictions_array)
            
            return final_predictions
            
        except Exception as e:
            logger.error(f"Failed to predict with GRU model for {symbol}: {e}")
            raise
    
    def get_model_info(self, symbol: str) -> Dict[str, Any]:
        """Get information about models for a symbol"""
        info = {
            "symbol": symbol,
            "has_lstm": symbol in self.lstm_models,
            "has_gru": symbol in self.gru_models,
            "device": str(self.device)
        }
        
        if symbol in self.model_configs:
            info["configs"] = {
                k: asdict(v) for k, v in self.model_configs.items() if k.startswith(symbol)
            }
        
        return info
    
    def save_model(self, symbol: str, model_type: str, filepath: str):
        """Save model to disk"""
        try:
            if model_type.lower() == "lstm" and symbol in self.lstm_models:
                model = self.lstm_models[symbol]
                config = self.model_configs[f"{symbol}_lstm"]
                processor = self.data_processors[symbol]
                
                model_data = {
                    'model_state_dict': model.state_dict(),
                    'config': config,
                    'scaler': processor.scaler,
                    'device': self.device
                }
                
                torch.save(model_data, filepath)
                logger.info(f"LSTM model for {symbol} saved to {filepath}")
                
            elif model_type.lower() == "gru" and symbol in self.gru_models:
                model = self.gru_models[symbol]
                config = self.model_configs[f"{symbol}_gru"]
                processor = self.data_processors[symbol]
                
                model_data = {
                    'model_state_dict': model.state_dict(),
                    'config': config,
                    'scaler': processor.scaler,
                    'device': self.device
                }
                
                torch.save(model_data, filepath)
                logger.info(f"GRU model for {symbol} saved to {filepath}")
            else:
                raise ValueError(f"No {model_type} model found for {symbol}")
                
        except Exception as e:
            logger.error(f"Failed to save {model_type} model for {symbol}: {e}")
            raise
    
    def load_model(self, symbol: str, model_type: str, filepath: str):
        """Load model from disk"""
        try:
            model_data = torch.load(filepath, map_location=self.device)
            
            if model_type.lower() == "lstm":
                config = model_data['config']
                model = LSTMModel(config)
                model.load_state_dict(model_data['model_state_dict'])
                model.to(self.device)
                
                self.lstm_models[symbol] = model
                self.model_configs[f"{symbol}_lstm"] = config
                
                # Restore scaler
                processor = TimeSeriesDataProcessor(config.sequence_length)
                processor.scaler = model_data['scaler']
                self.data_processors[symbol] = processor
                
                logger.info(f"LSTM model for {symbol} loaded from {filepath}")
                
            elif model_type.lower() == "gru":
                config = model_data['config']
                model = GRUModel(config)
                model.load_state_dict(model_data['model_state_dict'])
                model.to(self.device)
                
                self.gru_models[symbol] = model
                self.model_configs[f"{symbol}_gru"] = config
                
                # Restore scaler
                processor = TimeSeriesDataProcessor(config.sequence_length)
                processor.scaler = model_data['scaler']
                self.data_processors[symbol] = processor
                
                logger.info(f"GRU model for {symbol} loaded from {filepath}")
                
        except Exception as e:
            logger.error(f"Failed to load {model_type} model for {symbol}: {e}")
            raise

# Custom MinMaxScaler implementation (since we can't import sklearn in this context)
class MinMaxScaler:
    """Simple MinMaxScaler implementation"""
    
    def __init__(self):
        self.min_vals = None
        self.max_vals = None
        self.scale_range = None
    
    def fit(self, X):
        """Fit the scaler to the data"""
        self.min_vals = np.min(X, axis=0)
        self.max_vals = np.max(X, axis=0)
        self.scale_range = self.max_vals - self.min_vals
        # Avoid division by zero
        self.scale_range[self.scale_range == 0] = 1
        return self
    
    def transform(self, X):
        """Transform the data"""
        return (X - self.min_vals) / self.scale_range
    
    def fit_transform(self, X):
        """Fit and transform the data"""
        return self.fit(X).transform(X)
    
    def inverse_transform(self, X):
        """Inverse transform the data"""
        return X * self.scale_range + self.min_vals

# Global LSTM/GRU prediction engine instance
lstm_gru_engine = LSTMGRUPredictionEngine()