# アーキテクチャ

このドキュメントでは、StockVisionのアーキテクチャについて説明します。

## 全体像

StockVisionは、フロントエンド（React）とバックエンド（FastAPI）で構成されるフルスタックアプリケーションです。

## フロントエンド

フロントエンドは、ReactとTypeScriptで構築されています。

### 主要な技術

- React 18
- TypeScript
- Tailwind CSS
- React Router
- Axios
- Chart.js

### ディレクトリ構造

```
src/
├── components/     # UIコンポーネント
├── contexts/      # React Context
├── hooks/         # カスタムフック
├── pages/         # ページコンポーネント
├── services/      # APIサービス
├── types/         # TypeScript型定義
├── utils/         # ユーティリティ関数
└── ...
```

## バックエンド

バックエンドは、FastAPIとPythonで構築されています。

### 主要な技術

- FastAPI
- Python 3.12
- SQLAlchemy
- SQLite
- Pydantic
- Uvicorn

### ディレクトリ構造

```
src/
├── api/           # APIエンドポイント
├── models/        # データベースモデル
├── services/      # ビジネスロジック
├── utils/         # ユーティリティ関数
├── middleware/    # ミドルウェア
└── ...
```

## データベース

SQLiteを使用しています。