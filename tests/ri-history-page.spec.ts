import { test, expect } from '@playwright/test';

test.describe('RI History Page E2E Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the RI History page directly
    await page.goto('/ri-history/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Page header should highlight the RI History pill as active', async ({ page }) => {
    const activePill = page.locator('.pill-btn.active');
    await expect(activePill).toContainText('RI History');
  });

  test('Should render the main header and subtitle', async ({ page }) => {
    const mainTitle = page.locator('.main-title');
    await expect(mainTitle).toContainText('Rotary International History');
  });

  test('Should render both motto cards', async ({ page }) => {
    const mottoCards = page.locator('.motto-card');
    await expect(mottoCards).toHaveCount(2);

    await expect(mottoCards.nth(0)).toContainText('Service Above Self');
    await expect(mottoCards.nth(1)).toContainText('He Profits Most Who Serves Best');
  });

  test('Should render the 5 stages of the Four-Way Test timeline', async ({ page }) => {
    const timelineItems = page.locator('.timeline-item');
    await expect(timelineItems).toHaveCount(5);

    await expect(timelineItems.nth(0).locator('.timeline-stage-title')).toContainText('1932: The Bankruptcy Challenge');
    await expect(timelineItems.nth(4).locator('.timeline-stage-title')).toContainText('Applying the Philosophy & Success');
  });

  test('Should render the bell history cards', async ({ page }) => {
    const bellCards = page.locator('.bell-story-card');
    await expect(bellCards).toHaveCount(3);
    await expect(bellCards.first().locator('.bell-card-title')).toContainText('Attendance Contest');
  });

  test('Should load all three page images successfully with non-zero dimensions', async ({ page }) => {
    // 1. Service Above Self Logo Image
    const logoImg = page.locator('.motto-logo-img');
    await expect(logoImg).toBeVisible();
    const logoWidth = await logoImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(logoWidth).toBeGreaterThan(0);

    // 2. Object of Rotary / Four-Way Test Banners Sidebar Image
    const bannersImg = page.locator('.banners-sidebar-img');
    await expect(bannersImg).toBeVisible();
    const bannersWidth = await bannersImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(bannersWidth).toBeGreaterThan(0);

    // 3. Bell & Gavel Large Image
    const bellImg = page.locator('.bell-large-img');
    await expect(bellImg).toBeVisible();
    const bellWidth = await bellImg.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(bellWidth).toBeGreaterThan(0);
  });
});
