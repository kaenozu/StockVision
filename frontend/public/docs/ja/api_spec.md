# API仕様

このドキュメントでは、StockVision APIの仕様について説明します。

## エンドポイント

### 株式情報

- `GET /api/stocks/{stock_code}`: 株式情報を取得
- `GET /api/stocks/{stock_code}/current`: 現在の株価を取得
- `GET /api/stocks/{stock_code}/history`: 株価履歴を取得

### ウォッチリスト

- `GET /api/watchlist`: ウォッチリストを取得
- `POST /api/watchlist`: ウォッチリストに追加
- `DELETE /api/watchlist/{id}`: ウォッチリストから削除

## 認証

APIは認証を必要としませんが、一部の管理エンドポイントでは `X-Admin-Token` ヘッダーが必要です。

## レート制限

APIにはレート制限があります。詳細は [パフォーマンス](/docs/performance) ドキュメントを参照してください。