# ミドルウェア動作順序とアーキテクチャ

## 概要
StockVision APIでは、複数のミドルウェアを適用してパフォーマンス最適化、キャッシュ制御、メトリクス収集を行っています。
この文書では、ミドルウェアの適用順序とその理由、相互の影響について説明します。

## ミドルウェア適用順序

FastAPIのミドルウェアは **逆順 (LIFO: Last In, First Out)** で処理されます。つまり、最後に登録されたミドルウェアが最初にリクエストを受け取り、レスポンス処理では最初に登録されたミドルウェアが最後に処理されます。

### 1. リクエスト処理フロー

```
Client Request
    ↓
1. CORSMiddleware (FastAPI標準)
    ↓
2. PerformanceMetricsMiddleware
    ↓
3. ResponseCompressionMiddleware
    ↓
4. CacheControlMiddleware
    ↓
Application Logic (API Routes)
```

### 2. レスポンス処理フロー

```
Application Logic (API Routes)
    ↓
1. CacheControlMiddleware
    ↓
2. ResponseCompressionMiddleware
    ↓
3. PerformanceMetricsMiddleware
    ↓
4. CORSMiddleware (FastAPI標準)
    ↓
Client Response
```

## 各ミドルウェアの詳細と設計理由

### 1. CORSMiddleware (最外層)
**目的**: Cross-Origin Resource Sharing (CORS) ポリシーの適用

**設定場所**: `src/main.py:95-101`

**理由**: 
- セキュリティ関連の処理は最外層で実行する必要がある
- 他のすべてのミドルウェア処理前にオリジン検証を行う
- プリフライトリクエスト（OPTIONS）を適切に処理

### 2. PerformanceMetricsMiddleware
**目的**: レスポンス時間の測定とスローリクエストのロギング

**設定場所**: `src/middleware/performance.py:295-336`

**理由**:
- 全体的なリクエスト処理時間を正確に測定するため最外層（CORS以外）に配置
- 他のミドルウェアによるオーバーヘッドも含めた真の処理時間を計測
- メトリクス情報をレスポンスヘッダーに追加（`X-Process-Time`, `X-Timestamp`）

**追加機能**:
- スローリクエストの警告ログ出力
- 外部メトリクスシステム（将来のPrometheus統合など）へのデータ送信

### 3. ResponseCompressionMiddleware
**目的**: レスポンスの圧縮（GZip/Brotli）

**設定場所**: `src/middleware/performance.py:167-293`

**理由**:
- キャッシュ制御ヘッダー設定後に圧縮を実行
- 圧縮されたコンテンツにもETagが正しく適用されるように配置
- 圧縮前の元データサイズで適切なキャッシュヘッダーを生成

**圧縮対象**:
- `application/json`, `text/html`, `text/css`, `application/javascript` など
- 最小サイズ: 1KB以上（設定可能）
- 圧縮アルゴリズム優先度: Brotli > GZip

**メトリクス**:
- 圧縮率、処理時間、節約バイト数をヘッダーで提供
- デバッグ用の詳細情報を `X-Compression-*` ヘッダーに出力

### 4. CacheControlMiddleware (最内層)
**目的**: キャッシュ制御ヘッダーとETagの設定

**設定場所**: `src/middleware/performance.py:57-165`

**理由**:
- アプリケーションロジックに最も近い位置で実行
- レスポンスデータの内容に基づいたキャッシュ戦略を適用
- ETag生成は圧縮前の元データで行い、その後圧縮される

**キャッシュ戦略**:
- **推奨銘柄データ**: 長期キャッシュ（TTL: 1800秒）
- **リアルタイム株価**: 短期キャッシュ（TTL: 60秒）
- **ウォッチリスト**: キャッシュ無効（ユーザー固有データ）

**ETag機能**:
- レスポンス内容のSHA256ハッシュからETag生成
- `If-None-Match`ヘッダーによる304 Not Modified レスポンス

## 順序の重要性

### なぜこの順序なのか？

1. **セキュリティファースト**: CORSは最優先でチェック
2. **正確な測定**: メトリクスは全処理時間を含める必要
3. **効率的な圧縮**: キャッシュヘッダー設定後に圧縮
4. **適切なキャッシュ**: アプリケーションデータに基づいたキャッシュ制御

### もし順序を変更すると？

| 変更 | 影響 |
|------|------|
| CacheControl を最外層 | ETagが圧縮後データで生成され、キャッシュ効率が悪化 |
| Compression を内層 | キャッシュされたデータが未圧縮になり、転送効率悪化 |
| Metrics を内層 | 一部ミドルウェアの処理時間が測定対象外になる |

## 設定と制御

### 環境変数による制御
```python
# src/config/middleware.py で設定
CACHE_CONTROL_ENABLED = True
RESPONSE_COMPRESSION_ENABLED = True
PERFORMANCE_METRICS_ENABLED = True
```

### 動的設定変更
各ミドルウェアは実行時に設定を確認し、無効化されている場合は処理をスキップします。

## パフォーマンスへの影響

### 測定結果例
- **圧縮**: JSON データで 60-70% サイズ削減
- **キャッシュ**: 重複リクエストで 95% 応答時間短縮
- **メトリクス**: < 1ms のオーバーヘッド

### モニタリング
- スローリクエスト警告（デフォルト: > 2秒）
- 圧縮率とCPU使用時間の記録
- キャッシュヒット率の測定

## トラブルシューティング

### よくある問題
1. **キャッシュが効かない**: ETagヘッダーの確認、パス設定の確認
2. **圧縮されない**: Content-Typeとサイズの確認
3. **メトリクスが記録されない**: ミドルウェア有効化の確認

### デバッグ用ヘッダー
- `X-Process-Time`: 処理時間（ms）
- `X-Compression-Ratio`: 圧縮率
- `X-Original-Size`, `X-Compressed-Size`: サイズ情報

## 将来の拡張

### 計画中の機能
1. Redis キャッシュ統合
2. Prometheus メトリクス出力
3. 動的圧縮レベル調整
4. A/B テスト対応ヘッダー

---

**更新履歴**:
- 2025-09-06: 初版作成（イシュー #201 対応）
- PR #169 でのミドルウェア順序修正を反映