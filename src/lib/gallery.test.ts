import { describe, it, expect, vi } from "vitest";
import {
  latestFacts,
  buildGallery,
  getGallery,
  publishAll,
  GALLERY_KEYS,
  GALLERY_TTL_SECONDS,
} from "./gallery";

const post = (id: number, tx = 1, over: object = {}) => ({
  id, tx_id: tx, text: `post ${id}`, account: "rcns",
  photos_json: JSON.stringify([`f${id}a.jpg`, `f${id}b.jpg`]),
  hashtags_json: "[]", created_at: `2026-10-${String(id).padStart(2, "0")}T10:00:00Z`,
  is_retraction: 0, ...over,
});
const media = (file: string, tx: number, type: string, over: object = {}) => ({
  tx_id: tx, file_name: file, type, snippet: `${type} snippet`, is_retraction: 0, ...over,
});

describe("latestFacts (view semantics)", () => {
  it("keeps the highest-tx_id fact per entity", () => {
    const rows = [post(1, 10, { text: "old" }), post(1, 20, { text: "new" }), post(2, 5)];
    const out = latestFacts(rows, "id");
    expect(out).toHaveLength(2);
    expect(out.find((r) => r.id === 1)!.text).toBe("new");
  });

  it("drops the entity when its LATEST fact is a retraction", () => {
    const rows = [post(1, 10), post(1, 20, { is_retraction: 1 })];
    expect(latestFacts(rows, "id")).toHaveLength(0);
  });

  it("keeps the entity when an OLD fact is a retraction but latest is not", () => {
    const rows = [post(1, 10, { is_retraction: 1 }), post(1, 20)];
    expect(latestFacts(rows, "id")).toHaveLength(1);
  });
});

describe("buildGallery", () => {
  const posts = [post(3), post(1), post(2)];
  const mediaRows = [
    media("f1a.jpg", 1, "EVENT_POSTER"), media("f2a.jpg", 1, "EVENT_POSTER"),
    media("f2b.jpg", 1, "PHOTO"), media("f3a.jpg", 1, "BIRTHDAY"),
  ];
  const map = new Map(mediaRows.map((m) => [m.file_name, m]));

  it("emits one row per (post, matching photo), newest first", () => {
    const rows = buildGallery(posts, map, "gallery:tiktok");
    expect(rows.map((r) => [r.id, r.file_name])).toEqual([[2, "f2a.jpg"], [1, "f1a.jpg"]]);
  });

  it("names the photo column photo_src for instagram only", () => {
    const rows = buildGallery(posts, map, "gallery:instagram");
    expect(rows).toHaveLength(1);
    expect(rows[0].photo_src).toBe("f2b.jpg");
    expect(rows[0].file_name).toBeUndefined();
  });

  it("carries snippet/type only for the events source", () => {
    const ev = buildGallery(posts, map, "gallery:events");
    expect(ev[0].type).toBe("EVENT_POSTER");
    const tk = buildGallery(posts, map, "gallery:tiktok");
    expect(tk[0].type).toBeUndefined();
  });

  it("events excludes empty and legacy-archive text", () => {
    const ps = [post(1), post(2, 1, { text: "" }), post(3, 1, { text: "Legacy media archive dump" })];
    const m = new Map([["f1a.jpg", media("f1a.jpg", 1, "EVENT_POSTER")]]);
    const rows = buildGallery(ps, m, "gallery:events");
    expect(rows.map((r) => r.id)).toEqual([1]);
  });

  it("caps at 200 rows", () => {
    const many = Array.from({ length: 250 }, (_, i) => post(i + 1, 1));
    const m = new Map(many.map((p) => [`f${p.id}a.jpg`, media(`f${p.id}a.jpg`, 1, "EVENT_POSTER")]));
    expect(buildGallery(many, m, "gallery:tiktok")).toHaveLength(200);
  });

  it("sorts ids numerically on created_at ties — 10 before 9, not lexicographic", () => {
    const tie = "2026-10-10T10:00:00Z";
    const ps = [post(9, 1, { created_at: tie }), post(10, 1, { created_at: tie })];
    const m = new Map([["f9a.jpg", media("f9a.jpg", 1, "EVENT_POSTER")], ["f10a.jpg", media("f10a.jpg", 1, "EVENT_POSTER")]]);
    expect(buildGallery(ps, m, "gallery:tiktok").map((r) => r.id)).toEqual([10, 9]);
  });
});

