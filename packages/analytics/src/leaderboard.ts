import type {
  EventAnalyzeTraceSuccess,
  EventGenerateTraceSuccess,
  EventTypeGraphSuccess,
} from "@typeslayer/rust-types";
import {
  depthLimitInfo,
  typeRelationInfo,
  typeRelationOrder,
} from "@typeslayer/validate";
import type { Env } from "./types";

/** some moron on YouTube showed me how to do this.  fuck that guy. */
type Path<T> =
  T extends object
    ? {
        [K in keyof T & string]:
          | [K]
          | (Path<T[K]> extends infer P
              ? P extends string[]
                ? [K, ...P]
                : never
              : never)
      }[keyof T & string]
    : never

export const groupIds = [
  "compilation",
  "raw-data",
  "source_relations|count",
  "source_relations|max",
  "target_relations|count",
  "target_relations|max",
  "performance-metrics",
  "type-level-limits",
  "bundle-implications",
] as const;

type Events =
  | EventGenerateTraceSuccess
  | EventAnalyzeTraceSuccess
  | EventTypeGraphSuccess;

export type GroupId = (typeof groupIds)[number];

const typeRelationMetrics = (
  group: "source_relations" | "target_relations",
  sub: "max" | "count",
) => {
  const direction = group === "source_relations" ? "byTarget" : "bySource";
  const infoPath = group === "source_relations" ? "source" : "target";
  return typeRelationOrder.map(linkKind => {
    return {
      id: `${group}|${sub}|${linkKind}`,
      label: typeRelationInfo[linkKind][infoPath].title,
      subtitle: typeRelationInfo[linkKind][infoPath].description,
      groupId: `${group}|${sub}`,
      format: "count",
      eventName: "type_graph_success",
      dataPath: ["linkKindDataByKind", linkKind, direction, sub] as Path<EventTypeGraphSuccess['data']>,
    } satisfies Query<EventTypeGraphSuccess>
  });
};

