#!/usr/bin/env python3
"""
統合予想システム（LSTM + Ensemble）のバックテストスクリプト
複数銘柄での精度評価を実行
"""
import logging
import os
import sys
from typing import Dict, List

import numpy as np

from src.ml.integrated_predictor import integrated_predictor
from src.ml.lstm_predictor import TENSORFLOW_AVAILABLE
from src.models.price_history import PriceHistory
from src.stock_storage.database import get_session_scope

# プロジェクトのルートをパスに追加
sys.path.insert(0, os.path.abspath("."))


def calculate_accuracy_metrics(predictions: List[Dict]) -> Dict:
    """予想結果から精度指標を計算"""
    if not predictions:
        return {"accuracy": 0.0, "mae": 0.0, "mse": 0.0, "total_predictions": 0}

    # 方向性精度
    correct_directions = 0
    mae_values = []
    mse_values = []

    for pred in predictions:
        # 予想方向と実際の方向が一致するかチェック
        predicted_change = pred["predicted_price"] - pred["current_price"]
        actual_change = pred["actual_price"] - pred["current_price"]

        if (
            (predicted_change > 0 and actual_change > 0)
            or (predicted_change < 0 and actual_change < 0)
            or (predicted_change == 0 and actual_change == 0)
        ):
            correct_directions += 1

        # 絶対誤差・二乗誤差
        error = abs(pred["predicted_price"] - pred["actual_price"])
        mae_values.append(error)
        mse_values.append(error**2)

    accuracy = correct_directions / len(predictions)
    mae = np.mean(mae_values)
    mse = np.mean(mse_values)

    return {
        "accuracy": accuracy,
        "mae": mae,
        "mse": mse,
        "rmse": np.sqrt(mse),
        "total_predictions": len(predictions),
    }


def backtest_integrated(stock_codes: List[str], days_back: int = 30) -> Dict:
    """統合予想システムのバックテスト実行"""
    print(
        f"Starting integrated backtest for {len(stock_codes)} stocks, {days_back} days back..."
    )

    all_predictions = []
    stock_results = {}

    for stock_code in stock_codes:
        print(f"\nTesting stock {stock_code}...")
        stock_predictions = []

        try:
            # 過去の価格データを取得
            with get_session_scope() as session:
                # 最新のデータから過去N日分を取得
                price_data = (
                    session.query(PriceHistory)
                    .filter(PriceHistory.stock_code == stock_code)
                    .order_by(PriceHistory.date.desc())
                    .limit(days_back + 60)
                    .all()
                )

                if len(price_data) < days_back + 10:
                    print(f"   Insufficient data for {stock_code}")
                    continue

                # 時系列順に並び替え
                price_data.reverse()

                # バックテスト実行（過去数日分のテスト）
                test_days = min(10, days_back)  # 最大10日のバックテスト

                for i in range(len(price_data) - test_days, len(price_data) - 1):
                    current_record = price_data[i]
                    next_record = price_data[i + 1]

                    try:
                        # 統合予想を実行
                        result = integrated_predictor.predict(
                            stock_code, use_adaptive_weights=True
                        )

                        prediction = {
                            "stock_code": stock_code,
                            "date": current_record.date,
                            "current_price": float(current_record.close_price),
                            "predicted_price": result.predicted_price,
                            "actual_price": float(next_record.close_price),
                            "confidence": result.confidence,
                            "lstm_prediction": result.lstm_prediction,
                            "ensemble_prediction": result.ensemble_prediction,
                            "lstm_weight": result.lstm_weight,
                            "ensemble_weight": result.ensemble_weight,
                            "method_used": result.method_used,
                        }

                        stock_predictions.append(prediction)
                        all_predictions.append(prediction)

                    except Exception as e:
                        print(
                            f"   Prediction failed for {stock_code} on {current_record.date}: {e}"
                        )
                        continue

            # 銘柄別結果を計算
            if stock_predictions:
                stock_metrics = calculate_accuracy_metrics(stock_predictions)
                stock_results[stock_code] = stock_metrics
                print(f"   {stock_code} Results:")
                print(f"   - Accuracy: {stock_metrics['accuracy']:.1%}")
                print(f"   - MAE: {stock_metrics['mae']:.2f}")
                print(f"   - RMSE: {stock_metrics['rmse']:.2f}")
                print(f"   - Predictions: {stock_metrics['total_predictions']}")

        except Exception as e:
            print(f"   Error testing {stock_code}: {e}")
            continue

    # 全体結果を計算
    overall_metrics = calculate_accuracy_metrics(all_predictions)

    # 予想手法の分析
    method_analysis = {}
    for pred in all_predictions:
        method = pred["method_used"]
        if method not in method_analysis:
            method_analysis[method] = []
        method_analysis[method].append(pred)

    method_metrics = {}
    for method, preds in method_analysis.items():
        method_metrics[method] = calculate_accuracy_metrics(preds)

    return {
        "overall": overall_metrics,
        "by_stock": stock_results,
        "by_method": method_metrics,
        "predictions": all_predictions,
    }


