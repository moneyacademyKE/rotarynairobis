import { describe, it, expect, vi, afterEach } from "vitest";
import {
  classifyImage,
  classifyWithInferhub,
  classifyWithOpenRouter,
  decideImageType,
  DEFAULT_MAIN_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  OPENROUTER_DECISIONS_URL,
} from "./classify-client";

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

describe("classifyImage OpenRouter routing", () => {
  it("uses the OpenRouter decisions path first when OPENROUTER_API_KEY is set", async () => {
    const openrouter = vi.fn().mockResolvedValue('{"type":"BIRTHDAY","snippet":"hint"}');
    const main = vi.fn();
    const fallback = vi.fn();
    const out = await classifyImage(
      "b64",
      "image/jpeg",
      { OPENROUTER_API_KEY: "or", INFERSHUB_API_KEY: "k", GEMINI_API_KEY: "g" },
      { main, fallback, openrouter },
      "the caption",
    );
    expect(out).toContain("BIRTHDAY");
    expect(openrouter).toHaveBeenCalledOnce();
    expect(openrouter.mock.calls[0][3]).toBe("the caption");
    expect(main).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
  });

  it("falls back to inferhub when the decisions path throws", async () => {
    const openrouter = vi.fn().mockRejectedValue(new Error("400 decisions"));
    const main = vi.fn().mockResolvedValue('{"type":"PHOTO","snippet":"x"}');
    const fallback = vi.fn();
    const out = await classifyImage(
      "b64",
      "image/jpeg",
      { OPENROUTER_API_KEY: "or", INFERSHUB_API_KEY: "k" },
      { main, fallback, openrouter },
    );
    expect(out).toContain("PHOTO");
    expect(main).toHaveBeenCalledOnce();
    expect(fallback).not.toHaveBeenCalled();
  });
});

describe("decideImageType request shape", () => {
  it("posts a choice question to the decisions endpoint and returns the winning type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ answers: { category: { type: "choice", choice: "EVENT_POSTER", confidence: 0.97 } } }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const out = await decideImageType({ OPENROUTER_API_KEY: "or" }, "b64", "image/jpeg");
    expect(out).toEqual({ type: "EVENT_POSTER", confidence: 0.97 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(OPENROUTER_DECISIONS_URL);
    const body = JSON.parse(init.body);
    expect(body.model).toBe(DEFAULT_OPENROUTER_MODEL);
    expect(body.questions.category.type).toBe("choice");
    expect(Object.keys(body.questions.category.criteria).sort()).toEqual(
      ["BIRTHDAY", "EVENT_POSTER", "EVENT_RECAP", "PHOTO"],
    );
    expect(body.state[0].image_url.url).toBe("data:image/jpeg;base64,b64");
    expect(init.headers.Authorization).toBe("Bearer or");
  });

  it("throws on an invalid choice (so the fallback chain engages)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ answers: { category: { choice: "NOT_A_TYPE" } } }), { status: 200 }),
      ),
    );
    await expect(decideImageType({ OPENROUTER_API_KEY: "or" }, "b64", "image/jpeg")).rejects.toThrow(
      /invalid choice/,
    );
  });

  it("attaches status on HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 429 })));
    await expect(decideImageType({ OPENROUTER_API_KEY: "or" }, "b64", "image/jpeg")).rejects.toMatchObject({
      status: 429,
    });
  });
});

describe("classifyWithOpenRouter snippet", () => {
  it("uses the caption hint as the snippet (decision models write no text)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ answers: { category: { choice: "PHOTO", confidence: 0.9 } } }), { status: 200 }),
      ),
    );
    const out = await classifyWithOpenRouter({ OPENROUTER_API_KEY: "or" }, "b64", "image/jpeg", "Members planting trees");
    expect(JSON.parse(out)).toEqual({ type: "PHOTO", snippet: "Members planting trees" });
  });

  it("falls back to a generic snippet when no caption exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ answers: { category: { choice: "PHOTO", confidence: 0.9 } } }), { status: 200 }),
      ),
    );
    const out = await classifyWithOpenRouter({ OPENROUTER_API_KEY: "or" }, "b64", "image/jpeg");
    expect(JSON.parse(out).snippet).toContain("Nairobi South");
  });
});
