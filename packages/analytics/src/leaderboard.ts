import {
  depthLimitInfo,
  typeRelationInfo,
  typeRelationOrder,
} from "@typeslayer/validate";
import type { Env } from "./types";

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

export type GroupId = (typeof groupIds)[number];

const typeRelationMetrics = (
  group: "source_relations" | "target_relations",
  sub: "max" | "count",
) => {
  const direction = group === "source_relations" ? "byTarget" : "bySource";
  const infoPath = group === "source_relations" ? "source" : "target";
  return typeRelationOrder.map(
    linkKind =>
      ({
        id: `${group}|${sub}|${linkKind}`,
        label: typeRelationInfo[linkKind][infoPath].title,
        subtitle: typeRelationInfo[linkKind][infoPath].description,
        groupId: `${group}|${sub}`,
        format: "count",
        eventName: "type_graph_success",
        dataPath: `$.linkKindDataByKind.${linkKind}.${direction}.${sub}`,
      }) as Query,
  );
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
        dataPath: "$.nodeCount",
      },
      {
        id: "total-relations",
        label: "Total Relations",
        subtitle: "number of relations between types",
        groupId: "compilation",
        format: "count",
        eventName: "type_graph_success",
        dataPath: "$.linkCount",
      },
      {
        id: "time-to-typecheck",
        label: "Time To Typecheck",
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
        id: "total-files",
        label: "Total Files",
        subtitle: "total number of files in the project",
        groupId: "compilation",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: "$.fileStatistics.totalFiles",
      },
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
        id: "trace-count",
        label: "Trace Count",
        subtitle: "number of events in the trace file",
        groupId: "raw-data",
        format: "count",
        eventName: "generate_trace_success",
        dataPath: "$.traceCount",
      },
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
        id: "total-hotsponts",
        label: "Total Hotspots",
        subtitle: "hotspot files in a project",
        groupId: "performance-metrics",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: "$.totalHotspots",
      },
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
        dataPath:
          "$.depthLimitCounts.traceUnionsOrIntersectionsTooLarge_DepthLimit",
      },
      {
        id: "getTypeAtFlowNode_DepthLimit",
        label: depthLimitInfo.getTypeAtFlowNode_DepthLimit.title,
        subtitle: "getTypeAtFlowNode_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: "$.depthLimitCounts.getTypeAtFlowNode_DepthLimit",
      },
      {
        id: "instantiateType_DepthLimit",
        label: depthLimitInfo.instantiateType_DepthLimit.title,
        subtitle: "instantiateType_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: "$.depthLimitCounts.instantiateType_DepthLimit",
      },
      {
        id: "checkTypeRelatedTo_DepthLimit",
        label: depthLimitInfo.checkTypeRelatedTo_DepthLimit.title,
        subtitle: "checkTypeRelatedTo_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: "$.depthLimitCounts.checkTypeRelatedTo_DepthLimit",
      },
      {
        id: "checkCrossProductUnion_DepthLimit",
        label: depthLimitInfo.checkCrossProductUnion_DepthLimit.title,
        subtitle: "checkCrossProductUnion_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: "$.depthLimitCounts.checkCrossProductUnion_DepthLimit",
      },
      {
        id: "removeSubtypes_DepthLimit",
        label: depthLimitInfo.removeSubtypes_DepthLimit.title,
        subtitle: "removeSubtypes_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: "$.depthLimitCounts.removeSubtypes_DepthLimit",
      },
      {
        id: "typeRelatedToDiscriminatedType_DepthLimit",
        label: depthLimitInfo.typeRelatedToDiscriminatedType_DepthLimit.title,
        subtitle: "typeRelatedToDiscriminatedType_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath:
          "$.depthLimitCounts.typeRelatedToDiscriminatedType_DepthLimit",
      },
      {
        id: "recursiveTypeRelatedTo_DepthLimit",
        label: depthLimitInfo.recursiveTypeRelatedTo_DepthLimit.title,
        subtitle: "recursiveTypeRelatedTo_DepthLimit",
        groupId: "type-level-limits",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: "$.depthLimitCounts.recursiveTypeRelatedTo_DepthLimit",
      },
    ],
  },

  "bundle-implications": {
    label: "Bundle Implications",
    queries: [
      {
        id: "total-duplicate-packages",
        label: "Total Duplicate Packages",
        subtitle: "total number of duplicate packages",
        groupId: "bundle-implications",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: "$.totalDuplicatePackages",
      },
      {
        id: "Max Duplicated Package Instances",
        label: "Max Duplicated Package Instances",
        subtitle: "the max times a package is duplicated",
        groupId: "bundle-implications",
        format: "count",
        eventName: "analyze_trace_success",
        dataPath: "$.mostDuplicatedPackageInstances",
      },
    ],
  },
} satisfies Record<
  GroupId,
  {
    label: string;
    queries: Query[];
  }
>;

type Query = {
  id: string;
  label: string;
  subtitle: string;
  groupId: GroupId;
  format: LeaderboardNumberFormat;
  eventName: string;
  dataPath: `$.${string}`;
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
] satisfies Query[];

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
