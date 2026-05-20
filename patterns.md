# Patterns: Social Showcase

## Pattern: The Multi-Projector Pattern
**Problem**: How to display the same data through multiple, visually distinct platform identities without duplicating business logic or inflating bundle size.

**Solution**:
1.  **Unified Data Model**: Generate a flat, platform-agnostic `Post` interface during the ETL phase.
2.  **Theme-Scoped Tokens**: Use a single set of CSS variables (`--bg`, `--accent`) that are redefined within `[data-theme]` blocks.
3.  **Platform Route Layout**: Use the URL path (`/twitter`, `/instagram`) to drive the `data-theme` attribute at the root level.
4.  **Adaptive Componentry**: Components like `PostCard` check the current platform context and swap their DOM structure (e.g., Grid Item vs Feed Card).
5.  **Sidecar Metadata (The Manifest Pattern)**: Pre-processing heavy analysis (like OCR) into a static JSON sidecar allows the main application to remain "simple" and "fast" while gaining "smart" features.

**Benefits**:
- **Simplicity**: Logic for "what is a post?" is defined once.
- **Performance**: Zero-runtime switching cost.
- **Rich Hickey Quality**: De-complects the *identity* of the platform from the *data* of the message.

## Pattern: The Digital Auditor (Vision Bridge)
**Problem**: Semantic heuristics (Keywords/OCR) are inherently probabilistic, causing content "leaks" (e.g., event recaps showing up in event posters).

**Solution**:
1.  **High-Fidelity Observation**: Use Vision AI (`gemini-3.1-flash-lite`) to observe every asset as a direct auditor.
2.  **Categorical Truth**: Replace probabilistic heuristics with a definitive `type` field (EVENT_POSTER, BIRTHDAY, PHOTO).
3.  **Relational Projection**: Store these observations in a SQL table (`media`) separate from the original `posts`, allowing for pure joins based on verified facts.

## Pattern: The Edge-Ready Schema
**Problem**: How to scale a media-heavy application to production without incurring massive egress or compute costs.

**Solution**:
1.  **De-complected Storage**: Store the *Manifest* (Facts about media) in D1 SQL and the *Cache* (Computed views/searches) in KV.
2.  **Normalized Joins**: Use SQL to perform the heavy lifting of semantic filtering (e.g., `WHERE m.type = 'PHOTO'`) before the Qwik route loader even starts rendering.
3.  **Composable Deployment**: Use `wrangler` to synchronize the local ETL "Source of Truth" with the edge "Production state" via SQL seed generation.

## Pattern: The Lean Deploy (R2 Media Decoupling)
**Problem**: Pages deploys stall when `dist/` contains hundreds of media files (photos) that were originally bundled for local-first development but now live in R2.

**Solution**:
1.  **Immutable R2 Source**: All media assets are stored once in R2. The application references them via URL, not filesystem path.
2.  **Image Transforms at Edge**: Cloudflare Image Transforms handle on-the-fly resizing/optimization from the single R2 bucket — no build-time processing.
3.  **Stripped Deploy Artifact**: Remove `dist/photos/` (or equivalent) before `wrangler pages deploy`. The deploy should contain only: build JS chunks, manifest, favicon, robots.txt.
4.  **Smart Placement**: Pin `[placement] mode = "smart"` so the Pages Function runs adjacent to D1, not at the user's nearest PoP.

**Benefits**:
- **Speed**: 1.12s deploy vs infinite stall (48 files vs 1658).
- **Simplicity**: Media lifecycle (R2) is fully de-complected from code lifecycle (Pages).
- **Rich Hickey Quality**: Each concern (compute, storage, delivery) is independently addressable.

## Pattern: The Certification Loop (Vitest Domain Tests)
**Problem**: Passing TypeScript-casted raw rows from a SQL edge database into Qwik route loaders offers zero runtime guarantees without a verification cycle.

**Solution**:
1.  **Isolated Domain Libs**: Move parsing and transformation logic into pure functions inside `src/lib/`.
2.  **Headless Verification**: Use Vitest to execute these functions against mock AI responses and database rows.
3.  **Red/Green Quality**: Enforce that every new ingestion type (e.g., a new Gemini category) has a corresponding test before deployment.