export const groupInfo = {
  compilation: {
    label: "Compilation",
    queries: [
      {
        id: "total-types",
        label: "Total Types",
        subtitle: "number of types in a project",
        groupId: "compilation",
        format: "count",
        eventName: "type_graph_success",
        dataPath: ["nodeCount"],
      } satisfies Query<EventTypeGraphSuccess>,
      {
        id: "total-relations",
        label: "Total Relations",
        subtitle: "number of relations between types",
        groupId: "compilation",
        format: "count",
        eventName: "type_graph_success",
        dataPath: ["linkCount"],
      } satisfies Query<EventTypeGraphSuccess>,
      {
        id: "time-to-typecheck",
        label: "Time To Typecheck",
        subtitle: "total time to typecheck",
        groupId: "compilation",
        format: "milliseconds",
        eventName: "analyze_trace_success",
        dataPath: ["fileStatistics", "totalDuration"],
      } satisfies Query<EventAnalyzeTraceSuccess>,
      {
        id: "max-single-file-duration",
        label: "Max Single File Duration",
        subtitle: "max time for a single file",
        groupId: "compilation",
        format: "milliseconds",
        eventName: "analyze_trace_success",
        dataPath: ["fileStatistics", "maxDuration"],
      } satisfies Query<EventAnalyzeTraceSuccess>,
      {
        id: "total-files",
        label: "Total Files",
        subtitle: "total number of files in the project",
        groupId: "compilation",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: ["fileStatistics", "totalFiles"],
      } satisfies Query<EventAnalyzeTraceSuccess>,
    ],
  },

  "raw-data": {
    label: "Raw Data",
    queries: [
      {
        id: "types-json-size",
        label: "Types JSON Size",
        subtitle: "size of types.json file",
        groupId: "raw-data",
        format: "bytes",
        eventName: "generate_trace_success",
        dataPath: ["typesJsonFileSize"],
      } satisfies Query<EventGenerateTraceSuccess>,
      {
        id: "trace-json-size",
        label: "Trace JSON Size",
        subtitle: "size of trace.json file",
        groupId: "raw-data",
        format: "bytes",
        eventName: "generate_trace_success",
        dataPath: ["traceJsonFileSize"],
      } satisfies Query<EventGenerateTraceSuccess>,
      {
        id: "trace-count",
        label: "Trace Count",
        subtitle: "number of events in the trace file",
        groupId: "raw-data",
        format: "count",
        eventName: "generate_trace_success",
        dataPath: ["traceCount"],
      } satisfies Query<EventGenerateTraceSuccess>,
    ],
  },

  "source_relations|count": {
    label: "Type Metrics (Count)",
    queries: typeRelationMetrics("source_relations", "count"),
  },

  "source_relations|max": {
    label: "Type Metrics (Max)",
    queries: typeRelationMetrics("source_relations", "max"),
  },

  "target_relations|count": {
    label: "Type Relation Metrics (Count)",
    queries: typeRelationMetrics("target_relations", "count"),
  },

  "target_relations|max": {
    label: "Type Relation Metrics (Max)",
    queries: typeRelationMetrics("target_relations", "max"),
  },

  "performance-metrics": {
    label: "Performance Metrics",
    queries: [
      {
        id: "hotSpots",
        label: "Total Hotspots",
        subtitle: "hotspot files in a project",
        groupId: "performance-metrics",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: ["totalHotspots"],
      } satisfies Query<EventAnalyzeTraceSuccess>,
    ],
  },

  "type-level-limits": {
    label: "Type Level Limits",
    queries: [
      {
        id: "traceUnionsOrIntersectionsTooLarge_DepthLimit",
        label:
          depthLimitInfo.traceUnionsOrIntersectionsTooLarge_DepthLimit.title,
        subtitle: "traceUnionsOrIntersectionsTooLarge_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: [
          "depthLimitCounts",
          "traceUnionsOrIntersectionsTooLarge_DepthLimit",
        ],
      } satisfies Query<EventAnalyzeTraceSuccess>,
      {
        id: "getTypeAtFlowNode_DepthLimit",
        label: depthLimitInfo.getTypeAtFlowNode_DepthLimit.title,
        subtitle: "getTypeAtFlowNode_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: ["depthLimitCounts", "getTypeAtFlowNode_DepthLimit"],
      } satisfies Query<EventAnalyzeTraceSuccess>,
      {
        id: "instantiateType_DepthLimit",
        label: depthLimitInfo.instantiateType_DepthLimit.title,
        subtitle: "instantiateType_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: ["depthLimitCounts", "instantiateType_DepthLimit"],
      } satisfies Query<EventAnalyzeTraceSuccess>,
      {
        id: "checkTypeRelatedTo_DepthLimit",
        label: depthLimitInfo.checkTypeRelatedTo_DepthLimit.title,
        subtitle: "checkTypeRelatedTo_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: ["depthLimitCounts", "checkTypeRelatedTo_DepthLimit"],
      } satisfies Query<EventAnalyzeTraceSuccess>,
      {
        id: "checkCrossProductUnion_DepthLimit",
        label: depthLimitInfo.checkCrossProductUnion_DepthLimit.title,
        subtitle: "checkCrossProductUnion_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: ["depthLimitCounts", "checkCrossProductUnion_DepthLimit"],
      } satisfies Query<EventAnalyzeTraceSuccess>,
      {
        id: "removeSubtypes_DepthLimit",
        label: depthLimitInfo.removeSubtypes_DepthLimit.title,
        subtitle: "removeSubtypes_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: ["depthLimitCounts", "removeSubtypes_DepthLimit"],
      } satisfies Query<EventAnalyzeTraceSuccess>,
      {
        id: "typeRelatedToDiscriminatedType_DepthLimit",
        label: depthLimitInfo.typeRelatedToDiscriminatedType_DepthLimit.title,
        subtitle: "typeRelatedToDiscriminatedType_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: [
          "depthLimitCounts",
          "typeRelatedToDiscriminatedType_DepthLimit",
        ],
      } satisfies Query<EventAnalyzeTraceSuccess>,
      {
        id: "recursiveTypeRelatedTo_DepthLimit",
        label: depthLimitInfo.recursiveTypeRelatedTo_DepthLimit.title,
        subtitle: "recursiveTypeRelatedTo_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: ["depthLimitCounts", "recursiveTypeRelatedTo_DepthLimit"],
      } satisfies Query<EventAnalyzeTraceSuccess>,
    ],
  },

  "bundle-implications": {
    label: "Bundle Implications",
    queries: [
      {
        id: "duplicatePackages",
        label: "Total Duplicate Packages",
        subtitle: "total number of duplicate packages",
        groupId: "bundle-implications",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: ["totalDuplicatePackages"],
      } satisfies Query<EventAnalyzeTraceSuccess>,
      {
        id: "duplicatePackageInstances",
        label: "Max Duplicated Package Instances",
        subtitle: "the max times a package is duplicated",
        groupId: "bundle-implications",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: ["mostDuplicatedPackageInstances"],
      } satisfies Query<EventAnalyzeTraceSuccess>,
    ],
  },
}

