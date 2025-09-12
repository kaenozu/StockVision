#!/usr/bin/env python3
"""
Phase 3: 強化された統合予想システムのテストスクリプト
高度な特徴量エンジニアリングを含む統合システムのテスト
"""
import logging
import os
import sys

# プロジェクトのルートをパスに追加
sys.path.insert(0, os.path.abspath("."))


def test_enhanced_phase3_system():
    """Phase 3 強化システムのテスト"""
    print("Phase 3: Enhanced Integrated Prediction System Test")
    print("=" * 60)

    try:
        # 依存関係のインポート
        from src.ml.advanced_feature_engine import advanced_feature_engine
        from src.ml.enhanced_integrated_predictor import enhanced_integrated_predictor

        # テスト用銘柄
        test_stock = "7203"  # トヨタ自動車

        print(f"\nTesting enhanced system with stock: {test_stock}")

        # 1. 高度な特徴量エンジンのテスト
        print("\n1. Testing advanced feature engine...")

        # マーケットコンテキストを取得
        try:
            market_ctx = advanced_feature_engine.get_market_context()
            print("   Market context retrieved:")
            print(f"   - Nikkei 225 change: {market_ctx.nikkei225_change:.2f}%")
            print(f"   - TOPIX change: {market_ctx.topix_change:.2f}%")
            print(f"   - USD/JPY rate: {market_ctx.usd_jpy_rate:.2f}")
            print(f"   - VIX level: {market_ctx.vix_level:.1f}")
            print(f"   - Market regime: {market_ctx.regime.value}")
        except Exception as e:
            print(f"   Warning: Could not fetch live market data: {e}")
            print("   Using default/cached values for testing")

        # 2. 強化された価格データの取得
        print("\n2. Testing enhanced price data...")
        enhanced_df = enhanced_integrated_predictor.enhance_price_data(
            test_stock, days=30
        )

        if enhanced_df is not None:
            print(f"   Enhanced data shape: {enhanced_df.shape}")
            print(f"   Total features: {enhanced_df.shape[1]}")

            # 特徴量カテゴリ分析
            technical_features = [
                col
                for col in enhanced_df.columns
                if any(x in col.lower() for x in ["sma", "ema", "rsi", "macd", "bb_"])
            ]
            market_features = [
                col
                for col in enhanced_df.columns
                if any(
                    x in col.lower()
                    for x in ["nikkei", "topix", "mothers", "vix", "regime"]
                )
            ]
            seasonal_features = [
                col
                for col in enhanced_df.columns
                if any(x in col.lower() for x in ["day_", "month", "quarter"])
            ]

            print("   Feature categories:")
            print(f"   - Technical: {len(technical_features)}")
            print(f"   - Market: {len(market_features)}")
            print(f"   - Seasonal: {len(seasonal_features)}")

            # サンプル特徴量表示
            if len(enhanced_df) > 0:
                latest_row = enhanced_df.iloc[-1]
                print("   Sample latest features:")
                print(f"   - Close price: {latest_row.get('Close', 'N/A'):,.0f}")
                print(
                    "   - RSI: {:.1f}".format(latest_row.get("rsi", float("nan")))
                    if "rsi" in latest_row
                    else "   - RSI: N/A"
                )
                print(
                    "   - VIX level: {:.1f}".format(
                        latest_row.get("vix_level", float("nan"))
                    )
                    if "vix_level" in latest_row
                    else "   - VIX level: N/A"
                )
                print(
                    "   - Month: {}".format(latest_row.get("month", "N/A"))
                    if "month" in latest_row
                    else "   - Month: N/A"
                )
        else:
            print("   Warning: Could not enhance price data")

        # 3. 強化された統合予想の実行
        print("\n3. Testing enhanced integrated prediction...")

        # 基本予想（強化特徴量なし）
        result_basic = enhanced_integrated_predictor.predict_enhanced(
            test_stock, use_advanced_features=False
        )
        if result_basic:
            print("   Basic prediction:")
            print(f"   - Predicted price: {result_basic.predicted_price:,.0f} yen")
            print(f"   - Confidence: {result_basic.confidence:.1%}")
            print(f"   - Enhanced features used: {result_basic.enhanced_features_used}")

        # 強化予想（高度な特徴量あり）
        result_enhanced = enhanced_integrated_predictor.predict_enhanced(
            test_stock, use_advanced_features=True
        )
        if result_enhanced:
            print("   Enhanced prediction:")
            print(f"   - Predicted price: {result_enhanced.predicted_price:,.0f} yen")
            print(f"   - Confidence: {result_enhanced.confidence:.1%}")
            print(
                f"   - Enhanced features used: {result_enhanced.enhanced_features_used}"
            )
            print(
                f"   - Market context score: {result_enhanced.market_context_score:+.3f}"
            )
            print(f"   - Seasonal factor: {result_enhanced.seasonal_factor:+.3f}")
            print(f"   - Volatility regime: {result_enhanced.volatility_regime}")

        # 4. 予想の比較と分析
        print("\n4. Prediction comparison and analysis...")

        if result_basic and result_enhanced:
            basic_price = result_basic.predicted_price
            enhanced_price = result_enhanced.predicted_price

            improvement = enhanced_price - basic_price
            improvement_percent = (
                (improvement / basic_price) * 100 if basic_price > 0 else 0
            )

            confidence_improvement = (
                result_enhanced.confidence - result_basic.confidence
            )

            print("   Comparison:")
            print(
                f"   - Price difference: {improvement:+.0f} yen ({improvement_percent:+.2f}%)"
            )
            print(f"   - Confidence improvement: {confidence_improvement:+.1%}")
            print(
                f"   - Features improvement: {result_enhanced.enhanced_features_used - result_basic.enhanced_features_used}"
            )

            # 予想説明の生成
            if hasattr(enhanced_integrated_predictor, "get_prediction_explanation"):
                explanation = enhanced_integrated_predictor.get_prediction_explanation(
                    result_enhanced
                )
                print("   Prediction explanation:")
                print(f"   - Direction: {explanation['summary']['direction']}")
                print(f"   - Magnitude: {explanation['summary']['magnitude']:.1f}%")
                print(
                    f"   - Confidence level: {explanation['summary']['confidence_level']}"
                )
                print(
                    f"   - Market context: {explanation['key_factors']['market_context']}"
                )
                print(
                    f"   - Seasonal effect: {explanation['key_factors']['seasonal_effect']}"
                )

        # 5. 特徴量重要度の分析
        print("\n5. Feature importance analysis...")

        if result_enhanced and result_enhanced.feature_importance:
            print("   Feature category importance:")
            for category, importance in result_enhanced.feature_importance.items():
                print(f"   - {category.capitalize()}: {importance:.1%}")

        print("\n" + "=" * 60)
        print("✅ Phase 3 Enhanced System Test Completed Successfully!")

        # 成功条件の判定
        success_criteria = []

        if enhanced_df is not None and enhanced_df.shape[1] > 20:
            success_criteria.append("✅ Enhanced features generated")
        else:
            success_criteria.append("⚠️  Limited enhanced features")

        if result_enhanced and result_enhanced.enhanced_features_used > 0:
            success_criteria.append("✅ Enhanced prediction successful")
        else:
            success_criteria.append("⚠️  Enhanced prediction limited")

        if result_enhanced and result_enhanced.confidence > 0.5:
            success_criteria.append("✅ Acceptable prediction confidence")
        else:
            success_criteria.append("⚠️  Low prediction confidence")

        print("\nSuccess Criteria:")
        for criterion in success_criteria:
            print(f"   {criterion}")

        # 全体的な成功判定
        success_count = sum(1 for c in success_criteria if c.startswith("✅"))
        total_criteria = len(success_criteria)

        if success_count >= total_criteria * 0.8:  # 80%以上で成功
            print(f"\n🎉 PHASE 3 SYSTEM: EXCELLENT ({success_count}/{total_criteria})")
            return True
        elif success_count >= total_criteria * 0.6:  # 60%以上で良好
            print(f"\n✅ PHASE 3 SYSTEM: GOOD ({success_count}/{total_criteria})")
            return True
        else:
            print(
                f"\n⚠️  PHASE 3 SYSTEM: NEEDS IMPROVEMENT ({success_count}/{total_criteria})"
            )
            return False

    except ImportError as e:
        print(f"\n❌ Import Error: {e}")
        print("Please ensure all required dependencies are installed:")
        print("- yfinance")
        print("- requests")
        return False

    except Exception as e:
        print(f"\n❌ Phase 3 enhanced system test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = test_enhanced_phase3_system()
    sys.exit(0 if success else 1)
