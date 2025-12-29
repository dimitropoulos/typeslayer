import type { AbsolutePath } from "@typeslayer/analyze-trace/browser";
import type { TypeId } from "@typeslayer/validate";

export const TYPE_GRAPH_FILENAME = "type-graph.json";

export type LinkKind =
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

export type GraphLink = [sourceId: TypeId, targetId: TypeId];

export const graphLinkIndex = {
  sourceId: 0,
  targetId: 1,
} as const;

export type CountAndMax = {
  count: number;
  max: number;
};

export type GraphStats = {
  link: Record<LinkKind, CountAndMax>;
  node: Record<NodeStatKind, CountAndMax>;
};

export type NodeStatKind =
  | "typeArguments"
  | "unionTypes"
  | "intersectionTypes"
  | "aliasTypeArguments";

export type GraphStatNode = {
  id: TypeId;
  name: string;
  value: number;
  path?: AbsolutePath;
};

export type NodeStatKindData = {
  max: number;
  count: number;
  nodes: GraphStatNode[];
};

export type GraphNodeStats = Record<NodeStatKind, NodeStatKindData>;

export type LinkKindData = {
  byTarget: ByTarget;
  bySource: BySource;
};

export const targetToSourcesIndex = {
  targetId: 0,
  sourceIds: 1,
} as const;

export type ByTarget = {
  max: number;
  count: number;
  targetToSources: [targetId: TypeId, sourceIds: TypeId[]][];
};

export const sourceToTargetsIndex = {
  sourceId: 0,
  targetIds: 1,
} as const;

export type BySource = {
  max: number;
  count: number;
  sourceToTargets: [sourceId: TypeId, targetIds: TypeId[]][];
};

export type GraphLinkStats = Record<LinkKind, LinkKindData>;
