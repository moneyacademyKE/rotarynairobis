/** Bounded retries for idempotent Telegram reads; never log token-bearing URLs. */
export async function telegramRead(
  url: string,
  request: typeof fetch = fetch,
  sleep: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await request(url, { signal: AbortSignal.timeout(15_000) });
      if (response.status < 500) return response;
      await response.body?.cancel();
      if (attempt === 2) throw new Error("Telegram upstream unavailable");
    } catch (error) {
      if (attempt === 2) {
        // Fetch errors can embed the entire URL, including the bot credential.
        const code = String((error as { code?: string }).code ?? "NETWORK_ERROR");
        throw new Error(`Telegram read failed after 3 attempts (${/^[A-Z_]+$/.test(code) ? code : "NETWORK_ERROR"})`);
      }
    }
    await sleep(500 * 2 ** attempt);
  }
  throw new Error("Telegram read exhausted");
}
