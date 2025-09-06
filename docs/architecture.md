# StockVision アーキテクチャドキュメント

## 概要

StockVisionは、React + TypeScript (フロントエンド) と FastAPI (バックエンド) で構築された株価監視Webアプリケーションです。Yahoo Finance APIとの連携により、リアルタイムな株価情報を提供します。

## システム構成

```
┌────────────────────────────────────┐
│           フロントエンド           │
│        (React + TypeScript)        │
└─────────┬──────────────────────────┘
          │ HTTP/REST API
┌─────────▼──────────────────────────┐
│           バックエンド             │
│          (FastAPI + SQLite)        │
└─────────┬──────────────────────────┘
          │
┌─────────▼──────────────────────────┐
│         外部API (Yahoo Finance)    │
└────────────────────────────────────┘
```

## バックエンドアーキテクチャ

### 技術スタック

- **フレームワーク**: FastAPI
- **データベース**: SQLite
- **ORM**: SQLAlchemy
- **非同期処理**: asyncio, aiohttp
- **キャッシュ**: インメモリキャッシュ (TTL付きLRU)
- **クライアント**: yfinance (Yahoo Finance API)

### ディレクトリ構造

```
src/
├── api/                 # FastAPIエンドポイント
├── config/              # 設定管理
├── middleware/          # ミドルウェア (エラーハンドリング, パフォーマンス最適化)
├── models/              # SQLAlchemyデータモデル
├── services/            # 業務ロジック (ストックサービス)
├── stock_api/           # 外部APIクライアント (Yahoo Finance)
├── stock_storage/       # データベース接続管理
├── utils/               # ユーティリティ (キャッシュ, ログ)
└── main.py             # アプリケーションエントリーポイント
```

### データモデル

#### Stock (銘柄情報)

- `stock_code` (主キー): 4桁の銘柄コード
- `company_name`: 会社名
- `current_price`: 現在価格
- `previous_close`: 前日終値
- `price_change`: 価格変動
- `price_change_pct`: 価格変動率
- `volume`: 出来高
- `market_cap`: 時価総額
- `created_at`: 作成日時
- `updated_at`: 更新日時

#### PriceHistory (価格履歴)

- `id` (主キー): ID
- `stock_code` (外部キー): 銘柄コード
- `date`: 日付
- `open_price`: 始値
- `high_price`: 高値
- `low_price`: 安値
- `close_price`: 終値
- `volume`: 出来高
- `adj_close`: 調整後終値

#### Watchlist (ウォッチリスト)

- `id` (主キー): ID
- `stock_code` (外部キー): 銘柄コード
- `added_at`: 追加日時
- `notes`: メモ
- `alert_price_high`: 高値アラート価格
- `alert_price_low`: 安値アラート価格
- `is_active`: アクティブ状態

### APIエンドポイント

#### 株式情報

- `GET /api/stocks/{stock_code}`: 銘柄情報を取得
- `GET /api/stocks/{stock_code}/current`: 現在価格を取得
- `GET /api/stocks/{stock_code}/history`: 価格履歴を取得

#### ウォッチリスト

- `GET /api/watchlist`: ウォッチリストを取得
- `POST /api/watchlist`: ウォッチリストに追加
- `DELETE /api/watchlist/{id}`: ウォッチリストから削除

### サービスレイヤー

#### HybridStockService

リアルデータ (Yahoo Finance) とモックデータを切り替えて提供するハイブリッドサービス。

**主な機能:**

- リアルAPIとモックデータの切り替え
- キャッシュ管理 (リアルAPIレスポンスのキャッシング)
- フォールバック処理 (リアルAPI失敗時のモックデータ提供)
- データベースへの永続化

#### キャッシュ戦略

- **インメモリキャッシュ**: TTL付きLRUキャッシュ
- **キャッシュキー生成**: 衝突回避のための構造化キー生成 (`cache_key_generator.py`)
- **APIレスポンスキャッシュ**: デコレータによるエンドポイント単位のキャッシング

### 外部APIクライアント

#### YahooFinanceClient

Yahoo Finance APIへの非同期クライアント。

**主な機能:**

- 非同期HTTPリクエスト (aiohttp)
- レートリミット制御
- リトライ処理 (指数バックオフ)
- データ抽出とバリデーション
- yfinanceライブラリとの連携

## フロントエンドアーキテクチャ

### 技術スタック

- **フレームワーク**: React + TypeScript
- **ルーティング**: React Router
- **状態管理**: React Hooks (useState, useEffect, useContext, useReducer)
- **UIライブラリ**: Tailwind CSS
- **チャート**: Chart.js
- **HTTPクライアント**: Axios

