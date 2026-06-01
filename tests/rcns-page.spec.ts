import { test, expect } from '@playwright/test';

test.describe('RCNS Club Profile Page E2E Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the RCNS page directly
    await page.goto('/rcns/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Page header should highlight the RCNS pill as active', async ({ page }) => {
    const activePill = page.locator('.pill-btn.active');
    await expect(activePill).toContainText('RCNS');
  });

  test('Should render the main header and charter badge', async ({ page }) => {
    const mainTitle = page.locator('.main-title');
    await expect(mainTitle).toContainText('Rotary Club of Nairobi South');

    const charterBadge = page.locator('.charter-badge');
    await expect(charterBadge).toContainText('Chartered 1963');
  });

  test('Should render the history milestone details', async ({ page }) => {
    const historyCards = page.locator('.history-card');
    await expect(historyCards).toHaveCount(3);
    await expect(historyCards.first().locator('.card-title')).toContainText('Founding');
  });

  test('Should render the awards list cards', async ({ page }) => {
    const awardCards = page.locator('.award-card');
    await expect(awardCards).toHaveCount(4);
    await expect(awardCards.first().locator('.award-badge-year')).toContainText('2016/2017');
  });

  test('Should render youth programs info cards', async ({ page }) => {
    const mentorshipCards = page.locator('.mentorship-card');
    await expect(mentorshipCards).toHaveCount(2);
    await expect(mentorshipCards.first().locator('.mentorship-card-title')).toContainText('Rotaract');
  });

  test('Should support interactive search inside the Club Members roster', async ({ page }) => {
    const searchField = page.locator('.search-field');
    const memberCards = page.locator('.member-card');

    // 1. Initial state: verify all 15 members are loaded
    const initialCount = await memberCards.count();
    expect(initialCount).toBe(15);

    // 2. Search for "Insight" sequentially to hydrate handler
    await searchField.focus();
    await searchField.pressSequentially('Insight', { delay: 100 });

    // 3. Verify it filters to President card
    await expect(memberCards).toHaveCount(1);
    await expect(memberCards.first().locator('.member-name')).toContainText("Insight King'ori");

    // 4. Type a query that yields no results
    await searchField.fill('');
    await searchField.focus();
    await searchField.pressSequentially('NonExistentRtnXYZ', { delay: 50 });

    // 5. Verify the empty state shows up
    await expect(memberCards).toHaveCount(0);
    const emptyStateText = page.locator('.roster-empty');
    await expect(emptyStateText).toBeVisible();
    await expect(emptyStateText).toContainText('No club members match your search criteria');

    // 6. Clear search
    await searchField.fill('');

    // 7. Verify all 15 member cards are visible again
    await expect(memberCards).toHaveCount(initialCount);
  });
});
