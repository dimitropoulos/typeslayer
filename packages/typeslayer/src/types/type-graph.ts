import type { AbsolutePath } from "@typeslayer/analyze-trace/browser";
import type { TypeId } from "@typeslayer/validate";

export const TYPE_GRAPH_FILENAME = "type-graph.json";

export type GraphNode = { id: number; name: string };

export type EdgeKind =
  | "union"
  | "typeArgument"
  | "instantiated"
  | "substitutionBase"
  | "constraint"
  | "indexedAccessObject"
  | "indexedAccessIndex"
  | "conditionalCheck"
  | "conditionalExtends"
  | "conditionalTrue"
  | "conditionalFalse"
  | "keyof"
  | "evolvingArrayElement"
  | "evolvingArrayFinal"
  | "reverseMappedSource"
  | "reverseMappedMapped"
  | "reverseMappedConstraint"
  | "alias"
  | "aliasTypeArgument"
  | "intersection";
export type GraphLink = {
  source: number;
  target: number;
  kind: EdgeKind;
};
export type GraphStats = { count: Record<string, number> };
export type GraphEdgeEntry = [TypeId, TypeId[], AbsolutePath | null];
export const GRAPH_EDGE_ENTRY = {
  TYPEID_INDEX: 0,
  TARGET_TYPEIDS_INDEX: 1,
  PATH_INDEX: 2,
} as const;
export type GraphEdgeStats = Record<
  EdgeKind,
  {
    max: number;
    links: GraphEdgeEntry[];
  }
>;
export type NodeGraphStat =
  | "typeArguments"
  | "unionTypes"
  | "intersectionTypes"
  | "aliasTypeArguments";

export type GraphNodePreviewData = [
  typeId: TypeId,
  typeDisplayName: string,
  typeMetricValue: number,
  absolutePath: AbsolutePath | null,
];

export type GraphNodeStats = Record<
  NodeGraphStat,
  {
    max: number;
    nodes: GraphNodePreviewData[];
  }
>;

export type TypeGraph = {
  nodes: GraphNode[];
  links: GraphLink[];
  stats: GraphStats;
  edgeStats: GraphEdgeStats;
  nodeStats: GraphNodeStats;
};