def main():
    """メイン関数"""
    logging.basicConfig(level=logging.WARNING)  # ログを抑制

    print("Integrated Prediction System Backtest")
    print("=" * 50)

    print(f"TensorFlow available: {TENSORFLOW_AVAILABLE}")

    # テスト対象銘柄
    test_stocks = [
        "7203",  # トヨタ
        "6758",  # ソニー
        "9984",  # ソフトバンク
        "8411",  # みずほ
        "6501",  # 日立
    ]

    # バックテスト実行
    results = backtest_integrated(test_stocks, days_back=20)

    # 結果表示
    print("\n" + "=" * 50)
    print("INTEGRATED SYSTEM BACKTEST RESULTS")
    print("=" * 50)

    overall = results["overall"]
    print("Overall Performance:")
    print(f"- Direction Accuracy: {overall['accuracy']:.1%}")
    print(f"- Mean Absolute Error: {overall['mae']:.2f}")
    print(f"- Root Mean Square Error: {overall['rmse']:.2f}")
    print(f"- Total Predictions: {overall['total_predictions']}")

    print("\nStock-by-Stock Results:")
    for stock, metrics in results["by_stock"].items():
        print(
            f"- {stock}: {metrics['accuracy']:.1%} accuracy, {metrics['total_predictions']} predictions"
        )

    print("\nMethod Analysis:")
    for method, metrics in results["by_method"].items():
        print(
            f"- {method}: {metrics['accuracy']:.1%} accuracy, {metrics['total_predictions']} predictions"
        )

    # 個別予想の詳細表示（最初の5件）
    print("\nSample Predictions (first 5):")
    for i, pred in enumerate(results["predictions"][:5]):
        current = pred["current_price"]
        predicted = pred["predicted_price"]
        actual = pred["actual_price"]
        pred_change = ((predicted - current) / current) * 100
        actual_change = ((actual - current) / current) * 100

        print("{}. {} ({}) :".format(i + 1, pred["stock_code"], pred["date"]))
        print(
            "   Current: {current:,.0f}, Predicted: {predicted:,.0f} ({pred_change:+.1f}%), Actual: {actual:,.0f} ({actual_change:+.1f}%)".format(
                current=current,
                predicted=predicted,
                pred_change=pred_change,
                actual=actual,
                actual_change=actual_change,
            )
        )
        print(
            "   Method: {}, LSTM: {lstm_prediction:,.0f} ({lstm_weight:.1%}), Ensemble: {ensemble_prediction:,.0f} ({ensemble_weight:.1%})".format(
                pred["method_used"],
                lstm_prediction=pred["lstm_prediction"],
                lstm_weight=pred["lstm_weight"],
                ensemble_prediction=pred["ensemble_prediction"],
                ensemble_weight=pred["ensemble_weight"],
            )
        )

    # 精度評価
    target_accuracy = 0.70  # 70%目標
    current_accuracy = overall["accuracy"]

    print("\nAccuracy Assessment:")
    print(f"- Target: {target_accuracy:.1%}")
    print(f"- Current: {current_accuracy:.1%}")
    print(f"- Gap: {(target_accuracy - current_accuracy):.1%}")

    if current_accuracy >= target_accuracy:
        print("🎉 TARGET ACHIEVED!")
        status = "EXCELLENT"
    elif current_accuracy >= 0.65:
        print("✅ VERY GOOD - Close to target!")
        status = "VERY_GOOD"
    elif current_accuracy >= 0.60:
        print("✅ GOOD - Above baseline!")
        status = "GOOD"
    else:
        improvement_needed = target_accuracy - current_accuracy
        print(f"⚠️  Improvement needed: {improvement_needed:.1%}")
        status = "NEEDS_IMPROVEMENT"

    print(f"\nIntegrated System Status: {status}")

    return current_accuracy >= 0.60  # 60%以上で成功とする


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
