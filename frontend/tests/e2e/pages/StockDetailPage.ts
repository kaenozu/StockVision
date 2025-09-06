import { Page, Locator } from '@playwright/test';

export class StockDetailPage {
  readonly page: Page;
  readonly stockCode: Locator;
  readonly companyName: Locator;
  readonly currentPrice: Locator;
  readonly priceChange: Locator;

  constructor(page: Page, stockCode: string) {
    this.page = page;
    this.stockCode = page.getByText(stockCode);
    this.companyName = page.getByText('トヨタ自動車'); // 例として固定
    this.currentPrice = page.getByText('現在価格');
    this.priceChange = page.getByText('前日比');
  }

  async goto(stockCode: string) {
    await this.page.goto(`/stock/${stockCode}`);
  }
}