import { describe, it, expect, vi } from "vitest";
import { cachedQuery } from "./db-cache";

function makeEnv({ rows = [{ id: 1 }], cached = null as any } = {}) {
  const get = vi.fn().mockResolvedValue(cached);
  const put = vi.fn().mockResolvedValue(undefined);
  const all = vi.fn().mockResolvedValue({ results: rows });
  const prepare = vi.fn().mockReturnValue({ all });
  return {
    env: { CACHE: { get, put }, DB: { prepare } },
    get,
    put,
    all,
    prepare,
    rows,
  };
}

describe("cachedQuery", () => {
  it("returns KV hit without touching D1", async () => {
    const ctx = makeEnv({ cached: [{ id: 9 }] });
    const rows = await cachedQuery(ctx.env, "k", "SELECT 1");
    expect(rows).toEqual([{ id: 9 }]);
    expect(ctx.prepare).not.toHaveBeenCalled();
    expect(ctx.put).not.toHaveBeenCalled();
  });

  it("queries D1 on miss and writes back with TTL", async () => {
    const ctx = makeEnv();
    const rows = await cachedQuery(ctx.env, "k", "SELECT 1", 600);
    expect(rows).toEqual([{ id: 1 }]);
    expect(ctx.prepare).toHaveBeenCalledWith("SELECT 1");
    expect(ctx.put).toHaveBeenCalledWith("k", JSON.stringify([{ id: 1 }]), {
      expirationTtl: 600,
    });
  });

  it("still returns rows when the KV write fails", async () => {
    const ctx = makeEnv();
    ctx.put.mockRejectedValue(new Error("kv down"));
    const rows = await cachedQuery(ctx.env, "k", "SELECT 1");
    expect(rows).toEqual([{ id: 1 }]);
  });

  it("still returns rows when the KV read fails", async () => {
    const ctx = makeEnv();
    ctx.get.mockRejectedValue(new Error("kv down"));
    const rows = await cachedQuery(ctx.env, "k", "SELECT 1");
    expect(rows).toEqual([{ id: 1 }]);
    expect(ctx.prepare).toHaveBeenCalled();
  });
});
