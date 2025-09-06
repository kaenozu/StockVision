# キャッシュキー生成ロジックの改善

## 概要

イシュー #19 の対応として、従来の単純な文字列連結によるキャッシュキー生成を、より堅牢で衝突回避に優れたシステムに改善しました。

## 問題点

### 従来のシステムの問題

1. **単純な文字列連結**
   ```python
   # 従来の方法
   cache_key = f"{operation}_{stock_code}_{params}"
   # 例: "get_stock_7203_period=1d"
   ```

2. **キー衝突のリスク**
   - パラメータの順序や値によって予期しない衝突が発生する可能性
   - 型の違い（文字列 "1" と整数 1）が区別されない
   - 複雑なパラメータ構造の処理が困難

3. **デバッグの困難性**
   - キーの構造が不明確
   - 長いキーの扱いが困難

## 新しいキャッシュキー生成システム

### 主な特徴

1. **構造化されたキーフォーマット**
   ```
   {namespace}:{version}:{operation}:{primary_key}:[parameters]
   例: stockvision:v1:stock:current_price:7203:period=str:1d
   ```

2. **型安全性**
   - パラメータに型プレフィックスを付与
   - `int:30`, `str:1d`, `bool:true`, `list:[int:1,int:2]` など

3. **決定論的パラメータ処理**
   - パラメータは常にソート済み
   - 複雑なデータ構造も一意に表現

4. **長いキーの自動ハッシュ化**
   - 設定可能な最大長を超えるキーは自動的にハッシュ化
   - オリジナルの長さ情報も保持

### アーキテクチャ

#### `CacheKeyGenerator` クラス

メインのキー生成クラス：

```python
from src.utils.cache_key_generator import CacheKeyGenerator

generator = CacheKeyGenerator()
key = generator.generate_key("operation", "primary_key", {"param": "value"})
```

#### 設定可能な動作

```python
from src.utils.cache_key_generator import CacheKeyConfig

config = CacheKeyConfig(
    namespace="custom",
    version="v2",
    max_key_length=200,
    hash_long_keys=True,
    include_timestamp=False
)
```

#### 便利関数

```python
from src.utils.cache_key_generator import (
    generate_stock_cache_key,
    generate_api_cache_key,
    get_cache_key_info
)

# 株価関連のキー生成
key = generate_stock_cache_key("current_price", "7203", period="1d")

# APIキー生成  
key = generate_api_cache_key("/api/stocks", params={"symbol": "7203"})

# キー構造の分析（デバッグ用）
info = get_cache_key_info(key)
```

## 既存システムとの統合

### 更新されたファイル

1. **`src/utils/cache_key_generator.py`** (新規)
   - 新しいキー生成システムの実装

2. **`src/services/stock_service.py`**
   ```python
   # 従来
   def _get_cache_key(self, operation: str, stock_code: str, **kwargs) -> str:
       params = "_".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
       return f"{operation}_{stock_code}_{params}"
   
   # 改善後
   def _get_cache_key(self, operation: str, stock_code: str, **kwargs) -> str:
       return generate_stock_cache_key(operation, stock_code, **kwargs)
   ```

3. **`src/utils/cache.py`**
   - デコレータでのキー生成を新システムに移行

4. **`src/middleware/performance.py`**
   - 後方互換性を保ちつつ新システムに移行

### 後方互換性

既存のコードとの互換性を保つため、`performance.py`の`generate_cache_key`関数は引き続き動作しますが、内部で新しいシステムを使用します。

## テスト

### テストカバレッジ

- **22のテストケース**をすべて通過
- コリジョン防止の検証
- パフォーマンス特性の確認
- 型安全性の検証

### 実行方法

```bash
python -m pytest tests/unit/test_cache_key_generator.py -v
```

## パフォーマンス影響

### メモリ使用量

- **改善**: より短く一意なキーによりメモリ効率が向上
- 長いキーの自動ハッシュ化により最大メモリ使用量を制限

### 処理速度

- **わずかなオーバーヘッド**: 型プレフィックスの追加により処理時間がわずかに増加
- **長期的利益**: キー衝突の減少により全体的なキャッシュ効率が向上

## 実際の使用例

### Before (従来)
```python
# 衝突の可能性
key1 = "get_stock_7203_period_1"  # period="1"
key2 = "get_stock_7203_period_1"  # period=1 (int)
# key1 == key2 が true になる問題
```

### After (改善後)
```python
key1 = generate_stock_cache_key("get_stock", "7203", period="1")
# -> "stockvision:v1:stock:get_stock:7203:period=str:1"

key2 = generate_stock_cache_key("get_stock", "7203", period=1)
# -> "stockvision:v1:stock:get_stock:7203:period=int:1"

# key1 != key2 で衝突回避
```

## 今後の展望

1. **Redis統合**: 分散キャッシュでの一意性保証
2. **メトリクス収集**: キー使用パターンの分析
3. **自動最適化**: よく使用されるキーパターンの最適化

## まとめ

新しいキャッシュキー生成システムにより：

✅ **キー衝突の防止**  
✅ **型安全性の向上**  
✅ **デバッグ容易性の改善**  
✅ **長期的な保守性の向上**  
✅ **後方互換性の維持**  

これにより、アプリケーションのキャッシュシステムがより信頼性が高く、スケーラブルになりました。