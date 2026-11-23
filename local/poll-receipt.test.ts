/**
 * Receipt contract tests — what gets posted, what stays silent, and what
 * happens when the direct send fails. No network: the send boundary is
 * injected, exactly like the poller's.
 */

import { describe, it, expect } from "bun:test";
import {
  renderReceipt,
  eatClock,
  plainText,
  announce,
  sendReceipt,
  type ReceiptDeps,
  type ReceiptTarget,
} from "./poll-receipt";
import type { TickReport } from "./tick";

function report(over: Partial<TickReport> = {}): TickReport {
  return {
    at: "2026-11-23T15:20:00.000Z",
    poll: { skipped: false, polled: 0, newPosts: 0, newPhotos: 0 },
    classify: { done: 0, failed: 0, skipped: 0 },
    build: { skipped: true, published: [], failed: [], rowsWritten: 0 },
    ...over,
  };
}

function capturingDeps(fail?: string): { deps: ReceiptDeps; notes: string[]; escalated: string[] } {
  const notes: string[] = [];
  const escalated: string[] = [];
  const deps: ReceiptDeps = {
    send: async () => {
      if (fail) throw new Error(fail);
    },
    note: (line) => notes.push(line),
    escalate: (text) => escalated.push(text),
  };
  return { deps, notes, escalated };
}

const target: ReceiptTarget = { token: "t", chatId: "-1000", threadId: "6322" };

describe("renderReceipt", () => {
  it("posts nothing on a quiet tick", () => {
    expect(renderReceipt(report())).toBe("");
  });

  it("posts nothing when the poll is skipped and nothing moved", () => {
    expect(renderReceipt(report({ poll: { skipped: true, polled: 0, newPosts: 0, newPhotos: 0 } }))).toBe("");
  });

  it("reports ingestion counts when facts arrived", () => {
    const html = renderReceipt(
      report({
        poll: { skipped: false, polled: 12, newPosts: 3, newPhotos: 4 },
        classify: { done: 4, failed: 0, skipped: 0 },
        build: { published: ["recent", "gallery"], failed: [], rowsWritten: 87 },
      }),
    );
    expect(html).toContain("updates 12");
    expect(html).toContain("new posts 3");
    expect(html).toContain("new photos 4");
    expect(html).toContain("classified 4");
    expect(html).toContain("galleries 2 · rows 87");
    expect(html).not.toContain("failed");
  });

  it("reports classify failures beside successes", () => {
    const html = renderReceipt(report({ classify: { done: 1, failed: 2, skipped: 0 } }));
    expect(html).toContain("classified 1 · failed 2");
  });

  it("reports a poll error instead of pretending the tick was clean", () => {
    const html = renderReceipt(report({ poll: { skipped: false, error: "409 conflict", polled: 0, newPosts: 0, newPhotos: 0 } }));
    expect(html).toContain("🚫 poll: 409 conflict");
  });

  it("reports every failed gallery key with its error", () => {
    const html = renderReceipt(
      report({ build: { published: ["recent"], failed: [{ key: "gallery", error: "kv busy" }], rowsWritten: 5 } }),
    );
    expect(html).toContain("🚫 build: gallery: kv busy");
    expect(html).not.toContain("galleries 1");
  });

  it("escapes error text so a provider message cannot inject markup", () => {
    const html = renderReceipt(
      report({ poll: { skipped: false, error: "<script>x</script> & co", polled: 0, newPosts: 0, newPhotos: 0 } }),
    );
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt; &amp; co");
    expect(html).not.toContain("<script>");
  });

  it("heads every receipt with the site clock, not UTC", () => {
    expect(eatClock("2026-11-23T15:20:00.000Z")).toBe("2026-11-23 18:20 EAT");
    expect(eatClock("2026-11-23T22:45:00.000Z")).toBe("2026-11-24 01:45 EAT");
  });
});

describe("announce", () => {
  it("posts directly and escalates nothing when the send succeeds", async () => {
    const { deps, notes, escalated } = capturingDeps();
    await announce(target, "⏰ <b>rcns-local-poll</b>", deps);
    expect(escalated).toEqual([]);
    expect(notes.length).toBe(1);
    expect(notes[0]).toContain("[receipt] posted");
  });

  it("hands the text to trigger_cmd when the direct send fails", async () => {
    const { deps, notes, escalated } = capturingDeps("network down");
    await announce(target, "⏰ <b>rcns-local-poll</b> · posts 3", deps);
    expect(escalated).toEqual(["⏰ rcns-local-poll · posts 3"]);
    expect(notes[0]).toContain("direct send failed: network down");
  });

  it("escalates plain text, never markup an agent would repost verbatim", async () => {
    const { deps, escalated } = capturingDeps("blocked");
    await announce(target, "a\nb", deps);
    expect(escalated[0]).toBe("a\nb");
    expect(plainText("<b>x</b> y")).toBe("x y");
  });
});

describe("sendReceipt", () => {
  it("refuses to call the API without a token or chat", async () => {
    await expect(sendReceipt({ token: "", chatId: "-1" }, "hi")).rejects.toThrow(
      "RCNS_RECEIPT_TOKEN / RCNS_RECEIPT_CHAT_ID missing",
    );
    await expect(sendReceipt({ token: "t", chatId: "" }, "hi")).rejects.toThrow(
      "RCNS_RECEIPT_TOKEN / RCNS_RECEIPT_CHAT_ID missing",
    );
  });
});
