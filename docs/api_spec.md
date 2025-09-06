# StockVision API 仕様書

## 概要

StockVision APIは、株価情報を取得・管理するためのRESTful APIです。リアルタイムデータとモックデータのハイブリッドなデータソースを提供します。

## サーバー情報

- **URL**: `http://localhost:8000` (開発環境)
- **ベースパス**: `/api`

## 認証

認証は必要ありません。

## リクエスト/レスポンス形式

- **Content-Type**: `application/json`
- **文字エンコーディング**: UTF-8

## エラーレスポンス

### フォーマット

```json
{
  "detail": "エラーメッセージ"
}
```

### ステータスコード

- `400`: バリデーションエラー
- `404`: リソースが見つからない
- `500`: サーバーエラー
- `503`: サービス利用不可

## エンドポイント

### ヘルスチェック / メトリクス

#### Liveness

`GET /live` または `GET /api/live`

プロセスの生存確認用の軽量エンドポイント。

```json
{ "status": "alive" }
```

#### Readiness

`GET /ready` または `GET /api/ready`

依存関係（DB等）の準備ができているかを確認します。準備未完了時は `503` を返します。

```json
{ "status": "ready" }
```

#### Metrics (Prometheus)

`GET /metrics`

`ENABLE_METRICS=true` の場合に公開され、Prometheusテキスト形式でメトリクスを返します。
- `METRICS_BASIC_AUTH=user:pass` を設定するとBasic認証が必須に
- `METRICS_ALLOW_CIDRS=...` を設定するとCIDR/IP許可リストでアクセス制限

主なメトリクス:
- `http_requests_total{method, path, status}`
- `http_request_duration_seconds{method, path, status}`

### 株式情報

#### 銘柄情報の取得

`GET /api/stocks/{stock_code}`

**概要**: 指定された銘柄コードの情報を取得します。

**パラメータ**

| 名前 | 場所 | 必須 | 型 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `stock_code` | path | Yes | string | 4桁の銘柄コード (例: "7203") |
| `use_real_data` | query | No | boolean | リアルデータを使用するかどうか (デフォルト: 環境設定) |

**レスポンス**

```json
{
  "stock_code": "7203",
  "company_name": "トヨタ自動車株式会社",
  "current_price": 2500.50,
  "previous_close": 2450.00,
  "price_change": 50.50,
  "price_change_pct": 2.06,
  "volume": 1000000,
  "market_cap": 3000000000000,
  "day_high": 2550.00,
  "day_low": 2480.00,
  "year_high": 2800.00,
  "year_low": 2200.00,
  "avg_volume": 900000,
  "pe_ratio": 15.5,
  "dividend_yield": 2.5,
  "last_updated": "2023-10-27T10:00:00Z"
}
```

#### 現在価格の取得

`GET /api/stocks/{stock_code}/current`

**概要**: 指定された銘柄コードの現在価格情報を取得します。

**パラメータ**

| 名前 | 場所 | 必須 | 型 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `stock_code` | path | Yes | string | 4桁の銘柄コード (例: "7203") |
| `use_real_data` | query | No | boolean | リアルデータを使用するかどうか (デフォルト: 環境設定) |

**レスポンス**

```json
{
  "stock_code": "7203",
  "current_price": 2500.50,
  "previous_close": 2450.00,
  "price_change": 50.50,
  "price_change_pct": 2.06,
  "timestamp": "2023-10-27T10:00:00Z",
  "market_status": "open"
}
```

#### 価格履歴の取得

`GET /api/stocks/{stock_code}/history`

**概要**: 指定された銘柄コードの価格履歴を取得します。

**パラメータ**

| 名前 | 場所 | 必須 | 型 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `stock_code` | path | Yes | string | 4桁の銘柄コード (例: "7203") |
| `days` | query | No | integer | 取得する日数 (1-365, デフォルト: 30) |
| `use_real_data` | query | No | boolean | リアルデータを使用するかどうか (デフォルト: 環境設定) |

**レスポンス**

```json
[
  {
    "stock_code": "7203",
    "date": "2023-10-27",
    "open": 2480.00,
    "high": 2550.00,
    "low": 2470.00,
    "close": 2500.50,
    "volume": 1000000
  },
  ...
]
```

### ウォッチリスト

#### ウォッチリストの取得

`GET /api/watchlist`

