import { test, expect } from '@playwright/test';

/** Public routes: should render without uncaught JS errors (SPA → index.html). */
const ROUTES = [
  '/',
  '/about',
  '/podcast',
  '/shop',
  '/contact',
  '/donation',
  '/terms',
  '/privacy',
  '/curiosidades',
  '/signin',
  '/signup',
  '/forgot-password',
  '/cart',
];

for (const path of ROUTES) {
  test(`smoke: ${path} loads`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), `HTTP for ${path}`).toBeTruthy();

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();

    expect(errors, `pageerror on ${path}: ${errors.join(' | ')}`).toEqual([]);
  });
}
