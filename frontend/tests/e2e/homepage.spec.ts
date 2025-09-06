import { test, expect } from '@playwright/test';

test.describe('ホームページ', () => {
  const TEST_STOCK_CODE = '7203';
  const TEST_COMPANY_NAME = 'トヨタ自動車';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('正しく表示される', async ({ page }) => {
    // タイトルの確認
    await expect(page).toHaveTitle(/株価チェッカー/);

    // ヘッダーの確認
    await expect(page.getByText('株価チェッカー')).toBeVisible();

    // 検索フォームの確認
    await expect(page.getByPlaceholder('銘柄コードを入力')).toBeVisible();

    // 人気銘柄セクションの確認
    await expect(page.getByText('人気銘柄')).toBeVisible();

    // フッターの確認
    await expect(page.getByText('© 2023 株価チェッカー')).toBeVisible();

    // スクリーンショットを取得
    await page.screenshot({ path: 'test-results/homepage.png' });
  });

  test('銘柄検索機能', async ({ page }) => {
    // 銘柄コードを入力
    await page.getByPlaceholder('銘柄コードを入力').fill(TEST_STOCK_CODE);

    // 検索ボタンをクリック
    await page.getByRole('button', { name: '株価を取得' }).click();

    // 株式詳細ページに遷移したことを確認
    await expect(page).toHaveURL(new RegExp(`.*/stock/${TEST_STOCK_CODE}`));

    // 銘柄情報が表示されていることを確認
    await expect(page.getByText(TEST_STOCK_CODE)).toBeVisible();
    await expect(page.getByText(TEST_COMPANY_NAME)).toBeVisible();

    // 価格情報が表示されていることを確認
    await expect(page.getByText('現在価格')).toBeVisible();
    await expect(page.getByText('前日比')).toBeVisible();
  });

  test('ウォッチリストページへのナビゲーション', async ({ page }) => {
    // ナビゲーションバーからウォッチリストページへ
    await page.getByRole('link', { name: 'ウォッチリスト' }).click();

    // ウォッチリストページに遷移したことを確認
    await expect(page).toHaveURL(/.*\/watchlist/);

    // ウォッチリストページの要素を確認
    await expect(page.getByText('ウォッチリスト')).toBeVisible();

    // 「アイテムを追加」ボタンが表示されていることを確認
    await expect(page.getByRole('button', { name: 'アイテムを追加' })).toBeVisible();
  });
});