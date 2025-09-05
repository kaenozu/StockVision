# StockVision テストガイド

## 概要

このドキュメントは、StockVisionプロジェクトのテスト戦略、テストスイートの実行方法、新しいテストの追加方法について説明します。

## テスト戦略

StockVisionは、コードの品質と信頼性を確保するために、複数のレベルのテストを採用しています。

### テストレベル

1. **ユニットテスト (Unit Tests)**
   - 個々の関数、クラス、モジュールのロジックを検証。
   - 外部依存関係はモックを使用。
   - ファイル: `tests/unit/`

2. **統合テスト (Integration Tests)**
   - 複数のモジュールやサービスを組み合わせたテスト。
   - 実際のデータベースや外部APIとの連携を検証。
   - ファイル: `tests/integration/`

3. **コントラクトテスト (Contract Tests)**
   - APIエンドポイントの仕様（リクエスト/レスポンス形式、ステータスコードなど）を検証。
   - OpenAPI/Swagger定義との一致を確認。
   - ファイル: `tests/contract/`

4. **フロントエンドテスト (Frontend Tests)**
   - Reactコンポーネント、カスタムフック、サービスのテスト。
   - ユニットテストとコンポーネントテストを含む。
   - ファイル: `frontend/src/__tests__/`, `frontend/src/components/**/__tests__/`

### テストツール

#### バックエンド

- **テストフレームワーク**: pytest
- **アサーションライブラリ**: pytest 組み込み
- **モックライブラリ**: unittest.mock
- **カバレッジツール**: pytest-cov
- **APIテスト**: requests または FastAPI TestClient

#### フロントエンド

- **テストフレームワーク**: Jest
- **テストユーティリティ**: React Testing Library
- **アサーションライブラリ**: Jest 組み込み
- **モックライブラリ**: Jest 組み込み
- **カバレッジツール**: Jest 組み込み

## バックエンドテスト

### テストスイートの実行

```bash
# すべてのバックエンドテストを実行
pytest

# カバレッジレポート付きでテストを実行
pytest --cov=src --cov-report=html --cov-report=term

# 特定のテストタイプのみ実行
pytest -m unit        # ユニットテストのみ
pytest -m integration # 統合テストのみ
pytest -m contract    # コントラクトテストのみ

# 特定のファイルのテストを実行
pytest tests/unit/test_stock_service.py

# 特定のテスト関数を実行
pytest tests/unit/test_stock_service.py::test_get_stock_info_success

# 最後に失敗したテストのみ実行
pytest --lf

# 失敗したテストを除外して実行
pytest --ff
```

### テストディレクトリ構造

```
tests/
├── unit/                # ユニットテスト
│   ├── test_cache.py
│   ├── test_stock_service.py
│   ├── test_yahoo_client.py
│   └── ...
├── integration/         # 統合テスト
│   ├── test_database.py
│   ├── test_api_integration.py
│   └── ...
├── contract/            # コントラクトテスト
│   ├── test_stocks_api.py
│   ├── test_watchlist_api.py
│   └── ...
├── conftest.py         # テスト共通設定 (フィクスチャなど)
└── test_config.py      # テスト設定
```

### ユニットテストの例

```python
# tests/unit/test_stock_service.py

import pytest
from unittest.mock import AsyncMock, patch
from src.services.stock_service import HybridStockService
from src.stock_api.data_models import StockData

@pytest.mark.unit
class TestHybridStockService:
    @pytest.fixture
    def service(self):
        return HybridStockService()

    @pytest.fixture
    def mock_stock_data(self):
        return StockData(
            stock_code="7203",
            company_name="Toyota Motor Corp",
            current_price=1000.0,
            previous_close=990.0,
            price_change=10.0,
            price_change_pct=1.01,
            volume=1000000,
            market_cap=2000000000000
        )

    @patch("src.services.stock_service.YahooFinanceClient")
    @pytest.mark.asyncio
    async def test_get_stock_info_real_data_success(self, mock_yahoo_client, service, mock_stock_data):
        # モックの設定
        mock_client_instance = AsyncMock()
        mock_yahoo_client.return_value.__aenter__.return_value = mock_client_instance
        mock_client_instance.get_stock_info.return_value = mock_stock_data

        # テスト対象の関数を実行
        with patch("src.config.settings.should_use_real_data", return_value=True):
            result = await service.get_stock_info("7203", use_real_data=True)

        # アサーション
        assert result.stock_code == "7203"
        assert result.current_price == 1000.0
        mock_client_instance.get_stock_info.assert_called_once_with("7203")
```