type Query<Event extends Events> = {
  id: string;
  label: string;
  subtitle: string;
  groupId: GroupId;
  format: LeaderboardNumberFormat;
  eventName: Event["name"];
  dataPath: Path<Event["data"]>;
};

export const queries = [
  ...groupInfo.compilation.queries,
  ...groupInfo["raw-data"].queries,
  ...groupInfo["source_relations|count"].queries,
  ...groupInfo["source_relations|max"].queries,
  ...groupInfo["target_relations|count"].queries,
  ...groupInfo["target_relations|max"].queries,
  ...groupInfo["performance-metrics"].queries,
  ...groupInfo["type-level-limits"].queries,
  ...groupInfo["bundle-implications"].queries,
] as const;

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

// Cache configuration
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

const getRows = async <EventName extends Events["name"]>(
  env: Env,
  eventName: EventName,
  dataPath: string[],
) => {
  const fullPath = ["$", ...dataPath].join(".");
  const { results: rows } = await env.DB.prepare(
    `SELECT json_extract(data, '${fullPath}') as value
       FROM events
       WHERE name = '${eventName}'
         AND json_extract(data, '${fullPath}') IS NOT NULL
       ORDER BY value DESC`,
  ).all<{ value: number }>();

  return rows;
};

async function computeLeaderboard(env: Env): Promise<LeaderboardNumber[]> {
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

  return results;
}

export async function handleLeaderboard(
  env: Env,
  request: Request,
): Promise<Response> {
  try {
    const cache = caches.default;
    
    // Create a consistent cache key URL (no query params)
    const url = new URL(request.url);
    url.search = '';
    const cacheKeyUrl = url.toString();
    
    // Check if we have a cached response
    let response = await cache.match(cacheKeyUrl);
    
    if (response) {
      // Return cached response with hit indicator
      const newHeaders = new Headers(response.headers);
      newHeaders.set("X-Cache", "hit");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // Compute fresh data
    const results = await computeLeaderboard(env);

    // Create response with cache headers
    response = new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Cache": "miss",
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    });

    // Store in cache using consistent key (respects Cache-Control header)
    await cache.put(cacheKeyUrl, response.clone());

    return response;
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

export async function handleInvalidateCache(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    // Build the leaderboard URL with consistent cache key
    url.pathname = "/leaderboard";
    url.search = '';
    const cacheKeyUrl = url.toString();
    
    const cache = caches.default;
    const deleted = await cache.delete(cacheKeyUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: deleted ? "Cache invalidated" : "No cache entry found"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err: unknown) {
    console.error("Cache invalidation error:", err);
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
