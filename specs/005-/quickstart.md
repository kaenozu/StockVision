# Quickstart: 機械学習株価予測システム

## 前提条件
- Python 3.11+ インストール済み
- Node.js 18+ インストール済み  
- StockVision基盤システムが動作していること
- Yahoo Finance APIアクセス可能
- 最低1年分の株価履歴データが利用可能

## セットアップ手順

### 1. 機械学習ライブラリのインストール
```bash
# Backend dependencies
pip install scikit-learn pandas numpy joblib

# Development dependencies
pip install pytest pytest-asyncio
```

### 2. 初期データベース設定
```bash
# ML予測用テーブル作成
python -c "
from src.models.ml_models import create_ml_tables
create_ml_tables()
"
```

### 3. 初期モデル訓練
```bash
# サンプル銘柄でのモデル訓練
curl -X POST http://localhost:8000/api/ml/train \
  -H "Content-Type: application/json" \
  -d '{
    "model_types": ["short_term", "medium_term"],
    "stock_codes": ["7203", "6758"],
    "validation_split": 0.2
  }'
```

## 基本動作確認

### シナリオ1: 機械学習予測の取得
**目標**: システムが学習済みモデルを使用して株価予測を提供する

```bash
# 1. モデル訓練状況確認
curl http://localhost:8000/api/ml/models

# 期待結果: アクティブなモデルが1つ以上存在
# {
#   "models": [
#     {
#       "id": 1,
#       "name": "Random Forest Short-term v1.0.0",
#       "model_type": "short_term",
#       "is_active": true,
#       "accuracy_score": 0.73
#     }
#   ],
#   "active_models": 1
# }

# 2. 予測実行
curl http://localhost:8000/api/ml/predict/7203

# 期待結果: 具体的な売買推奨が返される
# {
#   "stock_code": "7203",
#   "predictions": {
#     "short_term": {
#       "target_date": "2025-09-09",
#       "predicted_price": 2985.50,
#       "predicted_action": "buy",
#       "confidence_score": 0.78
#     }
#   },
#   "overall_recommendation": {
#     "action": "buy",
#     "confidence": 0.82,
#     "reasoning": [
#       "Short-term model predicts 3% price increase",
#       "Volume analysis shows strong buying pressure"
#     ]
#   }
# }
```

### シナリオ2: 予測精度の確認
**目標**: システムが過去の予測精度を正確に追跡している

```bash
# 精度履歴確認
curl http://localhost:8000/api/ml/accuracy/7203?days=30

# 期待結果: 30日間の予測精度データ
# {
#   "stock_code": "7203",
#   "accuracy_metrics": {
#     "overall_accuracy": 0.72,
#     "directional_accuracy": 0.78,
#     "price_accuracy": 0.045
#   },
#   "daily_accuracy": [
#     {
#       "date": "2025-09-07",
#       "predicted_action": "buy",
#       "actual_optimal_action": "buy",
#       "was_correct": true,
#       "price_error_percent": 0.22
#     }
#   ]
# }
```

### シナリオ3: 市場異常検知の動作
**目標**: システムが市場異常を検知し、予測を適切に制御する

```bash
# 市場異常状況確認
curl http://localhost:8000/api/ml/anomaly-status

# 正常時の期待結果:
# {
#   "current_status": "normal",
#   "active_anomalies": [],
#   "model_predictions_paused": false
# }

# 異常時の期待結果:
# {
#   "current_status": "anomaly_detected",
#   "active_anomalies": [
#     {
#       "anomaly_type": "high_volatility",
#       "severity_level": "medium",
#       "affected_stocks": ["7203", "6758"],
#       "detection_date": "2025-09-08T09:15:00Z"
#     }
#   ],
#   "model_predictions_paused": true
# }
```

## フロントエンド統合テスト

### シナリオ4: UI での ML 予測表示
**目標**: React フロントエンドが ML 予測を適切に表示する

```bash
# フロントエンド起動
cd frontend && npm run dev

# ブラウザで確認:
# 1. http://localhost:3002 にアクセス
# 2. 銘柄詳細ページ（例: /stock/7203）に移動
# 3. 売買判定パネルで以下を確認:
#    - 🤖 機械学習予測タブが表示される
#    - 予測結果（買い/売り/様子見）が明確に表示される
#    - 信頼度が数値（0-100%）で表示される
#    - 目標価格とストップロスが提示される
#    - 判定根拠が複数項目でリストされる
```

### シナリオ5: モデル比較機能
**目標**: 複数のMLモデルの予測結果を比較表示する

```javascript
// ブラウザ開発者ツールで実行
fetch('/api/ml/predict/7203?prediction_horizon=all')
  .then(r => r.json())
  .then(data => {
    console.log('Short-term:', data.predictions.short_term);
    console.log('Medium-term:', data.predictions.medium_term);
    console.log('Long-term:', data.predictions.long_term);
    
    // 期待結果: 各期間の予測が異なる信頼度で表示される
    // UI上で「詳細分析」ボタンをクリックすると
    // 各モデルの予測が比較表で表示される
  });
```

