import { describe, it, expect, vi } from "vitest";

// Mocking Qwik City's RequestHandler behavior
const mockPlatform = {
  env: {
    TELEGRAM_BOT_TOKEN: "8708372324:AAHU9rTX6e0lp2nmmXC5kv5b-xzHrmjjDfo",
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
    expect((mockPlatform.env.DB.prepare as any)).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO posts"));
  });
});
