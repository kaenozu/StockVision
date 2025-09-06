import { test, expect } from '@playwright/test';

test('ホームページが正しく表示される', async ({ page }) => {
  await page.goto('/');

  // タイトルの確認
  await expect(page).toHaveTitle(/株価チェッカー/);

  // ヘッダーの確認
  await expect(page.getByText('株価チェッカー')).toBeVisible();

  // 検索フォームの確認
  await expect(page.getByPlaceholder('銘柄コードを入力')).toBeVisible();

  // 人気銘柄セクションの確認
  await expect(page.getByText('人気銘柄')).toBeVisible();
});

test('銘柄検索機能', async ({ page }) => {
  await page.goto('/');

  // 銘柄コードを入力
  await page.getByPlaceholder('銘柄コードを入力').fill('7203');

  // 検索ボタンをクリック
  await page.getByRole('button', { name: '株価を取得' }).click();

  // 株式詳細ページに遷移したことを確認
  await expect(page).toHaveURL(/.*\/stock\/7203/);

  // 銘柄情報が表示されていることを確認
  await expect(page.getByText('7203')).toBeVisible();
  await expect(page.getByText('トヨタ自動車')).toBeVisible();
});

test('ウォッチリストページへのナビゲーション', async ({ page }) => {
  await page.goto('/');

  // ナビゲーションバーからウォッチリストページへ
  await page.getByRole('link', { name: 'ウォッチリスト' }).click();

  // ウォッチリストページに遷移したことを確認
  await expect(page).toHaveURL(/.*\/watchlist/);

  // ウォッチリストページの要素を確認
  await expect(page.getByText('ウォッチリスト')).toBeVisible();
});