**Benefits**:
- **Reliability**: Guarantees "Value of Values" at the edge.
- **Speed**: Developer feedback loop is milliseconds, not "Deploy and Check."

## Pattern: The Search Boundary (Orama Edge Index)
**Problem**: Full-text search in SQL (LIKE or FTS5) can be compute-intensive and complects lookup logic with the primary storage engine.

**Solution**:
1.  **Edge-Native Indexing**: Store searchable facets in Orama, an in-memory, high-performance engine.
2.  **Ingestion Sidecar**: Every time a fact is persisted to D1, it is simultaneously indexed in Orama.
3.  **Resumable Search**: The search index can be hydrated and queried at the edge at near-zero latency.

**Benefits**:
- **Performance**: Sub-millisecond search results.
- **Rich Hickey Quality**: De-complects "Discovery" (Search) from "Identity/State" (SQL).


## Pattern: The SSR Worker Bridge (Qwik → Cloudflare)
**Problem**: A Qwik City app deployed to Pages without the adapter only serves static assets. Server-side features (`routeLoader$`, D1/KV bindings, platform context) are silently absent.

**Solution**:
1.  **Entry Point**: Create `src/entry.cloudflare-pages.tsx` that imports `createQwikCity` from `@builder.io/qwik-city/middleware/cloudflare-pages` and exports a `fetch` handler.
2.  **Adapter Vite Config**: Create `adapters/cloudflare-pages/vite.config.ts` that extends the base config with the SSR build inputs.
3.  **Build Chain**: Add `build.server` script: `vite build -c adapters/cloudflare-pages/vite.config.ts`. The `qwik build` command auto-detects this and chains it.
4.  **_worker.js**: The adapter produces `dist/_worker.js` which re-exports the fetch handler. Cloudflare detects this and enables "Advanced Mode" — full Worker compute for every request.
5.  **nodejs_compat**: Add `compatibility_flags = ["nodejs_compat"]` to `wrangler.toml` because Qwik SSR uses `node:async_hooks`.

**Benefits**:
- **Full Platform Access**: `routeLoader$` can access D1, KV, R2, and all Cloudflare bindings via `platform.env`.
- **Single Deploy Unit**: Static assets + SSR Worker in one `wrangler pages deploy dist` command.
- **Rich Hickey Quality**: The adapter bridge is the "Simple" connection between framework (Qwik) and platform (Cloudflare) — each can evolve independently.

## Pattern: The Runtime Spec Boundary
**Problem**: Passing TypeScript-casted raw rows from a SQL edge database into Qwik route loaders offers zero runtime guarantees. Malformed database rows or partial views corrupt downstream rendering seamlessly.

**Solution**:
1.  **Zod Schemas**: Represent the "Input Fact" shape (`dbPostRowSchema`) and the "Pure Output Value" shape (`postDomainSchema`) explicitly.
2.  **Transformer Function**: Write a pure function inside `src/domain/specs.ts` to parse raw database records and reshape JSON strings explicitly.
3.  **Boundary Execution**: Invoke this transformation entirely at the `routeLoader$` boundary on the Cloudflare edge.

**Benefits**:
- **Rich Hickey Quality**: De-complects the runtime UI rendering completely from SQL's schema quirks.
- **Resilience**: Enforces "Value of Values." The frontend views mathematical guarantees, not probabilistic assertions.
- **Testability**: Allows isolated unit testing (Red/Green TDD) of the data pipeline completely separated from the UI component framework.

## Pattern: Schema Evolution (Epochal Time Model)
**Problem**: Traditional databases overwrite data (`UPDATE`, `DROP TABLE`). In an edge-native application built from JSON extracts, recreating the structural seed with `DROP TABLE` destroys all historical context and introduces latency. It intertwines the concept of "identity" with "state".

**Solution**:
1.  **Fact-based Tables**: All base tables rename to `_facts` (e.g., `media_facts`, `posts_facts`). They are strictly append-only.
2.  **Epochal State Views**: For every fact table, expose a `VIEW` that uses `ROW_NUMBER() OVER(PARTITION BY id ORDER BY tx_id DESC)` to collapse the fact log strictly to the single most recent "truth".
3.  **Transparent Mutators**: Use `INSTEAD OF INSERT` SQL Triggers on the Views to intercept naive backend operations, safely unwrapping them silently into the immutable fact ledger.