### 統合テストの例

```python
# tests/integration/test_database.py

import pytest
from sqlalchemy.orm import Session
from src.models.stock import Stock
from src.stock_storage.database import get_session_scope

@pytest.mark.integration
class TestDatabaseIntegration:
    def test_stock_model_crud(self):
        """StockモデルのCRUD操作をテスト"""
        with get_session_scope() as session:
            # Create
            new_stock = Stock(
                stock_code="1234",
                company_name="Test Company",
                current_price=100.0,
                previous_close=99.0,
                price_change=1.0,
                price_change_pct=1.01,
                volume=1000
            )
            session.add(new_stock)
            session.commit()
            session.refresh(new_stock)

            # Read
            retrieved_stock = session.query(Stock).filter(Stock.stock_code == "1234").first()
            assert retrieved_stock is not None
            assert retrieved_stock.company_name == "Test Company"

            # Update
            retrieved_stock.current_price = 110.0
            session.commit()
            session.refresh(retrieved_stock)
            assert retrieved_stock.current_price == 110.0

            # Delete
            session.delete(retrieved_stock)
            session.commit()
            deleted_stock = session.query(Stock).filter(Stock.stock_code == "1234").first()
            assert deleted_stock is None
```

### コントラクトテストの例

```python
# tests/contract/test_stocks_api.py

import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

@pytest.mark.contract
class TestStocksAPIContract:
    def test_get_stock_info_success(self):
        """銘柄情報取得APIの正常系テスト"""
        response = client.get("/api/stocks/7203")
        
        assert response.status_code == 200
        data = response.json()
        assert "stock_code" in data
        assert "company_name" in data
        assert "current_price" in data
        assert data["stock_code"] == "7203"
        # 他のフィールドの存在と型を検証...

    def test_get_stock_info_invalid_code(self):
        """銘柄情報取得APIの異常系テスト (無効な銘柄コード)"""
        response = client.get("/api/stocks/INVALID")
        
        assert response.status_code == 422
        # エラーレスポンスの内容を検証...

    def test_get_price_history_success(self):
        """価格履歴取得APIの正常系テスト"""
        response = client.get("/api/stocks/7203/history?days=5")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # リストのアイテム数や各アイテムの構造を検証...
```

## フロントエンドテスト

### テストスイートの実行

```bash
cd frontend

# すべてのフロントエンドテストを実行
npm run test

# カバレッジレポート付きでテストを実行
npm run test:coverage

# ウォッチモードでテストを実行
npm run test:watch

# 特定のファイルのテストを実行
npm run test src/components/stock/StockCard.test.tsx

# 最後に失敗したテストのみ実行
npm run test -- --lastCommit

# 関連する変更のみテストを実行
npm run test -- --watch
```

### テストディレクトリ構造

```
frontend/src/
├── __tests__/                 # 一般的なテストファイル
│   ├── utils/
│   └── ...
├── components/
│   ├── stock/
│   │   ├── StockCard.test.tsx
│   │   ├── PriceChart.test.tsx
│   │   └── __tests__/
│   └── ...
├── services/
│   ├── stockApi.test.ts
│   └── ...
├── hooks/
│   ├── useStock.test.ts
│   └── ...
└── ...
```

### コンポーネントテストの例

