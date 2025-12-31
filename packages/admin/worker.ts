/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      if (request.method === "GET" && url.pathname === "/events/counts") {
        const { results } = await env.DB.prepare(`
          SELECT name, COUNT(*) as count
          FROM events
          GROUP BY name
        `).all<{
          name: string;
          count: number;
        }>();

        const counts: Record<string, number> = {};
        for (const row of results) {
          counts[row.name] = row.count;
        }

        return new Response(JSON.stringify(counts), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }

      const pathMatch = url.pathname.match(/^\/events\/([^/]+)$/);
      if (request.method === "GET" && pathMatch) {
        const eventName = decodeURIComponent(pathMatch[1]);
        const DEFAULT_LIMIT = 200;
        const MAX_LIMIT = 500;
        const limitParam = Number(url.searchParams.get("limit"));
        const limit = Number.isFinite(limitParam)
          ? Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limitParam)))
          : DEFAULT_LIMIT;

        const stmt = env.DB.prepare(
          `SELECT *
           FROM events
           WHERE name = ?
           ORDER BY timestamp DESC
           LIMIT ?`,
        ).bind(eventName, limit);

        const { results } = await stmt.all<{
          id: number;
          name: string;
          session_id: string;
          timestamp: number;
          version: string | null;
          platform: string | null;
          mode: string | null;
          data: string;
        }>();

        const events = results.map(row => {
          let parsed: unknown = row.data;
          try {
            parsed = JSON.parse(row.data);
          } catch {
            parsed = row.data;
          }

          return {
            id: row.id,
            name: row.name,
            sessionId: row.session_id,
            timestamp: row.timestamp,
            version: row.version,
            platform: row.platform,
            mode: row.mode,
            data: parsed,
          };
        });

        return new Response(JSON.stringify({ events }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(
        `Error: ${err instanceof Error ? err.message : String(err)}`.slice(
          0,
          4000,
        ),
        {
          status: 500,
          headers: {
            "Content-Type": "text/plain",
            ...corsHeaders,
          },
        },
      );
    }
  },
} satisfies ExportedHandler<Env>;
