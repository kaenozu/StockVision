# Data Model: テスト機能データモデル

**Generated**: 2025-09-04  
**Branch**: `002-test-feature-for`

## エンティティ定義

### 1. Stock（銘柄）
**Purpose**: 株式銘柄の基本情報と現在価格を管理

```python
class Stock:
    stock_code: str          # 銘柄コード（例: "7203"）
    company_name: str        # 会社名（例: "トヨタ自動車"）
    current_price: Decimal   # 現在価格
    previous_close: Decimal  # 前日終値
    price_change: Decimal    # 価格変動
    price_change_pct: Decimal # 変動率（%）
    volume: int             # 出来高
    market_cap: Optional[Decimal] # 時価総額
    created_at: datetime    # レコード作成日時
    updated_at: datetime    # 最終更新日時
```

**Validation Rules**:
- stock_code: 4桁数字必須
- current_price: 正数必須
- company_name: 1-100文字
- price_change_pct: -100 to 100%範囲内

### 2. Watchlist（ウォッチリスト）
**Purpose**: ユーザーが監視する銘柄リストを管理

```python
class Watchlist:
    id: int                 # 主キー
    stock_code: str         # 銘柄コード（外部キー）
    added_at: datetime      # 追加日時
    notes: Optional[str]    # メモ（最大500文字）
    alert_price_high: Optional[Decimal]  # 高値アラート
    alert_price_low: Optional[Decimal]   # 安値アラート
    is_active: bool         # アクティブフラグ
```

**Validation Rules**:
- stock_codeはStock.stock_codeに存在必須
- alert_price_high > alert_price_low（両方設定時）
- notes: 500文字以内

### 3. PriceHistory（価格履歴）
**Purpose**: 銘柄の価格履歴データを保存

```python
class PriceHistory:
    id: int                 # 主キー
    stock_code: str         # 銘柄コード（外部キー）
    date: date             # 取引日
    open_price: Decimal    # 始値
    high_price: Decimal    # 高値
    low_price: Decimal     # 安値
    close_price: Decimal   # 終値
    volume: int            # 出来高
    adj_close: Optional[Decimal] # 調整後終値
```

**Validation Rules**:
- high_price >= max(open_price, close_price)
- low_price <= min(open_price, close_price)  
- volume >= 0
- dateは過去日付のみ

## データ関係

```
Stock (1) ←→ (N) Watchlist
  └── stock_code

Stock (1) ←→ (N) PriceHistory
  └── stock_code
```

## インデックス戦略

```sql
-- パフォーマンス最適化用インデックス
CREATE INDEX idx_stock_code ON Stock(stock_code);
CREATE INDEX idx_watchlist_stock ON Watchlist(stock_code);
CREATE INDEX idx_price_history_stock_date ON PriceHistory(stock_code, date DESC);
CREATE INDEX idx_watchlist_active ON Watchlist(is_active);
```

## データアクセスパターン

### 読み取りパターン
1. **銘柄検索**: `GET /stocks/{stock_code}` 
2. **ウォッチリスト取得**: `GET /watchlist?active=true`
3. **価格履歴取得**: `GET /stocks/{stock_code}/history?days=30`
4. **リアルタイム価格**: `GET /stocks/{stock_code}/current`

### 書き込みパターン
1. **価格更新**: `PUT /stocks/{stock_code}/price`
2. **ウォッチリスト追加**: `POST /watchlist`
3. **履歴データ追加**: `POST /stocks/{stock_code}/history`

## State Transitions

### Stock Status
```
[新規登録] → [アクティブ] → [更新中] → [アクティブ]
                     ↓
                [エラー状態] → [復旧] → [アクティブ]
```

### Watchlist Status  
```
[追加] → [アクティブ] → [一時停止] → [アクティブ]
            ↓              ↓
        [削除済み]    [削除済み]
```

## データ整合性制約

### 必須制約
- すべてのテーブルにcreated_at, updated_atを含める
- 論理削除使用（削除フラグ）、物理削除禁止
- 外部キー制約でデータ整合性保証

### ビジネスルール制約
- 同一銘柄コードの重複登録禁止
- 過去日付の価格データのみ許可（未来日付禁止）
- ウォッチリスト1つあたり最大50銘柄

## バックアップ・復旧戦略

- SQLiteファイルの定期バックアップ（日次）
- 重要データ変更前の自動スナップショット
- データ破損時の前回正常バックアップからの復旧手順