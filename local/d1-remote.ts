/**
 * D1 REST client (read-only) — used while the live worker still owns the data.
 *
 * Mirror-mode sync pulls incremental fact rows through this; once the local
 * poller owns ingestion (cutover), this module shrinks to an archive tool.
 * Creds come from the environment (see local/README.md); never from code.
 */

export interface D1RemoteEnv {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_EMAIL: string;
  CLOUDFLARE_API_KEY: string;
  D1_DATABASE_ID: string;
}

interface D1Response<T = Record<string, unknown>> {
  result?: Array<{ results?: T[]; success?: boolean }>;
  success: boolean;
  errors?: Array<{ message: string }>;
}

export class D1Remote {
  constructor(private readonly env: D1RemoteEnv) {}

  private async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${this.env.D1_DATABASE_ID}/query`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Auth-Email": this.env.CLOUDFLARE_EMAIL,
        "X-Auth-Key": this.env.CLOUDFLARE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`D1 REST HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as D1Response<T>;
    if (!data.success) throw new Error(`D1 REST error: ${data.errors?.[0]?.message ?? "unknown"}`);
    return data.result?.[0]?.results ?? [];
  }

  /** Full-table chunked pull, ordered by primary key so chunks never overlap. */
  async *rows<T>(table: string, chunk = 500): AsyncGenerator<T[]> {
    let last = 0;
    for (;;) {
      const rows = await this.query<T>(
        `SELECT * FROM ${table} WHERE tx_id > ? ORDER BY tx_id LIMIT ?`,
        [last, chunk],
      );
      if (rows.length === 0) return;
      yield rows;
      last = Number((rows[rows.length - 1] as { tx_id: number }).tx_id);
      if (rows.length < chunk) return;
    }
  }

  /** MAX(tx_id) of a fact table — the change watermark, one indexed read. */
  async watermark(table: string): Promise<number> {
    const rows = await this.query<{ t: number | null }>(`SELECT MAX(tx_id) AS t FROM ${table}`);
    return Number(rows[0]?.t ?? 0);
  }

  /** Incremental delta pull since a local high-water mark. */
  async *delta<T>(table: string, sinceTxId: number, chunk = 500): AsyncGenerator<T[]> {
    let last = sinceTxId;
    for (;;) {
      const rows = await this.query<T>(
        `SELECT * FROM ${table} WHERE tx_id > ? ORDER BY tx_id LIMIT ?`,
        [last, chunk],
      );
      if (rows.length === 0) return;
      yield rows;
      last = Number((rows[rows.length - 1] as { tx_id: number }).tx_id);
      if (rows.length < chunk) return;
    }
  }

  /** One-shot utility reads (counts, spot rows). */
  read<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.query<T>(sql, params);
  }
}

export function d1FromEnv(): D1Remote {
  const required = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_EMAIL", "CLOUDFLARE_API_KEY", "D1_DATABASE_ID"] as const;
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing env ${key} — see local/README.md`);
  }
  return new D1Remote({
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID!,
    CLOUDFLARE_EMAIL: process.env.CLOUDFLARE_EMAIL!,
    CLOUDFLARE_API_KEY: process.env.CLOUDFLARE_API_KEY!,
    D1_DATABASE_ID: process.env.D1_DATABASE_ID!,
  });
}
