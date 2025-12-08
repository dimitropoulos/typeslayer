// Browser-safe exports - only types and schemas, no Node.js APIs
export type {
  TraceJsonSchema,
  TypesJsonSchema,
} from "@typeslayer/validate";
export { ANALYZE_TRACE_FILENAME } from "./constants";
export type { DepthLimitsRecord } from "./depth-limits";
export type {
  AbsolutePath,
  AnalyzeTraceOptions,
  AnalyzeTraceResult,
  DuplicatedPackage,
  DuplicatedPackageInstance,
  EventSpan,
  HotSpot,
  Microseconds,
  NodeModulePaths,
  ParseResult,
  Project,
  ProjectResult,
  RootSpan,
} from "./utils";
