# CSV データインポート機能 使用ガイド

## 概要

Yahoo Finance APIのレート制限を回避するため、Google ColabでCSVデータを生成し、アプリに取り込む機能です。

## 🎯 利点

- **レート制限完全回避**: Yahoo Finance APIへの直接呼び出し不要
- **大量データ処理**: Colabの豊富なリソースでバッチ処理
- **データ品質向上**: エラーハンドリング集約化
- **運用性向上**: 定期更新の自動化が可能

## 📋 使用手順

### Step 1: Google Colabでデータ取得

1. **Colabノートブックを開く**
   ```
   colab_templates/stock_data_fetcher.ipynb
   ```

2. **銘柄リストを編集**
   ```python
   # 日本株の場合（東証）
   japanese_stocks = [
       "7203.T",  # トヨタ自動車
       "9984.T",  # ソフトバンクG
       "6758.T",  # ソニー
       "4063.T",  # 信越化学
       "8306.T",  # 三菱UFJ
   ]
   ```

3. **ノートブックを実行**
   - 各セルを順番に実行
   - レート制限対策で3秒間隔で取得
   - エラー処理により安定動作

4. **CSVファイルをダウンロード**
   - `stock_data_YYYYMMDD_HHMMSS.csv`
   - `latest_prices_YYYYMMDD_HHMMSS.csv`

### Step 2: アプリへのデータ取り込み

#### 方法A: ファイル直接アップロード

```bash
# ファイルアップロード
curl -X POST "http://localhost:8000/api/csv/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@stock_data_20241201_143022.csv" \
  -F "data_type=stock_data"
```

#### 方法B: Colab URL経由 (推奨)

```bash
# ColabのCSV URLから直接取得
curl -X POST "http://localhost:8000/api/csv/download-from-colab" \
  -H "Content-Type: application/json" \
  -d '{
    "colab_url": "https://colab.research.google.com/.../stock_data.csv",
    "data_type": "stock_data"
  }'
```

### Step 3: データ確認

```bash
# インポート状況確認
curl "http://localhost:8000/api/csv/status"

# 特定銘柄のサンプルデータ確認
curl "http://localhost:8000/api/csv/sample-data/7203.T"
```

## 📊 API エンドポイント

### `/api/csv/upload` (POST)
- **説明**: CSVファイルを直接アップロード
- **パラメータ**:
  - `file`: CSVファイル (multipart/form-data)
  - `data_type`: データ種別 ("stock_data")

### `/api/csv/download-from-colab` (POST)
- **説明**: Colab URLからCSVをダウンロード
- **リクエスト**:
  ```json
  {
    "colab_url": "https://colab.research.google.com/.../file.csv",
    "data_type": "stock_data"
  }
  ```

### `/api/csv/status` (GET)
- **説明**: CSV取り込み状況の確認
- **レスポンス**:
  ```json
  {
    "success": true,
    "csv_status": {
      "stock_data": {
        "exists": true,
        "size_mb": 12.45,
        "modified": 1701234567
      }
    }
  }
  ```

### `/api/csv/sample-data/{symbol}` (GET)
- **説明**: 特定銘柄のサンプルデータ表示
- **例**: `/api/csv/sample-data/7203.T`

## 🔄 定期更新の自動化

### 方法1: Colab スケジュール実行
```python
# Colabでcron風の定期実行
import schedule
import time

def job():
    # データ取得処理
    df = fetch_stock_data_safe(symbols)
    df.to_csv(f'stock_data_{datetime.now().strftime("%Y%m%d")}.csv')

schedule.every().day.at("09:00").do(job)
```

### 方法2: GitHub Actions連携
```yaml
name: Update Stock Data
on:
  schedule:
    - cron: '0 9 * * *'  # 毎日9時
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Run Colab Notebook
        run: |
          # Colab notebook実行
          # CSV生成
          # アプリへアップロード
```

### 方法3: Google Drive API自動取得
```python
# アプリ側で定期的にGoogle Driveから取得
async def auto_update_from_drive():
    # Google Drive APIでCSV取得
    # データベースに同期
    pass
```

## 🛠 トラブルシューティング

### よくある問題

1. **Colabでのタイムアウト**
   - 銘柄数を減らす
   - `delay`パラメータを増やす
   - セッションを再開する

2. **CSVアップロードエラー**
   - ファイル形式確認（UTF-8 CSV）
   - ファイルサイズ制限確認
   - カラム名の一致確認

3. **データが反映されない**
   - バックグラウンド処理の完了待ち
   - ログファイル確認
   - データベース接続確認

### デバッグコマンド

```bash
# ログ確認
tail -f logs/stockvision.log

# データベース直接確認
sqlite3 data/stockvision.db "SELECT COUNT(*) FROM stocks;"

# プロセス状況確認
ps aux | grep python
```

## 📁 ファイル構成

```
StockVision/
├── colab_templates/
│   └── stock_data_fetcher.ipynb    # Colabノートブック
├── data/
│   ├── stock_data.csv              # 取り込み済みデータ
│   └── latest_prices.csv           # 最新価格データ
├── src/services/
│   └── csv_data_service.py         # CSV処理サービス
├── src/routers/
│   └── csv_routes.py               # CSV API ルート
└── docs/
    └── csv_data_import_guide.md    # このガイド
```

## 🚀 次のステップ

1. **Colabノートブックの実行**: データ取得テスト
2. **APIテスト**: 各エンドポイントの動作確認
3. **フロントエンド連携**: UI追加
4. **自動化設定**: 定期更新の実装
5. **監視設定**: データ品質監視

---

## 📞 サポート

問題が発生した場合は以下を確認してください：

1. **エラーログ**: `logs/stockvision.log`
2. **API応答**: レスポンスのerrorフィールド
3. **データベース状態**: SQLiteファイルの存在確認
4. **ネットワーク**: Colab URLへのアクセス可能性