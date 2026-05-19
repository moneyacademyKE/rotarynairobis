import { test, expect } from '@playwright/test';

test.describe('RCNS Website Factuality and Cleanliness Verification', () => {
  const pages = ['/twitter/', '/tiktok/', '/birthdays/', '/recaps/'];

  for (const pagePath of pages) {
    test(`Page "${pagePath}" should not contain removed brand text`, async ({ page }) => {
      await page.goto(pagePath);
      await page.waitForLoadState('domcontentloaded');

      const bodyText = await page.innerText('body');

      // Assertions for removed elements
      expect(bodyText).not.toContain('District 9212');
      expect(bodyText).not.toContain('Rotary Nairobi South');
      expect(bodyText).not.toContain('Edge-native showcase capturing fellowship');
    });
  }

  test('Home feed (/twitter/) should contain factual event text descriptions with no images', async ({ page }) => {
    await page.goto('/twitter/');
    await page.waitForLoadState('networkidle');

    // 1. Verify there are no <img> tags inside the event lists/cards
    const eventImages = page.locator('.main-content img');
    const imageCount = await eventImages.count();
    // Ignore global logo images or headers if any, but verify event cards don't have them
    const cardImages = page.locator('.event-card img, .post-card img');
    await expect(cardImages).toHaveCount(0);

    // 2. Extract all card text
    const cards = page.locator('.event-item-body');
    const cardTexts: string[] = [];
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const txt = await cards.nth(i).innerText();
      cardTexts.push(txt);
    }

    console.log(`Found ${count} event cards to check:`, cardTexts);

    // 3. Verify all card texts are formatted using the fluid templates
    for (const txt of cardTexts) {
      // Ensure fluid format structure starting with 'The Rotary Club of'
      expect(txt).toMatch(/^The Rotary Club of/i);

      // Ensure day of week prefix exists in the date segment (e.g. Monday, Tuesday...)
      expect(txt).toMatch(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
    }
  });
});
