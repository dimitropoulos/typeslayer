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

export type CompactGraphLink = [source: TypeId, target: TypeId, kind: LinkKind];

export const compactGraphLinkIndex = {
  sourceId: 0,
  targetId: 1,
  kind: 2,
} as const;

export type GraphStats = {
  linkCounts: Record<LinkKind, number>;
};

/**
 * to save lots of time/energy/space over the wire (and also memory and disk space)
 * we store this as a tuple to avoid needing to repeat the property names over and over
 */
export type CompactLinkStatLink = [
  target: TypeId,
  humanReadableName: string | null,
  sourceIds: TypeId[],
];

export const compactLinksStatsLinkIndex = {
  targetId: 0,
  humanReadableName: 1,
  sourceIds: 2,
} as const;

export type CompactLinkStats = {
  max: number;
  links: CompactLinkStatLink[];
};

export type GraphLinkStats = Record<LinkKind, CompactLinkStats>;

export type NodeStatKind =
  | "typeArguments"
  | "unionTypes"
  | "intersectionTypes"
  | "aliasTypeArguments";

export type NodeStatNode = {
  id: TypeId;
  name: string;
  value: number;
  path: AbsolutePath | null;
};

type NodeStatCategory = {
  max: number;
  nodes: NodeStatNode[];
};

export type GraphNodeStats = Record<NodeStatKind, NodeStatCategory>;
