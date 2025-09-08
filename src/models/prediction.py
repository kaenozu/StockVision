"""
Machine Learning prediction models for stock prediction system.
"""
import json
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any

from sqlalchemy import String, Integer, DECIMAL, DateTime, Date, Boolean, Text, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, validates, relationship
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.dialects.postgresql import JSON

from .stock import Base


class PredictionModel(Base):
    """Machine learning model for stock predictions."""
    
    __tablename__ = "prediction_models"
    
    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Model identification
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    model_type: Mapped[str] = mapped_column(String(20), nullable=False)
    algorithm: Mapped[str] = mapped_column(String(50), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    
    # Performance metrics
    accuracy_score: Mapped[float] = mapped_column(DECIMAL(5, 4), nullable=False)
    
    # Training data period
    training_data_start: Mapped[date] = mapped_column(Date, nullable=False)
    training_data_end: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Model file and features
    model_file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    feature_names: Mapped[Dict[str, Any]] = mapped_column(MutableDict.as_mutable(JSON), nullable=False)
    
    # Status and performance
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    performance_metrics: Mapped[Dict[str, Any]] = mapped_column(MutableDict.as_mutable(JSON), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    last_trained: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    prediction_results = relationship("PredictionResult", back_populates="model")
    accuracy_history = relationship("AccuracyHistory", back_populates="model")
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint('accuracy_score >= 0.0 AND accuracy_score <= 1.0', name='check_accuracy_range'),
        CheckConstraint("model_type IN ('short_term', 'medium_term', 'long_term')", name='check_model_type'),
        CheckConstraint("algorithm IN ('random_forest', 'linear_regression', 'svr')", name='check_algorithm'),
        Index('idx_model_type_algorithm', 'model_type', 'algorithm'),
        Index('idx_prediction_models_is_active', 'is_active'),
        Index('idx_last_trained', 'last_trained'),
    )
    
    @validates('version')
    def validate_version(self, key, version):
        """Validate semantic versioning format."""
        import re
        if not re.match(r'^\d+\.\d+\.\d+$', version):
            raise ValueError("Version must follow semantic versioning (e.g., 1.0.0)")
        return version
    
    @validates('accuracy_score')
    def validate_accuracy(self, key, accuracy_score):
        """Validate accuracy score is between 0 and 1."""
        if not (0.0 <= accuracy_score <= 1.0):
            raise ValueError("Accuracy score must be between 0.0 and 1.0")
        return accuracy_score


class PredictionResult(Base):
    """Individual prediction result from ML models."""
    
    __tablename__ = "prediction_results"
    
    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Stock and model reference
    stock_code: Mapped[str] = mapped_column(String(4), ForeignKey('stocks.stock_code'), nullable=False)
    model_id: Mapped[int] = mapped_column(Integer, ForeignKey('prediction_models.id'), nullable=False)
    
    # Prediction details
    prediction_date: Mapped[date] = mapped_column(Date, nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    predicted_price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    predicted_action: Mapped[str] = mapped_column(String(10), nullable=False)
    confidence_score: Mapped[float] = mapped_column(DECIMAL(5, 4), nullable=False)
    
    # Actual results (filled later)
    actual_price: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2), nullable=True)
    actual_action: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    accuracy_flag: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    error_percentage: Mapped[Optional[float]] = mapped_column(DECIMAL(7, 4), nullable=True)
    
    # Feature snapshot
    individual_predictions: Mapped[Dict[str, Any]] = mapped_column(MutableDict.as_mutable(JSON), nullable=False)
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    stock = relationship("Stock", back_populates="prediction_results")
    model = relationship("PredictionModel", back_populates="prediction_results")
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint('confidence_score >= 0.0 AND confidence_score <= 1.0', name='check_confidence_range'),
        CheckConstraint("predicted_action IN ('buy', 'sell', 'hold')", name='check_predicted_action'),
        CheckConstraint("actual_action IS NULL OR actual_action IN ('buy', 'sell', 'hold')", name='check_actual_action'),
        CheckConstraint('prediction_date <= target_date', name='check_date_order'),
        Index('idx_stock_model', 'stock_code', 'model_id'),
        Index('idx_target_date', 'target_date'),
        Index('idx_prediction_date', 'prediction_date'),
        Index('idx_accuracy_flag', 'accuracy_flag'),
    )
    
    @validates('predicted_action', 'actual_action')
    def validate_action(self, key, action):
        """Validate action is one of the allowed values."""
        if action is not None and action not in ['buy', 'sell', 'hold']:
            raise ValueError(f"Action must be one of: buy, sell, hold")
        return action
    
    @validates('confidence_score')
    def validate_confidence(self, key, confidence_score):
        """Validate confidence score is between 0 and 1."""
        if not (0.0 <= confidence_score <= 1.0):
            raise ValueError("Confidence score must be between 0.0 and 1.0")
        return confidence_score


