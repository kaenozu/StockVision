# Stock Tracking Application

Yahoo Finance APIを利用した日本株式情報監視アプリケーションです。FastAPIとSQLiteを使用してRESTful APIとCLIの両方でアクセスできます。

## 主な機能

- 株式現在価格の取得
- 株式履歴データの取得
- ウォッチリスト機能（銘柄の追加・削除・一覧表示）
- JSON、テーブル、コンパクト形式での表示
- リアルタイムデータ更新
- 包括的なエラーハンドリング
- レート制限対応

## プロジェクト構造

```
├── src/                    # メインソースコード
│   ├── models/             # SQLAlchemyモデル
│   ├── stock_api/          # 外部API統合
│   ├── stock_storage/      # データベース層
│   ├── stock_display/      # フォーマット/レンダリング
│   ├── stock_cli/          # CLIコマンド
│   ├── api/                # FastAPIエンドポイント
│   ├── utils/              # ユーティリティ
│   ├── middleware/         # ミドルウェア
│   └── main.py             # FastAPIアプリエントリーポイント
├── tests/                  # テストコード
│   ├── contract/           # APIコントラクトテスト
│   ├── integration/        # 統合テスト
│   └── unit/               # ユニットテスト
├── data/                   # SQLiteデータベース格納
├── logs/                   # アプリケーションログ
├── requirements.txt        # 依存関係
├── pytest.ini             # pytestの設定
├── .flake8                 # flake8の設定
├── .gitignore              # Git除外ファイル
└── README.md               # このファイル
```

## セットアップ

### 1. 仮想環境の作成と有効化

```bash
# 仮想環境の作成
python -m venv venv

# 仮想環境の有効化 (Windows)
venv\Scripts\activate

# 仮想環境の有効化 (Linux/macOS)
source venv/bin/activate
```

### 2. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 3. データベースのセットアップ

```bash
# マイグレーションの実行（後で実装）
# alembic upgrade head
```

### 4. アプリケーションの実行

```bash
# 開発サーバーの起動
python test_app.py

# または uvicornを直接使用
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

アプリケーションは http://localhost:8000 でアクセスできます。

## API使用例

### 株式情報の取得
```bash
# 株式基本情報
curl http://localhost:8000/stocks/7203

# 現在価格の取得
curl http://localhost:8000/stocks/7203/current

# 株価履歴の取得（デフォルト30日）
curl http://localhost:8000/stocks/7203/history

# 指定日数の履歴
curl http://localhost:8000/stocks/7203/history?days=7
```

### ウォッチリスト管理
```bash
# ウォッチリスト一覧取得
curl http://localhost:8000/watchlist

# 銘柄をウォッチリストに追加
curl -X POST http://localhost:8000/watchlist \
  -H "Content-Type: application/json" \
  -d '{"stock_code": "7203", "notes": "トヨタ自動車"}'

# ウォッチリストから削除
curl -X DELETE http://localhost:8000/watchlist/1
```

## API ドキュメント

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## テスト実行

```bash
# すべてのテストを実行
pytest

# カバレッジレポート付きでテストを実行
pytest --cov=src --cov-report=html

# 特定のテストタイプのみ実行
pytest -m unit        # ユニットテストのみ
pytest -m integration # 統合テストのみ
pytest -m contract    # コントラクトテストのみ
```

## コード品質チェック

```bash
# リンティング
flake8 src tests

# フォーマット
black src tests

# インポート順序チェック
isort src tests --check-only

# 型チェック
mypy src
```

## 開発ガイドライン

- コードスタイル: Black + flake8
- 型ヒント: 必須（mypy使用）
- テストカバレッジ: 最低80%
- コミットメッセージ: 英語で簡潔に

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。