import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { WatchlistPage } from './pages/WatchlistPage';

test.describe('ウォッチリスト', () => {
  const TEST_STOCK_CODE = '7203';
  const TEST_COMPANY_NAME = 'トヨタ自動車';

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.navigateToWatchlist();
  });

  test('アイテムを追加できる', async ({ page }) => {
    const watchlistPage = new WatchlistPage(page);
    
    // 「アイテムを追加」ボタンをクリック
    await watchlistPage.addItemButton.click();

    // モーダルが表示されることを確認
    await expect(page.getByText('ウォッチリストに追加')).toBeVisible();

    // 銘柄コードを入力
    await page.getByPlaceholder('銘柄コード').fill(TEST_STOCK_CODE);

    // 「追加」ボタンをクリック
    await page.getByRole('button', { name: '追加' }).click();

    // アイテムが追加されたことを確認
    await expect(page.getByText(TEST_COMPANY_NAME)).toBeVisible();
  });

  test('アイテムを削除できる', async ({ page }) => {
    const watchlistPage = new WatchlistPage(page);
    
    // 事前にアイテムを追加
    await watchlistPage.addItemButton.click();
    await page.getByPlaceholder('銘柄コード').fill(TEST_STOCK_CODE);
    await page.getByRole('button', { name: '追加' }).click();
    await expect(page.getByText(TEST_COMPANY_NAME)).toBeVisible();

    // 削除ボタンをクリック
    await page.getByRole('button', { name: '削除' }).first().click();

    // 確認ダイアログで「削除」をクリック
    await page.getByRole('button', { name: '削除' }).click();

    // アイテムが削除されたことを確認
    await expect(page.getByText(TEST_COMPANY_NAME)).not.toBeVisible();
  });
});