**概要**: ユーザーのウォッチリストを取得します。

**パラメータ**

| 名前 | 場所 | 必須 | 型 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `active` | query | No | boolean | アクティブなアイテムのみ取得 (デフォルト: true) |

**レスポンス**

```json
[
  {
    "id": 1,
    "stock_code": "7203",
    "added_at": "2023-10-27T10:00:00Z",
    "notes": "トヨタ自動車",
    "alert_price_high": 2600.00,
    "alert_price_low": 2400.00,
    "is_active": true
  },
  ...
]
```

#### ウォッチリストに追加

`POST /api/watchlist`

**概要**: 指定された銘柄をウォッチリストに追加します。

**リクエストボディ**

```json
{
  "stock_code": "7203",
  "notes": "トヨタ自動車 (任意)",
  "alert_price_high": 2600.00,
  "alert_price_low": 2400.00
}
```

**レスポンス**

```json
{
  "id": 1,
  "stock_code": "7203",
  "added_at": "2023-10-27T10:00:00Z",
  "notes": "トヨタ自動車",
  "alert_price_high": 2600.00,
  "alert_price_low": 2400.00,
  "is_active": true
}
```

#### ウォッチリストから削除

`DELETE /api/watchlist/{id}`

**概要**: 指定されたIDのウォッチリストアイテムを削除します。

**パラメータ**

| 名前 | 場所 | 必須 | 型 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | path | Yes | integer | ウォッチリストアイテムID |

**レスポンス**

- ステータスコード: `204 No Content`

## ヘルスチェック

### アプリケーション状態の確認

`GET /api/status`

**概要**: アプリケーションとデータベースの状態を確認します。

**レスポンス**

```json
{
  "status": "healthy",
  "database": {
    "healthy": true,
    "stats": {
      "stocks_count": 100,
      "watchlist_count": 10,
      "price_history_count": 5000
    }
  },
  "cache": {
    "general": {
      "size": 50,
      "maxsize": 1000,
      "ttl": 300.0
    },
    "yahoo_api": {
      "entries": 20,
      "size_bytes": 10240
    }
  },
  "configuration": {
    "yahoo_finance_api_enabled": true,
    "debug_mode": false,
    "log_level": "INFO"
  },
  "performance": {
    "optimizations_enabled": [
      "hybrid_data_source",
      "yahoo_finance_api_enabled",
      "intelligent_caching",
      "in_memory_caching",
      "database_connection_pooling",
      "gzip_compression",
      "sqlite_performance_tuning"
    ]
  },
  "version": "1.0.0"
}
```

## キャッシュ戦略

APIは、パフォーマンス向上のためにインメモリキャッシュを使用しています。

### キャッシュTTL (秒)

- **銘柄情報**: 300 (5分)
- **現在価格**: 60 (1分)
- **価格履歴**: 600 (10分)

リアルデータを使用する場合、これらのTTLに従ってキャッシュされます。
モックデータを使用する場合、キャッシュは使用されません。

## データソース

APIは、リアルデータとモックデータの2つのデータソースをサポートしています。

### リアルデータ (Yahoo Finance)

- **有効化**: 環境変数 `USE_REAL_YAHOO_API=true`
- **クライアント**: `yfinance` ライブラリ
- **レートリミット**: デフォルトで60秒間に10リクエスト

### モックデータ

- **有効化**: 環境変数 `USE_REAL_YAHOO_API=false` (デフォルト)
- **データ**: ランダムに生成された realistic な株価データ

データソースの切り替えは、各エンドポイントの `use_real_data` クエリパラメータまたは環境変数で行います。
クエリパラメータが指定された場合、それが優先されます。
リアルデータの取得に失敗した場合、自動的にモックデータにフォールバックします。

## アラート価格設定

ウォッチリストアイテムに、高値・安値のアラート価格を設定できます。
アラート価格を設定した銘柄の価格が、設定された価格を突破した場合に通知できます (通知機能は今後の実装予定)。

### ウォッチリストアイテムのデータ構造

ウォッチリストアイテムのデータ構造に、以下のフィールドが追加されています：

- `alert_price_high` (number, optional): 高値アラート価格。
- `alert_price_low` (number, optional): 安値アラート価格。

これらのフィールドは、`POST /api/watchlist` および `GET /api/watchlist` のリクエスト・レスポンスで使用されます。
