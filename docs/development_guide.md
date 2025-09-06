# StockVision 開発ガイド

## 概要

このドキュメントは、StockVisionプロジェクトの開発を始めるためのガイドです。環境構築、コード規約、テスト、デバッグなどについて説明します。

## 環境構築

### 必要条件

- **Python**: 3.10以上
- **Node.js**: 18以上
- **npm**: 9以上
- **仮想環境ツール**: venv または conda (推奨)

### バックエンド環境構築

1. **仮想環境の作成と有効化**

   ```bash
   # venv を使用する場合
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```

2. **依存関係のインストール**

   ```bash
   pip install -r requirements.txt
   ```

3. **データベースの初期化**

   ```bash
   # 現在の実装では、アプリケーション起動時に自動的にテーブルが作成されます。
   # 手動で初期化する場合は、以下のコードを実行します。
   # python -c "from src.stock_storage.database import init_db; init_db()"
   ```

4. **環境変数の設定 (.envファイル)**

   プロジェクトルートに `.env` ファイルを作成し、以下の変数を設定します。

   ```env
   # リアルデータを使用するかどうか (true/false)
   USE_REAL_YAHOO_API=false

   # データベースURL
   DATABASE_URL=sqlite:///./data/stock_tracking.db

   # ログレベル
   LOG_LEVEL=INFO

   # デバッグモード
   DEBUG=false
   ```

### フロントエンド環境構築

1.  **依存関係のインストール**

    ```bash
    cd frontend
    npm install
    ```

2.  **Playwrightのインストール (E2Eテスト用)**

    ```bash
    npx playwright install --with-deps
    ```
    これにより、Chromium, Firefox, WebKitブラウザがインストールされます。

3.  **環境変数の設定 (.envファイル)**

    `frontend` ディレクトリに `.env` ファイルを作成し、以下の変数を設定します。

    ```env
    # バックエンドAPIのベースURL
    VITE_API_BASE_URL=http://localhost:8000
    ```

## 開発サーバーの起動

### バックエンド

開発サーバーを起動するには、以下のコマンドを実行します。

```bash
# test_app.py を使用する場合
python test_app.py

# uvicorn を直接使用する場合
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

サーバーは `http://localhost:8000` で起動します。
APIドキュメントは `http://localhost:8000/docs` (Swagger UI) または `http://localhost:8000/redoc` (ReDoc) で確認できます。

### フロントエンド

開発サーバーを起動するには、以下のコマンドを実行します。

```bash
cd frontend
npm run dev
```

サーバーは `http://localhost:3000` で起動します。

## コード規約

### Python (バックエンド)

- **コードスタイル**: Black + flake8
- **型ヒント**: 必須 (mypyを使用)
- **Docstring**: GoogleスタイルまたはNumPyスタイル
- **命名規則**: PEP 8 に準拠 (snake_case for variables/functions, PascalCase for classes)

#### Linting & Formatting

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

#### Pre-commit Hook

コードの品質を保つために、pre-commit hook を設定することを推奨します。

```bash
# pre-commit のインストール
pip install pre-commit

# hook の設定
pre-commit install
```

### TypeScript (フロントエンド)

- **コードスタイル**: ESLint + Prettier
- **型安全性**: 型を積極的に使用する
- **命名規則**: 
  - ファイル名: `PascalCase` (コンポーネント), `camelCase` (その他)
  - 変数/関数: `camelCase`
  - 型/インターフェース: `PascalCase`
  - 定数: `UPPER_SNAKE_CASE`

#### Linting & Formatting

```bash
# リンティング
npm run lint

# フォーマット
npm run format

# 型チェック
npm run type-check
```

## プロジェクト構造

### バックエンド

```
src/
├── api/                 # FastAPIエンドポイント
├── config/              # 設定管理
├── middleware/          # ミドルウェア
├── models/              # SQLAlchemyデータモデル
├── services/            # 業務ロジック
├── stock_api/           # 外部APIクライアント
├── stock_storage/       # データベース接続管理
├── utils/               # ユーティリティ
└── main.py             # アプリケーションエントリーポイント
```

### フロントエンド

```
frontend/src/
├── assets/              # 静的アセット
├── components/          # UIコンポーネント
├── pages/               # ページコンポーネント
├── services/            # APIクライアント
├── hooks/               # カスタムフック
├── contexts/            # Reactコンテキスト
├── types/               # TypeScript型定義
├── utils/               # ユーティリティ
├── config/              # 設定
├── App.tsx             # ルートアプリケーションコンポーネント
└── main.tsx            # エントリーポイント
```

## テスト

### バックエンドテスト

#### テストスイートの実行

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

#### テストディレクトリ構造

```
tests/
├── unit/             # ユニットテスト
├── integration/      # 統合テスト
├── contract/         # APIコントラクトテスト
└── conftest.py      # テスト共通設定
```

#### テストの書き方

- **ユニットテスト**: 個々の関数やクラスのロジックをテスト。
- **統合テスト**: 複数のモジュールやサービスを組み合わせたテスト。
- **コントラクトテスト**: APIエンドポイントの仕様を検証。

