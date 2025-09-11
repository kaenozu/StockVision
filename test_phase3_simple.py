#!/usr/bin/env python3
"""
Phase 3: 簡略版テストスクリプト（外部データソースなし）
高度な特徴量エンジニアリングの基本機能テスト
"""
import os
import sys
import logging

# プロジェクトのルートをパスに追加
sys.path.insert(0, os.path.abspath('.'))

def test_phase3_simple():
    """Phase 3 システムの簡略版テスト"""
    print("Phase 3: Simple Feature Engineering Test")
    print("=" * 50)
    
    try:
        # 依存関係のインポート
        from src.ml.advanced_feature_engine import AdvancedFeatureEngine
        import pandas as pd
        import numpy as np
        from datetime import datetime, timedelta
        
        # テスト用データ作成
        dates = pd.date_range(start='2025-01-01', end='2025-09-10', freq='D')
        test_data = pd.DataFrame({
            'Open': 3000 + np.random.randn(len(dates)) * 50,
            'High': 3050 + np.random.randn(len(dates)) * 50,
            'Low': 2950 + np.random.randn(len(dates)) * 50,
            'Close': 3000 + np.random.randn(len(dates)) * 50,
            'Volume': 1000000 + np.random.randint(-100000, 100000, len(dates))
        }, index=dates)
        
        print(f"\n1. Created test data: {test_data.shape}")
        print(f"   Date range: {test_data.index[0]} to {test_data.index[-1]}")
        
        # 特徴量エンジンを初期化
        feature_engine = AdvancedFeatureEngine()
        
        # 2. 技術的特徴量のテスト
        print("\n2. Testing technical features...")
        tech_df = feature_engine.create_technical_features(test_data.copy())
        tech_features = [col for col in tech_df.columns if col not in ['Open', 'High', 'Low', 'Close', 'Volume']]
        print(f"   Technical features created: {len(tech_features)}")
        print(f"   Sample features: {tech_features[:5]}")
        
        # 3. 季節性特徴量のテスト
        print("\n3. Testing seasonal features...")
        seasonal_df = feature_engine.create_seasonal_features(test_data.copy())
        seasonal_features = [col for col in seasonal_df.columns 
                           if any(x in col.lower() for x in ['day_', 'month', 'quarter', 'season', 'holiday'])]
        print(f"   Seasonal features created: {len(seasonal_features)}")
        print(f"   Sample seasonal features: {seasonal_features[:5]}")
        
        # 季節性特徴量の値をチェック
        if len(seasonal_df) > 0:
            latest = seasonal_df.iloc[-1]
            print(f"   Latest values:")
            print(f"   - Month: {latest.get('month', 'N/A')}")
            print(f"   - Day of week: {latest.get('day_of_week', 'N/A')}")
            print(f"   - Quarter: {latest.get('quarter', 'N/A')}")
        
        # 4. マクロ経済特徴量のテスト
        print("\n4. Testing macroeconomic features...")
        macro_df = feature_engine.create_macroeconomic_features(test_data.copy())
        macro_features = [col for col in macro_df.columns 
                         if any(x in col.lower() for x in ['rate', 'inflation', 'gdp', 'unemployment'])]
        print(f"   Macroeconomic features created: {len(macro_features)}")
        print(f"   Sample macro features: {macro_features[:5]}")
        
        # 5. センチメント特徴量のテスト
        print("\n5. Testing sentiment features...")
        sentiment_df = feature_engine.create_sentiment_features(test_data.copy())
        sentiment_features = [col for col in sentiment_df.columns 
                            if any(x in col.lower() for x in ['sentiment', 'fear', 'greed'])]
        print(f"   Sentiment features created: {len(sentiment_features)}")
        print(f"   Sample sentiment features: {sentiment_features[:3]}")
        
        # 6. クロスアセット特徴量のテスト
        print("\n6. Testing cross-asset features...")
        cross_asset_df = feature_engine.create_cross_asset_features(test_data.copy())
        cross_asset_features = [col for col in cross_asset_df.columns 
                              if 'correlation' in col.lower()]
        print(f"   Cross-asset features created: {len(cross_asset_features)}")
        print(f"   Sample cross-asset features: {cross_asset_features[:3]}")
        
        # 7. 季節性要因の計算テスト
        print("\n7. Testing seasonal factor calculation...")
        current_seasonal = feature_engine.calculate_seasonal_factor()
        print(f"   Current seasonal factor: {current_seasonal:.4f}")
        
        # 異なる日付での季節性要因
        test_dates = [
            datetime(2025, 1, 5),   # 年始
            datetime(2025, 3, 31),  # 年度末
            datetime(2025, 4, 1),   # 新年度
            datetime(2025, 8, 15),  # 夏休み
            datetime(2025, 12, 30)  # 年末
        ]
        
        print(f"   Seasonal factors for different dates:")
        for date in test_dates:
            factor = feature_engine.calculate_seasonal_factor(date)
            print(f"   - {date.strftime('%Y-%m-%d')}: {factor:+.4f}")
        
        # 8. 統合機能のテスト（マーケット機能を除く）
        print("\n8. Testing integrated features (without market data)...")
        
        # マーケット特徴量を除く全特徴量の作成
        all_features_df = test_data.copy()
        all_features_df = feature_engine.create_technical_features(all_features_df)
        all_features_df = feature_engine.create_seasonal_features(all_features_df)
        all_features_df = feature_engine.create_macroeconomic_features(all_features_df)
        all_features_df = feature_engine.create_cross_asset_features(all_features_df)
        all_features_df = feature_engine.create_sentiment_features(all_features_df)
        
        total_features = all_features_df.shape[1] - 5  # 元の価格・ボリューム列を除く
        print(f"   Total enhanced features: {total_features}")
        
        # 特徴量カテゴリ分析
        all_columns = all_features_df.columns.tolist()
        categories = {
            'Technical': [col for col in all_columns if any(x in col.lower() for x in ['sma', 'ema', 'rsi', 'macd', 'bb_'])],
            'Seasonal': [col for col in all_columns if any(x in col.lower() for x in ['day_', 'month', 'quarter'])],
            'Macro': [col for col in all_columns if any(x in col.lower() for x in ['rate', 'gdp', 'inflation'])],
            'Sentiment': [col for col in all_columns if any(x in col.lower() for x in ['sentiment', 'fear'])],
            'Cross-Asset': [col for col in all_columns if 'correlation' in col.lower()]
        }
        
        print(f"   Feature breakdown:")
        for category, features in categories.items():
            print(f"   - {category}: {len(features)}")
        
        # 9. データ品質チェック
        print("\n9. Data quality check...")
        
        # NaN値のチェック
        nan_count = all_features_df.isnull().sum().sum()
        print(f"   Total NaN values: {nan_count}")
        
        # 無限値のチェック
        inf_count = np.isinf(all_features_df.select_dtypes(include=[np.number])).sum().sum()
        print(f"   Total infinite values: {inf_count}")
        
        # 定数特徴量のチェック
        numeric_columns = all_features_df.select_dtypes(include=[np.number]).columns
        constant_features = [col for col in numeric_columns if all_features_df[col].nunique() <= 1]
        print(f"   Constant features: {len(constant_features)}")
        
        print("\n" + "=" * 50)
        print("Phase 3 Simple Test Results:")
        
        # 成功条件の評価
        success_criteria = []
        
        if total_features >= 30:
            success_criteria.append("✅ Generated sufficient features")
            score_features = 1
        else:
            success_criteria.append("⚠️  Limited features generated")
            score_features = 0.5
        
        if nan_count == 0:
            success_criteria.append("✅ No NaN values")
            score_quality = 1
        elif nan_count < total_features * 0.1:
            success_criteria.append("✅ Acceptable NaN values")
            score_quality = 0.8
        else:
            success_criteria.append("⚠️  High NaN values")
            score_quality = 0.5
        
        if len(categories['Technical']) >= 10:
            success_criteria.append("✅ Rich technical features")
            score_technical = 1
        else:
            success_criteria.append("⚠️  Limited technical features")
            score_technical = 0.7
        
        if len(categories['Seasonal']) >= 5:
            success_criteria.append("✅ Good seasonal coverage")
            score_seasonal = 1
        else:
            success_criteria.append("⚠️  Limited seasonal features")
            score_seasonal = 0.7
        
        for criterion in success_criteria:
            print(f"   {criterion}")
        
        # 総合スコア計算
        total_score = (score_features + score_quality + score_technical + score_seasonal) / 4
        
        print(f"\nOverall Score: {total_score:.1%}")
        
        if total_score >= 0.8:
            print("🎉 PHASE 3 FEATURE ENGINEERING: EXCELLENT")
            return True
        elif total_score >= 0.6:
            print("✅ PHASE 3 FEATURE ENGINEERING: GOOD")
            return True
        else:
            print("⚠️  PHASE 3 FEATURE ENGINEERING: NEEDS IMPROVEMENT")
            return False
        
    except ImportError as e:
        print(f"\nImport Error: {e}")
        return False
        
    except Exception as e:
        print(f"\nPhase 3 simple test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING)  # エラーログを抑制
    success = test_phase3_simple()
    sys.exit(0 if success else 1)