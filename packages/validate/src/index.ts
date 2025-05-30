export {
	type ResolvedType,
	typesJsonFile,
	TypesJsonFile,
	resolvedType,
	TYPES_JSON_FILENAME,
} from "./types-json";
export {
	type TraceEvent,
	traceJsonFile,
	TraceJsonFile,
	traceEvent,
	eventPhase,
	type EventChecktypes__InstantiateType_DepthLimit,
	event_checktypes__instantiateType_DepthLimit,
	type EventChecktypes__RecursiveTypeRelatedTo_DepthLimit,
	event_checktypes__recursiveTypeRelatedTo_DepthLimit,
	type EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit,
	event_checktypes__typeRelatedToDiscriminatedType_DepthLimit,
	TRACE_JSON_FILENAME,
} from "./trace-json";
export { createTypeRegistry, type TypeRegistry } from "./type-registry";
export type { TypeId } from "./utils";
export { CPU_PROFILE_FILENAME } from "./tsc-cpuprofile";
export { packageNameRegex, extractPackageName, relativizePath } from "./package-name";
