/**
 * LLM-free pipeline receipt: run one tick, then publish the result straight
 * to Telegram's Bot API.
 *
 * Why this exists: the tick ran inside an LLM-backed cron session, so a model
 * provider outage (503, all nodes exhausted) stopped Telegram ingestion along
 * with the narration. Here the work happens in plain TypeScript and the
 * receipt is one Bot API call — content keeps flowing when no model answers,
 * and a quiet tick costs zero tokens.
 *
 * The receipt itself is the decision: renderReceipt returns "" when nothing
 * moved, so "nothing to report" and "report nothing" are the same fact rather
 * than two rules that can drift apart.
 *
 * Streams are contractual: stderr is the durable log (the launcher redirects it
 * to a file) and stdout is reserved for escalation, because trigger_cmd output
 * is precisely what wakes an agent. A quiet tick therefore writes nothing to
 * stdout and costs zero tokens.
 *
 * Env (supplied by the launcher, never echoed by this file):
 *   RCNS_RECEIPT_TOKEN     bot token allowed to post the receipt
 *   RCNS_RECEIPT_CHAT_ID   destination chat id
 *   RCNS_RECEIPT_THREAD_ID forum topic id (optional)
 *
 * Run: `bun local/poll-receipt.ts`
 */

import { tick, type TickReport } from "./tick";

export interface ReceiptTarget {
  token: string;
  chatId: string;
  threadId?: string;
}

export interface ReceiptDeps {
  send: (target: ReceiptTarget, html: string) => Promise<void>;
  /** Durable log line; the real implementation writes stderr, which the
      launcher redirects to a log file. */
  note: (line: string) => void;
  /** Last-resort hand-off: printing puts the text on trigger_cmd's stdout. */
  escalate: (text: string) => void;
}

const EAT_ZONE = "Africa/Nairobi";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Site clock in the owner's timezone — EAT, never bare UTC. */
export function eatClock(iso: string): string {
  const d = new Date(iso);
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: EAT_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: EAT_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return `${day} ${hhmm} EAT`;
}

/**
 * One line per fact. "" means the tick changed nothing and broke nothing,
 * which is exactly the case that must not wake an agent.
 */
export function renderReceipt(r: TickReport): string {
  const lines: string[] = [`⏰ <b>rcns-local-poll</b> · <b>${eatClock(r.at)}</b>`];

  if (r.poll.error) {
    lines.push(`🚫 poll: ${esc(r.poll.error)}`);
  } else if (!r.poll.skipped && (r.poll.polled > 0 || r.poll.newPosts > 0 || r.poll.newPhotos > 0)) {
    lines.push(
      `📥 updates ${r.poll.polled} · new posts ${r.poll.newPosts} · new photos ${r.poll.newPhotos}`,
    );
  }

  if (r.classify.error) {
    lines.push(`🚫 classify: ${esc(r.classify.error)}`);
  } else if (r.classify.done > 0 || r.classify.failed > 0) {
    const failed = r.classify.failed > 0 ? ` · failed ${r.classify.failed}` : "";
    lines.push(`🏷 classified ${r.classify.done}${failed}`);
  }

  if (r.build.failed.length > 0) {
    const detail = r.build.failed.map((f) => `${esc(f.key)}: ${esc(f.error)}`).join("; ");
    lines.push(`🚫 build: ${detail}`);
  } else if (r.build.published.length > 0) {
    lines.push(`🖼 galleries ${r.build.published.length} · rows ${r.build.rowsWritten}`);
  }

  return lines.length > 1 ? lines.join("\n") : "";
}

/** Telegram Bot API sendMessage. Throws on a non-ok reply so the caller can fall back. */
export async function sendReceipt(
  target: ReceiptTarget,
  html: string,
): Promise<void> {
  if (!target.token || !target.chatId) {
    throw new Error("RCNS_RECEIPT_TOKEN / RCNS_RECEIPT_CHAT_ID missing");
  }
  const payload: Record<string, unknown> = {
    chat_id: target.chatId,
    text: html,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (target.threadId) payload.message_thread_id = Number(target.threadId);

  const res = await fetch(`https://api.telegram.org/bot${target.token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body: { ok?: boolean; description?: string } = await res
    .json()
    .catch(() => ({}));
  if (!res.ok || body.ok === false) {
    throw new Error(`telegram ${res.status}: ${body.description ?? "send failed"}`);
  }
}

export function realDeps(): ReceiptDeps {
  return {
    send: sendReceipt,
    // Log on stderr: stdout belongs to the escalation channel alone.
    note: (line) => console.error(line),
    escalate: (text) => console.log(text),
  };
}

/** Plain text for the agent fallback path — tags would render as literal pipes. */
export function plainText(html: string): string {
  return html.replace(/<\/?b>/g, "");
}

/**
 * Post the receipt. If the direct send fails (network, bot blocked), hand the
 * text to trigger_cmd so the cron agent can still narrate it — degraded, but
 * not silent.
 */
export async function announce(
  target: ReceiptTarget,
  html: string,
  deps: ReceiptDeps,
): Promise<void> {
  try {
    await deps.send(target, html);
    deps.note(`[receipt] posted: ${plainText(html).replace(/\n/g, " | ")}`);
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e);
    deps.note(`[receipt] direct send failed: ${msg}`);
    deps.escalate(plainText(html));
  }
}

if (import.meta.main) {
  const target: ReceiptTarget = {
    token: process.env.RCNS_RECEIPT_TOKEN ?? "",
    chatId: process.env.RCNS_RECEIPT_CHAT_ID ?? "",
    threadId: process.env.RCNS_RECEIPT_THREAD_ID,
  };
  const deps = realDeps();

  let report: TickReport;
  try {
    report = await tick();
  } catch (e: unknown) {
    // The tick itself blew up: that is always worth a line, however it lands.
    const msg = (e as Error)?.message ?? String(e);
    await announce(target, `⛔ <b>rcns-local-poll</b> · <b>${eatClock(new Date().toISOString())}</b>\n🚫 tick crashed: ${esc(msg)}`, deps);
    process.exit(0);
  }

  const html = renderReceipt(report);
  if (!html) {
    deps.note("[receipt] quiet tick, nothing to post");
    process.exit(0);
  }
  await announce(target, html, deps);
}
