... (ここには元のファイルの内容が続きます)

## アラート価格設定

ウォッチリストアイテムに、高値・安値のアラート価格を設定できます。
アラート価格を設定した銘柄の価格が、設定された価格を突破した場合に通知できます (通知機能は今後の実装予定)。

### ウォッチリストアイテムのデータ構造

ウォッチリストアイテムのデータ構造に、以下のフィールドが追加されています：

- `alert_price_high` (number, optional): 高値アラート価格。
- `alert_price_low` (number, optional): 安値アラート価格。

これらのフィールドは、`POST /api/watchlist` および `GET /api/watchlist` のリクエスト・レスポンスで使用されます。

## メトリクス

パフォーマンスメトリクスを取得するためのエンドポイントを提供します。

### メトリクスサマリーの取得

`GET /api/metrics/summary`

**概要**: パフォーマンスメトリクスのサマリーを取得します。

**レスポンス**

```json
{
  "total_requests": 1234,
  "slow_requests_count": 5,
  "average_response_time": 0.123,
  "request_rate_per_second": 2.5,
  "status_code_distribution": {
    "200": 1200,
    "404": 20,
    "500": 5
  },
  "top_slow_endpoints": [
    {
      "endpoint": "GET /api/stocks/7203/history",
      "average_time": 1.23
    }
  ],
  "endpoint_stats": {
    "GET /api/stocks/{stock_code}": {
      "200": {
        "count": 100,
        "avg_time": 0.123,
        "min_time": 0.05,
        "max_time": 0.5
      },
      "overall": {
        "count": 100,
        "avg_time": 0.123,
        "min_time": 0.05,
        "max_time": 0.5
      }
    }
  }
}
```

### スローリクエストの取得

`GET /api/metrics/slow-requests`

**概要**: 最近のスローリクエストを取得します。

**パラメータ**

| 名前 | 場所 | 必須 | 型 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `limit` | query | No | integer | 取得するスローリクエストの数 (1-1000, デフォルト: 50) |

**レスポンス**

```json
[
  {
    "timestamp": 1678886400,
    "method": "GET",
    "path": "/api/stocks/7203/history",
    "process_time": 1.23,
    "status_code": 200,
    "user_agent": "Mozilla/5.0 ...",
    "client_ip": "127.0.0.1"
  }
]
```

### エンドポイント統計の取得

`GET /api/metrics/endpoints`

**概要**: エンドポイントごとの統計情報を取得します。

**レスポンス**

```json
{
  "GET /api/stocks/{stock_code}": {
    "200": {
      "count": 100,
      "avg_time": 0.123,
      "min_time": 0.05,
      "max_time": 0.5
    },
    "overall": {
      "count": 100,
      "avg_time": 0.123,
      "min_time": 0.05,
      "max_time": 0.5
    }
  }
}
```

### トップスローエンドポイントの取得

`GET /api/metrics/top-slow-endpoints`

**概要**: 最も遅いエンドポイントのトップリストを取得します。

**パラメータ**

| 名前 | 場所 | 必須 | 型 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `limit` | query | No | integer | 取得するエンドポイントの数 (1-100, デフォルト: 10) |

**レスポンス**

```json
[
  {
    "endpoint": "GET /api/stocks/7203/history",
    "average_time": 1.23
  }
]
```

### メトリクス履歴のクリア

`POST /api/metrics/clear`

**概要**: メトリクス履歴をクリアします。

**レスポンス**

```json
{
  "message": "Metrics history cleared"
}
```