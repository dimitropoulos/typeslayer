import type { Env } from "./types";

export const groupIds = [
  "compilation",
  "type-metrics",
  "type-relation-metrics",
  "performance-metrics",
  "type-level-limits",
  "bundle-implications",
  "raw-data",
] as const;

export type GroupId = (typeof groupIds)[number];

export const groupInfo = {
  "compilation": {
    label: "Compilation",
  },
  "type-level-limits": {
    label: "Type Level Limits",
  },
  "raw-data": {
    label: "Raw Data",
  },
  "bundle-implications": {
    label: "Bundle Implications",
  },
  "performance-metrics": {
    label: "Performance Metrics",
  },
  "type-metrics": {
    label: "Type Metrics",
  },
  "type-relation-metrics": {
    label: "Type Relation Metrics",
  },
} satisfies Record<
  GroupId,
  {
    label: string;
  }
>;

export const queries = [
  {
    id: "total-types",
    label: "Total Types",
    subtitle: "number of types in a project",
    groupId: "type-metrics",
    format: "count",
    eventName: "generate_trace_success",
    dataPath: "$.typesCount",
  },
  {
    id: "total-relations",
    label: "Total Relations",
    subtitle: "number of relations between types",
    groupId: "type-relation-metrics",
    format: "count",
    eventName: "type_graph_success",
    dataPath: "$.totalLinks",
  },
  {
    id: "types-json-size",
    label: "Types JSON Size",
    subtitle: "size of types.json file",
    groupId: "raw-data",
    format: "bytes",
    eventName: "generate_trace_success",
    dataPath: "$.typesJsonFileSize",
  },
  {
    id: "trace-json-size",
    label: "Trace JSON Size",
    subtitle: "size of trace.json file",
    groupId: "raw-data",
    format: "bytes",
    eventName: "generate_trace_success",
    dataPath: "$.traceJsonFileSize",
  },
  {
    id: "total-duration",
    label: "Total Duration",
    subtitle: "total time to typecheck",
    groupId: "compilation",
    format: "milliseconds",
    eventName: "analyze_trace_success",
    dataPath: "$.fileStatistics.totalDuration",
  },
  {
    id: "max-single-file-duration",
    label: "Max Single File Duration",
    subtitle: "max time for a single file",
    groupId: "compilation",
    format: "milliseconds",
    eventName: "analyze_trace_success",
    dataPath: "$.fileStatistics.maxDuration",
  },
  {
    id: "num-files",
    label: "Number of Files",
    subtitle: "number of files in the project",
    groupId: "bundle-implications",
    format: "count",
    eventName: "analyze_trace_success",
    dataPath: "$.fileStatistics.totalFiles",
  },
] satisfies {
  id: string;
  label: string;
  subtitle: string;
  groupId: GroupId;
  format: LeaderboardNumberFormat;
  eventName: string;
  dataPath: `$.${string}`;
}[];

export type LeaderboardNumberFormat = "count" | "bytes" | "milliseconds";

export type LeaderboardNumber = {
  id: string;
  label: string;
  subtitle: string;
  groupId: GroupId;
  format: LeaderboardNumberFormat;

  winner: number;
  median: number;
  mean: number;
  standardDeviation: number;
  samples: number;
  top10: number[];
  bottom10: number[];
};

const getRows = async (env: Env, eventName: string, dataPath: string) => {
  const { results: rows } = await env.DB.prepare(
    `SELECT json_extract(data, '${dataPath}') as value
       FROM events
       WHERE name = '${eventName}'
         AND json_extract(data, '${dataPath}') IS NOT NULL
       ORDER BY value DESC`,
  ).all<{ value: number }>();

  return rows;
};

export async function handleLeaderboard(env: Env): Promise<Response> {
  try {
    const results: LeaderboardNumber[] = [];

    for (const query of queries) {
      const rows = await getRows(env, query.eventName, query.dataPath);

      if (rows && rows.length > 0) {
        const values = rows.map(r => r.value);
        const sorted = values.toSorted((a, b) => a - b);

        const samples = values.length;
        const winner = sorted[sorted.length - 1];
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / samples;

        const median =
          samples % 2 === 0
            ? (sorted[samples / 2 - 1] + sorted[samples / 2]) / 2
            : sorted[Math.floor(samples / 2)];

        const variance =
          values.reduce((acc, val) => acc + (val - mean) ** 2, 0) / samples;
        const standardDeviation = Math.sqrt(variance);

        const top10 = sorted.slice(-10).reverse();
        const bottom10 = sorted.slice(0, 10);

        results.push({
          id: query.id,
          label: query.label,
          subtitle: query.subtitle,
          groupId: query.groupId,
          format: query.format,
          winner,
          median,
          mean,
          standardDeviation,
          samples,
          top10,
          bottom10,
        });
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: unknown) {
    console.error("Leaderboard error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}
