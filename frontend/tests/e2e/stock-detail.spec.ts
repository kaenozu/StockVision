import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { StockDetailPage } from './pages/StockDetailPage';

test.describe('株式詳細ページ', () => {
  const TEST_STOCK_CODE = '7203';
  const TEST_COMPANY_NAME = 'トヨタ自動車';

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.searchForStock(TEST_STOCK_CODE);
  });

  test('正しく表示される', async ({ page }) => {
    const stockDetailPage = new StockDetailPage(page, TEST_STOCK_CODE);

    // 銘柄コードが表示されていることを確認
    await expect(stockDetailPage.stockCode).toBeVisible();

    // 会社名が表示されていることを確認
    await expect(stockDetailPage.companyName).toBeVisible();

    // 現在価格が表示されていることを確認
    await expect(stockDetailPage.currentPrice).toBeVisible();

    // 前日比が表示されていることを確認
    await expect(stockDetailPage.priceChange).toBeVisible();

    // チャートが表示されていることを確認
    await expect(page.getByRole('img', { name: 'チャート' })).toBeVisible();
  });

  test('ウォッチリストに追加できる', async ({ page }) => {
    // 「ウォッチリストに追加」ボタンをクリック
    await page.getByRole('button', { name: 'ウォッチリストに追加' }).click();

    // 成功メッセージが表示されることを確認
    await expect(page.getByText('ウォッチリストに追加しました')).toBeVisible();
  });
});