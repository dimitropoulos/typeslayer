import { ListSubheader } from "@mui/material";
import type {
  EventChecktypes__CheckCrossProductUnion_DepthLimit,
  EventChecktypes__CheckTypeRelatedTo_DepthLimit,
  EventChecktypes__GetTypeAtFlowNode_DepthLimit,
  EventChecktypes__InstantiateType_DepthLimit,
  EventChecktypes__RecursiveTypeRelatedTo_DepthLimit,
  EventChecktypes__RemoveSubtypes_DepthLimit,
  EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit,
  EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit,
} from "@typeslayer/validate";
import { useAnalyzeTrace } from "../../hooks/tauri-hooks";
import { AwardNavItem } from "./award-nav-item";
import type { AwardId } from "./awards";
import { InlineBarGraph } from "./inline-bar-graph";
import { ShowTypeLimit } from "./show-type-limit";

const typeLevelLimits = [
  "instantiateType_DepthLimit",
  "recursiveTypeRelatedTo_DepthLimit",
  "typeRelatedToDiscriminatedType_DepthLimit",
  "checkCrossProductUnion_DepthLimit",
  "checkTypeRelatedTo_DepthLimit",
  "getTypeAtFlowNode_DepthLimit",
  "removeSubtypes_DepthLimit",
  "traceUnionsOrIntersectionsTooLarge_DepthLimit",
] satisfies AwardId[];

export type TypeLevelLimitAwardId = (typeof typeLevelLimits)[number];

const useTypeLevelLimitsValue = () => {
  const { data: analyzeTrace } = useAnalyzeTrace();

  if (!analyzeTrace) {
    return () => 0;
  }

  return (awardId: TypeLevelLimitAwardId): number => {
    switch (awardId) {
      case "instantiateType_DepthLimit":
      case "recursiveTypeRelatedTo_DepthLimit":
      case "typeRelatedToDiscriminatedType_DepthLimit":
      case "checkCrossProductUnion_DepthLimit":
      case "checkTypeRelatedTo_DepthLimit":
      case "getTypeAtFlowNode_DepthLimit":
      case "removeSubtypes_DepthLimit":
      case "traceUnionsOrIntersectionsTooLarge_DepthLimit":
        return analyzeTrace.depthLimits[awardId].length;
      default:
        awardId satisfies never;
        throw new Error(`Unknown award: ${awardId}`);
    }
  };
};

export const TypeLevelLimitsNavItems = () => {
  const getValue = useTypeLevelLimitsValue();

  return (
    <>
      <ListSubheader>Type-Level Limits</ListSubheader>

      {typeLevelLimits.map(awardId => (
        <AwardNavItem
          key={awardId}
          awardId={awardId}
          value={getValue(awardId)}
        />
      ))}
    </>
  );
};

