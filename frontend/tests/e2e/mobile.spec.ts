import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { WatchlistPage } from './pages/WatchlistPage';

test.describe('モバイルデバイス', () => {
  test('ホームページが正しく表示される', async ({ page }) => {
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
    await page.screenshot({ path: 'test-results/mobile-homepage.png' });
  });

  test('ハンバーガーメニューが正しく動作する', async ({ page }) => {
    const homePage = new HomePage(page);
    const watchlistPage = new WatchlistPage(page);
    await homePage.goto();

    // ハンバーガーメニューが表示されていることを確認
    await expect(homePage.hamburgerMenuButton).toBeVisible();

    // ハンバーガーメニューをクリック
    await homePage.openHamburgerMenu();

    // メニューが開いたことを確認
    await expect(page.getByRole('navigation')).toBeVisible();

    // ウォッチリストリンクが表示されていることを確認
    await expect(homePage.watchlistLink).toBeVisible();

    // ウォッチリストリンクをクリック
    await homePage.navigateToWatchlist();

    // ウォッチリストページに遷移したことを確認
    await expect(page).toHaveURL(/.*\/watchlist/);

    // ウォッチリストページの要素を確認
    await expect(watchlistPage.watchlistTitle).toBeVisible();

    // 「アイテムを追加」ボタンが表示されていることを確認
    await expect(watchlistPage.addItemButton).toBeVisible();
  });
});