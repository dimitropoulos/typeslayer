import type { AbsolutePath } from "@typeslayer/analyze-trace/browser";
import type { TypeId } from "@typeslayer/validate";

export const TYPE_GRAPH_FILENAME = "type-graph.json";

export type LinkKind =
  | "unionTypes"
  | "intersectionTypes"
  | "typeArguments"
  | "instantiatedType"
  | "aliasTypeArguments"
  | "conditionalCheckType"
  | "conditionalExtendsType"
  | "conditionalFalseType"
  | "conditionalTrueType"
  | "indexedAccessObjectType"
  | "indexedAccessIndexType"
  | "keyofType"
  | "reverseMappedSourceType"
  | "reverseMappedMappedType"
  | "reverseMappedConstraintType"
  | "substitutionBaseType"
  | "constraintType"
  | "evolvingArrayElementType"
  | "evolvingArrayFinalType"
  | "aliasType";

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
