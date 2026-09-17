import { describe, it, expect, vi } from "vitest";
import { publishAll, handleScheduled, SOURCES, PUBLISH_TTL_SECONDS } from "./publish";

function makeEnv({ failSql, failPut }: { failSql?: RegExp; failPut?: string } = {}) {
  const put = vi.fn().mockResolvedValue(undefined);
  if (failPut) {
    put.mockImplementation((key: string) =>
      key === failPut ? Promise.reject(new Error("kv down")) : Promise.resolve(undefined)
    );
  }
  const prepare = vi.fn().mockImplementation((sql: string) => {
    if (failSql && failSql.test(sql)) {
      return { all: vi.fn().mockRejectedValue(new Error("d1 exploded")) };
    }
    return { all: vi.fn().mockResolvedValue({ results: [{ id: 1, sql }] }) };
  });
  return { env: { DB: { prepare }, CACHE: { put } }, put, prepare };
}

describe("publishAll", () => {
  it("writes every source to KV with the publish TTL", async () => {
    const ctx = makeEnv();
    const report = await publishAll(ctx.env);

    expect(report.published).toEqual(Object.keys(SOURCES));
    expect(report.failed).toEqual([]);
    expect(ctx.put).toHaveBeenCalledTimes(Object.keys(SOURCES).length);
    const firstPut = ctx.put.mock.calls[0];
    expect(firstPut[2]).toEqual({ expirationTtl: PUBLISH_TTL_SECONDS });
  });

  it("prepares the exact SQL each route serves", async () => {
    const ctx = makeEnv();
    await publishAll(ctx.env);

    for (const [key, sql] of Object.entries(SOURCES)) {
      expect(ctx.prepare).toHaveBeenCalledWith(sql);
      const call = ctx.put.mock.calls.find((c) => c[0] === key);
      expect(call).toBeDefined();
      expect(JSON.parse(call![1])).toEqual([{ id: 1, sql }]);
    }
  });

  it("isolates failures: one broken source does not abort the rest", async () => {
    const ctx = makeEnv({ failSql: /search:snapshot|LIMIT 500/ });
    const report = await publishAll(ctx.env);

    expect(report.published).not.toContain("search:snapshot");
    expect(report.published).toHaveLength(Object.keys(SOURCES).length - 1);
    expect(report.failed).toEqual([
      { key: "search:snapshot", error: "d1 exploded" },
    ]);
  });

  it("records a KV write failure instead of throwing", async () => {
    const ctx = makeEnv({ failPut: "gallery:tiktok" });
    const report = await publishAll(ctx.env);

    expect(report.published).not.toContain("gallery:tiktok");
    expect(report.failed[0].key).toBe("gallery:tiktok");
    expect(report.failed[0].error).toBe("kv down");
  });
});

describe("SOURCES contract", () => {
  it("keys are unique and every query is bounded", () => {
    const keys = Object.keys(SOURCES);
    expect(new Set(keys).size).toBe(keys.length);
    for (const sql of Object.values(SOURCES)) {
      expect(sql).toMatch(/LIMIT \d+/i);
    }
  });

  it("covers the search snapshot and the five galleries", () => {
    for (const key of [
      "gallery:tiktok",
      "gallery:instagram",
      "gallery:birthdays",
      "gallery:recaps",
      "gallery:events",
      "search:snapshot",
    ]) {
      expect(SOURCES[key]).toBeTruthy();
    }
  });
});

describe("handleScheduled", () => {
  it("publishes and returns the report", async () => {
    const ctx = makeEnv();
    const report = await handleScheduled(ctx.env);
    expect(report.published).toEqual(Object.keys(SOURCES));
    expect(ctx.put).toHaveBeenCalled();
  });
});
