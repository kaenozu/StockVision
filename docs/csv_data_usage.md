# CSV データインポート機能 使用ガイド

## 概要

Yahoo Finance APIのレート制限を回避するため、Google ColabでCSVデータを生成し、アプリに取り込む機能です。

## 🚀 クイックスタート

### 1. Google Colabでデータ取得

1. **Colabノートブックを開く**
   ```
   colab_templates/stock_data_fetcher.ipynb
   ```

2. **銘柄リストを編集**
   ```python
   japanese_stocks = [
       "7203.T",  # トヨタ自動車
       "9984.T",  # ソフトバンクG
       "6758.T",  # ソニー
   ]
   ```

3. **全セルを実行してCSV生成**

### 2. アプリにアップロード

```bash
# 方法A: ファイル直接アップロード
curl -X POST "http://localhost:8000/api/csv/upload" \
  -F "file=@stock_data.csv" \
  -F "data_type=stock_data"

# 方法B: Colab URL経由
curl -X POST "http://localhost:8000/api/csv/download-from-colab" \
  -H "Content-Type: application/json" \
  -d '{"colab_url": "https://colab.../file.csv", "data_type": "stock_data"}'
```

### 3. データ確認

```bash
# 状況確認
curl "http://localhost:8000/api/csv/status"

# サンプルデータ確認
curl "http://localhost:8000/api/csv/sample-data/7203.T"
```

## 📊 利用可能なAPIエンドポイント

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/csv/upload` | POST | CSVファイル直接アップロード |
| `/api/csv/download-from-colab` | POST | Colab URLからダウンロード |
| `/api/csv/status` | GET | インポート状況確認 |
| `/api/csv/sample-data/{symbol}` | GET | 特定銘柄のサンプルデータ |

## 🔄 定期更新設定

### Google Colabスケジュール実行
```python
import schedule
import time

def daily_update():
    # データ取得・CSV生成処理
    pass

schedule.every().day.at("09:00").do(daily_update)
```

### 手動更新の流れ
1. Colabノートブック実行 (約10-15分)
2. 生成CSVをダウンロード
3. アプリにアップロード
4. データ反映確認

## 🛠 トラブルシューティング

### よくある問題
- **Colabタイムアウト**: 銘柄数を減らす、遅延を増やす
- **アップロードエラー**: ファイル形式・サイズを確認
- **データ未反映**: バックグラウンド処理の完了を待つ

### デバッグコマンド
```bash
# ログ確認
tail -f logs/stockvision.log

# データベース確認
sqlite3 data/stockvision.db "SELECT COUNT(*) FROM stocks;"
```

## 📁 関連ファイル

```
StockVision/
├── colab_templates/stock_data_fetcher.ipynb  # Colabノートブック
├── src/services/csv_data_service.py          # CSV処理サービス
├── src/routers/csv_routes.py                 # API ルート
└── data/                                     # データ保存場所
```