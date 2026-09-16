import type { RequestHandler } from "@builder.io/qwik-city";
import { publishAll } from "~/lib/publish";

/**
 * Manual publish escape hatch: rewrites all KV read models from D1 on demand.
 * Same security boundary as /api/reprocess — bearer TELEGRAM_SECRET_TOKEN,
 * fails closed when the secret is not configured.
 */
export const onPost: RequestHandler = async ({ request, platform, json }) => {
  const env = platform.env as any;

  if (!env.TELEGRAM_SECRET_TOKEN) {
    json(500, { error: "TELEGRAM_SECRET_TOKEN not configured" });
    return;
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${env.TELEGRAM_SECRET_TOKEN}`) {
    json(401, { error: "Unauthorized" });
    return;
  }

  try {
    const report = await publishAll(env);
    json(200, {
      status: report.failed.length === 0 ? "ok" : "partial",
      ...report,
    });
  } catch (error: any) {
    console.error("Manual publish failure:", error);
    json(500, { error: error.message });
  }
};
