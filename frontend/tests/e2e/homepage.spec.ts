import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { StockDetailPage } from './pages/StockDetailPage';
import { WatchlistPage } from './pages/WatchlistPage';

test.describe('ホームページ', () => {
  const TEST_STOCK_CODE = '7203';
  const TEST_COMPANY_NAME = 'トヨタ自動車';

  test('正しく表示される', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // タイトルの確認
    await expect(page).toHaveTitle(/株価チェッカー/);

    // ヘッダーの確認
    await expect(page.getByText('株価チェッカー')).toBeVisible();

    // 検索フォームの確認
    await expect(homePage.searchInput).toBeVisible();

    // 人気銘柄セクションの確認
    await expect(homePage.popularStocksSection).toBeVisible();

    // フッターの確認
    await expect(page.getByText('© 2023 株価チェッカー')).toBeVisible();

    // スクリーンショットを取得
    await page.screenshot({ path: 'test-results/homepage.png' });
  });

  test('銘柄検索機能', async ({ page }) => {
    const homePage = new HomePage(page);
    const stockDetailPage = new StockDetailPage(page, TEST_STOCK_CODE);
    await homePage.goto();

    // 銘柄コードを入力
    await homePage.searchForStock(TEST_STOCK_CODE);

    // 株式詳細ページに遷移したことを確認
    await expect(page).toHaveURL(new RegExp(`.*/stock/${TEST_STOCK_CODE}`));

    // 銘柄情報が表示されていることを確認
    await expect(stockDetailPage.stockCode).toBeVisible();
    await expect(stockDetailPage.companyName).toBeVisible();

    // 価格情報が表示されていることを確認
    await expect(stockDetailPage.currentPrice).toBeVisible();
    await expect(stockDetailPage.priceChange).toBeVisible();
  });

  test('ウォッチリストページへのナビゲーション', async ({ page }) => {
    const homePage = new HomePage(page);
    const watchlistPage = new WatchlistPage(page);
    await homePage.goto();

    // ナビゲーションバーからウォッチリストページへ
    await homePage.navigateToWatchlist();

    // ウォッチリストページに遷移したことを確認
    await expect(page).toHaveURL(/.*\/watchlist/);

    // ウォッチリストページの要素を確認
    await expect(watchlistPage.watchlistTitle).toBeVisible();

    // 「アイテムを追加」ボタンが表示されていることを確認
    await expect(watchlistPage.addItemButton).toBeVisible();
  });
});