**Benefits**:
- **Rich Hickey Quality**: Data state vs value is de-complected. Future reads can occur "as-of" any point in time safely.
- **Zero App Friction**: The app continues to `SELECT * FROM posts` unaware that it's hitting a virtual, epoch point-in-time calculation.

## Pattern: The Event-Driven Processing Edge (Queue-Drizzle Logic)
**Problem**: Intensive compute tasks (like Gemini Vision Analysis) block the UI thread during ingestion and creates synchronous fragility.

**Solution**:
1.  **Non-Blocking Ingestion**: The Qwik City API endpoint (`/api/classify`) immediately pushes a message to a Cloudflare Queue and returns `202 Accepted`.
2.  **Asynchronous Background Worker**: The `queue()` handler in `entry.cloudflare-workers.tsx` processes batches in isolation from the user's fetch request.
3.  **Strictly-Typed ORM Insertion**: Using Drizzle ORM at the consumer end ensures that analyzed facts are parsed against a TS schema before hitting the SQL Epochal ledger.

## Pattern: Worker-Asset "Compute First" Deployment
**Problem**: Cloudflare Pages obscures the boundary between static file hosting and serverless compute, often complicating background worker access.

**Solution**:
1.  **Native Workers Target**: Deployment targets standard Cloudflare Workers exclusively via `wrangler deploy`.
2.  **Worker Asset Binding**: Using the `assets = { directory = "dist" }` wrangler directive allows the worker to be the primary entry point (`main`) for both SSR and Background Tasks, while still serving static files at zero-latency from the local build.
3.  **Adapter Unification**: Use the `@builder.io/qwik-city/adapters/cloudflare-pages` plugin but re-route it into a raw Workers build to maintain the performance benefits of Qwik's Cloudflare optimizations while regaining the flexibility of raw Workers.

**Benefits**:
- **Reliability**: Eliminates "Pages Functions" routing obscurity.
- **Complexity Management**: Background logic (`queue`, `cron`) lives in the same entry point as frontend logic (`fetch`), de-complected only by event-handler signatures.
- **Rich Hickey Quality**: The deployment artifact is a single, clear "Value" representing the entire platform state.


## Pattern: The De-complected Identity (Zero-Auth Strategy)
**Problem**: Integrating Auth.js/OAuth into a project where identity is not a core requirement (e.g., a public showcase) introduces massive "accidental complexity" in the form of sessions, redirects, and database boilerplate.

**Solution**:
1.  **Identity Removal**: Purge OAuth providers and session middleware.
2.  **Functional Security**: Protect ingestion endpoints using static environment-level secret keys (e.g., `GEMINI_API_KEY`) passed in headers.
3.  **Schema Pruning**: Strip `users`, `accounts`, and `sessions` tables to keep the D1 database focused on domain-specific facts.

**Benefits**:
- **Simplicity**: No session lifecycle to manage.
- **Performance**: Zero DB overhead for identity checks on read operations.
- **Rich Hickey Quality**: De-complects "Who is asking" from "What is the truth", making the application a pure projector of data.


## Pattern: The Media Proxy Bridge
**Problem**: How to serve massive binary assets (200MB+) from an edge-native application without increasing the deployment artifact size or introducing complex third-party CDN logic.

**Solution**:
1.  **Request Interception**: Implement a middleware interceptor in the Worker entry point (`entry.cloudflare-workers.tsx`) that catches a specific path prefix (e.g., `/photos/*`).
2.  **R2 Streaming**: Fetch the raw byte stream directly from the `PHOTOS` R2 binding.
3.  **Edge Cache-Control**: Manually inject infinite TTL headers (`immutable`) to ensure the request is only performed once per edge node.
4.  **Zero-Router Overhead**: The proxy logic runs before the main SSR framework (Qwik City), ensuring zero overhead for standard page navigations.

