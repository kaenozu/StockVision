#!/usr/bin/env python3
"""
統合予想システム（LSTM + Ensemble）のテストスクリプト
"""
import logging
import os
import sys

from src.ml.integrated_predictor import integrated_predictor
from src.ml.lstm_predictor import TENSORFLOW_AVAILABLE

# プロジェクトのルートをパスに追加
sys.path.insert(0, os.path.abspath("."))


def test_integrated_predictor():
    """統合予想システムのテスト"""
    print("Integrated Predictor Test (LSTM + Ensemble)")
    print("=" * 50)

    print(f"TensorFlow available: {TENSORFLOW_AVAILABLE}")

    # テスト用銘柄
    test_stock = "7203"  # トヨタ自動車

    print(f"\nTesting stock: {test_stock}")

    try:
        # 1. モデル情報取得
        print("\n1. Getting model info...")
        model_info = integrated_predictor.get_model_info(test_stock)
        print(f"   LSTM available: {model_info['integrated']['lstm_available']}")
        print(f"   LSTM trained: {model_info['integrated']['lstm_trained']}")
        print(f"   Ensemble trained: {model_info['integrated']['ensemble_trained']}")
        print(
            f"   Default weights - LSTM: {model_info['integrated']['weights']['lstm']:.1%}, "
            f"Ensemble: {model_info['integrated']['weights']['ensemble']:.1%}"
        )

        # 2. 統合予想実行（固定重み）
        print("\n2. Running integrated prediction (fixed weights)...")
        result_fixed = integrated_predictor.predict(
            test_stock, use_adaptive_weights=False
        )

        print(f"   Method used: {result_fixed.method_used}")
        print(f"   Final predicted price: {result_fixed.predicted_price:,.0f} yen")
        print(f"   Confidence: {result_fixed.confidence:.1%}")

        if result_fixed.lstm_prediction > 0:
            print(
                f"   LSTM prediction: {result_fixed.lstm_prediction:,.0f} yen (weight: {result_fixed.lstm_weight:.1%})"
            )
        print(
            f"   Ensemble prediction: {result_fixed.ensemble_prediction:,.0f} yen (weight: {result_fixed.ensemble_weight:.1%})"
        )
        print(
            f"   Current price: {result_fixed.technical_indicators['current_price']:,.0f} yen"
        )

        # 3. 統合予想実行（適応的重み）
        print("\n3. Running integrated prediction (adaptive weights)...")
        result_adaptive = integrated_predictor.predict(
            test_stock, use_adaptive_weights=True
        )

        print(f"   Method used: {result_adaptive.method_used}")
        print(f"   Final predicted price: {result_adaptive.predicted_price:,.0f} yen")
        print(f"   Confidence: {result_adaptive.confidence:.1%}")

        if result_adaptive.lstm_prediction > 0:
            print(
                f"   LSTM prediction: {result_adaptive.lstm_prediction:,.0f} yen (adaptive weight: {result_adaptive.lstm_weight:.1%})"
            )
        print(
            f"   Ensemble prediction: {result_adaptive.ensemble_prediction:,.0f} yen (adaptive weight: {result_adaptive.ensemble_weight:.1%})"
        )

        # 4. 精度比較
        print("\n4. Model accuracies...")
        accuracies = result_adaptive.model_accuracies
        if accuracies["lstm"] > 0:
            print(f"   LSTM accuracy: {accuracies['lstm']:.1%}")
        print(f"   Ensemble accuracy: {accuracies['ensemble']:.1%}")
        print(f"   Integrated accuracy: {accuracies['integrated']:.1%}")

        # 5. 技術指標
        print("\n5. Technical indicators...")
        ti = result_adaptive.technical_indicators
        print(f"   Current price: {ti['current_price']:,.0f} yen")
        print(
            f"   SMA20: {ti.get('sma_20', 'N/A'):,.0f}"
            + (" yen" if ti.get("sma_20", "N/A") != "N/A" else "")
        )
        print(
            f"   RSI: {ti.get('rsi', 'N/A'):.1f}"
            if ti.get("rsi", "N/A") != "N/A"
            else "   RSI: N/A"
        )
        print(
            f"   MACD: {ti.get('macd', 'N/A'):.2f}"
            if ti.get("macd", "N/A") != "N/A"
            else "   MACD: N/A"
        )

        # 6. 予想比較
        print("\n6. Prediction comparison...")
        current_price = ti["current_price"]
        if result_fixed.predicted_price != result_adaptive.predicted_price:
            print(
                f"   Fixed weights: {result_fixed.predicted_price:,.0f} yen ({((result_fixed.predicted_price - current_price) / current_price) * 100:+.1f}%)"
            )
            print(
                f"   Adaptive weights: {result_adaptive.predicted_price:,.0f} yen ({((result_adaptive.predicted_price - current_price) / current_price) * 100:+.1f}%)"
            )
        else:
            print(
                f"   Both methods: {result_adaptive.predicted_price:,.0f} yen ({((result_adaptive.predicted_price - current_price) / current_price) * 100:+.1f}%)"
            )

        print("\nIntegrated predictor test completed successfully!")
        return True

    except Exception as e:
        print(f"\nIntegrated predictor test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = test_integrated_predictor()
    sys.exit(0 if success else 1)
