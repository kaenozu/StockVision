# Research Phase: テスト機能調査結果

**Generated**: 2025-09-04  
**Branch**: `002-test-feature-for`

## Research Questions

### 1. Python FastAPI + SQLite アーキテクチャパターン調査

**Decision**: FastAPIとSQLite3を組み合わせたシンプル構成
**Rationale**: 
- FastAPIは軽量で高速なWeb API構築が可能
- SQLiteはセットアップ不要でローカル動作に適している
- PydanticによるType-safe なデータ検証が可能

**Alternatives considered**:
- Flask + PostgreSQL: 重すぎる
- Django: オーバーヘッドが大きい
- NodeJS + Express: Pythonエコシステムから外れる

### 2. 株価データ取得API調査

**Decision**: Yahoo Finance API (yfinance) + Alpha Vantage バックアップ
**Rationale**:
- yfinanceは日本株対応で使いやすい
- 無料で基本情報取得可能
- Alpha Vantageをフォールバックとして併用

**Alternatives considered**:
- Quandl: 有料プランが必要
- Bloomberg API: 個人利用には高コスト
- 直接スクレイピング: 法的リスクと安定性の問題

### 3. データ永続化パターン

**Decision**: SQLite + SQLAlchemy ORM
**Rationale**:
- ORMによりデータモデル定義が簡潔
- マイグレーション管理が容易
- Raw SQLより安全で保守性が高い

**Alternatives considered**:
- Raw SQLite: コード量増加とメンテナンス性低下
- JSON ファイル保存: 複雑なクエリに対応困難
- CSV保存: 関係データ表現に不適

### 4. テスト戦略

**Decision**: pytest + テスト用SQLite インメモリDB
**Rationale**:
- pytestは標準的で豊富な機能
- インメモリDBでテストの高速化
- 実際のDB操作をテスト可能

**Alternatives considered**:
- モッキング中心: 実際のDB操作検証不可
- 専用テストDB: セットアップ複雑化
- unittest: pytestより機能不足

### 5. CLI設計パターン

**Decision**: Click + Rich によるモダンCLI
**Rationale**:
- Clickは柔軟なコマンド構成に対応
- Richで視覚的に見やすい出力
- JSON/テーブル両対応可能

**Alternatives considered**:
- argparse: 低レベル、機能不足
- Typer: 新しいがClickで十分
- 純粋なプリント: 可読性低下

## 技術スタック決定

```python
# Core
- Python 3.11+
- FastAPI 0.104+
- SQLAlchemy 2.0+
- SQLite3

# Data fetching
- yfinance
- requests
- aiohttp (非同期対応)

# CLI
- Click 8.1+
- Rich 13.7+

# Testing
- pytest 7.4+
- pytest-asyncio
- pytest-mock

# Validation
- Pydantic 2.4+
```

## アーキテクチャ決定

### ライブラリ構成
1. `stock_api`: 外部データ取得
2. `stock_storage`: ローカルデータ管理
3. `stock_display`: 表示・フォーマット
4. `stock_cli`: CLI インターフェース

### ディレクトリ構造
```
src/
├── stock_api/
│   ├── __init__.py
│   ├── yahoo_client.py
│   └── data_models.py
├── stock_storage/
│   ├── __init__.py
│   ├── database.py
│   └── models.py
├── stock_display/
│   ├── __init__.py
│   ├── formatters.py
│   └── renderers.py
├── stock_cli/
│   ├── __init__.py
│   └── commands.py
└── main.py

tests/
├── contract/
├── integration/
└── unit/
```

## Phase 0 完了確認

- [x] 全技術スタック決定済み
- [x] 外部依存関係明確化
- [x] アーキテクチャパターン確定
- [x] テスト戦略決定
- [x] NEEDS CLARIFICATION なし