### ディレクトリ構造

```
frontend/src/
├── assets/              # 静的アセット (画像, フォントなど)
├── components/          # UIコンポーネント
│   ├── layout/          # レイアウトコンポーネント (Header, Footer, Layout)
│   ├── stock/           # 株式関連コンポーネント (StockCard, PriceChart)
│   ├── watchlist/       # ウォッチリストコンポーネント
│   ├── UI/              # 汎用UIコンポーネント (Button, LoadingSpinner)
│   ├── enhanced/        # 拡張コンポーネント (アクセシビリティ対応)
│   └── ...              # その他のコンポーネント
├── pages/               # ページコンポーネント (ルートに対応)
├── services/            # APIクライアント (stockApi)
├── hooks/               # カスタムフック (useStock, useWatchlist)
├── contexts/            # Reactコンテキスト (Theme, Responsive, Accessibility)
├── types/               # TypeScript型定義
├── utils/               # ユーティリティ (フォーマッター, バリデーター)
├── config/              # 設定 (UIテーマ)
├── App.tsx             # ルートアプリケーションコンポーネント
├── main.tsx            # エントリーポイント
└── index.css           # グローバルCSS
```

### コンポーネント設計

#### レイアウト

- **App.tsx**: ルートコンポーネント、ルーティング、エラーバウンダリ
- **Layout.tsx**: ヘッダー、フッター、モバイルナビゲーションを含むメインレイアウト
- **Header.tsx**: ブランド、ナビゲーション、検索バー
- **Footer.tsx**: フッター情報、リンク
- **MobileNav.tsx**: モバイルデバイス用ナビゲーション

#### 株式情報

- **StockCard.tsx**: 株式情報をカード形式で表示
- **PriceChart.tsx**: 価格チャート (ライン/ローソク足)
- **TechnicalChart.tsx**: テクニカル分析チャート (SMA, EMA, MACD, RSI, ボリンジャーバンド)
- **StockSearch.tsx**: 株式検索フォーム

#### ウォッチリスト

- **WatchlistPage.tsx**: ウォッチリストページ
- **WatchListWidget.tsx**: サイドバーウィジェット
- **RecentlyViewed.tsx**: 最近見た銘柄

### 状態管理

#### React Context

- **ThemeContext**: テーマ (ライト/ダーク) 管理
- **ResponsiveContext**: レスポンシブデザイン情報管理
- **AccessibilityContext**: アクセシビリティ設定管理

#### カスタムフック

- **useStock.ts**: 株式データの取得と状態管理
- **useWatchlist.ts**: ウォッチリストの取得と操作
- **useLocalStorage.ts**: ローカルストレージとの連携
- **usePersistentState.ts**: 永続化された状態管理

### APIクライアント

#### stockApi.ts

バックエンドAPIとの通信を行うAxiosベースのクライアント。

**主な機能:**

- 型安全なHTTPリクエスト/レスポンス
- キャッシュとの連携
- エラーハンドリングと型ガード
- リトライ処理

## パフォーマンス最適化

### バックエンド

- **データベース最適化**: SQLiteのPRAGMA設定によるパフォーマンスチューニング
- **キャッシュ**: インメモリキャッシュによるAPIレスポンスのキャッシング
- **接続プール**: データベース接続プールの利用
- **ミドルウェア**: GZip圧縮、キャッシュヘッダー、ETagによるレスポンス最適化

### フロントエンド

- **コード分割**: React.lazyによる動的インポート
- **メモ化**: useMemo, useCallbackによる再計算の抑制
- **仮想リスト**: 大量データ表示時のパフォーマンス向上
- **デバウンス**: 検索入力のデバウンス処理

## セキュリティ

- **CORS**: クロスオリジンリクエストの制限
- **コンテンツセキュリティ**: セキュリティヘッダーの設定
- **入力バリデーション**: Pydanticによるリクエストバリデーション

## テスト

- **ユニットテスト**: pytestによるビジネスロジックのテスト
- **統合テスト**: APIエンドポイントの統合テスト
- **コントラクトテスト**: API仕様の検証
- **フロントエンドテスト**: Jest + React Testing Libraryによるコンポーネントテスト

## デプロイ

- **バックエンド**: Railway (Python)
- **フロントエンド**: Vercel (React)
- **環境変数**: `.env`ファイルによる設定管理
- **CI/CD**: GitHub Actionsによる自動テストとデプロイ