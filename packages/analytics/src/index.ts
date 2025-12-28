/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  INGESTION_SECRET?: string;
  REQUIRE_INGESTION_SECRET?: string;
}

type AnalyticsEvent = {
  name: string;
  sessionId: string;
  timestamp: number;
  version?: string;
  platform?: string;
  mode?: string;
  data: unknown;
};

const isValidEvent = (e: unknown): e is AnalyticsEvent => {
  return (
    e &&
    typeof e === "object" &&
    "name" in e &&
    typeof e.name === "string" &&
    "sessionId" in e &&
    typeof e.sessionId === "string" &&
    "timestamp" in e &&
    typeof e.timestamp === "number" &&
    "data" in e &&
    e.data !== undefined
  );
}

const corsHeaders = () => {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Typeslayer-Analytics-Key",
  } as Record<string, string>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health endpoint
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders(),
      });
    }

    // Optional shared-secret check
    if (env.REQUIRE_INGESTION_SECRET === "1") {
      const key = request.headers.get("X-Typeslayer-Analytics-Key");
      if (!key || key !== env.INGESTION_SECRET) {
        return new Response("Unauthorized", {
          status: 401,
          headers: corsHeaders(),
        });
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", {
        status: 400,
        headers: corsHeaders(),
      });
    }

    // Support single event or NDJSON batch
    const events: AnalyticsEvent[] = [];
    if (Array.isArray(body)) {
      for (const e of body) {
        if (isValidEvent(e)) {
          events.push(e);
        }
      }
    } else if (isValidEvent(body)) {
      events.push(body);
    } else if (typeof body === "string") {
      // In case NDJSON was forwarded as a string; try parse line-by-line
      const lines = (body as string).split(/\n+/).filter(Boolean);
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (isValidEvent(obj)) {
            events.push(obj);
          }
        } catch {}
      }
    } else {
      return new Response("Missing required fields", {
        status: 400,
        headers: corsHeaders(),
      });
    }

    if (events.length === 0) {
      return new Response("No valid events", {
        status: 400,
        headers: corsHeaders(),
      });
    }

    try {
      const stmt = env.DB.prepare(
        `INSERT INTO events (name, session_id, timestamp, version, platform, mode, data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );

      const batch: D1PreparedStatement[] = [];
      for (const e of events) {
        batch.push(
          stmt.bind(
            e.name,
            e.sessionId,
            e.timestamp,
            e.version ?? null,
            e.platform ?? null,
            e.mode ?? null,
            JSON.stringify(e.data),
          ),
        );
      }

      // Batch insert; fallback to sequential if batch not supported
      if (typeof env.DB.batch === "function") {
        await env.DB.batch(batch);
      } else {
        for (const q of batch) {
          await q.run();
        }
      }

      return new Response("OK", { status: 200, headers: corsHeaders() });
    } catch (err: unknown) {
      console.error("DB error:", err);
      return new Response(`DB error: ${err instanceof Error ? err.message : String(err)}`, {
        status: 500,
        headers: corsHeaders(),
      });
    }
  },
} satisfies ExportedHandler<Env>;