### フロントエンドテスト

#### テストスイートの実行

```bash
cd frontend
# すべてのテストを実行
npm run test

# カバレッジレポート付きでテストを実行
npm run test:coverage

# ウォッチモードでテストを実行
npm run test:watch
```

#### テストの書き方

- **コンポーネントテスト**: React Testing Library を使用して、コンポーネントのレンダリングとユーザーインタラクションをテスト。
- **フックテスト**: カスタムフックのロジックをテスト。
- **サービステスト**: APIクライアントのリクエストとレスポンスをモックしてテスト。

## デバッグ

### バックエンド

- **ログ**: `logging` モジュールを使用して、適切なログレベルで情報を出力。
- **デバッガー**: VS Code や PyCharm のデバッガーを使用して、ブレークポイントを設定してステップ実行。
- **APIドキュメント**: Swagger UI (`/docs`) から各エンドポイントを直接呼び出してテスト。

### フロントエンド

- **ブラウザデベロッパーツール**: Chrome DevTools などを使用して、コンポーネントの状態、ネットワークリクエスト、コンソールログを確認。
- **React Developer Tools**: Reactコンポーネントのプロップスと状態を検査。
- **デバッガー**: VS Code の JavaScript デバッガーを使用して、ブレークポイントを設定してステップ実行。

## 新機能の追加方法

### バックエンド

1. **データモデルの定義** (必要に応じて)
   - `src/models/` に新しいモデルクラスを作成。
   - バリデーションルールを追加。

2. **APIエンドポイントの実装**
   - `src/api/` に新しいルーターファイルを作成。
   - FastAPIのエンドポイントを定義。
   - Pydanticモデルを使用してリクエスト/レスポンスを定義。

3. **サービスロジックの実装**
   - `src/services/` に関連するサービスクラスを作成または修正。
   - ビジネスロジックを実装。

4. **ユーティリティ関数の実装** (必要に応じて)
   - `src/utils/` に関連するユーティリティ関数を作成。

5. **テストの追加**
   - `tests/unit/`, `tests/integration/`, `tests/contract/` にテストを追加。

6. **エンドポイントのルーティング**
   - `src/main.py` で新しいルーターをインクルード。

### フロントエンド

1. **TypeScript型定義の追加** (必要に応じて)
   - `src/types/` に新しい型インターフェースを定義。

2. **APIクライアントの更新**
   - `src/services/stockApi.ts` に関数を追加または修正。

3. **カスタムフックの作成** (必要に応じて)
   - `src/hooks/` に新しいカスタムフックを作成。

4. **UIコンポーネントの作成**
   - `src/components/` に新しいコンポーネントを作成。
   - Tailwind CSS を使用してスタイリング。
   - アクセシビリティとレスポンシブデザインを考慮。

5. **ページコンポーネントの作成**
   - `src/pages/` に新しいページコンポーネントを作成。
   - React Router にルートを追加。

6. **ルーティングの設定**
   - `src/App.tsx` で新しいルートを定義。

7. **テストの追加**
   - `src/__tests__/` にコンポーネントテストやフックテストを追加。

## デプロイ

### バックエンド (Railway)

1. GitHubリポジトリをRailwayに接続。
2. 環境変数をRailwayのダッシュボードで設定。
3. デプロイメントをトリガー。

### フロントエンド (Vercel)

1. GitHubリポジトリをVercelに接続。
2. ビルド設定を構成 (Build Command: `cd frontend && npm run build`, Output Directory: `frontend/dist`)。
3. 環境変数をVercelのダッシュボードで設定。
4. デプロイメントをトリガー。

## トラブルシューティング

### よくある問題と解決方法

#### データベース接続エラー

- `data` ディレクトリと `stocks.db` ファイルが存在することを確認。
- `DATABASE_URL` 環境変数が正しいことを確認。

#### APIリクエストが失敗する

- バックエンドサーバーが起動していることを確認。
- CORS設定を確認。
- APIエンドポイントのURLが正しいことを確認。

#### フロントエンドのビルドエラー

- すべての依存関係がインストールされていることを確認 (`npm install`)。
- TypeScriptの型エラーを修正。
- ESLint/Prettierのエラーを修正。

#### テストが失敗する

- テスト対象のコードにエラーがないことを確認。
- モックの設定が正しいことを確認。
- テストデータが適切であることを確認。

## 貢献

1. フォークして機能ブランチを作成 (`git checkout -b feature/AmazingFeature`)
2. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
3. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
4. プルリクエストを作成

### コミットメッセージガイドライン

- 英語で簡潔に記述。
- 以下のプレフィックスを使用:
  - `feat`: 新機能
  - `fix`: バグ修正
  - `chore`: ビルドプロセスや補助ツールの変更
  - `docs`: ドキュメントのみの変更
  - `style`: コードの意味に影響を与えない変更（空白、フォーマット、セミコロンの欠落など）
  - `refactor`: バグ修正でも機能追加でもないコードの変更
  - `perf`: パフォーマンスを向上させるコード変更
  - `test`: 不足テストの追加や既存テストの修正