```typescript
// frontend/src/components/stock/StockCard.test.tsx

import { render, screen } from '@testing-library/react';
import { StockCard } from './StockCard';
import { StockData } from '../../types/stock';

const mockStockData: StockData = {
  stock_code: '7203',
  company_name: 'トヨタ自動車',
  current_price: 1000,
  previous_close: 990,
  price_change: 10,
  price_change_pct: 1.01,
  volume: 1000000
};

describe('StockCard', () => {
  it('renders stock information correctly', () => {
    render(<StockCard stockData={mockStockData} />);
    
    expect(screen.getByText('7203')).toBeInTheDocument();
    expect(screen.getByText('トヨタ自動車')).toBeInTheDocument();
    expect(screen.getByText('¥1,000')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('(+1.01%)')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<StockCard loading={true} />);
    
    expect(screen.getByText('株式データを取得中...')).toBeInTheDocument();
  });

  it('displays error message', () => {
    const errorMessage = 'Failed to load stock data';
    render(<StockCard error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
```

### フックテストの例

```typescript
// frontend/src/hooks/useStock.test.ts

import { renderHook, act } from '@testing-library/react';
import { useStockData } from './useStock';
import * as stockApi from '../services/stockApi';

// Mock the stockApi module
jest.mock('../services/stockApi');

const mockStockApi = stockApi as jest.Mocked<typeof stockApi>;

describe('useStockData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches stock data successfully', async () => {
    const mockData = {
      stock_code: '7203',
      company_name: 'トヨタ自動車',
      current_price: 1000,
      // ... other fields
    };
    
    mockStockApi.stockApi.getStockData.mockResolvedValue(mockData);

    const { result } = renderHook(() => useStockData('7203'));

    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    // Wait for the async operation to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Final state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual(mockData);
  });

  it('handles fetch error', async () => {
    const errorMessage = 'Network error';
    mockStockApi.stockApi.getStockData.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useStockData('7203'));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(errorMessage);
  });
});
```

### サービステストの例

```typescript
// frontend/src/services/stockApi.test.ts

import axios from 'axios';
import { stockApi, isApiError } from './stockApi';
import { StockData } from '../types/stock';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('stockApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStockData', () => {
    it('fetches stock data successfully', async () => {
      const mockData: StockData = {
        stock_code: '7203',
        company_name: 'トヨタ自動車',
        current_price: 1000,
        previous_close: 990,
        price_change: 10,
        price_change_pct: 1.01,
        volume: 1000000
      };

      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await stockApi.getStockData('7203');

      expect(result).toEqual(mockData);
      expect(mockedAxios.get).toHaveBeenCalledWith('/stocks/7203', { params: {} });
    });

    it('handles API error', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: 'Stock not found' }
        }
      };

      mockedAxios.get.mockRejectedValue(mockError);

      await expect(stockApi.getStockData('0000')).rejects.toThrow('Stock not found');
    });
  });
});

describe('isApiError', () => {
  it('correctly identifies API error objects', () => {
    const apiError = {
      error: {
        code: 404,
        message: 'Not Found'
      }
    };

    expect(isApiError(apiError)).toBe(true);
  });

  it('rejects non-API error objects', () => {
    const nonApiError = {
      message: 'Generic error'
    };

    expect(isApiError(nonApiError)).toBe(false);
  });
});
```

## テストカバレッジ

### カバレッジレポートの生成

```bash
# バックエンド
pytest --cov=src --cov-report=html --cov-report=term

# フロントエンド
npm run test:coverage
```

### カバレッジ目標

- **ユニットテスト**: 80%以上
- **統合テスト**: 70%以上
- **コントラクトテスト**: 90%以上 (APIエンドポイントの主要パス)
- **フロントエンド**: 75%以上

## CI/CDでのテスト

GitHub Actions により、以下のテストが自動的に実行されます。

```yaml
# .github/workflows/test.yml

name: Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.10, 3.11]

    steps:
    - uses: actions/checkout@v3
    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    - name: Run backend tests
      run: |
        pytest --cov=src --cov-report=xml
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
        flags: backend
        name: codecov-umbrella

  frontend-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install frontend dependencies
      run: |
        cd frontend
        npm install
    - name: Run frontend tests
      run: |
        cd frontend
        npm run test:coverage
    - name: Upload frontend coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./frontend/coverage/lcov.info
        flags: frontend
        name: codecov-frontend
```

