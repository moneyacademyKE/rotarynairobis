import { test, expect } from "bun:test";
import { telegramRead } from "./telegram-read";

test("transport reset is retried, with bounded backoff", async () => {
  let calls = 0;
  const waits: number[] = [];
  const request = (async () => {
    if (++calls < 3) throw Object.assign(new Error("reset"), { code: "ECONNRESET" });
    return new Response("ok");
  }) as typeof fetch;
  expect(await (await telegramRead("https://example.invalid", request, async ms => { waits.push(ms); })).text()).toBe("ok");
  expect(calls).toBe(3);
  expect(waits).toEqual([500, 1000]);
});

test("permanent transport failure is bounded and does not leak credentials", async () => {
  let calls = 0;
  const request = (async () => { calls++; throw new Error("https://botSECRET"); }) as typeof fetch;
  await expect(telegramRead("https://botSECRET", request, async () => {})).rejects.toThrow("NETWORK_ERROR");
  expect(calls).toBe(3);
});

test("server failures retry but authorization failures do not", async () => {
  let calls = 0;
  const request = (async () => new Response("", { status: ++calls === 1 ? 502 : 401 })) as typeof fetch;
  expect((await telegramRead("https://example.invalid", request, async () => {})).status).toBe(401);
  expect(calls).toBe(2);
});
