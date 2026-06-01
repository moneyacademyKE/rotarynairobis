import { describe, it, expect, vi } from "vitest";
import { onPost } from "./index";

describe("AI Job Classification Ingestion Endpoint", () => {
  it("should fail with 401 if request is unauthorized", async () => {
    const jsonMock = vi.fn();
    const mockPlatform = {
      env: {
        CLASSIFY_API_SECRET: "my_secret_key",
      },
    };
    const request = new Request("http://localhost/api/classify", {
      method: "POST",
      headers: {
        Authorization: "Bearer wrong_token",
      },
    });

    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    expect(jsonMock).toHaveBeenCalledWith(401, expect.objectContaining({ error: "Unauthorized" }));
  });

  it("should fail with 500 if no auth secrets are configured in environment", async () => {
    const jsonMock = vi.fn();
    const mockPlatform = {
      env: {}, // No secrets at all
    };
    const request = new Request("http://localhost/api/classify", {
      method: "POST",
    });

    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    expect(jsonMock).toHaveBeenCalledWith(500, expect.objectContaining({ error: expect.stringContaining("No auth secret configured") }));
  });

  it("should fall back to GEMINI_API_KEY if CLASSIFY_API_SECRET is missing", async () => {
    const jsonMock = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mockSend = vi.fn().mockResolvedValue(undefined);
    
    const mockPlatform = {
      env: {
        GEMINI_API_KEY: "gemini_key",
        CLASSIFY_QUEUE: {
          send: mockSend,
        },
      },
    };

    const request = new Request("http://localhost/api/classify", {
      method: "POST",
      headers: {
        Authorization: "Bearer gemini_key",
      },
      body: JSON.stringify({
        fileName: "test.jpg",
        imageUrl: "http://example.com/test.jpg",
      }),
    });

    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    expect(warnSpy).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledWith({
      fileName: "test.jpg",
      imageUrl: "http://example.com/test.jpg",
    });
    expect(jsonMock).toHaveBeenCalledWith(202, expect.objectContaining({ status: "Enqueued" }));
    
    warnSpy.mockRestore();
  });

  it("should fail with 400 if required parameters are missing in payload", async () => {
    const jsonMock = vi.fn();
    const mockPlatform = {
      env: {
        CLASSIFY_API_SECRET: "my_secret_key",
      },
    };

    const request = new Request("http://localhost/api/classify", {
      method: "POST",
      headers: {
        Authorization: "Bearer my_secret_key",
      },
      body: JSON.stringify({
        fileName: "test.jpg", // Missing imageUrl
      }),
    });

    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    expect(jsonMock).toHaveBeenCalledWith(400, expect.objectContaining({ error: expect.stringContaining("required") }));
  });

  it("should successfully enqueue job when authorized and parameters are valid", async () => {
    const jsonMock = vi.fn();
    const mockSend = vi.fn().mockResolvedValue(undefined);
    const mockPlatform = {
      env: {
        CLASSIFY_API_SECRET: "my_secret_key",
        CLASSIFY_QUEUE: {
          send: mockSend,
        },
      },
    };

    const request = new Request("http://localhost/api/classify", {
      method: "POST",
      headers: {
        Authorization: "Bearer my_secret_key",
      },
      body: JSON.stringify({
        fileName: "photo.jpg",
        imageUrl: "http://example.com/photo.jpg",
      }),
    });

    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    expect(mockSend).toHaveBeenCalledWith({
      fileName: "photo.jpg",
      imageUrl: "http://example.com/photo.jpg",
    });
    expect(jsonMock).toHaveBeenCalledWith(202, expect.objectContaining({ status: "Enqueued" }));
  });

  it("should fail with 500 if queue dispatch throws an error", async () => {
    const jsonMock = vi.fn();
    const mockSend = vi.fn().mockRejectedValue(new Error("Queue offline"));
    const mockPlatform = {
      env: {
        CLASSIFY_API_SECRET: "my_secret_key",
        CLASSIFY_QUEUE: {
          send: mockSend,
        },
      },
    };

    const request = new Request("http://localhost/api/classify", {
      method: "POST",
      headers: {
        Authorization: "Bearer my_secret_key",
      },
      body: JSON.stringify({
        fileName: "photo.jpg",
        imageUrl: "http://example.com/photo.jpg",
      }),
    });

    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    expect(jsonMock).toHaveBeenCalledWith(500, expect.objectContaining({ error: "Failed to enqueue job" }));
  });

  it("should fail with 401 if Authorization header is not a string", async () => {
    const jsonMock = vi.fn();
    const mockPlatform = {
      env: {
        CLASSIFY_API_SECRET: "my_secret_key",
      },
    };
    const request = {
      headers: {
        get: () => 12345, // returns a number, triggering the non-string guard
      },
      json: async () => ({}),
    };

    await onPost({ request, platform: mockPlatform, json: jsonMock } as any);
    expect(jsonMock).toHaveBeenCalledWith(401, expect.objectContaining({ error: "Unauthorized" }));
  });
});

