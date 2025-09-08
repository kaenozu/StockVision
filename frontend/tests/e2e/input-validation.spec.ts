import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';

test.describe('入力値の検証', () => {
  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
  });

  test('4桁以外の数字を入力した場合にエラーメッセージが表示される', async ({ page }) => {
    const homePage = new HomePage(page);

    // 3桁の数字を入力
    await homePage.searchForStock('123');

    // エラーメッセージが表示されることを確認
    await expect(page.getByText('4桁の数字を入力してください')).toBeVisible();

    // 5桁の数字を入力
    await homePage.searchForStock('12345');

    // エラーメッセージが表示されることを確認
    await expect(page.getByText('4桁の数字を入力してください')).toBeVisible();
  });

  test('数字以外の文字を入力した場合にエラーメッセージが表示される', async ({ page }) => {
    const homePage = new HomePage(page);

    // 英字を入力
    await homePage.searchForStock('abcd');

    // エラーメッセージが表示されることを確認
    await expect(page.getByText('数字を入力してください')).toBeVisible();

    // 記号を入力
    await homePage.searchForStock('12-4');

    // エラーメッセージが表示されることを確認
    await expect(page.getByText('数字を入力してください')).toBeVisible();
  });
});