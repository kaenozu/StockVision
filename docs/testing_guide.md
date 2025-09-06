... (ここには元のファイルの内容が続きます)

### フロントエンド

1.  **ユーザーの視点でのテスト**
    - 実際にユーザーがどのようにコンポーネントとやり取りするかを考慮してテストを記述する。
    - React Testing Library のクエリは、ユーザーの視点に立ったものを使う (例: `getByRole`, `getByText`)。

2.  **実装の詳細に依存しない**
    - コンポーネントの内部実装 (stateの名前、クラス名など) に依存したテストは避ける。

3.  **非同期処理のテスト**
    - `async/await` と `act` を使用して、非同期処理を正しくテストする。

4.  **イベントハンドラのテスト**
    - ユーザーのアクション (クリック、入力など) が正しくハンドラをトリガーするかテストする。

5.  **条件付きレンダリングのテスト**
    - propsやstateの値に応じて、コンポーネントが正しく条件分岐するかテストする。

## E2Eテスト (Playwright)

E2Eテストは、Playwrightを使用して、実際のブラウザ上でアプリケーション全体のフローをテストします。

### テストツール

- **テストフレームワーク**: Playwright Test Runner
- **アサーションライブラリ**: Playwright 組み込み
- **モックライブラリ**: Playwright 組み込み
- **カバレッジツール**: Playwright 組み込み

### テストスイートの実行方法

```bash
cd frontend
# すべてのE2Eテストを実行
npx playwright test

# 特定のファイルのテストを実行
npx playwright test tests/e2e/homepage.spec.ts

# UIモードでテストを実行
npx playwright test --ui

# ヘッドレスモードでテストを実行 (CI環境など)
npx playwright test --headed=false

# テストレポートを表示
npx playwright show-report
```

### 環境変数

E2Eテストは、`frontend/.env` ファイルで環境変数を設定できます。

- `BASE_URL`: アプリケーションのベースURL (デフォルト: `http://localhost:3000`)

### テストの書き方

E2Eテストは、`frontend/tests/e2e/` ディレクトリに配置します。

```typescript
import { test, expect } from '@playwright/test';

test.describe('ホームページ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('正しく表示される', async ({ page }) => {
    // タイトルの確認
    await expect(page).toHaveTitle(/株価チェッカー/);

    // ヘッダーの確認
    await expect(page.getByText('株価チェッカー')).toBeVisible();

    // その他の要素の確認...
  });
});
```

### ベストプラクティス

1.  **ページオブジェクトモデルの使用**
    - ページやコンポーネントごとにクラスを作成し、要素のセレクターや操作をカプセル化する。

2.  **テストデータの分離**
    - テストで使用するデータ (ユーザー名、パスワードなど) は、テストコードから分離して管理する。

3.  **アサーションの明確化**
    - 何を検証しているのかが明確になるように、アサーションを記述する。

4.  **待機処理の適切な使用**
    - 明示的な待機 (`waitForTimeout`) よりも、要素が表示されるまで待つ (`toBeVisible`) などの条件待ちを優先する。

5.  **テストの独立性**
    - 一つのテストが他のテストに影響を与えないように、テストを独立させ、必要に応じて事前/事後処理を行う。