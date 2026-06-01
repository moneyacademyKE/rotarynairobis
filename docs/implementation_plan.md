# Implementation Plan - About Page Interactive Upgrades & District 9215 Team Photo styling

This plan details the design and implementation for styling the leadership photo within the **District Transition** section of the About page, assigning the Rotary Club of Nairobi South (RCNS) correctly to **District 9215** (which is effective July 1, 2026), and correcting all tests.

---

## Rich Hickey Gap Analysis

### 1. Feature Set Difference

| Feature | Current State | Target State | Gap / Difference |
| :--- | :--- | :--- | :--- |
| **District Transition Photo styling** | Markup for showing the photo exists, but CSS classes `.transition-photo-wrapper` and `.transition-team-photo` are unstyled | Sleek, modern, layout-shift-free transition photo layout with rounded corners, subtle shadow, and responsive containment | Missing CSS rules inside the `STYLES` constant in `src/routes/about/index.tsx`. |
| **RCNS District Assignment Verification** | Unit tests and E2E tests expect `District 9216` for RCNS assignment | Unit tests and E2E tests expect `District 9215` for RCNS assignment, aligning with the user request | Tests mismatch the updated rotary-basics.json database ledger. |

### 2. Feature Explanation

*   **Responsive Layout-Shift-Free Team Photo:** Add styles utilizing modern CSS features like `aspect-ratio` to allocate space before the photo load to prevent Cumulative Layout Shift (CLS). Include subtle transitions, smooth borders, and container queries or clean responsive layouts.
*   **TDD Test Synchronization:** Fix the failing test assertions in `about.test.ts` and `about-page.spec.ts` to expect "District 9215" instead of "District 9216" for the RCNS assignment.

### 3. Benefits & Trade-offs

*   **Benefits:**
    *   *High Performance UX:* Prevent layout shift during lazy load of the 414KB leadership picture.
    *   *Accurate Documentation:* Represents the actual geographic and administrative division.
    *   *Passing Test Coverage:* Align tests with the data model.
*   **Trade-offs:**
    *   *None.* Aligning the tests to the correct district assignment fixes a known test failure.

### 4. Complexity vs. Utility Analysis

| Feature Component | Complexity | Utility | Recommendation |
| :--- | :--- | :--- | :--- |
| **Transition photo wrapper styles** | Low | High | Implement: Essential to make the picture look premium. |
| **Test alignment to District 9215** | Low | High | Implement: Fixes test suite regression and maintains accurate requirements. |

---

## User Review Required

> [!IMPORTANT]
> The team photo is sourced from `/images/district-9215-team.jpg` and will be lazily loaded to preserve bandwith on mobile devices.
>
> Rotary Club of Nairobi South is assigned to **District 9215** instead of District 9216 based on the redistricting details, and the test suite has been updated to reflect this.

---

## Proposed Changes

### UI & Styling

#### [MODIFY] [index.tsx (about)](file:///Users/moe/Desktop/rcns/src/routes/about/index.tsx)
*   Add styles for `.transition-photo-section`, `.transition-photo-wrapper`, and `.transition-team-photo`.
*   Ensure the wrapper uses a glassmorphic border, high-quality border-radius (e.g. `12px`), and max-width.
*   Ensure the image uses `aspect-ratio` to eliminate CLS and `object-fit: cover` with proper responsive sizing.

### Testing & Verification

#### [MODIFY] [about.test.ts](file:///Users/moe/Desktop/rcns/src/routes/about/about.test.ts)
*   Update line 49 assertion to expect "District 9215".

#### [MODIFY] [about-page.spec.ts](file:///Users/moe/Desktop/rcns/tests/about-page.spec.ts)
*   Update line 192 assertion to expect "District 9215".

---

## Verification Plan

### Automated Tests
*   Run Vitest: `bun run test` (Ensuring all unit tests pass)
*   Verify type safety: `bun run build.types`
*   Verify Playwright tests pass: `npx playwright test tests/about-page.spec.ts`

### Manual Verification
*   Run dev server: `bun run dev`
*   Inspect the About page district transition section drawer, expand it, and verify the leadership photo is styled beautifully with responsive width.
