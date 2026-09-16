import { describe, it, expect, vi } from "vitest";

function makeRequest(auth?: string) {
  return new Request("http://localhost/api/publish", {
    method: "POST",
    headers: auth ? { Authorization: auth } : {},
  });
}

describe("Manual Publish Endpoint", () => {
  it("fails with 500 when TELEGRAM_SECRET_TOKEN is not configured", async () => {
    const jsonMock = vi.fn();
    const { onPost } = await import("./index");
    await onPost({ request: makeRequest(), platform: { env: {} }, json: jsonMock } as any);
    expect(jsonMock).toHaveBeenCalledWith(500, expect.objectContaining({ error: "TELEGRAM_SECRET_TOKEN not configured" }));
  });

  it("fails with 401 on a wrong bearer token", async () => {
    const jsonMock = vi.fn();
    const { onPost } = await import("./index");
    await onPost({
      request: makeRequest("Bearer wrong"),
      platform: { env: { TELEGRAM_SECRET_TOKEN: "secure_token" } },
      json: jsonMock,
    } as any);
    expect(jsonMock).toHaveBeenCalledWith(401, expect.objectContaining({ error: "Unauthorized" }));
  });

  it("publishes all sources and reports ok on success", async () => {
    const jsonMock = vi.fn();
    const put = vi.fn().mockResolvedValue(undefined);
    const all = vi.fn().mockResolvedValue({ results: [{ id: 1 }] });
    const prepare = vi.fn().mockReturnValue({ all });
    const { onPost } = await import("./index");

    await onPost({
      request: makeRequest("Bearer secure_token"),
      platform: { env: { TELEGRAM_SECRET_TOKEN: "secure_token", DB: { prepare }, CACHE: { put } } },
      json: jsonMock,
    } as any);

    expect(jsonMock).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ status: "ok" })
    );
    const body = jsonMock.mock.calls[0][1];
    expect(body.published).toHaveLength(6);
  });

  it("reports partial when a source fails but others publish", async () => {
    const jsonMock = vi.fn();
    const put = vi.fn().mockResolvedValue(undefined);
    const all = vi.fn().mockRejectedValue(new Error("d1 down"));
    const prepare = vi.fn().mockReturnValue({ all });
    const { onPost } = await import("./index");

    await onPost({
      request: makeRequest("Bearer secure_token"),
      platform: { env: { TELEGRAM_SECRET_TOKEN: "secure_token", DB: { prepare }, CACHE: { put } } },
      json: jsonMock,
    } as any);

    expect(jsonMock).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ status: "partial" })
    );
    const body = jsonMock.mock.calls[0][1];
    expect(body.failed).toHaveLength(6);
    expect(body.published).toHaveLength(0);
  });
});
