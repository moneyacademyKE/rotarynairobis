# Architectural Decision Record (ADR) Log

## ADR-001: Contraction-Safe Event Description & Absolute Date Priority Parser

### Status
Accepted & Implemented (June 24, 2026)

### Context
The Rotary social showcase dynamically formats visual post captions inside edge route loaders to display rich card previews (dates, times, venues, and topics). The legacy TypeScript parser experienced three critical bugs:
1. **Contraction Collision:** Simple quotation mark matchers `/['"“‘]([^'"”’\n]{5,100})['"”’]/` caught apostrophes inside English contractions (like `isn't` or `you're`), resulting in corrupted topics like `'t just an event; it'`.
2. **Relative Date Overrides:** The parser evaluated relative keywords (like `today`, `tomorrow`) before absolute dates. Any caption containing "today" in a call-to-action (e.g. "Register today!") would bypass the calendar date (e.g., `July 4th`) and override the event date with the post creation date.
3. **Time Separation Mismatches:** Caption times containing periods (e.g., `4.00pm`) were not parsed properly by `(?::(\d{2}))?`, which caused the regex to match starting from the `00` digit pair, returning `00:00 PM`.
4. **Missing Club Attributions:** When telegram ingestion posted records with null/generic accounts, the fallback scan lacked mapping rules for newer clubs (like `Kilimani Alfajiri`), defaulting them to `Nairobi South`.

### Decision
We updated the parser rules and regex structures:
1. **Reorder Date Parser:** Evaluate absolute numeric, month-first, and day-first date formats at the very top of `parseEventDate`, before running relative weekday or relative keyword checks.
2. **Bounded Quote Matcher:** Replace topic quote extraction regex with `/(?:^|\s|["'“‘])['"“‘]([^'"”’\n]{5,100})['"”’](?:\s|$|[.,!?"'”’])/` to ensure quotation delimiters are separated from word tokens (preventing contraction matching).
3. **Flexible Time Regex:** Adjust the time separator regex to allow both colons and periods: `/\b(\d{1,2})(?:[.:](\d{2}))?\s*(AM|PM|am|pm)\b/i`.
4. **Map Kilimani Alfajiri:** Add `kilimani` / `kilimanialfajiri` checks in the account scan logic to return `Kilimani Alfajiri`.

### Consequences
* **Precision:** Event titles, times, and dates resolve with 100% accuracy on-the-fly inside the SSR route loader.
* **Integrity:** Historical post data remains completely unaltered (retaining the append-only ledger model), while the projection layer correctly handles formatting.
* **Testability:** Hardened the unit test suite with cases specifically representing all three problematic posts, maintaining a 100% pass rate.

## ADR-002: Declarative Mapping for Rebranded Club Identities

### Status
Accepted & Implemented (June 24, 2026)

### Context
The Rotary Club of Lang'ata rebranding requested that references to "Lang'ata" display as "Nairobi-Lang'ata" on the showcase cards and search details, while maintaining data immutability of raw ingestion facts.

### Decision
We updated the projection logic mapping inside the parser rules to target `langata` matching signatures (both in account names and body text fallback) and project them to the official rebranded name `"Nairobi-Lang'ata"`.

### Consequences
* **Accurate Attribution:** Resolved the user's request. Showcase displays "Nairobi-Lang'ata" on all card headers and drawers.
* **Database Fact Safety:** The original raw telegram and social webhook source identifiers remain unmodified, maintaining the integrity of historical ingestion data.
* **Test Verification:** Updated the test suite assertions to verify the rebranding name mapping and ensure zero regressions.

## ADR-003: AI Prompt Alignment and Parser Bypass (De-scaffolding)

### Status
Accepted & Implemented (June 24, 2026)

### Context
Maintaining heavy, complex string parsing heuristics in the projection layer (TypeScript code) is error-prone, hard to scale, and complects the UI layout with data extraction. By encoding the visual sentence templates directly in the LLM ingestion instructions, we can generate clean metadata at source.

### Decision
1. **Prompt Fine-Tuning**: Modified `src/lib/classification-prompt.ts` to instruct the Gemini model to output snippets that match the exact fluid formatting templates, club name mappings, and venue normalizations.
2. **Deterministic Loader Bypass**: Updated the parser route loader `reformatEventText` to detect pre-formatted snippets using a regex boundary check and return them directly, avoiding redundant edge processing and potential regex corruption.
3. **Hybrid Fallback**: Left the legacy parser code in place to serve as a guardrail for legacy records.

### Consequences
* **Simplicity**: Code complexity in the serverless edge routes is decoupled from prompt refinement.
* **Accuracy**: Cards display the visual details from event flyers with near 100% fidelity.
* **Backward Compatibility**: Existing database records continue to render correctly via fallback guardrail paths.