## 新しいテストの追加方法

### バックエンドテストの追加

1. **テストファイルの作成**
   - 適切なディレクトリ (`tests/unit/`, `tests/integration/`, `tests/contract/`) に新しいテストファイルを作成。
   - ファイル名は `test_*.py` または `*_test.py`。

2. **テストクラスとメソッドの定義**
   - `pytest` の規約に従って、テストクラスとメソッドを定義。
   - テストメソッド名は `test_*` で始める。

3. **フィクスチャの使用**
   - `conftest.py` で共通のフィクスチャを定義。
   - 必要に応じて、テストメソッド内でローカルフィクスチャを定義。

4. **アサーションの記述**
   - `assert` 文を使用して、期待される結果と実際の結果を比較。
   - 例外のテストには `pytest.raises` を使用。

5. **モックの使用**
   - 外部依存関係をモックして、テスト対象のコードのみを検証。
   - `unittest.mock` または `pytest-mock` を使用。

### フロントエンドテストの追加

1. **テストファイルの作成**
   - テスト対象のコンポーネントやフックと同じディレクトリに `*.test.tsx` または `*.test.ts` ファイルを作成。
   - または、`__tests__` ディレクトリにファイルを作成。

2. **必要なモジュールのインポート**
   - `@testing-library/react` から `render`, `screen`, `fireEvent` などをインポート。
   - テスト対象のコンポーネントやフックをインポート。

3. **テストケースの記述**
   - `describe` ブロックで関連するテストケースをグループ化。
   - `it` または `test` で個々のテストケースを定義。

4. **コンポーネントのレンダリング**
   - `render` 関数を使用してコンポーネントをレンダリング。
   - 必要に応じて、props や context provider を渡す。

5. **アサーションの記述**
   - `expect` とマッチャーを使用して、DOMの状態やユーザーインタラクションの結果を検証。
   - `screen.getBy*`, `screen.queryBy*`, `screen.findBy*` などのクエリを使用して要素を取得。

6. **モックの使用**
   - `jest.mock` でモジュールをモック。
   - `jest.fn()` でモック関数を作成。
   - `mockImplementation`, `mockResolvedValue` などでモックの動作を定義。

## ベストプラクティス

### バックエンド

1. **AAAパターン (Arrange, Act, Assert)**
   - テストコードを明確に3つのセクションに分ける。

2. **DRY原則**
   - 共通のセットアップコードはフィクスチャにまとめる。

3. **F.I.R.S.T原則**
   - **Fast**: テストは高速に実行できるようにする。
   - **Independent**: テストは互いに依存しないようにする。
   - **Repeatable**: テストはどの環境でも同じ結果になるようにする。
   - **Self-Validating**: テストはbooleanの結果を返すようにする。
   - **Timely**: テストはプロダクトコードを書く前か直後に書く。

4. **境界値テスト**
   - 入力値の境界値 (最小値、最大値、ゼロなど) でテストする。

5. **エラーパスのテスト**
   - 正常系だけでなく、異常系 (エラー発生時) のテストも記述する。

### フロントエンド

1. **ユーザーの視点でのテスト**
   - 実際にユーザーがどのようにコンポーネントとやり取りするかを考慮してテストを記述する。
   - React Testing Library のクエリは、ユーザーの視点に立ったものを使う (例: `getByRole`, `getByText`)。

2. **実装の詳細に依存しない**
   - コンポーネントの内部実装 (stateの名前、クラス名など) に依存したテストは避ける。

3. **非同期処理のテスト**
   - `async/await` と `act` を使用して、非同期処理を正しくテストする。

4. **イベントハンドラのテスト**
   - ユーザーのアクション (クリック、入力など) が正しくハンドラをトリガーするかテストする。

5. **条件付きレンダリングのテスト**
   - propsやstateの値に応じて、コンポーネントが正しく条件分岐するかテストする。