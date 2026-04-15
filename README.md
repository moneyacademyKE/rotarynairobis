# RCNS Social Showcase ⚡️ (Hickey Certified)

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

## 📂 Patterns & Learnings
For a deep dive into the architectural decisions and "Simple" design patterns used in this repository, see:
- [Patterns Documentation](file:///Users/moe/Desktop/com/patterns.md)
- [Edge Learnings](file:///Users/moe/Desktop/com/learnings.md)