function makeEnv({ posts = [], media = [], kvGet = null, failPrepare = false, watermark = 0 }: { posts?: any[]; media?: any[]; kvGet?: any; failPrepare?: boolean; watermark?: number } = {}) {
  const put = vi.fn().mockResolvedValue(undefined);
  const get = vi.fn().mockResolvedValue(kvGet);
  const prepare = vi.fn().mockImplementation((sql: string) => ({
    all: failPrepare
      ? vi.fn().mockRejectedValue(new Error("d1 down"))
      : vi.fn().mockResolvedValue({ results: sql.includes("posts_facts") ? posts : media }),
    first: vi.fn().mockResolvedValue(watermark),
  }));
  return { env: { DB: { prepare }, CACHE: { get, put } }, prepare, put, get };
}

describe("getGallery", () => {
  it("serves KV hits without touching D1", async () => {
    const { env, prepare } = makeEnv({ kvGet: [{ id: 9 }] });
    const rows = await getGallery(env, "gallery:tiktok");
    expect(rows).toEqual([{ id: 9 }]);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("builds from facts on a miss and refills KV", async () => {
    const { env, put } = makeEnv({ posts: [post(1)], media: [media("f1a.jpg", 1, "EVENT_POSTER")] });
    const rows = await getGallery(env, "gallery:tiktok");
    expect(rows).toHaveLength(1);
    expect(put).toHaveBeenCalledWith("gallery:tiktok", expect.any(String), { expirationTtl: GALLERY_TTL_SECONDS });
  });
});

describe("publishAll", () => {
  it("queries D1 with two table scans — not once per gallery", async () => {
    const { env, prepare, put } = makeEnv({ posts: [post(1)], media: [media("f1a.jpg", 1, "EVENT_POSTER")] });
    const report = await publishAll(env);
    const scans = prepare.mock.calls.filter((call: any[]) => String(call[0]).includes("SELECT *"));
    expect(scans).toHaveLength(2);
    expect(put).toHaveBeenCalledTimes(GALLERY_KEYS.length);
    expect(report.published).toEqual([...GALLERY_KEYS]);
    expect(report.failed).toEqual([]);
  });

  it("skips when the watermark matches the stored cursor — no scans, no writes", async () => {
    const { env, prepare, put } = makeEnv({ watermark: 42, kvGet: "42" });
    const report = await publishAll(env);
    expect(report.skipped).toBe(true);
    expect(report.published).toEqual([]);
    const scans = prepare.mock.calls.filter((call: any[]) => String(call[0]).includes("SELECT *"));
    expect(scans).toHaveLength(0);
    expect(put).not.toHaveBeenCalled();
  });

  it("publishes and advances the cursor when the watermark moved", async () => {
    const { env, put } = makeEnv({ posts: [post(1)], media: [media("f1a.jpg", 1, "EVENT_POSTER")], watermark: 42, kvGet: "41" });
    const report = await publishAll(env);
    expect(report.skipped).toBeUndefined();
    expect(report.published).toEqual([...GALLERY_KEYS]);
    expect(put).toHaveBeenCalledWith("publish:last-tx", "42");
  });

  it("force bypasses the skip even when the watermark matches", async () => {
    const { env, put } = makeEnv({ posts: [post(1)], media: [media("f1a.jpg", 1, "EVENT_POSTER")], watermark: 42, kvGet: "42" });
    const report = await publishAll(env, { force: true });
    expect(report.skipped).toBeUndefined();
    expect(report.published).toEqual([...GALLERY_KEYS]);
    // Force mode never probes the watermark, so it cannot advance the cursor.
    expect(put.mock.calls.some((call: any[]) => call[0] === "publish:last-tx")).toBe(false);
  });

  it("when the fact load fails, every key reports the same failure", async () => {
    const { env } = makeEnv({ failPrepare: true });
    const report = await publishAll(env);
    expect(report.published).toEqual([]);
    expect(report.failed).toHaveLength(GALLERY_KEYS.length);
  });
});
