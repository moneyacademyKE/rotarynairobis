# Image Processing & Event Description Generation Accuracy Plan

Resolve issues with incorrect time parsing (e.g., `00:00 PM` instead of `4:00 PM`), false-positive topic extraction from word contractions (e.g., `'t just an event; it'`), and missing club attribution (e.g., defaulting to `"Nairobi South"` instead of `"Kilimani Alfajiri"`).

## Rich Hickey Gap Analysis

To achieve maximum simplicity and factual purity, we analyze the options for extracting structured metadata from social media post facts.

### 1. Feature Set Comparison

| Feature | Current Fragile Parser (Regex) | Refined Robust Parser | Model-Only (`m.snippet`) | Combined Pipeline (Recommended) |
| :--- | :--- | :--- | :--- | :--- |
| **Time Format Normalization** | Fails on `4.00pm` (gives `00:00 PM`) | Extracts `4.00pm` as `4:00 PM` | Extracts `4:00 PM` (accurate) | **Refined Regex + Model validation** |
| **Topic Extract from Quotes** | Greedily matches apostrophes (`isn't` -> `'t...it'`) | Requires quote to be bounded by space/boundary | N/A (uses visual layout) | **Bounded Regex + Model snippet fallback** |
| **Club Name Resolution** | Missing Kilimani, Lang'ata fallback bugs | Full lookup mapping (incl. Kilimani Alfajiri) | Extracts from logo/visual text | **Comprehensive mapping + Model fallback** |
| **Reference Anchor (Dates)** | Overridden by CTAs ("today") | Reordered: absolute dates match first | Infers from visual countdown only | **Reordered parser (absolute first) + Model fallback** |

### 2. Complexity vs. Utility

| Strategy | Complexity | Utility | Trade-offs / Risks |
| :--- | :--- | :--- | :--- |
| **Model-Only (`m.snippet`)** | Low (de-complects parsing logic) | High (very accurate visual check) | Fails on posters that have countdowns like "17 days to go" without absolute calendar dates. |
| **Refined Parser-Only** | Medium (requires deterministic regex) | High (deterministic for written text) | Highly dependent on clean text caption syntax. |
| **Combined Pipeline (Recommended)** | Medium-High (unifies text + visual facts) | **Maximum** (highest accuracy & resilience) | Must specify clean precedence rules: use refined caption parser if clean event fields are found; fallback to `m.snippet` if parsing is ambiguous. |

### 3. Actionable Recommendation

We recommend the **Combined Pipeline** with **Refined Parser rules**:
1. **Reorder Date Parsing:** Parse absolute calendar dates (`July 4th`) before relative keywords (`today`) to stop CTA words from overriding real event dates.
2. **Constrain Quote Matching:** Modify the topic extraction regex to require the quote mark to be preceded by a space/boundary and not sandwiched by word characters (e.g., `n't`, `re'd`).
3. **Enhance Club Attribution:** Add Kilimani Alfajiri and other missing clubs to the fallback scan mapping.
4. **Fix Time Regex:** Expand the time regex to match periods as separators (e.g., `4.00pm` -> `4:00 PM`).

---

## Proposed Changes

We will modify the core parsing utility library and verify it against our test suite.

### Core Utilities

#### [MODIFY] [twitter-parser.ts](file:///Users/moe/Desktop/rcns/src/lib/twitter-parser.ts)

*   **Time Regex update:** Replace `/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)\b/i` with `/\b(\d{1,2})(?:[.:](\d{2}))?\s*(AM|PM|am|pm)\b/i`.
*   **Topic Quotes Regex update:** Replace `/['"“‘]([^'"”’\n]{5,100})['"”’]/` with `/(?:^|\s|["'“‘])['"“‘]([^'"”’\n]{5,100})['"”’](?:\s|$|[.,!?"'”’])/` or a non-greedy word boundary contraction check.
*   **Date Parser reordering:** Move numeric, month-first, and day-first absolute regex parsers above relative weekdays and relative keyword checks.
*   **Club Fallbacks:** Add `kilimani` / `kilimanialfajiri` mapping to return `Kilimani Alfajiri`.

## Verification Plan

### Automated Tests
*   Run the parser test suite to verify no regressions and add new cases representing the problematic files:
    `bun test src/routes/twitter/twitter-parser.test.ts`

### Manual Verification
*   Execute a dry run of the test cases using a scratch script on the database/post text.
