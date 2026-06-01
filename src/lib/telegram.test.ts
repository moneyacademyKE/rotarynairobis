import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setWebhook, getFile, getDownloadUrl, sendMessage } from "./telegram";

describe("Telegram Bot API Helpers", () => {
  const originalFetch = globalThis.fetch;
  const mockToken = "123456:ABC-DEF";

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("setWebhook", () => {
    it("should call setWebhook API successfully", async () => {
      const mockResponse = { ok: true, result: true };
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const res = await setWebhook(mockToken, "https://example.com/webhook", "my_secret");
      expect(res).toEqual(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.telegram.org/bot123456:ABC-DEF/setWebhook",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            url: "https://example.com/webhook",
            secret_token: "my_secret",
            allowed_updates: ["channel_post", "edited_channel_post"],
          }),
        })
      );
    });

    it("should throw error if HTTP request fails", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      } as Response);

      await expect(
        setWebhook(mockToken, "https://example.com/webhook", "my_secret")
      ).rejects.toThrow("Telegram setWebhook HTTP error: 400 Bad Request");
    });

    it("should throw error if Telegram API reports not ok", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, description: "Invalid URL" }),
      } as Response);

      await expect(
        setWebhook(mockToken, "https://example.com/webhook", "my_secret")
      ).rejects.toThrow("Telegram setWebhook failed: Invalid URL");
    });
  });

  describe("getFile", () => {
    it("should fetch file info successfully", async () => {
      const mockResult = { file_id: "file123", file_unique_id: "uniq123", file_path: "path/to/file.jpg" };
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: mockResult }),
      } as Response);

      const res = await getFile(mockToken, "file123");
      expect(res).toEqual(mockResult);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.telegram.org/bot123456:ABC-DEF/getFile?file_id=file123"
      );
    });

    it("should URL-encode fileId parameters to prevent injection", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: {} }),
      } as Response);

      await getFile(mockToken, "file/123?foo=bar");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.telegram.org/bot123456:ABC-DEF/getFile?file_id=file%2F123%3Ffoo%3Dbar"
      );
    });

    it("should throw error if HTTP request fails", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      await expect(getFile(mockToken, "file123")).rejects.toThrow(
        "Telegram getFile HTTP error: 404 Not Found"
      );
    });

    it("should throw error if Telegram API reports not ok", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, description: "File not found" }),
      } as Response);

      await expect(getFile(mockToken, "file123")).rejects.toThrow(
        "Telegram getFile failed: File not found"
      );
    });
  });

  describe("getDownloadUrl", () => {
    it("should return the formatted file download path", () => {
      const url = getDownloadUrl(mockToken, "photos/file_0.jpg");
      expect(url).toBe("https://api.telegram.org/file/bot123456:ABC-DEF/photos/file_0.jpg");
    });
  });

  describe("sendMessage", () => {
    it("should send message successfully", async () => {
      const mockResult = { ok: true, result: { message_id: 99 } };
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const res = await sendMessage(mockToken, 12345, "Hello World");
      expect(res).toEqual(mockResult);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.telegram.org/bot123456:ABC-DEF/sendMessage",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ chat_id: 12345, text: "Hello World" }),
        })
      );
    });

    it("should throw error if HTTP request fails", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
      } as Response);

      await expect(sendMessage(mockToken, 12345, "Hello")).rejects.toThrow(
        "Telegram sendMessage HTTP error: 500 Server Error"
      );
    });

    it("should throw error if Telegram API reports not ok", async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, description: "Chat not found" }),
      } as Response);

      await expect(sendMessage(mockToken, 12345, "Hello")).rejects.toThrow(
        "Telegram sendMessage failed: Chat not found"
      );
    });
  });
});
