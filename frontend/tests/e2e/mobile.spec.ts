import { test, expect } from '@playwright/test';

test.describe('モバイルデバイス', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ホームページが正しく表示される', async ({ page }) => {
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
    await page.screenshot({ path: 'test-results/mobile-homepage.png' });
  });

  test('ハンバーガーメニューが正しく動作する', async ({ page }) => {
    // ハンバーガーメニューが表示されていることを確認
    await expect(page.getByRole('button', { name: 'メニューを開く' })).toBeVisible();

    // ハンバーガーメニューをクリック
    await page.getByRole('button', { name: 'メニューを開く' }).click();

    // メニューが開いたことを確認
    await expect(page.getByRole('navigation')).toBeVisible();

    // ウォッチリストリンクが表示されていることを確認
    await expect(page.getByRole('link', { name: 'ウォッチリスト' })).toBeVisible();

    // ウォッチリストリンクをクリック
    await page.getByRole('link', { name: 'ウォッチリスト' }).click();

    // ウォッチリストページに遷移したことを確認
    await expect(page).toHaveURL(/.*\/watchlist/);

    // ウォッチリストページの要素を確認
    await expect(page.getByText('ウォッチリスト')).toBeVisible();

    // 「アイテムを追加」ボタンが表示されていることを確認
    await expect(page.getByRole('button', { name: 'アイテムを追加' })).toBeVisible();
  });
});