class TrainingDataset(Base):
    """Training dataset metadata and quality tracking."""
    
    __tablename__ = "training_datasets"
    
    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Dataset identification
    stock_code: Mapped[str] = mapped_column(String(4), ForeignKey('stocks.stock_code'), nullable=False)
    data_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    data_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Data quality metrics
    total_records: Mapped[int] = mapped_column(Integer, nullable=False)
    missing_records: Mapped[int] = mapped_column(Integer, nullable=False)
    quality_score: Mapped[float] = mapped_column(DECIMAL(5, 4), nullable=False)
    
    # Dataset structure
    feature_columns: Mapped[Dict[str, Any]] = mapped_column(MutableDict.as_mutable(JSON), nullable=False)
    target_columns: Mapped[Dict[str, Any]] = mapped_column(MutableDict.as_mutable(JSON), nullable=False)
    
    # File and validation
    data_file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    validation_errors: Mapped[Dict[str, Any]] = mapped_column(MutableDict.as_mutable(JSON), nullable=True)
    
    # Timestamps
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    stock = relationship("Stock", back_populates="training_datasets")
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint('data_start_date < data_end_date', name='check_date_range'),
        CheckConstraint('total_records >= missing_records', name='check_record_counts'),
        CheckConstraint('quality_score >= 0.0 AND quality_score <= 1.0', name='check_quality_score'),
        Index('idx_stock_dates', 'stock_code', 'data_start_date', 'data_end_date'),
        Index('idx_quality_score', 'quality_score'),
        Index('idx_last_updated', 'last_updated'),
    )
    
    @validates('quality_score')
    def validate_quality_score(self, key, quality_score):
        """Validate quality score calculation."""
        if self.total_records and self.missing_records is not None:
            expected_quality = (self.total_records - self.missing_records) / self.total_records
            if abs(quality_score - expected_quality) > 0.001:  # Allow small floating point differences
                raise ValueError("Quality score must equal (total_records - missing_records) / total_records")
        return quality_score


class AccuracyHistory(Base):
    """Historical tracking of model prediction accuracy."""
    
    __tablename__ = "accuracy_history"
    
    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Model reference
    model_id: Mapped[int] = mapped_column(Integer, ForeignKey('prediction_models.id'), nullable=False)
    
    # Evaluation period
    evaluation_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Accuracy metrics
    total_predictions: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_predictions: Mapped[int] = mapped_column(Integer, nullable=False)
    accuracy_percentage: Mapped[float] = mapped_column(DECIMAL(7, 4), nullable=False)
    avg_error_percentage: Mapped[float] = mapped_column(DECIMAL(7, 4), nullable=False)
    
    # Detailed metrics
    mae_score: Mapped[Optional[float]] = mapped_column(DECIMAL(10, 6), nullable=True)  # Mean Absolute Error
    mse_score: Mapped[Optional[float]] = mapped_column(DECIMAL(10, 6), nullable=True)  # Mean Squared Error
    rmse_score: Mapped[Optional[float]] = mapped_column(DECIMAL(10, 6), nullable=True)  # Root Mean Squared Error
    r2_score: Mapped[Optional[float]] = mapped_column(DECIMAL(10, 6), nullable=True)  # R-squared
    
    # Performance by action type
    buy_accuracy: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 4), nullable=True)
    sell_accuracy: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 4), nullable=True)
    hold_accuracy: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 4), nullable=True)
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    model = relationship("PredictionModel", back_populates="accuracy_history")
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint('total_predictions >= correct_predictions', name='check_prediction_counts'),
        CheckConstraint('accuracy_percentage >= 0.0 AND accuracy_percentage <= 100.0', name='check_accuracy_percentage'),
        Index('idx_model_evaluation_date', 'model_id', 'evaluation_date'),
        Index('idx_accuracy_percentage', 'accuracy_percentage'),
        Index('idx_evaluation_date', 'evaluation_date'),
    )
    
    @validates('accuracy_percentage')
    def validate_accuracy_percentage(self, key, accuracy_percentage):
        """Validate accuracy percentage calculation."""
        if self.total_predictions and self.correct_predictions is not None:
            expected_accuracy = (self.correct_predictions / self.total_predictions) * 100
            if abs(accuracy_percentage - expected_accuracy) > 0.01:  # Allow small floating point differences
                raise ValueError("Accuracy percentage must equal (correct_predictions / total_predictions) * 100")
        return accuracy_percentage


class MarketAnomalyDetection(Base):
    """Market anomaly detection and gating for predictions."""
    
    __tablename__ = "market_anomaly_detection"
    
    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Detection details
    stock_code: Mapped[Optional[str]] = mapped_column(String(4), ForeignKey('stocks.stock_code'), nullable=True)  # Null for market-wide anomalies
    detection_date: Mapped[date] = mapped_column(Date, nullable=False)
    anomaly_type: Mapped[str] = mapped_column(String(50), nullable=False)
    anomaly_level: Mapped[str] = mapped_column(String(20), nullable=False)
    
    # Anomaly details
    detected_metrics: Mapped[Dict[str, Any]] = mapped_column(MutableDict.as_mutable(JSON), nullable=False)
    threshold_values: Mapped[Dict[str, Any]] = mapped_column(MutableDict.as_mutable(JSON), nullable=False)
    
    # Response policy
    prediction_gate_action: Mapped[str] = mapped_column(String(20), nullable=False)
    affected_period_start: Mapped[date] = mapped_column(Date, nullable=False)
    affected_period_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    stock = relationship("Stock", back_populates="anomaly_detections")
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint("anomaly_level IN ('low', 'medium', 'high', 'critical')", name='check_anomaly_level'),
        CheckConstraint("prediction_gate_action IN ('warning', 'suspend', 'block')", name='check_gate_action'),
        CheckConstraint('affected_period_start <= affected_period_end OR affected_period_end IS NULL', name='check_period_range'),
        Index('idx_stock_detection_date', 'stock_code', 'detection_date'),
        Index('idx_anomaly_level', 'anomaly_level'),
        Index('idx_anomaly_is_active', 'is_active'),
        Index('idx_detection_date', 'detection_date'),
    )