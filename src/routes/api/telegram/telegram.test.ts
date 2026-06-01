import { describe, it, expect, vi, afterEach } from "vitest";

// Mocking Qwik City's RequestHandler behavior
const mockPlatform = {
  env: {
    TELEGRAM_BOT_TOKEN: "FAKE_TOKEN_FOR_TESTS",
    TELEGRAM_SECRET_TOKEN: "test_secret_token",
    DB: {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    },
    CLASSIFY_QUEUE: {
      send: vi.fn().mockResolvedValue(undefined),
    },
    PHOTOS: {
      put: vi.fn().mockResolvedValue(undefined),
    },
  },
};

import { onPost } from "./index";

describe("Telegram Webhook Ingestion (TDD Green)", () => {
  it("should fail with 401 if secret token is missing", async () => {
    const jsonMock = vi.fn();
    const request = new Request("http://localhost/api/telegram", {
      method: "POST",
      body: JSON.stringify({ update_id: 123 }),
      headers: { "X-Telegram-Bot-Api-Secret-Token": "wrong_token" }
    });

    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    expect(jsonMock).toHaveBeenCalledWith(401, expect.anything());
  });

  it("should ignore standard messages (Ingestion Only mode)", async () => {
    const jsonMock = vi.fn();
    const request = new Request("http://localhost/api/telegram", {
      method: "POST",
      body: JSON.stringify({ 
        update_id: 111,
        message: { message_id: 1, text: "Private hello" }
      }),
      headers: { "X-Telegram-Bot-Api-Secret-Token": "test_secret_token" }
    });

    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    expect(jsonMock).toHaveBeenCalledWith(200, expect.objectContaining({ status: "Not a channel post (Ignored)" }));
  });

  it("should succeed and store facts for a channel_post (No Attribution)", async () => {
    const jsonMock = vi.fn();
    const request = new Request("http://localhost/api/telegram", {
      method: "POST",
      body: JSON.stringify({ 
        update_id: 999,
        channel_post: {
          message_id: 456,
          chat: { id: -100123, type: "channel", title: "Test Channel" },
          text: "Broadcast Content",
        }
      }),
      headers: { "X-Telegram-Bot-Api-Secret-Token": "test_secret_token" }
    });

    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    
    expect(jsonMock).toHaveBeenCalledWith(200, expect.objectContaining({ status: "Success", update_id: 999 }));
    
    // Verify Fact Accretion
    expect((mockPlatform.env.DB.prepare as any)).toHaveBeenCalledWith(expect.stringContaining("INSERT OR IGNORE INTO telegram_raw_facts"));
    
    // Verify Account is null (No Attribution)
    expect((mockPlatform.env.DB.prepare as any)).toHaveBeenCalledWith(expect.stringContaining("posts_facts"));
  });

  it("should merge text replies into parent posts if parent has photos", async () => {
    const jsonMock = vi.fn();
    
    // Mock DB behavior specifically for this test to return parent photos_json
    const mockDbPrepare = mockPlatform.env.DB.prepare as any;
    mockDbPrepare.mockImplementation((query: string) => {
      if (query.includes("SELECT photos_json")) {
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ photos_json: '["parent_photo.jpg"]' }),
          }),
        };
      }
      return {
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      };
    });

    const request = new Request("http://localhost/api/telegram", {
      method: "POST",
      body: JSON.stringify({ 
        update_id: 1001,
        channel_post: {
          message_id: 2046,
          reply_to_message: {
            message_id: 2045,
            photo: [{ file_id: "xyz", file_unique_id: "abc", file_size: 10 }]
          },
          text: "Reply text caption",
        }
      }),
      headers: { "X-Telegram-Bot-Api-Secret-Token": "test_secret_token" }
    });

    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    
    expect(jsonMock).toHaveBeenCalledWith(200, expect.objectContaining({ status: "Success" }));
    expect(mockDbPrepare).toHaveBeenCalledWith(expect.stringContaining("SELECT photos_json FROM posts WHERE id = ?"));
    expect(mockDbPrepare).toHaveBeenCalledWith(expect.stringContaining("posts_facts"));
  });

  it("should fail gracefully if TELEGRAM_BOT_TOKEN is missing in environment", async () => {
    const jsonMock = vi.fn();
    const badPlatform = { env: { DB: mockPlatform.env.DB } };
    const request = new Request("http://localhost/api/telegram");

    const { onGet } = await import("./index");
    await onGet({ request, platform: badPlatform, json: jsonMock } as any);
    expect(jsonMock).toHaveBeenCalledWith(500, expect.objectContaining({ error: expect.stringContaining("TELEGRAM_BOT_TOKEN") }));
  });

  describe("onGet - Self Healing & Diagnostics", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("should return healthy status if webhook URL is already aligned", async () => {
      const jsonMock = vi.fn();
      const mockDB = {
        prepare: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(42),
        }),
      };
      const platform = {
        env: {
          TELEGRAM_BOT_TOKEN: "token123",
          TELEGRAM_SECRET_TOKEN: "secret123",
          DB: mockDB,
        },
      };
      const request = new Request("http://localhost/api/telegram");

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          ok: true,
          result: { url: "http://localhost/api/telegram" },
        }),
      } as Response);

      const { onGet } = await import("./index");
      await onGet({ request, platform, json: jsonMock } as any);

      expect(jsonMock).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          status: "Healthy",
          heal_status: "Webhook is perfectly aligned. No action needed.",
          database_facts_count: 42,
        })
      );
    });

    it("should fail with 500 if webhook is not aligned but TELEGRAM_SECRET_TOKEN is missing", async () => {
      const jsonMock = vi.fn();
      const platform = {
        env: {
          TELEGRAM_BOT_TOKEN: "token123",
          // missing TELEGRAM_SECRET_TOKEN
        },
      };
      const request = new Request("http://localhost/api/telegram");

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          ok: true,
          result: { url: "http://wrong-url/api/telegram" },
        }),
      } as Response);

      const { onGet } = await import("./index");
      await onGet({ request, platform, json: jsonMock } as any);

      expect(jsonMock).toHaveBeenCalledWith(
        500,
        expect.objectContaining({ error: "TELEGRAM_SECRET_TOKEN not configured" })
      );
    });

    it("should trigger webhook self-healing if URL is not aligned and secret is provided", async () => {
      const jsonMock = vi.fn();
      const mockDB = {
        prepare: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(100),
        }),
      };
      const platform = {
        env: {
          TELEGRAM_BOT_TOKEN: "token123",
          TELEGRAM_SECRET_TOKEN: "secret123",
          DB: mockDB,
        },
      };
      const request = new Request("http://localhost/api/telegram");

      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("getWebhookInfo")) {
          return Promise.resolve({
            json: async () => ({
              ok: true,
              result: { url: "http://wrong-url/api/telegram" },
            }),
          } as Response);
        }
        if (url.includes("setWebhook")) {
          return Promise.resolve({
            json: async () => ({ ok: true }),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      const { onGet } = await import("./index");
      await onGet({ request, platform, json: jsonMock } as any);

      expect(jsonMock).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          status: "Healthy",
          heal_status: expect.stringContaining("Successfully healed!"),
        })
      );
    });
  });

  describe("onPost - Error paths and Media processing", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("should fail with 400 if update_id is missing", async () => {
      const jsonMock = vi.fn();
      const request = new Request("http://localhost/api/telegram", {
        method: "POST",
        headers: {
          "X-Telegram-Bot-Api-Secret-Token": "test_secret_token",
        },
        body: JSON.stringify({}), // Missing update_id
      });

      await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
      expect(jsonMock).toHaveBeenCalledWith(400, expect.objectContaining({ error: "Invalid update" }));
    });

    it("should fail with 500 if database preparer throws an error", async () => {
      const jsonMock = vi.fn();
      const badDB = {
        prepare: vi.fn().mockImplementation(() => {
          throw new Error("D1 IO Failure");
        }),
      };
      const badPlatform = {
        env: {
          TELEGRAM_BOT_TOKEN: "bot_token",
          TELEGRAM_SECRET_TOKEN: "test_secret_token",
          DB: badDB,
        },
      };
      const request = new Request("http://localhost/api/telegram", {
        method: "POST",
        headers: {
          "X-Telegram-Bot-Api-Secret-Token": "test_secret_token",
        },
        body: JSON.stringify({ update_id: 12345 }),
      });

      await onPost({ request, platform: badPlatform, json: jsonMock } as any);
      expect(jsonMock).toHaveBeenCalledWith(500, expect.objectContaining({ error: "D1 IO Failure" }));
    });

    it("should successfully ingest photo media and queue it for classification", async () => {
      const jsonMock = vi.fn();
      const mockPut = vi.fn().mockResolvedValue(undefined);
      const mockSend = vi.fn().mockResolvedValue(undefined);
      const mockDB = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        }),
      };
      const platform = {
        env: {
          TELEGRAM_BOT_TOKEN: "bot_token",
          TELEGRAM_SECRET_TOKEN: "test_secret_token",
          DB: mockDB,
          PHOTOS: {
            put: mockPut,
          },
          CLASSIFY_QUEUE: {
            send: mockSend,
          },
        },
      };

      const request = new Request("http://localhost/api/telegram", {
        method: "POST",
        headers: {
          "X-Telegram-Bot-Api-Secret-Token": "test_secret_token",
        },
        body: JSON.stringify({
          update_id: 8888,
          channel_post: {
            message_id: 777,
            chat: { id: -1001, type: "channel" },
            date: 1234567,
            text: "Event poster announcement",
            photo: [
              { file_id: "small_id", file_unique_id: "small_uniq" },
              { file_id: "large_id", file_unique_id: "large_uniq" }, // largest photo at the end
            ],
          },
        }),
      });

      // Mock fetch requests for getFile and photo download
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("getFile")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              result: {
                file_id: "large_id",
                file_unique_id: "large_uniq",
                file_path: "photos/photo_file.jpg",
              },
            }),
          } as Response);
        }
        if (url.includes("file/bot")) {
          return Promise.resolve({
            ok: true,
            blob: async () => new Blob(["image data"], { type: "image/jpeg" }),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      const { onPost } = await import("./index");
      await onPost({ request, platform, json: jsonMock } as any);

      expect(mockPut).toHaveBeenCalledWith("telegram_large_uniq.jpg", expect.any(Blob), {
        customMetadata: { origin: "telegram", update_id: "8888" },
      });
      expect(mockSend).toHaveBeenCalledWith({
        fileName: "telegram_large_uniq.jpg",
        imageUrl: "http://localhost/photos/telegram_large_uniq.jpg",
      });
      expect(jsonMock).toHaveBeenCalledWith(200, expect.objectContaining({ status: "Success", update_id: 8888 }));
    });

    it("should fail with 500 if TELEGRAM_SECRET_TOKEN is missing during onPost", async () => {
      const jsonMock = vi.fn();
      const platform = { env: {} }; // Missing secret token
      const request = new Request("http://localhost/api/telegram", {
        method: "POST",
        headers: {
          "X-Telegram-Bot-Api-Secret-Token": "some_token",
        },
        body: JSON.stringify({ update_id: 12345 }),
      });

      await onPost({ request, platform, json: jsonMock } as any);
      expect(jsonMock).toHaveBeenCalledWith(500, expect.objectContaining({ error: "TELEGRAM_SECRET_TOKEN not configured" }));
    });
  });
});


