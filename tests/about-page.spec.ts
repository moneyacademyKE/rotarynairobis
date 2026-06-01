import { test, expect } from '@playwright/test';

test.describe('RCNS About Page E2E Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the About page directly
    await page.goto('/about/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Page header should highlight the About pill as active', async ({ page }) => {
    const activePill = page.locator('.pill-btn.active');
    await expect(activePill).toContainText('About');
  });

  test('About page should render the main header, welcome message, and quote card', async ({ page }) => {
    const mainTitle = page.locator('.main-title');
    await expect(mainTitle).toContainText('Welcome to Rotary');

    const quoteAuthor = page.locator('.quote-author');
    await expect(quoteAuthor).toContainText('Kemal Attilâ');
  });

  test('Should render the Rotary Numbers section with cards', async ({ page }) => {
    const numCards = page.locator('.number-card');
    await expect(numCards).toHaveCount(7);

    const firstVal = await numCards.nth(0).locator('.num-value').innerText();
    expect(firstVal).toBe('1.2M');
  });

  test('Should render the Four-Way Test questions in correct order', async ({ page }) => {
    const questions = page.locator('.four-way-question');
    await expect(questions).toHaveCount(4);

    await expect(questions.nth(0)).toContainText('TRUTH');
    await expect(questions.nth(1)).toContainText('FAIR');
    await expect(questions.nth(2)).toContainText('GOODWILL');
    await expect(questions.nth(3)).toContainText('BENEFICIAL');
  });

  test('Should support interactive search inside the Rotary Glossary accordion', async ({ page }) => {
    const searchField = page.locator('.search-field');
    const glossaryCards = page.locator('.glossary-card');

    // 1. Initial state: verify terms are loaded (e.g. at least 10 items)
    const initialCount = await glossaryCards.count();
    expect(initialCount).toBeGreaterThan(10);

    // 2. Type "Interact" into search sequentially to allow lazy handler hydration
    await searchField.focus();
    await searchField.pressSequentially('Interact', { delay: 100 });

    // 3. Verify only relevant matches are visible (auto-polls for count 1)
    await expect(glossaryCards).toHaveCount(1);
    await expect(glossaryCards.first().locator('.glossary-term')).toContainText('Interact');

    // 4. Type a query that yields no results
    await searchField.fill('');
    await searchField.focus();
    await searchField.pressSequentially('NonExistentTermXYZ', { delay: 50 });

    // 5. Verify the empty state shows up (auto-polls)
    await expect(glossaryCards).toHaveCount(0);
    const emptyStateText = page.locator('.glossary-empty');
    await expect(emptyStateText).toBeVisible();
    await expect(emptyStateText).toContainText('No glossary terms match your search');

    // 6. Clear search
    await searchField.fill('');
    
    // 7. Verify all cards are visible again (auto-polls)
    await expect(glossaryCards).toHaveCount(initialCount);
  });

  test('Should render 7 Areas of Focus and support expandable insight drawers', async ({ page }) => {
    const focusCards = page.locator('.focus-card');
    await expect(focusCards).toHaveCount(7);

    // Verify Supporting the Environment is present
    const envCard = focusCards.filter({ hasText: 'Supporting the Environment' });
    await expect(envCard).toBeVisible();

    // Verify clicking a card opens the drawer
    const peaceCard = focusCards.filter({ hasText: 'Peace & Conflict Resolution' });
    const peaceHeader = peaceCard.locator('.focus-card-header');
    const peaceDrawer = peaceCard.locator('.focus-drawer');

    // Initially drawer should not be open
    await expect(peaceDrawer).not.toHaveClass(/focus-drawer--open/);

    // Click header to open
    await peaceHeader.click();
    await expect(peaceDrawer).toHaveClass(/focus-drawer--open/);
    await expect(peaceDrawer.locator('.drawer-overview')).toContainText('grassroots');

    // Click again to close
    await peaceHeader.click();
    await expect(peaceDrawer).not.toHaveClass(/focus-drawer--open/);
  });

  test('Should render Club Leadership & Committees section and support expandable insight drawers', async ({ page }) => {
    const committeeCards = page.locator('.committee-card');
    await expect(committeeCards).toHaveCount(7);

    // Verify Membership card is present
    const memberCard = committeeCards.filter({ hasText: 'Membership & Retention' });
    await expect(memberCard).toBeVisible();

    // Verify clicking a committee card opens the drawer
    const leadershipCard = committeeCards.filter({ hasText: 'Executive Board Leadership' });
    const leadershipHeader = leadershipCard.locator('.committee-card-header');
    const leadershipDrawer = leadershipCard.locator('.committee-drawer');

    // Initially drawer should not be open
    await expect(leadershipDrawer).not.toHaveClass(/committee-drawer--open/);

    // Click to open
    await leadershipHeader.click();
    await expect(leadershipDrawer).toHaveClass(/committee-drawer--open/);
    await expect(leadershipDrawer.locator('.drawer-overview')).toContainText('Executive leadership steers');
    await expect(leadershipDrawer.locator('.drawer-section--example')).toBeVisible();

    // Click again to close
    await leadershipHeader.click();
    await expect(leadershipDrawer).not.toHaveClass(/committee-drawer--open/);
  });

  test('Should render expandable Four-Way Test cards and support drawers', async ({ page }) => {
    const fourWayCards = page.locator('.four-way-card');
    await expect(fourWayCards).toHaveCount(4);

    const firstCard = fourWayCards.first();
    const firstHeader = firstCard.locator('.four-way-card-header');
    const firstDrawer = firstCard.locator('.four-way-drawer');

    // Initially closed
    await expect(firstDrawer).not.toHaveClass(/four-way-drawer--open/);

    // Open it
    await firstHeader.click();
    await expect(firstDrawer).toHaveClass(/four-way-drawer--open/);
    await expect(firstDrawer.locator('.drawer-overview')).toContainText('foundation of trust');

    // Close it
    await firstHeader.click();
    await expect(firstDrawer).not.toHaveClass(/four-way-drawer--open/);
  });

  test('Should support Avenues of Service tab switching and deep insights drawer', async ({ page }) => {
    const pills = page.locator('.avenue-pill');
    await expect(pills).toHaveCount(5);

    // Click community service pill
    const communityPill = pills.filter({ hasText: 'Community Service' });
    await communityPill.click();

    const detailContainer = page.locator('.avenue-active-details');
    await expect(detailContainer.locator('.avenue-details-title')).toContainText('Community Service');

    // Try opening deep insights drawer
    const detailsHeaderBtn = detailContainer.locator('.avenue-details-header-btn');
    const detailsDrawer = detailContainer.locator('.avenue-drawer');

    await expect(detailsDrawer).not.toHaveClass(/avenue-drawer--open/);

    // Open it
    await detailsHeaderBtn.click();
    await expect(detailsDrawer).toHaveClass(/avenue-drawer--open/);
    await expect(detailsDrawer.locator('.drawer-overview')).toContainText('quality of life');

    // Close it
    await detailsHeaderBtn.click();
    await expect(detailsDrawer).not.toHaveClass(/avenue-drawer--open/);
  });

  test('Should render District Transition section and support toggling details', async ({ page }) => {
    const transitionSection = page.locator('.transition-section');
    await expect(transitionSection).toBeVisible();
    await expect(transitionSection.locator('.section-title-centered')).toContainText('Historic District Reorganization');

    const transitionCard = page.locator('.transition-card');
    const toggleBtn = transitionCard.locator('.transition-header-btn');
    const transitionDrawer = transitionCard.locator('.transition-drawer');

    // Initially closed
    await expect(transitionDrawer).not.toHaveClass(/transition-drawer--open/);

    // Open it
    await toggleBtn.click();
    await expect(transitionDrawer).toHaveClass(/transition-drawer--open/);
    await expect(transitionDrawer.locator('.district-split-grid')).toBeVisible();
    await expect(transitionDrawer.locator('.drawer-section--highlight')).toContainText('District 9215');
    
    // Verify leadership photo is visible and styled properly
    const leadershipPhoto = transitionDrawer.locator('.transition-team-photo');
    await expect(leadershipPhoto).toBeVisible();
    await expect(leadershipPhoto).toHaveAttribute('src', '/images/district-9215-team.jpg');

    // Close it
    await toggleBtn.click();
    await expect(transitionDrawer).not.toHaveClass(/transition-drawer--open/);
  });
});
