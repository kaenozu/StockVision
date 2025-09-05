# StockVision 📈

Yahoo Finance APIを利用した現代的な日本株式情報監視Webアプリケーションです。React + TypeScript フロントエンドとFastAPI バックエンドで構成されています。

## 主な機能

### 📊 高度なチャート分析
- 基本チャート：株価ラインチャート・ローソク足チャート
- テクニカル分析：SMA/EMA、MACD、RSI、ボリンジャーバンド
- インタラクティブな指標切り替え
- ダークモード・ライトモード対応

### 💰 リアルタイム株価情報
- 現在価格・前日比・変化率の表示
- 過去データの履歴表示
- 5分間隔での自動価格更新
- ウォッチリスト機能（並列価格取得で高速化）

### 🎨 モダンUI/UX
- React + TypeScriptによる堅牢なフロントエンド
- テーマ切り替え（ライト/ダーク/システム）
- 完全レスポンシブ対応（モバイル底部ナビ）
- アクセシビリティ対応（キーボードナビ、ARIA属性）
- スケルトンローディング、トースト通知

### 🚀 高性能・高機能
- FastAPIによる高速バックエンド
- SQLAlchemyによるデータベース管理
- 包括的なエラーハンドリング
- デバウンス検索、仮想リスト、メモ化によるパフォーマンス最適化
- ローカルストレージによるデータ永続化

### 📱 個人利用向け機能
- 最近見た銘柄履歴（自動記録）
- ユーザー設定の永続化
- インテリジェントキャッシング
- オフライン対応準備

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

## 🚀 デプロイ

### 本番環境デプロイ (Vercel + Railway)

#### 1. Vercel (フロントエンド)
1. [Vercel](https://vercel.com)でアカウント作成
2. GitHubリポジトリを連携
3. プロジェクト設定:
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/dist`
   - Root Directory: `frontend`

#### 2. Railway (バックエンド)
1. [Railway](https://railway.app)でアカウント作成
2. GitHubリポジトリをデプロイ
3. 環境変数を設定:
   ```
   USE_REAL_YAHOO_API=false
   PYTHON_VERSION=3.12
   ```

#### 3. 自動デプロイ
- `main`ブランチにプッシュで自動デプロイ
- GitHub Actionsによる自動テスト・デプロイ
- Lighthouse パフォーマンス監視

### 開発環境セットアップ

#### バックエンド
```bash
# 依存関係インストール
pip install -r requirements.txt

# 開発サーバー起動
python -m uvicorn src.main:app --reload --port 8000
```

#### フロントエンド
```bash
# フロントエンドディレクトリに移動
cd frontend

# 依存関数インストール
npm install

# 開発サーバー起動
npm run dev
```

### 環境変数

#### バックエンド (.env)
```
USE_REAL_YAHOO_API=false
DATABASE_URL=sqlite:///data/stock_tracking.db
LOG_LEVEL=INFO
```

#### フロントエンド (.env)
```
VITE_API_BASE_URL=http://localhost:8000
```

## 📊 パフォーマンス

- **Lighthouse Score**: 90+
- **初回ロード**: < 2秒
- **API レスポンス**: < 500ms
- **メモリ使用量**: < 50MB

## 🤝 貢献

1. フォークして機能ブランチを作成
2. 変更をコミット (`git commit -am 'Add feature'`)
3. ブランチにプッシュ (`git push origin feature`)
4. プルリクエストを作成

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。