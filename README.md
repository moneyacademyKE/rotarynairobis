# Rotary Nairobi South Social Showcase ⚡️ (Hickey Certified)

> "Simplicity is the absence of interleaving." — Rich Hickey

This project is a high-performance, edge-native social media showcase for the **Rotary Club of Nairobi South**, built on **Qwik City** and deployed exclusively to **Cloudflare Workers**. 

It is architected according to the principles of "Simple Made Easy," focusing on the complete de-complecting of state, time, and compute.

---

## 🏆 Architectural Certification (Rich Hickey Doctrine)

### 1. Epochal Time Data Model (Simple State)
We have abandoned destructive SQL. All data is stored in **Immutable Fact Ledgers** (`_facts` tables). The application views the "Current Truth" through dynamic SQL Views that collapse the log at runtime. This de-complects "Update" logic into pure "Append" logic.

### 2. The Runtime Spec Boundary (Value of Values)
Database rows are never trusted. Every interaction passes through a **Zod Spec Boundary** on the edge. This ensures the UI renders deterministic **Values**, not probabilistic database artifacts.

### 3. Event-Driven Decoupling (Background Compute)
Intensive AI processing (Gemini Vision) is offloaded to **Cloudflare Queues**. The UI returns `202 Accepted` immediately, de-complecting user Interaction from expensive Compute.

### 4. Native Worker Asset Integration (Zero Complexity Hosting)
We utilize **Standard Cloudflare Workers** with the `assets` directive. This eliminates the "Pages Functions" abstraction layer, providing a single, clear entry point for SSR, Background Queues, and Cron tasks.

---

## 🚀 Key Integrations

- **Drizzle ORM**: SQL-first, zero-bundle-weight TypeScript mapping.
- **Auth.js**: Edge-native session management via D1.
- **Partytown**: Third-party script isolation to preserve Qwik's resumability.
- **Google Gemini**: Automated visual classification via the Edge Processing Worker.

## 🛠 Project Lifecycle

### Development
```shell
bun run dev
```

### Production Build (Hickey Quality)
```shell
bun run build && bun run build.server
```

### Edge Deployment
```shell
bun run deploy
```

## 📖 Playbook: AI Ingestion & Reprocessing Operations

### 1. Ingestion Prompt Tuning
The system uses the Gemini model to classify images and generate snippets according to precise visual formatting templates. The configuration and system instructions are managed in [classification-prompt.ts](file:///Users/moe/Desktop/rcns/src/lib/classification-prompt.ts).
If any template, club name mapping, or venue normalization changes:
1. Update `CLASSIFICATION_PROMPT` in `classification-prompt.ts`.
2. Run unit tests (`bun test`) to ensure zero regressions.
3. Deploy the changes (`bun run deploy`) to update the queue consumer worker.

### 2. Cloudflare In-Cloud Reprocessing
To reprocess existing images and regenerate database records using the updated prompt directly on Cloudflare:
```shell
bun run scripts/reprocess-last.ts --count <N>
```
This enqueues the last `N` media items directly to the Cloudflare Queue. The active queue consumer worker will classify each image and update the D1 database.

### 3. Edge Parser Bypass
To prevent redundant execution and potential regex corruption on the edge, any snippet matching the standard structural templates (e.g. `invites you to` or speaker host formats) completely bypasses the regex parser heuristics inside [twitter-parser.ts](file:///Users/moe/Desktop/rcns/src/lib/twitter-parser.ts) and is rendered directly to the page.

## 📂 Patterns & Learnings
For a deep dive into the architectural decisions and "Simple" design patterns used in this repository, see:
- [Patterns Documentation](file:///Users/moe/Desktop/rcns/patterns.md)
- [Edge Learnings](file:///Users/moe/Desktop/rcns/learnings.md)