**Benefits**:
- **Simplicity**: No separate media server or CDN configuration.
- **Performance**: Assets are served at the edge from local R2→Edge Cache.
- **Rich Hickey Quality**: De-complects "Media Facts" from "Application Logic."

## Pattern: Floating Identity Projection
**Problem**: How to maintain consistent branding across independent data projectors (Twitter feed, Instagram gallery) without cluttering the main content flow or introducing layout-shift complexity.

**Solution**:
1.  **Persistent Logo Anchor**: Use a `fixed` header with `pointer-events: none` to float the brand identity over the scrollable area.
2.  **Fluid Scaling**: Use `clamp()` for responsive logo heights to avoid brittle media queries.
3.  **Active Link Layer**: Enable `pointer-events: auto` specifically on the logo anchor to maintain standard navigation UX.
4.  **Adaptive Top Spacing**: Synchronize the `main` container padding with the logo's fluid height to ensure the start of the feed is always visible.

**Benefits**:
- **Consistency**: High-impact brand presence on all tabs.
- **Experience**: The brand "feels" premium as it floats independently of the content scroll.
- **Rich Hickey Quality**: De-complects the *Identity of the Site* from the *Content of the Platform*.
 
## Pattern: The Epochal Ingestion Ledger (Telegram Facts)
**Problem**: Third-party event streams (Telegram) are ephemeral and mutating. If we only store the "current state" of a post, we lose the historical context or the ability to re-process the raw data if our classification logic improves.

**Solution**:
1.  **Raw Fact Accession**: Every incoming webhook payload is immediately persisted to `telegram_raw_facts` as a JSON blob + `update_id`.
2.  **Point-in-Time Projection**: A secondary process (or trigger) transforms these raw facts into the unified `posts_facts` ledger.
3.  **Immutability**: We never "update" a Telegram post; we append a new fact if the message is edited, and the D1 `VIEW` resolves the most recent one.

**Benefits**:
- **Rich Hickey Quality**: De-complects "Event Reception" from "Data Interpretation."
- **Auditability**: We can replay the entire Telegram history from raw JSON at any time.

## Pattern: The Media Pull-Through Bridge
**Problem**: Telegram media links are temporary (ephemeral). We need a permanent "Fact" of the media in our own infrastructure (R2).

**Solution**:
1.  **Metadata Fetch**: Use `getFile` to retrieve the internal Telegram path.
2.  **R2 Proxy**: The worker fetches the bytes from Telegram and `put`s them into R2 using a `telegram_` prefix based on the `file_unique_id`.
3.  **Unified URI**: The `posts_facts` table stores the R2 filename, allowing the standard `/photos/*` proxy to serve it.

**Benefits**:
- **Persistence**: Media survives even if the original Telegram message is deleted.
- **Simplicity**: No complex client-side upload logic; the server handles the data migration.

## Pattern: Transient Search Projection (Transient Orama Context)
**Problem**: Maintaining a persistent, synchronized search index in serverless edge environments (Cloudflare Workers) introduces significant accidental complexity. Shared mutability, synchronization lags, and persistence sync issues complect the look-up operations with edge lifetime.

**Solution**:
1. **Dynamic Execution Loader**: Build a transient Orama search context on-demand at edge runtime from the primary D1 database facts list.
2. **Strict Zod Boundary Conversion**: Read SQLite raw rows and parse them through the `parseD1PostRows` specification boundary to ensure data-safety before indexing.
3. **Stateless Garbage Collection**: Allow the transient index instance to be garbage-collected at request completion. This guarantees zero side-effects, zero memory leak footprint, and extreme performance (<10ms edge processing overhead).

**Benefits**:
- **Simplicity**: Completely isolates Search query compute from local state sync logic, aligning fully with the "Simple Made Easy" doctrine.
- **Performance**: Edge in-memory search scales seamlessly with no cold-start synchronization lag or database-level lock contentions.

