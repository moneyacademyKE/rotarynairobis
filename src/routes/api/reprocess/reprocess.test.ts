import { describe, it, expect, vi } from "vitest";

describe("AI Reprocessing Endpoint", () => {
  it("should fail with 401 if secret token does not match environment", async () => {
    const jsonMock = vi.fn();
    const mockPlatform = {
      env: {
        TELEGRAM_SECRET_TOKEN: "secure_token"
      }
    };
    const request = new Request("http://localhost/api/reprocess", {
      method: "POST",
      headers: {
        "Authorization": "Bearer wrong"
      }
    });

    const { onPost } = await import("./index");
    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    expect(jsonMock).toHaveBeenCalledWith(401, expect.objectContaining({ error: "Unauthorized" }));
  });

  it("should successfully fetch and enqueue the last 50 images", async () => {
    const jsonMock = vi.fn();
    const mockSend = vi.fn();
    
    const mockResults = [
      { id: 1, file_name: "photo_1.jpg" },
      { id: 2, file_name: "photo_2.jpg" }
    ];

    const mockDB = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: mockResults })
      })
    };

    const mockPlatform = {
      env: {
        TELEGRAM_SECRET_TOKEN: "secure_token",
        DB: mockDB,
        CLASSIFY_QUEUE: {
          send: mockSend
        }
      }
    };

    const request = new Request("http://localhost/api/reprocess", {
      method: "POST",
      headers: {
        "Authorization": "Bearer secure_token"
      }
    });

    const { onPost } = await import("./index");
    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);

    expect(mockDB.prepare).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenNthCalledWith(1, {
      fileName: "photo_1.jpg",
      imageUrl: "http://localhost/photos/photo_1.jpg"
    });

    expect(jsonMock).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        status: "Success",
        message: expect.stringContaining("Enqueued 2 images")
      })
    );
  });

  it("should fail with 500 if TELEGRAM_SECRET_TOKEN is not configured in environment", async () => {
    const jsonMock = vi.fn();
    const mockPlatform = { env: {} }; // Missing TELEGRAM_SECRET_TOKEN
    const request = new Request("http://localhost/api/reprocess", {
      method: "POST"
    });

    const { onPost } = await import("./index");
    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    expect(jsonMock).toHaveBeenCalledWith(500, expect.objectContaining({ error: "TELEGRAM_SECRET_TOKEN not configured" }));
  });

  it("should fail with 500 if database query fails and throws error", async () => {
    const jsonMock = vi.fn();
    const mockDB = {
      prepare: vi.fn().mockImplementation(() => {
        throw new Error("DB Connection Interrupted");
      })
    };
    const mockPlatform = {
      env: {
        TELEGRAM_SECRET_TOKEN: "secure_token",
        DB: mockDB
      }
    };
    const request = new Request("http://localhost/api/reprocess", {
      method: "POST",
      headers: {
        "Authorization": "Bearer secure_token"
      }
    });

    const { onPost } = await import("./index");
    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    expect(jsonMock).toHaveBeenCalledWith(500, expect.objectContaining({ error: "DB Connection Interrupted" }));
  });
});

