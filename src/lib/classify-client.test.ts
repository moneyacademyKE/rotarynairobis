import { describe, it, expect, vi, afterEach } from "vitest";
import { classifyImage, classifyWithInferhub, DEFAULT_MAIN_MODEL } from "./classify-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("classifyImage routing", () => {
  it("uses the main inferhub path when INFERSHUB_API_KEY is set", async () => {
    const main = vi.fn().mockResolvedValue('{"type":"PHOTO","snippet":"x"}');
    const fallback = vi.fn();
    const out = await classifyImage(
      "b64",
      "image/jpeg",
      { INFERSHUB_API_KEY: "k", GEMINI_API_KEY: "g" },
      { main, fallback },
    );
    expect(out).toContain("PHOTO");
    expect(main).toHaveBeenCalledOnce();
    expect(fallback).not.toHaveBeenCalled();
  });

  it("falls back to Gemini when the main path throws", async () => {
    const main = vi.fn().mockRejectedValue(new Error("502 bad gateway"));
    const fallback = vi.fn().mockResolvedValue('{"type":"BIRTHDAY","snippet":"y"}');
    const out = await classifyImage(
      "b64",
      "image/jpeg",
      { INFERSHUB_API_KEY: "k", GEMINI_API_KEY: "g" },
      { main, fallback },
    );
    expect(out).toContain("BIRTHDAY");
    expect(fallback).toHaveBeenCalledOnce();
  });

  it("goes straight to Gemini when no inferhub key is configured", async () => {
    const main = vi.fn();
    const fallback = vi.fn().mockResolvedValue('{"type":"PHOTO","snippet":"z"}');
    const out = await classifyImage("b64", "image/jpeg", { GEMINI_API_KEY: "g" }, { main, fallback });
    expect(out).toContain("PHOTO");
    expect(main).not.toHaveBeenCalled();
  });
});

describe("classifyWithInferhub request shape", () => {
  it("posts an OpenAI-compatible vision payload in json mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: '{"type":"PHOTO","snippet":"ok"}' } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const out = await classifyWithInferhub({ INFERSHUB_API_KEY: "k" }, "b64", "image/jpeg");

    expect(out).toContain("PHOTO");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.inferhub.dev/v1/chat/completions");
    const body = JSON.parse(init.body);
    expect(body.model).toBe(DEFAULT_MAIN_MODEL);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].content[0].text).toContain("JSON object");
    expect(body.messages[0].content[1].image_url.url).toBe("data:image/jpeg;base64,b64");
    expect(init.headers.Authorization).toBe("Bearer k");
  });

  it("throws with status attached on HTTP errors (batch retry relies on it)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("upstream exploded", { status: 503 })),
    );
    await expect(classifyWithInferhub({ INFERSHUB_API_KEY: "k" }, "b64", "image/jpeg")).rejects.toMatchObject({
      status: 503,
    });
  });
});
