import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly popularStocksSection: Locator;
  readonly watchlistLink: Locator;
  readonly hamburgerMenuButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder('銘柄コードを入力');
    this.searchButton = page.getByRole('button', { name: '株価を取得' });
    this.popularStocksSection = page.getByText('人気銘柄');
    this.watchlistLink = page.getByRole('link', { name: 'ウォッチリスト' });
    this.hamburgerMenuButton = page.getByRole('button', { name: 'メニューを開く' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async searchForStock(stockCode: string) {
    await this.searchInput.fill(stockCode);
    await this.searchButton.click();
  }

  async navigateToWatchlist() {
    await this.watchlistLink.click();
  }

  async openHamburgerMenu() {
    await this.hamburgerMenuButton.click();
  }
}