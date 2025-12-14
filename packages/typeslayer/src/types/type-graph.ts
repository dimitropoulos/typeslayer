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

export type GraphLink = {
  source: number;
  target: number;
  kind: LinkKind;
};

export type GraphStats = {
  count: Record<LinkKind, number>;
};

export type LinkStatLink = {
  targetId: TypeId;
  sourceIds: TypeId[];
  path?: string | undefined;
};

type LinkStats = {
  max: number;
  links: LinkStatLink[];
};

export type GraphLinkStats = Record<LinkKind, LinkStats>;

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

export type TypeGraph = {
  nodes: number;
  links: GraphLink[];
  stats: GraphStats;
  linkStats: GraphLinkStats;
  nodeStats: GraphNodeStats;
};
