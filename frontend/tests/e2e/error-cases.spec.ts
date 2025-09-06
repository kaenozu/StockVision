import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';

test.describe('エラーケース', () => {
  const INVALID_STOCK_CODE = '99999';

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
  });

  test('無効な銘柄コードを入力した場合にエラーメッセージが表示される', async ({ page }) => {
    const homePage = new HomePage(page);

    // 無効な銘柄コードを入力
    await homePage.searchForStock(INVALID_STOCK_CODE);

    // エラーメッセージが表示されることを確認
    await expect(page.getByText('銘柄が見つかりません')).toBeVisible();
  });

  test('空の銘柄コードを入力した場合にエラーメッセージが表示される', async ({ page }) => {
    const homePage = new HomePage(page);

    // 空の銘柄コードを入力
    await homePage.searchForStock('');

    // エラーメッセージが表示されることを確認
    await expect(page.getByText('銘柄コードを入力してください')).toBeVisible();
  });
});