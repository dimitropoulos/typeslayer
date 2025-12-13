import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  type ResolvedType,
  type TypeRelationInfo,
  typeRelationInfo,
} from "@typeslayer/validate";
import { type SyntheticEvent, useCallback, useState } from "react";
import { useTraceJson, useTypeGraph } from "../hooks/tauri-hooks";
import { useTypeRegistry } from "../pages/award-winners/use-type-registry";
import type { EdgeKind, GraphLink } from "../types/type-graph";
import { CenterLoader } from "./center-loader";
import { Code } from "./code";
import { InlineCode } from "./inline-code";
import { ShowMoreChildren } from "./show-more-children";
import { TabLabel } from "./tab-label";
import { TypeSummary } from "./type-summary";

const LastDitchEffort = ({ typeId }: { typeId: number }) => {
  const { data: traceJson, isLoading } = useTraceJson();

  if (isLoading) {
    return <CenterLoader />;
  }

  if (!traceJson) {
    return null;
  }

  const events = traceJson.filter(event => {
    if (!("name" in event)) {
      return false;
    }

    switch (event.name) {
      case "checkTypeParameterDeferred":
        return event.args.parent === typeId || event.args.id === typeId;

      case "checkTypeRelatedTo_DepthLimit":
      case "structuredTypeRelatedTo":
      case "traceUnionsOrIntersectionsTooLarge_DepthLimit":
      case "typeRelatedToDiscriminatedType_DepthLimit":
        return event.args.sourceId === typeId || event.args.targetId === typeId;

      case "checkCrossProductUnion_DepthLimit":
      case "removeSubtypes_DepthLimit":
        return event.args.typeIds.includes(typeId);

      case "instantiateType_DepthLimit":
        return event.args.typeId === typeId;

      case "recursiveTypeRelatedTo_DepthLimit":
        return (
          event.args.sourceId === typeId ||
          event.args.targetId === typeId ||
          event.args.sourceIdStack.includes(typeId) ||
          event.args.targetIdStack.includes(typeId)
        );

      default:
        return false;
    }
  });

  if (events.length === 0) {
    return (
      <Stack gap={1}>
        <Typography>
          no types found with relations to <InlineCode>{typeId}</InlineCode>.
        </Typography>
        <Typography>
          that means that TypeScript didn't record any more information about
          this type other than that it exists in your code.
        </Typography>
        <Typography>
          one situation this can happen is for a top-level package export, so
          check those.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack>
      <Typography>so what do you do next?</Typography>
      <Typography gutterBottom>
        it's tough. the last thing we can do is perform a search of all traces
        that contain this type id:
      </Typography>
      <Code value={JSON.stringify(events, null, 2)} />
      <Typography sx={{ mt: 2 }}>
        Now, what you shoudl do next is take the timestamp (the{" "}
        <InlineCode>ts</InlineCode> field) of any of the events returned above,
        and look at that time in{" "}
        <Link href="/perfetto">the Perfetto module</Link>.
      </Typography>
      <Typography>
        there, you'll see what other sorts of things TypeScript was doing at
        that time (and what file it was checking).
      </Typography>
    </Stack>
  );
};

const kindToTypesRelationInfo = (kind: EdgeKind): TypeRelationInfo => {
  switch (kind) {
    case "typeArgument":
      return typeRelationInfo.typeArguments;

    case "union":
      return typeRelationInfo.unionTypes;

    case "intersection":
      return typeRelationInfo.intersectionTypes;

    case "aliasTypeArgument":
      return typeRelationInfo.aliasTypeArguments;

    case "instantiated":
      return typeRelationInfo.instantiatedType;

    case "substitutionBase":
      return typeRelationInfo.substitutionBaseType;

    case "constraint":
      return typeRelationInfo.constraintType;

    case "indexedAccessObject":
      return typeRelationInfo.indexedAccessObjectType;

    case "indexedAccessIndex":
      return typeRelationInfo.indexedAccessIndexType;

    case "conditionalCheck":
      return typeRelationInfo.conditionalCheckType;

    case "conditionalExtends":
      return typeRelationInfo.conditionalExtendsType;

    case "conditionalTrue":
      return typeRelationInfo.conditionalTrueType;

    case "conditionalFalse":
      return typeRelationInfo.conditionalFalseType;

    case "keyof":
      return typeRelationInfo.keyofType;

    case "alias":
      return typeRelationInfo.aliasType;

    case "evolvingArrayElement":
      return typeRelationInfo.evolvingArrayElementType;

    case "evolvingArrayFinal":
      return typeRelationInfo.evolvingArrayFinalType;

    case "reverseMappedSource":
      return typeRelationInfo.reverseMappedSourceType;

    case "reverseMappedMapped":
      return typeRelationInfo.reverseMappedMappedType;

    case "reverseMappedConstraint":
      return typeRelationInfo.reverseMappedConstraintType;
    default:
      kind satisfies never;
      return "<error>" as never;
  }
};

const TargetsTabs = ({ targets }: { targets: GraphLink[] }) => {
  const { typeRegistry } = useTypeRegistry();

  const targetsByKind = Object.entries(
    targets.reduce(
      (acc, node) => {
        acc[node.kind] = (acc[node.kind] ?? []).concat(node);
        return acc;
      },
      {} as Record<EdgeKind, GraphLink[]>,
    ),
  ) as [EdgeKind, GraphLink[]][];

  const [selectedTab, setSelectedTab] = useState<EdgeKind | undefined>(
    targetsByKind[0][0],
  );

  const handleTabChange = useCallback(
    (_event: SyntheticEvent, value: EdgeKind) => {
      setSelectedTab(value);
    },
    [],
  );

  return (
    <Stack>
      <Tabs onChange={handleTabChange} value={selectedTab}>
        {targetsByKind.map(([kind, nodes]) => (
          <Tab
            label={
              <TabLabel
                label={kindToTypesRelationInfo(kind).title}
                count={nodes.length}
              />
            }
            key={kind}
            value={kind}
          />
        ))}
      </Tabs>
      <Stack sx={{ mt: 1 }}>
        <ShowMoreChildren incrementsOf={50}>
          {targets
            .filter(({ kind }) => kind === selectedTab)
            .map(({ source }) => {
              const resolvedType = typeRegistry?.[source];
              if (!resolvedType) {
                return (
                  <Typography key={source} color="error">
                    Could not find type with id {source} in registry
                  </Typography>
                );
              }

              return (
                <Stack key={source} sx={{ gap: 1, flexDirection: "row" }}>
                  <TypeSummary resolvedType={resolvedType} key={source} />
                </Stack>
              );
            })}
        </ShowMoreChildren>
      </Stack>
    </Stack>
  );
};

export const TypeRelationsDialog = ({
  resolvedType,
  onClose,
}: {
  resolvedType: ResolvedType;
  onClose: () => void;
}) => {
  const { id: typeId } = resolvedType;

  const { data: typeGraph, isLoading } = useTypeGraph();

  const targets = typeGraph?.links.filter(node => node.target === typeId) ?? [];

  const noneFound =
    targets.length === 0 ? <LastDitchEffort typeId={typeId} /> : null;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <em>types related to</em>{" "}
        <TypeSummary resolvedType={resolvedType} suppressActions />
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <CenterLoader />
        ) : (
          <Stack gap={0.5}>
            {targets.length === 0 ? (
              noneFound
            ) : (
              <TargetsTabs targets={targets} />
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
