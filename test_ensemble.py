#!/usr/bin/env python3
"""
Ensemble predictor (Random Forest + SVM) テストスクリプト
"""
import os
import sys
import logging

# プロジェクトのルートをパスに追加
sys.path.insert(0, os.path.abspath('.'))

from src.ml.ensemble_predictor import ensemble_predictor

def test_ensemble_predictor():
    """アンサンブル予想エンジンのテスト"""
    print("Ensemble Predictor Test")
    print("=" * 40)
    
    # テスト用銘柄
    test_stock = "7203"  # トヨタ自動車
    
    print(f"Testing stock: {test_stock}")
    
    try:
        # 1. モデル情報取得
        print("\n1. Getting model info...")
        model_info = ensemble_predictor.get_model_info(test_stock)
        print(f"   Model trained: {model_info['trained']}")
        
        # 2. 予想実行（必要に応じて訓練も実行）
        print("\n2. Running prediction...")
        result = ensemble_predictor.predict(test_stock)
        
        print(f"   Prediction completed!")
        print(f"   Stock: {result.stock_code}")
        print(f"   Predicted price: {result.predicted_price:,.0f} yen")
        print(f"   Confidence: {result.confidence:.1%}")
        print(f"   Model accuracy: {result.model_accuracy:.1%}")
        print(f"   Current price: {result.technical_indicators['current_price']:,.0f} yen")
        
        # 技術指標表示
        print(f"   Technical indicators:")
        ti = result.technical_indicators
        print(f"     SMA20: {ti.get('sma_20', 'N/A'):,.0f}" + (" yen" if ti.get('sma_20') != 'N/A' else ""))
        print(f"     RSI: {ti.get('rsi', 'N/A')}" + (f"" if ti.get('rsi') == 'N/A' else ""))
        print(f"     MACD: {ti.get('macd', 'N/A')}")
        
        # 3. 訓練後のモデル情報
        print("\n3. Model info after training...")
        model_info_after = ensemble_predictor.get_model_info(test_stock)
        print(f"   Model trained: {model_info_after['trained']}")
        
        if model_info_after['trained']:
            metrics = model_info_after['metrics']
            config = model_info_after['config']
            print(f"   RF Weight: {config.get('rf_weight', 'N/A')}")
            print(f"   SVM Weight: {config.get('svm_weight', 'N/A')}")
            print(f"   Lookback days: {config.get('lookback_days', 'N/A')}")
            print(f"   Accuracy: {metrics.get('accuracy', 'N/A'):.1%}")
            print(f"   MAE: {metrics.get('mae', 'N/A'):.2f}")
            print(f"   RMSE: {metrics.get('rmse', 'N/A'):.2f}")
        
        print("\nEnsemble predictor test completed successfully!")
        return True
        
    except Exception as e:
        print(f"\nEnsemble predictor test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = test_ensemble_predictor()
    sys.exit(0 if success else 1)