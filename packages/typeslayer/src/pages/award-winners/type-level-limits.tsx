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
import { type AwardId, awards } from "./awards";
import { InlineBarGraph } from "./inline-bar-graph";
import { ShowTypeLimit } from "./show-type-limit";

const typeLevelLimits = [
  "limit_instantiateType",
  "limit_recursiveTypeRelatedTo",
  "limit_typeRelatedToDiscriminatedType",
  "limit_checkCrossProductUnion",
  "limit_checkTypeRelatedTo",
  "limit_getTypeAtFlowNode",
  "limit_removeSubtypes",
  "limit_traceUnionsOrIntersectionsTooLarge",
] satisfies AwardId[];

export type TypeLevelLimitAwardId = (typeof typeLevelLimits)[number];

export const getDepthLimitsProperty = <T extends TypeLevelLimitAwardId>(
  awardId: T,
) => {
  return (awardId.replace("limit_", "") +
    "_DepthLimit") as T extends `limit_${infer Stat}`
    ? `${Stat}_DepthLimit`
    : never;
};

const useTypeLevelLimitsValue = () => {
  const { data: analyzeTrace } = useAnalyzeTrace();

  if (!analyzeTrace) {
    return () => 0;
  }

  return (awardId: TypeLevelLimitAwardId): number => {
    const property = getDepthLimitsProperty(awardId);

    switch (awardId) {
      case "limit_instantiateType":
      case "limit_recursiveTypeRelatedTo":
      case "limit_typeRelatedToDiscriminatedType":
      case "limit_checkCrossProductUnion":
      case "limit_checkTypeRelatedTo":
      case "limit_getTypeAtFlowNode":
      case "limit_removeSubtypes":
      case "limit_traceUnionsOrIntersectionsTooLarge":
        return analyzeTrace.depthLimits[property].length;
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
    case "limit_instantiateType":
      return (
        <ShowTypeLimit<EventChecktypes__InstantiateType_DepthLimit>
          awardId={awardId}
          key={awardId}
          notFound="No Type Instantiation Limits Found"
          title={awards.limit_instantiateType.title}
          icon={awards.limit_instantiateType.icon}
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
          getTypeId={current => current.args.typeId}
        />
      );

    case "limit_recursiveTypeRelatedTo":
      return (
        <ShowTypeLimit<EventChecktypes__RecursiveTypeRelatedTo_DepthLimit>
          key={awardId}
          awardId={awardId}
          notFound="No Recursive Relations Limits Found"
          title={awards.limit_recursiveTypeRelatedTo.title}
          icon={awards.limit_recursiveTypeRelatedTo.icon}
          inlineBarGraph={(current, first) => (
            <InlineBarGraph
              label={`${current.args.depth.toLocaleString()} depth`}
              width={`${(current.args.depth / first.args.depth) * 100}%`}
            />
          )}
          getKey={current =>
            `${current.args.sourceId}-${current.args.sourceId}:${current.ts}`
          }
          getTypeId={current => current.args.sourceId}
        />
      );

    case "limit_typeRelatedToDiscriminatedType":
      return (
        <ShowTypeLimit<EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit>
          key={awardId}
          awardId={awardId}
          notFound="No Discriminated Type Limits Found"
          title={awards.limit_typeRelatedToDiscriminatedType.title}
          icon={awards.limit_typeRelatedToDiscriminatedType.icon}
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
          getTypeId={current => current.args.sourceId}
        />
      );

    case "limit_checkCrossProductUnion":
      return (
        <ShowTypeLimit<EventChecktypes__CheckCrossProductUnion_DepthLimit>
          key={awardId}
          awardId={awardId}
          notFound="No Cross-Product Union Limits Found"
          title={awards.limit_checkCrossProductUnion.title}
          icon={awards.limit_checkCrossProductUnion.icon}
          inlineBarGraph={(current, first) => (
            <InlineBarGraph
              label={`${current.args.size.toLocaleString()} size`}
              width={`${(current.args.size / first.args.size) * 100}%`}
            />
          )}
          getKey={current => `${current.args.typeIds.join("-")}:${current.ts}`}
          getTypeId={current => current.args.typeIds[0]}
        />
      );

    case "limit_checkTypeRelatedTo":
      return (
        <ShowTypeLimit<EventChecktypes__CheckTypeRelatedTo_DepthLimit>
          key={awardId}
          awardId={awardId}
          notFound="No Type Relation Depth Limits Found"
          title={awards.limit_checkTypeRelatedTo.title}
          icon={awards.limit_checkTypeRelatedTo.icon}
          inlineBarGraph={(current, first) => (
            <InlineBarGraph
              label={`${current.args.depth.toLocaleString()} depth`}
              width={`${(current.args.depth / first.args.depth) * 100}%`}
            />
          )}
          getKey={current =>
            `${current.args.sourceId}-${current.args.targetId}:${current.ts}`
          }
          getTypeId={current => current.args.sourceId}
        />
      );

    case "limit_getTypeAtFlowNode":
      return (
        <ShowTypeLimit<EventChecktypes__GetTypeAtFlowNode_DepthLimit>
          key={awardId}
          awardId={awardId}
          notFound="No Flow Node Type Limits Found"
          title={awards.limit_getTypeAtFlowNode.title}
          icon={awards.limit_getTypeAtFlowNode.icon}
          inlineBarGraph={current => (
            <InlineBarGraph
              label={`${current.args.flowId.toLocaleString()} flowId`}
              width={`100%`}
            />
          )}
          getKey={current => `${current.args.flowId}:${current.ts}`}
          getTypeId={current => current.args.flowId}
        />
      );

    case "limit_removeSubtypes":
      return (
        <ShowTypeLimit<EventChecktypes__RemoveSubtypes_DepthLimit>
          key={awardId}
          awardId={awardId}
          notFound="No Remove Subtypes Limits Found"
          title={awards.limit_removeSubtypes.title}
          icon={awards.limit_removeSubtypes.icon}
          inlineBarGraph={() => (
            <InlineBarGraph label={`limit hit`} width={`100%`} />
          )}
          getKey={current => `${current.args.typeIds.join("-")}:${current.ts}`}
          getTypeId={current => current.args.typeIds[0]}
        />
      );

    case "limit_traceUnionsOrIntersectionsTooLarge":
      return (
        <ShowTypeLimit<EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit>
          key={awardId}
          awardId={awardId}
          notFound="No Union/Intersection Size Limits Found"
          title={awards.limit_traceUnionsOrIntersectionsTooLarge.title}
          icon={awards.limit_traceUnionsOrIntersectionsTooLarge.icon}
          inlineBarGraph={(current, first) => (
            <InlineBarGraph
              label={`${(current.args.sourceSize * current.args.targetSize).toLocaleString()} size`}
              width={`${((current.args.sourceSize * current.args.targetSize) / (first.args.sourceSize * first.args.targetSize)) * 100}%`}
            />
          )}
          getKey={current =>
            `${current.args.sourceId}-${current.args.targetId}:${current.ts}`
          }
          getTypeId={current => current.args.sourceId}
        />
      );

    default:
      throw new Error(`Unknown awardId: ${awardId}`);
  }
};
