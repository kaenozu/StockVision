import { Page, Locator } from '@playwright/test';

export class WatchlistPage {
  readonly page: Page;
  readonly watchlistTitle: Locator;
  readonly addItemButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.watchlistTitle = page.getByText('ウォッチリスト');
    this.addItemButton = page.getByRole('button', { name: 'アイテムを追加' });
  }

  async goto() {
    await this.page.goto('/watchlist');
  }
}