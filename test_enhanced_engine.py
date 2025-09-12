#!/usr/bin/env python3
"""
Test script for Enhanced Prediction Engine
"""
import os
import sys

sys.path.append(os.path.dirname(__file__))

try:
    print("Testing enhanced prediction engine import...")
    from src.ml.enhanced_prediction_engine import EnhancedStockPredictionEngine

    print("OK Enhanced prediction engine imported successfully")

    # Test instantiation
    print("Testing engine instantiation...")
    engine = EnhancedStockPredictionEngine()
    print("OK Enhanced prediction engine instantiated successfully")

    # Test prediction
    print("Testing prediction for stock 7974...")
    result = engine.predict_price("7974", optimize_params=False, period="6mo")
    print(f"OK Prediction successful: {result}")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback

    traceback.print_exc()
