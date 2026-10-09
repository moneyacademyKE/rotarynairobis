import { describe, expect, it, vi } from "vitest";
import {
  findFileId,
  parseTelegramUid,
  servePhoto,
  type PhotoEnv,
} from "./photo-source";

vi.mock("./telegram", () => ({
  getFile: vi.fn(async (_token: string, fileId: string) => {
    if (fileId === "bad") throw new Error("wrong file_id");
    return { file_id: fileId, file_path: `photos/file_${fileId}.jpg` };
  }),
  getDownloadUrl: (_token: string, path: string) => `https://tg.example/${path}`,
}));

const RAW = JSON.stringify({
  channel_post: {
    message_id: 42,
    photo: [
      { file_id: "small-id", file_unique_id: "SMALLUID" },
      { file_id: "big-id", file_unique_id: "UID123" },
    ],
  },
});

function makeEnv(overrides: Partial<PhotoEnv> = {}): PhotoEnv & {
  kv: Map<string, string>;
} {
  const kv = new Map<string, string>();
  return {
    kv,
    DB: {
      prepare: () => ({
        bind: () => ({ first: async <T,>() => ({ raw_json: RAW }) as T }),
      }),
    },
    CACHE: {
      get: async (k) => kv.get(k) ?? null,
      put: async (k, v) => void kv.set(k, v),
    },
    TELEGRAM_BOT_TOKEN: "token",
    ...overrides,
  };
}

const okStream = () =>
  new Response(new ReadableStream({ start: (c) => c.close() }), {
    status: 200,
  });

describe("parseTelegramUid", () => {
  it("extracts the file_unique_id from telegram_ filenames", () => {
    expect(parseTelegramUid("telegram_ABC-123_x.jpg")).toBe("ABC-123_x");
  });

  it("rejects non-telegram names", () => {
    expect(parseTelegramUid("random.png")).toBeNull();
    expect(parseTelegramUid("telegram_.jpg")).toBeNull();
  });
});

describe("findFileId", () => {
  it("returns the file_id of the matching photo size", () => {
    expect(findFileId(RAW, "UID123")).toBe("big-id");
    expect(findFileId(RAW, "SMALLUID")).toBe("small-id");
  });

  it("returns null for unknown uid, malformed json, or photo-less updates", () => {
    expect(findFileId(RAW, "NOPE")).toBeNull();
    expect(findFileId("not json", "UID123")).toBeNull();
    expect(findFileId(JSON.stringify({ channel_post: {} }), "UID123")).toBeNull();
  });
});

describe("servePhoto", () => {
  it("serves from R2 when the binding exists and hits", async () => {
    const env = makeEnv({
      PHOTOS: {
        get: async () => ({
          body: new ReadableStream({ start: (c) => c.close() }),
          httpEtag: "etag",
          writeHttpMetadata: () => {},
        }),
      },
    });
    const res = await servePhoto("telegram_UID123.jpg", env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("immutable");
  });

  it("falls back to Telegram end-to-end on a cold cache (D1 -> getFile -> stream)", async () => {
    const env = makeEnv();
    const res = await servePhoto("telegram_UID123.jpg", env, async () => okStream());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(env.kv.get("tg:id:UID123")).toBe("big-id");
    expect(env.kv.get("tg:path:UID123")).toBe("photos/file_big-id.jpg");
  });

  it("serves from the KV path cache without touching D1", async () => {
    const env = makeEnv();
    env.kv.set("tg:path:UID123", "photos/file_big-id.jpg");
    let dbTouched = false;
    env.DB = {
      prepare: () => {
        dbTouched = true;
        return { bind: () => ({ first: async () => null }) };
      },
    };
    const res = await servePhoto("telegram_UID123.jpg", env, async () => okStream());
    expect(res.status).toBe(200);
    expect(dbTouched).toBe(false);
  });

  it("404s for unknown file shapes and 502s when Telegram fails", async () => {
    const env = makeEnv();
    expect((await servePhoto("random.png", env)).status).toBe(404);

    const badRaw = {
      prepare: () => ({
        bind: () => ({
          first: async <T,>() =>
            ({
              raw_json: JSON.stringify({
                channel_post: { photo: [{ file_id: "bad", file_unique_id: "UID9" }] },
              }),
            }) as T,
        }),
      }),
    };
    const res = await servePhoto(
      "telegram_UID9.jpg",
      { ...env, DB: badRaw },
      async () => okStream()
    );
    expect(res.status).toBe(502);
  });
});
