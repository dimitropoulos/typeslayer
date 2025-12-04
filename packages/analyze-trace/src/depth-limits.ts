import {
  depthLimits,
  type EventChecktypes__CheckCrossProductUnion_DepthLimit,
  type EventChecktypes__CheckTypeRelatedTo_DepthLimit,
  type EventChecktypes__GetTypeAtFlowNode_DepthLimit,
  type EventChecktypes__InstantiateType_DepthLimit,
  type EventChecktypes__RecursiveTypeRelatedTo_DepthLimit,
  type EventChecktypes__RemoveSubtypes_DepthLimit,
  type EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit,
  type EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit,
  event_checktypes__checkCrossProductUnion_DepthLimit,
  event_checktypes__checkTypeRelatedTo_DepthLimit,
  event_checktypes__getTypeAtFlowNode_DepthLimit,
  event_checktypes__instantiateType_DepthLimit,
  event_checktypes__recursiveTypeRelatedTo_DepthLimit,
  event_checktypes__removeSubtypes_DepthLimit,
  event_checktypes__traceUnionsOrIntersectionsTooLarge_DepthLimit,
  event_checktypes__typeRelatedToDiscriminatedType_DepthLimit,
  type TraceJsonSchema,
} from "@typeslayer/validate";

export type DepthLimitsRecord = {
  checkCrossProductUnion_DepthLimit: EventChecktypes__CheckCrossProductUnion_DepthLimit[];
  checkTypeRelatedTo_DepthLimit: EventChecktypes__CheckTypeRelatedTo_DepthLimit[];
  getTypeAtFlowNode_DepthLimit: EventChecktypes__GetTypeAtFlowNode_DepthLimit[];
  instantiateType_DepthLimit: EventChecktypes__InstantiateType_DepthLimit[];
  recursiveTypeRelatedTo_DepthLimit: EventChecktypes__RecursiveTypeRelatedTo_DepthLimit[];
  removeSubtypes_DepthLimit: EventChecktypes__RemoveSubtypes_DepthLimit[];
  traceUnionsOrIntersectionsTooLarge_DepthLimit: EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit[];
  typeRelatedToDiscriminatedType_DepthLimit: EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit[];
};

export const createDepthLimits = (traceFile: TraceJsonSchema) => {
  const limitNamesSet = new Set(
    depthLimits.map(d => d.shape.name),
  ) as unknown as Set<string>;
  const limitEvents = traceFile.filter(event => limitNamesSet.has(event.name));

  return {
    checkCrossProductUnion_DepthLimit: (
      limitEvents.filter(
        event =>
          event_checktypes__checkCrossProductUnion_DepthLimit.safeParse(event)
            .success,
      ) as EventChecktypes__CheckCrossProductUnion_DepthLimit[]
    ).sort((a, b) => a.args.size - b.args.size),

    checkTypeRelatedTo_DepthLimit: (
      limitEvents.filter(
        event =>
          event_checktypes__checkTypeRelatedTo_DepthLimit.safeParse(event)
            .success,
      ) as EventChecktypes__CheckTypeRelatedTo_DepthLimit[]
    ).sort((a, b) => a.args.depth - b.args.depth),

    getTypeAtFlowNode_DepthLimit: (
      limitEvents.filter(
        event =>
          event_checktypes__getTypeAtFlowNode_DepthLimit.safeParse(event)
            .success,
      ) as EventChecktypes__GetTypeAtFlowNode_DepthLimit[]
    ).sort((a, b) => a.args.flowId - b.args.flowId),

    instantiateType_DepthLimit: (
      limitEvents.filter(
        event =>
          event_checktypes__instantiateType_DepthLimit.safeParse(event).success,
      ) as EventChecktypes__InstantiateType_DepthLimit[]
    ).sort((a, b) => a.args.instantiationDepth - b.args.instantiationDepth),

    recursiveTypeRelatedTo_DepthLimit: (
      limitEvents.filter(
        event =>
          event_checktypes__recursiveTypeRelatedTo_DepthLimit.safeParse(event)
            .success,
      ) as EventChecktypes__RecursiveTypeRelatedTo_DepthLimit[]
    ).sort((a, b) => a.args.depth - b.args.depth),

    removeSubtypes_DepthLimit: limitEvents.filter(
      event =>
        event_checktypes__removeSubtypes_DepthLimit.safeParse(event).success,
    ) as EventChecktypes__RemoveSubtypes_DepthLimit[],

    traceUnionsOrIntersectionsTooLarge_DepthLimit: (
      limitEvents.filter(
        event =>
          event_checktypes__traceUnionsOrIntersectionsTooLarge_DepthLimit.safeParse(
            event,
          ).success,
      ) as EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit[]
    ).sort(
      (a, b) =>
        a.args.sourceSize * a.args.targetSize -
        b.args.sourceSize * b.args.targetSize,
    ),

    typeRelatedToDiscriminatedType_DepthLimit: (
      limitEvents.filter(
        event =>
          event_checktypes__typeRelatedToDiscriminatedType_DepthLimit.safeParse(
            event,
          ).success,
      ) as EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit[]
    ).sort((a, b) => a.args.numCombinations - b.args.numCombinations),
  } satisfies DepthLimitsRecord;
};
