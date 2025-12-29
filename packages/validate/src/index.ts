export {
  extractPackageName,
  packageNameRegex,
  relativizePath,
} from "./package-name";
export {
  type DepthLimitNames,
  depthLimitInfo,
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
  eventPhase,
  TRACE_JSON_FILENAME,
  type TraceEvent,
  type TraceJsonSchema,
  traceEvent,
  traceJsonSchema,
} from "./trace-json";
export { CPU_PROFILE_FILENAME } from "./tsc-cpuprofile";
export { createTypeRegistry, type TypeRegistry } from "./type-registry";
export {
  type ResolvedType,
  resolvedType,
  TYPES_JSON_FILENAME,
  type TypeRelationInfo,
  type TypesJsonSchema,
  typeRelationInfo,
  typesJsonSchema,
} from "./types-json";
export type { TypeId } from "./utils";
