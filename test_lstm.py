#!/usr/bin/env python3
"""
LSTM予想エンジンのテストスクリプト
"""
import os
import sys
import logging

# プロジェクトのルートをパスに追加
sys.path.insert(0, os.path.abspath('.'))

from src.ml.lstm_predictor import lstm_predictor, TENSORFLOW_AVAILABLE

def test_lstm_predictor():
    """LSTM予想エンジンのテスト"""
    print(f"TensorFlow available: {TENSORFLOW_AVAILABLE}")
    
    if not TENSORFLOW_AVAILABLE:
        print("TensorFlow not available - LSTM predictor cannot be tested")
        return False
    
    try:
        # テスト用銘柄
        test_stock = "7203"  # トヨタ自動車
        
        print(f"\nTesting LSTM predictor with stock {test_stock}")
        
        # 1. モデル情報取得テスト
        print("1. Getting model info...")
        model_info = lstm_predictor.get_model_info(test_stock)
        print(f"   Model trained: {model_info['trained']}")
        
        # 2. 予想テスト（初回はトレーニングも実行される）
        print("2. Running prediction (this will train the model if needed)...")
        result = lstm_predictor.predict(test_stock, days_ahead=1)
        
        print(f"   Prediction completed!")
        print(f"   Stock: {result.stock_code}")
        print(f"   Predicted price: {result.predicted_price:,.0f} yen")
        print(f"   Confidence: {result.confidence:.1%}")
        print(f"   Model accuracy: {result.model_accuracy:.1%}")
        print(f"   Current price: {result.technical_indicators['current_price']:,.0f} yen")
        
        # 3. モデル情報再取得（トレーニング後）
        print("3. Getting model info after training...")
        model_info_after = lstm_predictor.get_model_info(test_stock)
        print(f"   Model trained: {model_info_after['trained']}")
        if model_info_after['trained']:
            metrics = model_info_after['metrics']
            print(f"   RMSE: {metrics.get('rmse', 'N/A')}")
            print(f"   MAE: {metrics.get('mae', 'N/A')}")
            accuracy = metrics.get('accuracy', 'N/A')
            if accuracy != 'N/A':
                print(f"   Directional accuracy: {accuracy:.1%}")
            else:
                print(f"   Directional accuracy: {accuracy}")
        
        print("\nLSTM predictor test completed successfully!")
        return True
        
    except Exception as e:
        print(f"\nLSTM predictor test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = test_lstm_predictor()
    sys.exit(0 if success else 1)