## Pattern: Stale Subprocess Sweep (Orphaned Process Sweeper)
**Problem**: Headless browser tasks or scraping subprocesses (e.g., Playwright's `chrome-headless-shell`) often outlive their parent execution script, running indefinitely in the background and starving the host system's CPU.

**Solution**:
1. **Age and Command Filters**: Formulate a list of known suspect process names/arguments (e.g., `chrome-headless-shell`, specific script files) and define an epoch age limit (e.g., 1 hour).
2. **Deterministic Process Query**: Use system process status APIs or `ps` (e.g., `ps -Aww -o pid,ppid,lstart,command`) to capture an immutable snapshot of all active OS processes.
3. **Regex Extraction & Parsing**: Parse output lines to extract the PID, parent PPID, start time, and full command arguments, converting the start date string into a comparable timestamp.
4. **Targeted Signal Eviction**: Run an automated sweeper at scheduled times or pre-build phases. For any suspect process exceeding the age threshold, issue a terminating signal (`SIGKILL`) directly to the PID to prevent leakage.

**Benefits**:
- **Simplicity**: No complex stateful process managers (PM2/systemd) needed for transient scripts; uses simple Unix/macOS process trees.
- **Resource Protection**: Automatically prevents local and CI systems from being bogged down by zombie browsers.
- **Reliability**: Self-cleaning execution boundary that maintains system health across long-lived development or server contexts.

## Pattern: The Unified Asset Boundary (Wrangler v4 Workers Static Assets)
**Problem**: Traditional edge/serverless frameworks separate static file hosting (e.g. Pages or Workers Sites) from dynamic edge compute (Workers functions). This separation complects deployment targets, introduces configuration drift, and slows down builds with complex asset synchronization rules.

**Solution**:
1. **Unified Configuration**: Adopt a single `wrangler.toml` or `wrangler.json` setup mapping both compute (`main` entry point) and assets (`assets = { directory = "dist" }`) into one unified deployment.
2. **Deterministic Route Mapping**: Let Wrangler automatically resolve static file routing (serving them directly from Cloudflare's edge CDN) and only route unhandled API or SSR endpoints to the Worker's `fetch` handler.
3. **Decoupled Asset Uploads**: Eliminate legacy wrapper commands (`--legacy-assets`). Upgrading to Wrangler v4 makes the build pipeline idempotent, only uploading changed file hashes directly.

**Benefits**:
- **Performance**: Static pages and assets are distributed natively across Cloudflare's edge CDN, while dynamic routes benefit from smart compute placement near databases (D1).
- **Simplicity**: Eliminates middle-tier wrapper routing configurations and routing tables; compute and static content are handled inside a single unit.

## Pattern: The Context-Driven Sliding Inspection Drawer
**Problem**: Traditional detail/view navigation in responsive social feeds relies on route transitions or nested modals, which interrupts the scanning flow, increases state entanglement, and duplicates modal markup across elements.

**Solution**:
1. **Root-Level Drawer Shell**: Place a single drawer layout component (`.drawer-panel`) and backdrop (`.drawer-backdrop`) at the top-level root route shell (`layout.tsx`).
2. **Stateless Context Store**: Define a shared, reactive store (`DrawerState`) and distribute it via Qwik's `createContextId` and `useContextProvider` at the root layout.
3. **Card-Level Delegation**: Individual post or gallery card items simply consume `DrawerContext` and write visual details (title, full media URL, description text) to the shared store on click. This opens the drawer without triggering layout shifts or sub-route page reloads.

**Benefits**:
- **Simplicity**: De-complects the *Card Render logic* from the *Detailed Inspection UI*.
- **Performance**: Zero extra DOM element footprint for each card on the page; modal markup is rendered exactly once.
- **Experience**: The user gets a smooth, desktop-grade slide-out panel that preserves scroll position and keeps the feed immediately accessible.


## Pattern: The Fluid Event Text Extractor (Double-Layer Fact Formatting)
**Problem**: Raw image text extraction (OCR/AI) is highly unstructured, yielding inconsistent dates, missing venues, and variable speaker formats. Directly rendering these raw snippets results in a chaotic, unpolished layout full of default fallback placeholders (like "our fellowship venue" or "February 20, 2026").

**Solution**:
1. **Fluid Output Prompts**: Modify the Gemini extraction prompt to output a fully structured, natural English event sentence directly inside the queue consumer using a set of strictly defined templates (e.g., speaker + topic, speaker only, special events, or generic fellowship).
2. **On-the-Fly Formatting Mirror**: Implement a matching parsing helper (`reformatEventText`) in the frontend route loader that runs the exact same regex-based restructuring on raw database text values.
3. **Double-Layer Fact Protection**: The combination of both layers ensures that newly ingested items are stored pre-formatted directly by the AI, while legacy database rows are formatted dynamically on-the-fly, producing a clean UI.

**Benefits**:
- **Simplicity**: No complex relational tables required for individual event attributes (venue, speaker, date, time); everything is parsed into a single human-readable and structured event statement.
- **Factuality**: Avoids generic placeholders, formatting every event announcement to sound premium and natural.
- **TDD Verification**: The entire parser is validated using Vitest and E2E Playwright suites to guarantee formatting correctness before pushing to production.

## Pattern: The Source-of-Truth Priority Pattern (Database Contamination Bypass)
**Problem**: In joined database tables (such as posts linked to media), inaccurate database associations or seeder groupings can cause posts to display incorrect visual/text details (e.g., matching a post with an incorrect OCR flyer snippet).

**Solution**:
1. **Source of Truth Hierarchy**: Prioritize human-authored post caption text (`post.text`) over machine-extracted OCR text (`post.snippet`) when rendering titles, dates, speakers, and venues. Fall back to OCR data only if direct text is absent.
2. **Metadata Sanitization**: Pre-process captions through a regex-based header-stripping routine to discard platform attribution prefixes (e.g., `'rotarymuthaiga' on Instagram`) before parsing or formatting.
3. **Keyword Dictionary Mapping**: Supplement regex-based property extraction with a dictionary of known domain keywords (such as "assembly", "induction", "movie night") to gracefully map events that don't match typical grammar-based regex patterns.

**Benefits**:
- **Factuality**: Guaranteed correct event description cards, fully aligned with the actual user post.
- **Visual Purity**: Prevents drawer headers and card contents from showing social media account headers.
- **Simplicity**: No complex database migrations or relational restructuring needed to fix loose seeder joins.

## Pattern: Unified Interactive Search & Glassmorphic Reel overlays
**Problem**: Standalone pages like search or cinematic full-bleed feeds often feel isolated or visually incomplete, hardcoding legacy styles or rendering raw media without overlays and click-actions, which breaks the app's interactive loop.

**Solution**:
1. **Interactive Shared Context Integration**: Bind search items and full-bleed media cards to the root `DrawerContext`. Clicking any search item or reel CTA immediately loads the post metadata and media into the shared slide-out drawer.
2. **Visual Variable Auditing**: Cleanse legacy standalone pages of hardcoded, outdated style definitions, standardizing inputs, forms, and results layouts against the core Obsidian design tokens.
3. **Glassmorphic Metadata Badges**: Add a glassmorphic bottom overlay container (`.reel-overlay`) over full-bleed media containing social indicators, cleaned captions, and custom category tags (e.g. `Birthday`, `Event Recap`, `Event Poster`) to project immediate visual information.
4. **Tactile Spring Active States**: Add subtle scale-down hover transformations and press effects (`transform: scale(0.95)`) to clickable components like navigation pills and buttons, providing satisfying physical click feedback.

**Benefits**:
- **Cohesion**: The entire app functions as a single unified system, with search results, visual gallery photos, and full-bleed reels all feeding into the same interactive detail drawer.
- **Visual Harmony**: Elimination of styling leaks and legacy variables, ensuring consistent margins, font sizing, and contrast across all routes.
- **Premium Tactility**: Elevates simple web views to a polished edge-native product.

## Pattern: Self-Healing Webhook & Diagnostics Endpoint
**Problem**: Maintaining serverless webhook ingestion bindings (e.g. Telegram Bot Webhook) is prone to configuration drift when URLs change, environments redeploy, or cold starts interrupt delivery. This complects routing setup with operations, leading to silent ingestion failures.

**Solution**:
1. **Dual-Handler Endpoint**: Expose both `GET` and `POST` handlers on the same route `/api/telegram`.
2. **Dynamic Verification GET**: The `GET` request retrieves current configuration parameters directly from the third-party provider (Telegram `getWebhookInfo`).
3. **Automated Alignment (Self-Healing)**: If the registered URL mismatches the active request origin, execute an in-flight `setWebhook` alignment, binding the correct secrets and subscription events dynamically.
4. **Data Fact Counting**: Expose basic metrics (like total row counts in D1 `telegram_raw_facts`) to immediately prove write integrity.

**Benefits**:
- **Simplicity**: No manual config synchronization; visiting the endpoint via HTTP automatically repairs it.
- **De-coupling**: Separates configuration deployment from API operation.
- **Rich Hickey Quality**: Webhook URL is derived dynamically from request coordinates rather than being static, hardcoded configuration.


## Pattern: Epochal Ingestion Consolidation for Split Payloads
**Problem**: Downstream automation tools often split a single conceptual entity (e.g., a photo with a caption) into multiple sequential webhooks (e.g., a photo message followed by a reply text message). In database schemas where routes join posts and media on a single record, this split results in orphaned records that are filtered out of all views.

**Solution**:
1. **Detect Parent Reference**: In the webhook handler, inspect if the incoming payload is a reply to an existing parent message (`reply_to_message`).
2. **Immutable Fact Appending**: Fetch the existing parent's attributes (e.g., `photos_json`) from the database view.
3. **Consolidated Fact Insertion**: Insert a new fact under the parent's ID (`targetPostId`), combining the parent's attributes and the reply's text.
4. **Natural View Collapse**: Let the database view resolve the entity's latest state by grouping on `id` and selecting the most recent `tx_id`.

**Benefits**:
- **Data Integrity**: Preserves the immutable ledger model (no destructive `UPDATE` queries).
- **Seamless Merging**: Correctly merges split photo and caption payloads into a single visible UI post without complicating the schema.


## Pattern: The Temporal Alignment Pattern
**Problem**: Stateless edge components need to parse relative date expressions (e.g. "this Wednesday", "tomorrow", "this coming Thursday") in event flyers, but the system clock at execution time can vary and does not reflect when the announcement was actually published.

**Solution**:
1. **Fact Accretion**: Capture and persist the original publication timestamp (`created_at`) when receiving updates.
2. **Context Passing**: Pass `created_at` through the domain layer schemas down to the date parsing utility functions.
3. **Reference Anchoring**: Use the publication date as the baseline anchor when converting relative day indicators into absolute calendar dates.

**Benefits**:
- **Accuracy**: Prevents relative dates from drifting as time moves forward (e.g., an event announced as "this Wednesday" remains mapped to that specific Wednesday even when viewed weeks later).
- **Simplicity**: Retains pure, stateless date parsing functions.


## Pattern: The Idempotent View Filter (In-Memory Deduplication)
**Problem**: Redundant webhooks, duplication of automation records, or concurrent network retries can insert multiple post records with different IDs but identical text content, leading to duplicate cards on the UI.

**Solution**:
1. **Normalization**: Clean and normalize text strings (strip whitespace, lowercase, condense newlines) inside the edge route loader.
2. **In-Memory Set Tracking**: Process posts in order and use a local `Set` to keep track of already-rendered normalized captions.
3. **Idempotent Filtering**: Filter out any posts whose text content has already been seen.

**Benefits**:
- **Robustness**: Provides an immediate, zero-downtime safety net against ingestion duplication.
- **Independence**: Leaves the historical raw database facts completely intact and unaltered.


## Pattern: Chronological Sorting Alignment (Hybrid ID Spaces)
**Problem**: An application merges content from distinct sources (e.g., live Telegram feed message IDs vs legacy seeds with generated IDs) that use non-overlapping, differently-scaled ID sequences. Relying on auto-incrementing/integer IDs for chronological sorting hides the live records.

**Solution**:
1. **Unified Temporal Fact**: Add and maintain a `created_at` timestamp across all fact schemas.
2. **Deterministic Multi-Key Sorting**: Order all queries and loaders using `created_at DESC, id DESC`.
3. **Index Coverage**: Ensure that the database view resolves the entities' temporal values cleanly for immediate edge queries.

**Benefits**:
- **Visual Integrity**: Guarantees that the latest content is presented to the user first.
- **Independence of ID Space**: Decouples presentation order from the raw primary keys of individual ingestion pipelines.