## 継続的学習テスト

### シナリオ6: 自動再訓練の確認
**目標**: システムが新しいデータで自動的にモデルを改善する

```bash
# 1. 現在のモデル精度を記録
CURRENT_ACCURACY=$(curl -s http://localhost:8000/api/ml/models | jq '.models[0].accuracy_score')
echo "Current accuracy: $CURRENT_ACCURACY"

# 2. 新しいデータを追加（実際は市場データの自動取得）
# ここでは手動でトレーニングをトリガー
curl -X POST http://localhost:8000/api/ml/train \
  -H "Content-Type: application/json" \
  -d '{"model_types": ["short_term"], "force_retrain": true}'

# 3. 訓練完了後、精度の変化を確認
# （実際は数分後に実行）
sleep 300
NEW_ACCURACY=$(curl -s http://localhost:8000/api/ml/models | jq '.models[0].accuracy_score')
echo "New accuracy: $NEW_ACCURACY"

# 期待結果: 精度が向上しているか、最低でも大幅に悪化していない
```

## パフォーマンステスト

### シナリオ7: 5分以内処理完了の確認
**目標**: システムが要件通り5分以内に予測処理を完了する

```bash
# 複数銘柄の予測を並行実行
STOCKS=("7203" "6758" "9984" "4063" "8058")
START_TIME=$(date +%s)

for stock in "${STOCKS[@]}"; do
  curl http://localhost:8000/api/ml/predict/$stock &
done

wait  # 全ての並行処理完了を待機

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "Total time: ${DURATION} seconds"

# 期待結果: 300秒（5分）以内で完了
if [ $DURATION -le 300 ]; then
  echo "✅ Performance test PASSED"
else
  echo "❌ Performance test FAILED"
fi
```

## エラーハンドリングテスト

### シナリオ8: データ不足時の適切な警告
**目標**: 学習データが不足している場合に適切なエラーメッセージが表示される

```bash
# 存在しない銘柄で予測を要求
curl http://localhost:8000/api/ml/predict/9999

# 期待結果: 適切なエラーレスポンス
# {
#   "error": "INSUFFICIENT_DATA",
#   "message": "Stock code '9999' has insufficient training data",
#   "details": {
#     "required_days": 252,
#     "available_days": 0
#   }
# }
```

### シナリオ9: 市場異常時の予測停止
**目標**: 市場異常検知時に予測が自動停止される

```bash
# 市場異常をシミュレート（テスト用エンドポイント）
curl -X POST http://localhost:8000/api/ml/test/trigger-anomaly \
  -H "Content-Type: application/json" \
  -d '{
    "anomaly_type": "high_volatility",
    "severity": "high",
    "affected_stocks": ["7203"]
  }'

# 異常状態での予測要求
curl http://localhost:8000/api/ml/predict/7203

# 期待結果: 予測停止のエラーメッセージ
# {
#   "error": "MARKET_ANOMALY_DETECTED",
#   "message": "Predictions temporarily paused due to market anomaly",
#   "details": {
#     "anomaly_type": "high_volatility",
#     "severity": "high",
#     "estimated_resolution": "2025-09-08T15:30:00Z"
#   }
# }
```

## 成功判定基準

### 必須項目（すべてPASSが必要）
- [ ] シナリオ1: ML予測が正常に取得できる
- [ ] シナリオ2: 予測精度が70%以上
- [ ] シナリオ3: 市場異常検知が機能する
- [ ] シナリオ4: UI でML予測が適切に表示される
- [ ] シナリオ7: 処理時間が5分以内
- [ ] シナリオ8: データ不足時の適切なエラー処理
- [ ] シナリオ9: 市場異常時の予測停止

### 推奨項目（可能な限りPASSが望ましい）
- [ ] シナリオ5: モデル比較機能が動作する
- [ ] シナリオ6: 継続的学習でモデルが改善される

## トラブルシューティング

### モデル訓練が失敗する場合
1. データベースにTRADING_HISTORYテーブルのデータが十分にあるか確認
2. Python依存関係（scikit-learn, pandas等）が正しくインストールされているか確認
3. `/logs/ml_training.log` でエラーメッセージを確認

### 予測精度が低い場合（70%未満）
1. 訓練データ期間が十分か確認（最低1年間必要）
2. 特徴量エンジニアリングが正しく動作しているか確認
3. `validation_split` パラメータを調整して再訓練

### UI で ML 予測が表示されない場合
1. バックエンドAPIが正常に応答しているか確認
2. フロントエンドのAPI呼び出しでCORSエラーが発生していないか確認
3. React コンポーネントの条件分岐ロジックを確認

## 次のステップ

Quickstart が正常に完了したら:
1. `/tasks` コマンドで詳細な実装タスクを生成
2. TDD（テスト駆動開発）に従って各コンポーネントを実装
3. 継続的な精度監視とモデル改善サイクルを確立