export const TypeLevelLimitAward = ({
  awardId,
}: {
  awardId: TypeLevelLimitAwardId;
}) => {
  switch (awardId) {
    case "instantiateType_DepthLimit":
      return (
        <ShowTypeLimit<EventChecktypes__InstantiateType_DepthLimit>
          awardId={awardId}
          key={awardId}
          inlineBarGraph={(current, first) => (
            <InlineBarGraph
              label={`${current.args.instantiationDepth.toLocaleString()} depth`}
              width={`${
                (current.args.instantiationDepth /
                  first.args.instantiationDepth) *
                100
              }%`}
            />
          )}
          getKey={current =>
            `${current.args.typeId}-${current.args.instantiationCount}-${current.args.instantiationDepth}:${current.ts}`
          }
          getListItemTypeId={current => current.args.typeId}
          tabs={event => [{ tabName: "Type", content: event.args.typeId }]}
        />
      );

    case "recursiveTypeRelatedTo_DepthLimit":
      return (
        <ShowTypeLimit<EventChecktypes__RecursiveTypeRelatedTo_DepthLimit>
          key={awardId}
          awardId={awardId}
          inlineBarGraph={(current, first) => (
            <InlineBarGraph
              label={`${current.args.depth.toLocaleString()} depth`}
              width={`${(current.args.depth / first.args.depth) * 100}%`}
            />
          )}
          getKey={current =>
            `${current.args.sourceId}-${current.args.sourceId}:${current.ts}`
          }
          getListItemTypeId={current => current.args.sourceId}
          tabs={event => [
            { tabName: "Source", content: event.args.sourceId },
            { tabName: "Source Stack", content: event.args.sourceIdStack },
            { tabName: "Target", content: event.args.targetId },
            { tabName: "Target Stack", content: event.args.targetIdStack },
          ]}
        />
      );

    case "typeRelatedToDiscriminatedType_DepthLimit":
      return (
        <ShowTypeLimit<EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit>
          key={awardId}
          awardId={awardId}
          inlineBarGraph={(current, first) => (
            <InlineBarGraph
              label={`${current.args.numCombinations.toLocaleString()} depth`}
              width={`${
                (current.args.numCombinations / first.args.numCombinations) *
                100
              }%`}
            />
          )}
          getKey={current =>
            `${current.args.sourceId}-${current.args.targetId}:${current.ts}`
          }
          getListItemTypeId={current => current.args.sourceId}
          tabs={event => [
            { tabName: "Source", content: event.args.sourceId },
            { tabName: "Target", content: event.args.targetId },
          ]}
        />
      );

    case "checkCrossProductUnion_DepthLimit":
      return (
        <ShowTypeLimit<EventChecktypes__CheckCrossProductUnion_DepthLimit>
          key={awardId}
          awardId={awardId}
          inlineBarGraph={(current, first) => (
            <InlineBarGraph
              label={`${current.args.size.toLocaleString()} size`}
              width={`${(current.args.size / first.args.size) * 100}%`}
            />
          )}
          getKey={current => `${current.args.typeIds.join("-")}:${current.ts}`}
          getListItemTypeId={current => current.args.typeIds[0]} // TODO this is wrong.  show many.
          tabs={event => [
            {
              tabName: "Types",
              content: event.args.typeIds,
            },
          ]}
        />
      );

    case "checkTypeRelatedTo_DepthLimit":
      return (
        <ShowTypeLimit<EventChecktypes__CheckTypeRelatedTo_DepthLimit>
          key={awardId}
          awardId={awardId}
          inlineBarGraph={(current, first) => (
            <InlineBarGraph
              label={`${current.args.depth.toLocaleString()} depth`}
              width={`${(current.args.depth / first.args.depth) * 100}%`}
            />
          )}
          getKey={current =>
            `${current.args.sourceId}-${current.args.targetId}:${current.ts}`
          }
          getListItemTypeId={current => current.args.sourceId}
          tabs={event => [
            { tabName: "Source", content: event.args.sourceId },
            { tabName: "Target", content: event.args.targetId },
          ]}
        />
      );

    case "getTypeAtFlowNode_DepthLimit":
      return (
        <ShowTypeLimit<EventChecktypes__GetTypeAtFlowNode_DepthLimit>
          key={awardId}
          awardId={awardId}
          inlineBarGraph={current => (
            <InlineBarGraph
              label={`${current.args.flowId.toLocaleString()} flowId`}
              width={`100%`}
            />
          )}
          getKey={current => `${current.args.flowId}:${current.ts}`}
          getListItemTypeId={current => current.args.flowId}
          tabs={event => [{ tabName: "Type", content: event.args.flowId }]}
        />
      );

    case "removeSubtypes_DepthLimit":
      return (
        <ShowTypeLimit<EventChecktypes__RemoveSubtypes_DepthLimit>
          key={awardId}
          awardId={awardId}
          inlineBarGraph={() => (
            <InlineBarGraph label={`limit hit`} width={`100%`} />
          )}
          getKey={current => `${current.args.typeIds.join("-")}:${current.ts}`}
          getListItemTypeId={current => current.args.typeIds[0]}
          tabs={event => [
            {
              tabName: "Types",
              content: event.args.typeIds,
            },
          ]}
        />
      );

    case "traceUnionsOrIntersectionsTooLarge_DepthLimit":
      return (
        <ShowTypeLimit<EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit>
          key={awardId}
          awardId={awardId}
          inlineBarGraph={(current, first) => (
            <InlineBarGraph
              label={`${(current.args.sourceSize * current.args.targetSize).toLocaleString()} size`}
              width={`${((current.args.sourceSize * current.args.targetSize) / (first.args.sourceSize * first.args.targetSize)) * 100}%`}
            />
          )}
          getKey={current =>
            `${current.args.sourceId}-${current.args.targetId}:${current.ts}`
          }
          getListItemTypeId={current => current.args.sourceId}
          tabs={event => [
            { tabName: "Source", content: event.args.sourceId },
            { tabName: "Target", content: event.args.targetId },
          ]}
        />
      );

    default:
      throw new Error(`Unknown awardId: ${awardId}`);
  }
};
