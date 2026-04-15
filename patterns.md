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

