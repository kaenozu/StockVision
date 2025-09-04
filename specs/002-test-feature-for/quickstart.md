# Quickstart Guide: 株価テスト機能

**Version**: 1.0.0  
**Generated**: 2025-09-04  
**Branch**: `002-test-feature-for`

## セットアップ（5分）

### 1. 環境準備

```bash
# Python 3.11以上が必要
python --version

# 仮想環境作成
python -m venv venv
venv\Scripts\activate  # Windows

# 依存関係インストール
pip install -r requirements.txt
```

### 2. データベース初期化

```bash
# SQLiteデータベース作成
python -c "from src.stock_storage.database import init_db; init_db()"
```

### 3. APIサーバー起動

```bash
# 開発サーバー起動
uvicorn src.main:app --reload --port 8000
```

サーバーが起動したら http://localhost:8000 でアクセス可能

## 基本操作（10分）

### 1. 銘柄情報取得

**API経由**:
```bash
curl "http://localhost:8000/stocks/7203"
```

**CLI経由**:
```bash
python -m src.stock_cli search 7203
```

**期待される結果**:
```json
{
  "stock_code": "7203",
  "company_name": "トヨタ自動車",
  "current_price": 2450.5,
  "previous_close": 2430.0,
  "price_change": 20.5,
  "price_change_pct": 0.84
}
```

### 2. ウォッチリストに追加

**API経由**:
```bash
curl -X POST "http://localhost:8000/watchlist" \
  -H "Content-Type: application/json" \
  -d '{"stock_code": "7203", "notes": "テスト銘柄"}'
```

**CLI経由**:
```bash
python -m src.stock_cli watchlist add 7203 --notes "テスト銘柄"
```

### 3. ウォッチリスト確認

```bash
# API
curl "http://localhost:8000/watchlist"

# CLI
python -m src.stock_cli watchlist list
```

### 4. 価格履歴取得

```bash
# 過去30日の履歴
curl "http://localhost:8000/stocks/7203/history?days=30"

# CLI（テーブル形式）
python -m src.stock_cli history 7203 --days 30 --format table
```

## 機能検証シナリオ

### シナリオ1: 新規銘柄の追加と監視

```bash
# Step 1: 銘柄データ取得
python -m src.stock_cli search 6758  # ソニーグループ

# Step 2: ウォッチリストに追加
python -m src.stock_cli watchlist add 6758 \
  --notes "エンタメ関連株" \
  --alert-high 15000 \
  --alert-low 12000

# Step 3: 確認
python -m src.stock_cli watchlist list
```

### シナリオ2: データ更新と履歴確認

```bash
# Step 1: 価格データ更新
python -m src.stock_cli update 7203

# Step 2: 更新結果確認
python -m src.stock_cli search 7203 --format json

# Step 3: 履歴確認
python -m src.stock_cli history 7203 --days 7
```

### シナリオ3: 一括操作

```bash
# 複数銘柄を一括でウォッチリストに追加
python -m src.stock_cli watchlist batch-add \
  --codes 7203,6758,4063,9984 \
  --notes "日本主要株"

# 全ウォッチリスト銘柄の価格一括更新
python -m src.stock_cli update --all

# 結果の確認（テーブル形式）
python -m src.stock_cli watchlist list --format table
```

## トラブルシューティング

### よくあるエラーと対処法

**1. データベース接続エラー**
```bash
# データベースファイルが存在するか確認
ls -la data/stocks.db

# 権限確認
chmod 664 data/stocks.db

# 再初期化
rm data/stocks.db
python -c "from src.stock_storage.database import init_db; init_db()"
```

**2. API接続エラー**
```bash
# サーバー起動確認
curl http://localhost:8000/health

# プロセス確認
ps aux | grep uvicorn

# ポート確認
netstat -an | grep :8000
```

**3. 銘柄データ取得エラー**
```bash
# ネットワーク接続確認
ping finance.yahoo.com

# APIキー確認（Alpha Vantage）
echo $ALPHA_VANTAGE_API_KEY

# ログ確認
tail -f logs/stock_api.log
```

## 性能確認

### レスポンス時間測定

```bash
# 単一銘柄取得の応答時間
time curl "http://localhost:8000/stocks/7203"

# 複数銘柄の平均応答時間
for code in 7203 6758 4063; do
  time curl "http://localhost:8000/stocks/$code"
done
```

### メモリ使用量確認

```bash
# プロセスのメモリ使用量
ps aux | grep uvicorn | awk '{print $6}'

# データベースファイルサイズ
ls -lh data/stocks.db
```

## 次のステップ

1. **追加機能の実装**: アラート機能、グラフ表示
2. **パフォーマンス最適化**: キャッシュ機能追加
3. **テストの充実**: 結合テスト、性能テスト追加
4. **ドキュメント更新**: API仕様書、運用手順書作成

このクイックスタートガイドで基本機能が動作することを確認してください。