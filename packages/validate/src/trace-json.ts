import { z } from "zod/v4";
import { absolutePath, typeId } from "./utils";

export const TRACE_JSON_FILENAME = "trace.json";

export const eventPhase = {
  begin: "B",
  end: "E",
  complete: "X",
  metadata: "M",
  instantGlobal: "I",
  // 'i' is instantThread
} as const;

export const instantScope = {
  thread: "t",
  global: "g",
  process: "p",
};

const durationEvent = {
  ph: z.union([z.literal(eventPhase.begin), z.literal(eventPhase.end)]),
};

const completeEvent = {
  ph: z.literal(eventPhase.complete),
  dur: z.number().positive(),
};

const instantEvent = {
  ph: z.literal(eventPhase.instantGlobal),
};

const category = {
  parse: {
    cat: z.literal("parse"),
  },
  program: {
    cat: z.literal("program"),
  },
  bind: {
    cat: z.literal("bind"),
  },
  check: {
    cat: z.literal("check"),
  },
  checkTypes: {
    cat: z.literal("checkTypes"),
  },
  emit: {
    cat: z.literal("emit"),
  },
  session: {
    cat: z.literal("session"),
  },
};

const eventCommon = {
  pid: z.number().int().positive(),
  tid: z.number().int().positive(),
  ts: z.number().positive(),
};

/*
 * METADATA EVENTS
 */

const event_metadata__TracingStartedInBrowser = z
  .object({
    ...eventCommon,
    cat: z.literal("disabled-by-default-devtools.timeline"),
    name: z.literal("TracingStartedInBrowser"),
    ph: z.literal(eventPhase.metadata),
  })
  .strict();

const event_metadata__process_name = z
  .object({
    ...eventCommon,
    ph: z.literal(eventPhase.metadata),
    args: z.object({
      name: z.literal("tsc"),
    }),
    cat: z.literal("__metadata"),
    name: z.literal("process_name"),
  })
  .strict();

const event_metadata__thread_name = z
  .object({
    ...eventCommon,
    name: z.literal("thread_name"),
    cat: z.literal("__metadata"),
    ph: z.literal(eventPhase.metadata),
    args: z.object({
      name: z.literal("Main"),
    }),
  })
  .strict();

/*
 * PARSE PHASE EVENTS
 */

const event_parse__createSourceFile = z
  .object({
    ...eventCommon,
    ...category.parse,
    ...durationEvent,
    name: z.literal("createSourceFile"),
    args: z.object({
      path: absolutePath,
    }),
  })
  .strict();

const event_parse__parseJsonSourceFileConfigFileContent = z
  .object({
    ...eventCommon,
    ...category.parse,
    ...completeEvent,
    name: z.literal("parseJsonSourceFileConfigFileContent"),
    args: z.object({
      path: absolutePath,
    }),
  })
  .strict();

/*
 * PROGRAM PHASE EVENTS
 */

const event_program__createProgram = z
  .object({
    ...eventCommon,
    ...category.program,
    ...durationEvent,
    name: z.literal("createProgram"),
    args: z.object({
      configFilePath: absolutePath, // path to the tsconfig.json file
    }),
  })
  .strict();

const event_program__findSourceFile = z
  .object({
    ...eventCommon,
    ...category.program,
    ...completeEvent,
    name: z.literal("findSourceFile"),
    dur: z.number(),
    args: z.object({
      fileName: absolutePath,
      fileIncludeKind: z.union([
        z.literal("RootFile"),
        z.literal("Import"),
        z.literal("TypeReferenceDirective"),
        z.literal("LibFile"),
        z.literal("LibReferenceDirective"),
        z.literal("AutomaticTypeDirectiveFile"),
        z.literal("ReferenceFile"),
      ]),
    }),
  })
  .strict();

const event_program__processRootFiles = z
  .object({
    ...eventCommon,
    ...category.program,
    ...completeEvent,
    name: z.literal("processRootFiles"),
    dur: z.number(),
    args: z.object({ count: z.number().int().positive() }),
  })
  .strict();

const event_program__processTypeReferenceDirective = z
  .object({
    ...eventCommon,
    ...category.program,
    ...completeEvent,
    name: z.literal("processTypeReferenceDirective"),
    dur: z.number(),
    args: z.object({
      directive: z.string(),
      hasResolved: z.literal(true),
      refKind: z.number().int().positive(),
      refPath: absolutePath.optional(),
    }),
  })
  .strict();

const event_program__processTypeReferences = z
  .object({
    ...eventCommon,
    ...category.program,
    ...completeEvent,
    name: z.literal("processTypeReferences"),
    dur: z.number(),
    args: z.object({
      count: z.number().int().positive(),
    }),
  })
  .strict();

const event_program__resolveLibrary = z
  .object({
    ...eventCommon,
    ...category.program,
    ...completeEvent,
    name: z.literal("resolveLibrary"),
    args: z.object({
      resolveFrom: absolutePath,
    }),
  })
  .strict();

const event_program__resolveModuleNamesWorker = z
  .object({
    ...eventCommon,
    ...category.program,
    ...completeEvent,
    name: z.literal("resolveModuleNamesWorker"),
    args: z.object({
      containingFileName: absolutePath,
    }),
  })
  .strict();

const event_program__resolveTypeReferenceDirectiveNamesWorker = z
  .object({
    ...eventCommon,
    ...category.program,
    ...completeEvent,
    name: z.literal("resolveTypeReferenceDirectiveNamesWorker"),
    args: z.object({
      containingFileName: absolutePath,
    }),
  })
  .strict();

const event_program__shouldProgramCreateNewSourceFiles = z
  .object({
    ...eventCommon,
    ...category.program,
    ...instantEvent,
    name: z.literal("shouldProgramCreateNewSourceFiles"),
    s: z.union([
      z.literal(instantScope.global),
      z.literal(instantScope.thread),
      z.literal(instantScope.process),
    ]),
    args: z.object({
      hasOldProgram: z.boolean(),
    }),
  })
  .strict();

const event_program__tryReuseStructureFromOldProgram = z
  .object({
    ...eventCommon,
    ...category.program,
    ...completeEvent,
    name: z.literal("tryReuseStructureFromOldProgram"),
    dur: z.number(),
    args: z.object({}),
  })
  .strict();

/*
 * BIND PHASE EVENTS
 */

const event_bind__bindSourceFile = z
  .object({
    ...eventCommon,
    ...category.bind,
    ...durationEvent,
    name: z.literal("bindSourceFile"),
    args: z.object({
      path: absolutePath,
    }),
  })
  .strict();

/*
 * CHECK PHASE EVENTS
 */

const event_check__checkExpression = z
  .object({
    ...eventCommon,
    ...category.check,
    ...completeEvent,
    name: z.literal("checkExpression"),
    dur: z.number(),
    args: z.object({
      kind: z.number(),
      pos: z.number(),
      end: z.number(),
      path: absolutePath.optional(),
    }),
  })
  .strict();

const event_check__checkSourceFile = z
  .object({
    ...eventCommon,
    ...category.check,
    ...durationEvent,
    name: z.literal("checkSourceFile"),
    args: z.object({
      path: absolutePath,
    }),
  })
  .strict();

const event_check__checkVariableDeclaration = z
  .object({
    ...eventCommon,
    ...category.check,
    ...completeEvent,
    name: z.literal("checkVariableDeclaration"),
    dur: z.number(),
    args: z.object({
      kind: z.number(),
      pos: z.number(),
      end: z.number(),
      path: absolutePath,
    }),
  })
  .strict();

const event_check__checkDeferredNode = z
  .object({
    ...eventCommon,
    ...category.check,
    ...completeEvent,
    name: z.literal("checkDeferredNode"),
    dur: z.number(),
    args: z.object({
      kind: z.number(),
      pos: z.number(),
      end: z.number(),
      path: absolutePath,
    }),
  })
  .strict();

const event_check__checkSourceFileNodes = z
  .object({
    ...eventCommon,
    ...category.check,
    ...completeEvent,
    name: z.literal("checkSourceFileNodes"),
    dur: z.number(),
    args: z.object({
      path: absolutePath,
    }),
  })
  .strict();

/*
 * CHECKTYPES PHASE EVENTS
 */
const event_checktypes__checkTypeParameterDeferred = z
  .object({
    ...eventCommon,
    ...category.checkTypes,
    ...completeEvent,
    name: z.literal("checkTypeParameterDeferred"),
    dur: z.number(),
    args: z.object({
      parent: typeId,
      id: typeId,
    }),
  })
  .strict();

const event_checktypes__getVariancesWorker = z
  .object({
    ...eventCommon,
    ...category.checkTypes,
    ...completeEvent,
    name: z.literal("getVariancesWorker"),
    dur: z.number(),
    args: z.object({
      arity: z.number().int().nonnegative(),
      id: z.number().int().positive(),
      results: z.object({
        variances: z.array(
          z.union([
            z.literal("[independent]"),
            z.literal("[independent] (unreliable)"),
            z.literal("[independent] (unmeasurable)"),
            z.literal("[bivariant]"),
            z.literal("[bivariant] (unreliable)"),
            z.literal("[bivariant] (unmeasurable)"),
            z.literal("in"),
            z.literal("in (unreliable)"),
            z.literal("in (unmeasurable)"),
            z.literal("out"),
            z.literal("out (unreliable)"),
            z.literal("out (unmeasurable)"),
            z.literal("in out" /*burger*/),
            z.literal("in out (unreliable)"),
            z.literal("in out (unmeasurable)"),
          ]),
        ),
      }),
    }),
  })
  .strict();

const event_checktypes__structuredTypeRelatedTo = z
  .object({
    ...eventCommon,
    ...category.checkTypes,
    ...completeEvent,
    name: z.literal("structuredTypeRelatedTo"),
    args: z.object({
      sourceId: typeId,
      targetId: typeId,
    }),
  })
  .strict();

/*
 * CHECKTYPES PHASE DEPTH LIMIT EVENTS
 */

/**
 * The `checkCrossProductUnion_DepthLimit` limit is hit when the cross-product of two types exceeds 100_000 combinations while expanding intersections into a union.
 *
 * This triggers the error `TS(2590) Expression produces a union type that is too complex to represent.`
 */
export const event_checktypes__checkCrossProductUnion_DepthLimit = z
  .object({
    ...eventCommon,
    ...category.checkTypes,
    ...instantEvent,
    name: z.literal("checkCrossProductUnion_DepthLimit"),
    s: z.union([
      z.literal(instantScope.global),
      z.literal(instantScope.thread),
      z.literal(instantScope.process),
    ]),
    args: z.object({
      typeIds: z.array(typeId),
      size: z.number().int().positive(),
    }),
  })
  .strict();
export type EventChecktypes__CheckCrossProductUnion_DepthLimit = z.infer<
  typeof event_checktypes__checkCrossProductUnion_DepthLimit
>;

/**
 * The `checkTypeRelatedTo_DepthLimit` limit is hit when a type relationship check overflows: either the checker reaches its recursion stack limit while comparing deeply nested (or expanding) types or it exhausts the relation-complexity budget.
 * in Node.js the maximum number of elements in a map is 2^24.
 * TypeScript therefore limits the number of entries an invocation of `checkTypeRelatedTo` can add to a relation to 1/8th of its remaining capacity.
 * This limit being hit means the relation will be recorded as failing.
 *
 * This triggers one of the following errors:
 * - `TS(2859) Excessive complexity comparing types '{0}' and '{1}'.`
 * - `TS(2321) Excessive stack depth comparing types '{0}' and '{1}'.`
 */
export const event_checktypes__checkTypeRelatedTo_DepthLimit = z
  .object({
    ...eventCommon,
    ...category.checkTypes,
    ...instantEvent,
    name: z.literal("checkTypeRelatedTo_DepthLimit"),
    s: z.union([
      z.literal(instantScope.global),
      z.literal(instantScope.thread),
      z.literal(instantScope.process),
    ]),
    args: z.object({
      sourceId: typeId,
      targetId: typeId,
      depth: z.number().int().positive(),
      targetDepth: z.number().int().positive(),
    }),
  })
  .strict();
export type EventChecktypes__CheckTypeRelatedTo_DepthLimit = z.infer<
  typeof event_checktypes__checkTypeRelatedTo_DepthLimit
>;

/**
 * The `getTypeAtFlowNode_DepthLimit` limit is hit when resolving the control flow type for a reference causes more than 2_000 recursions.
 * To avoid overflowing the call stack we report an error and disable further control flow analysis in the containing function or module body.
 *
 * This triggers the error `TS(2563) The containing function or module body is too large for control flow analysis.`
 */
export const event_checktypes__getTypeAtFlowNode_DepthLimit = z
  .object({
    ...eventCommon,
    ...category.checkTypes,
    ...instantEvent,
    name: z.literal("getTypeAtFlowNode_DepthLimit"),
    s: z.union([
      z.literal(instantScope.global),
      z.literal(instantScope.thread),
      z.literal(instantScope.process),
    ]),
    args: z.object({
      flowId: z.number().int().positive(),
    }),
  })
  .strict();
export type EventChecktypes__GetTypeAtFlowNode_DepthLimit = z.infer<
  typeof event_checktypes__getTypeAtFlowNode_DepthLimit
>;

/**
 * The `instantiateType_DepthLimit` is hit when more than 100 recursive type instantiations or 5_000_000 instantiations are caused by the same statement or expression.
 * There is a very high likelihood we're dealing with a combination of infinite generic types that perpetually generate new type identities, so TypeScript stops and throws this error.
 *
 * This triggers the error `TS(2589) Type instantiation is excessively deep and possibly infinite.`
 */

export const event_checktypes__instantiateType_DepthLimit = z
  .object({
    ...eventCommon,
    ...category.checkTypes,
    ...instantEvent,
    name: z.literal("instantiateType_DepthLimit"),
    s: z.union([
      z.literal(instantScope.global),
      z.literal(instantScope.thread),
      z.literal(instantScope.process),
    ]),
    args: z.object({
      typeId,
      instantiationDepth: z.number().int(),
      instantiationCount: z.number().int().positive(),
    }),
  })
  .strict();
export type EventChecktypes__InstantiateType_DepthLimit = z.infer<
  typeof event_checktypes__instantiateType_DepthLimit
>;

/**
 * The `recursiveTypeRelatedTo_DepthLimit` limit is hit when the sourceDepth or targetDepth of a type check exceeds 100 during recursive type comparison, indicating a runaway recursion from deeply nested generics or type instantiations.
 *
 * This is not currently considered a hard error by the compiler and therefore
    does not report to the user (unless you're a TypeSlayer user 😉).
 */
export const event_checktypes__recursiveTypeRelatedTo_DepthLimit = z
  .object({
    ...eventCommon,
    ...category.checkTypes,
    ...instantEvent,
    name: z.literal("recursiveTypeRelatedTo_DepthLimit"),
    s: z.union([
      z.literal(instantScope.global),
      z.literal(instantScope.thread),
      z.literal(instantScope.process),
    ]),
    args: z.object({
      sourceId: typeId,
      sourceIdStack: z.array(typeId),
      targetId: typeId,
      targetIdStack: z.array(typeId),
      depth: z.number().int().positive(),
      targetDepth: z.number().int().positive(),
    }),
  })
  .strict();
export type EventChecktypes__RecursiveTypeRelatedTo_DepthLimit = z.infer<
  typeof event_checktypes__recursiveTypeRelatedTo_DepthLimit
>;

/**
 * The `removeSubtypes_DepthLimit` limit is hit when subtype-reduction work becomes too large.
 * Specifically, when more than 100,000 pairwise constituent checks occur, the type checker will pause and estimate remaining work.
 * If that estimate exceeds 1_000_000 pairwise checks, the checker will halt and report this error.
 *
 * This triggers the error `TS(2590) Expression produces a union type that is too complex to represent.`
 *
 */
export const event_checktypes__removeSubtypes_DepthLimit = z
  .object({
    ...eventCommon,
    ...category.checkTypes,
    ...instantEvent,
    name: z.literal("removeSubtypes_DepthLimit"),
    s: z.union([
      z.literal(instantScope.global),
      z.literal(instantScope.thread),
      z.literal(instantScope.process),
    ]),
    args: z.object({
      typeIds: z.array(typeId),
    }),
  })
  .strict();
export type EventChecktypes__RemoveSubtypes_DepthLimit = z.infer<
  typeof event_checktypes__removeSubtypes_DepthLimit
>;

/**
 * The `traceUnionsOrIntersectionsTooLarge_DepthLimit` limit is hit when the product of a source and target type that will be part of a union will exceed 1_000_000 members when multiplied out.
 *
 * This is not currently considered a hard error by the compiler and therefore
    does not report to the user (unless you're a TypeSlayer user 😉).
 */
export const event_checktypes__traceUnionsOrIntersectionsTooLarge_DepthLimit = z
  .object({
    ...eventCommon,
    ...category.checkTypes,
    ...instantEvent,
    name: z.literal("traceUnionsOrIntersectionsTooLarge_DepthLimit"),
    s: z.union([
      z.literal(instantScope.global),
      z.literal(instantScope.thread),
      z.literal(instantScope.process),
    ]),
    args: z.object({
      sourceId: typeId,
      sourceSize: z.number().int().positive(),
      targetId: typeId,
      targetSize: z.number().int().positive(),
      pos: z.number().int().nonnegative().optional(),
      end: z.number().int().positive().optional(),
    }),
  })
  .strict();
export type EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit =
  z.infer<
    typeof event_checktypes__traceUnionsOrIntersectionsTooLarge_DepthLimit
  >;

/**
 * The `typeRelatedToDiscriminatedType_DepthLimit` limit is hit when comparing a source object to a discriminated-union target type with more than 25 constituent types.
 * When this occurs, the type checker will just return `false` for the type comparison to avoid excessive computation.
 *
 * This is not currently considered a hard error by the compiler and therefore
    does not report to the user (unless you're a TypeSlayer user 😉).
 */
export const event_checktypes__typeRelatedToDiscriminatedType_DepthLimit = z
  .object({
    ...eventCommon,
    ...category.checkTypes,
    ...instantEvent,
    name: z.literal("typeRelatedToDiscriminatedType_DepthLimit"),
    s: z.union([
      z.literal(instantScope.global),
      z.literal(instantScope.thread),
      z.literal(instantScope.process),
    ]),
    args: z.object({
      sourceId: typeId,
      targetId: typeId,
      numCombinations: z.number().int().positive(),
    }),
  })
  .strict();

export type EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit =
  z.infer<typeof event_checktypes__typeRelatedToDiscriminatedType_DepthLimit>;

export const depthLimits = [
  event_checktypes__checkCrossProductUnion_DepthLimit,
  event_checktypes__checkTypeRelatedTo_DepthLimit,
  event_checktypes__getTypeAtFlowNode_DepthLimit,
  event_checktypes__instantiateType_DepthLimit,
  event_checktypes__recursiveTypeRelatedTo_DepthLimit,
  event_checktypes__removeSubtypes_DepthLimit,
  event_checktypes__traceUnionsOrIntersectionsTooLarge_DepthLimit,
  event_checktypes__typeRelatedToDiscriminatedType_DepthLimit,
];

export type DepthLimitNames =
  | EventChecktypes__CheckCrossProductUnion_DepthLimit["name"]
  | EventChecktypes__CheckTypeRelatedTo_DepthLimit["name"]
  | EventChecktypes__GetTypeAtFlowNode_DepthLimit["name"]
  | EventChecktypes__InstantiateType_DepthLimit["name"]
  | EventChecktypes__RecursiveTypeRelatedTo_DepthLimit["name"]
  | EventChecktypes__RemoveSubtypes_DepthLimit["name"]
  | EventChecktypes__TraceUnionsOrIntersectionsTooLarge_DepthLimit["name"]
  | EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit["name"];

export const depthLimitInfo = {
  instantiateType_DepthLimit: {
    description: "Type Instantiation",
  },
  recursiveTypeRelatedTo_DepthLimit: {
    description: "Recursive Relations",
  },
  typeRelatedToDiscriminatedType_DepthLimit: {
    description: "Discrimination",
  },
  checkCrossProductUnion_DepthLimit: {
    description: "Cross-Product Union",
  },
  checkTypeRelatedTo_DepthLimit: {
    description: "Type Relation Depth",
  },
  getTypeAtFlowNode_DepthLimit: {
    description: "Flow Node Type",
  },
  removeSubtypes_DepthLimit: {
    description: "Remove Subtypes",
  },
  traceUnionsOrIntersectionsTooLarge_DepthLimit: {
    description: "Union/Intersection Size",
  },
} satisfies Record<DepthLimitNames, { description: string }>;

/*
 * EMIT PHASE EVENTS
 */

const event_emit__emit = z
  .object({
    ...eventCommon,
    ...category.emit,
    ...durationEvent,
    name: z.literal("emit"),
    args: z.object({}), // for some reason, this is empty
  })
  .strict();

const event_emit__emitBuildInfo = z
  .object({
    ...eventCommon,
    ...category.emit,
    ph: z.union([
      z.literal(eventPhase.begin),
      z.literal(eventPhase.end),
      z.literal(eventPhase.complete),
    ]),
    dur: z.number().positive().optional(),
    name: z.literal("emitBuildInfo"),
    args: z.union([
      z.object({}),
      z.object({
        buildInfoPath: absolutePath,
      }),
    ]),
  })
  .strict();

const event_emit__emitDeclarationFileOrBundle = z
  .object({
    ...eventCommon,
    ...category.emit,
    ...completeEvent,
    name: z.literal("emitDeclarationFileOrBundle"),
    dur: z.number(),
    args: z.object({
      declarationFilePath: absolutePath,
    }),
  })
  .strict();

const event_emit__emitJsFileOrBundle = z
  .object({
    ...eventCommon,
    ...category.emit,
    ...completeEvent,
    name: z.literal("emitJsFileOrBundle"),
    dur: z.number(),
    args: z.object({
      jsFilePath: absolutePath,
    }),
  })
  .strict();

const event_emit__transformNodes = z
  .object({
    ...eventCommon,
    ...category.emit,
    ...completeEvent,
    name: z.literal("transformNodes"),
    args: z.object({
      path: absolutePath,
    }),
  })
  .strict();

/*
 * SESSION PHASE EVENTS
 */

const event_session__cancellationThrown = z
  .object({
    ...eventCommon,
    ...category.session,
    ...instantEvent,
    name: z.literal("cancellationThrown"),
    args: z.object({
      kind: z.union([
        z.literal("CancellationTokenObject"),
        z.literal("ThrotledCancellationToken"),
      ]),
    }),
  })
  .strict();

const event_session__commandCanceled = z
  .object({
    ...eventCommon,
    ...category.session,
    ...instantEvent,
    name: z.literal("commandCanceled"),
    args: z.object({
      seq: z.number().int().nonnegative(),
      command: z.string(),
    }),
  })
  .strict();

const event_session__commandError = z
  .object({
    ...eventCommon,
    ...category.session,
    ...instantEvent,
    name: z.literal("commandError"),
    args: z.object({
      seq: z.number().int().nonnegative(),
      command: z.string(),
      message: z.string(),
    }),
  })
  .strict();

const event_session__createConfiguredProject = z
  .object({
    ...eventCommon,
    ...category.session,
    ...instantEvent,
    name: z.literal("createConfiguredProject"),
    args: z.object({
      configFilePath: absolutePath,
    }),
  })
  .strict();

const event_session__createdDocumentRegistryBucket = z
  .object({
    ...eventCommon,
    ...category.session,
    ...instantEvent,
    name: z.literal("createdDocumentRegistryBucket"),
    args: z.object({
      configFilePath: absolutePath,
      key: z.string(),
    }),
  })
  .strict();

const event_session__documentRegistryBucketOverlap = z
  .object({
    ...eventCommon,
    ...category.session,
    ...instantEvent,
    name: z.literal("documentRegistryBucketOverlap"),
    args: z.object({
      path: absolutePath,
      key1: z.string(),
      key2: z.string(),
    }),
  })
  .strict();

const event_session__executeCommand = z
  .object({
    ...eventCommon,
    ...category.session,
    ...durationEvent,
    name: z.literal("executeCommand"),
    args: z.object({
      seq: z.number().int().nonnegative(),
      command: z.string(),
    }),
  })
  .strict();

const event_session__finishCachingPerDirectoryResolution = z
  .object({
    ...eventCommon,
    ...category.session,
    ...instantEvent,
    name: z.literal("finishCachingPerDirectoryResolution"),
    s: z.union([
      z.literal(instantScope.global),
      z.literal(instantScope.thread),
      z.literal(instantScope.process),
    ]),
  })
  .strict();

const event_session__getPackageJsonAutoImportProvider = z
  .object({
    ...eventCommon,
    ...category.session,
    ...completeEvent,
    name: z.literal("getPackageJsonAutoImportProvider"),
  })
  .strict();

const event_session__getUnresolvedImports = z
  .object({
    ...eventCommon,
    ...category.session,
    ...completeEvent,
    name: z.literal("getUnresolvedImports"),
    args: z.object({
      count: z.number().int().nonnegative(),
    }),
  })
  .strict();

const event_session__loadConfiguredProject = z
  .object({
    ...eventCommon,
    ...category.session,
    ...durationEvent,
    name: z.literal("loadConfiguredProject"),
    args: z.object({
      configFilePath: absolutePath,
    }),
  })
  .strict();

const event_session__regionSemanticCheck = z
  .object({
    ...eventCommon,
    ...category.session,
    ...durationEvent,
    name: z.literal("regionSemanticCheck"),
    args: z.object({
      file: absolutePath,
      configFilePath: absolutePath,
    }),
  })
  .strict();

const event_session__request = z
  .object({
    ...eventCommon,
    ...category.session,
    ...instantEvent,
    name: z.literal("request"),
    args: z.object({
      seq: z.number().int().nonnegative(),
      command: z.string(),
    }),
  })
  .strict();

const event_session__response = z
  .object({
    ...eventCommon,
    ...category.session,
    ...instantEvent,
    name: z.literal("response"),
    args: z.object({
      seq: z.number().int().nonnegative(),
      command: z.string(),
      success: z.boolean(),
    }),
  })
  .strict();

const event_session__semanticCheck = z
  .object({
    ...eventCommon,
    ...category.session,
    ...durationEvent,
    name: z.literal("semanticCheck"),
    args: z.object({
      file: absolutePath,
      configFilePath: absolutePath,
    }),
  })
  .strict();

const event_session__stepAction = z
  .object({
    ...eventCommon,
    ...category.session,
    ...instantEvent,
    name: z.literal("stepAction"),
    s: z.union([
      z.literal(instantScope.global),
      z.literal(instantScope.thread),
      z.literal(instantScope.process),
    ]),
    args: z.object({
      seq: z.number().int().nonnegative(),
    }),
  })
  .strict();

const event_session__stepCanceled = z
  .object({
    ...eventCommon,
    ...category.session,
    ...instantEvent,
    name: z.literal("stepCanceled"),
    args: z.object({
      seq: z.number().int().nonnegative(),
      early: z.literal(true).optional(),
    }),
  })
  .strict();

const event_session__stepError = z
  .object({
    ...eventCommon,
    ...category.session,
    ...instantEvent,
    name: z.literal("stepError"),
    args: z.object({
      seq: z.number().int().nonnegative(),
      message: z.string(),
    }),
  })
  .strict();

const event_session__suggestionCheck = z
  .object({
    ...eventCommon,
    ...category.session,
    ...durationEvent,
    name: z.literal("suggestionCheck"),
    args: z.object({
      file: absolutePath,
      configFilePath: absolutePath,
    }),
  })
  .strict();

const event_session__syntacticCheck = z
  .object({
    ...eventCommon,
    ...category.session,
    ...durationEvent,
    name: z.literal("syntacticCheck"),
    args: z.object({
      file: absolutePath,
      configFilePath: absolutePath,
    }),
  })
  .strict();

const event_session__updateGraph = z
  .object({
    ...eventCommon,
    ...category.session,
    ...durationEvent,
    name: z.literal("updateGraph"),
    args: z.object({
      name: z.string(),
      kind: z.union([
        z.literal(0), //"Inferred
        z.literal(1), // Configured"
        z.literal(2), // "Inferred"
        z.literal(3), // "External"
        z.literal(4), // "AutoImportProvider"
        z.literal(5), // "Auxiliary"
      ]),
    }),
  })
  .strict();

/*
 * TRACE EVENT UNION
 */

export const traceEvent = z.discriminatedUnion(
  "name",
  [
    event_metadata__TracingStartedInBrowser,
    event_metadata__process_name,
    event_metadata__thread_name,

    event_parse__createSourceFile,
    event_parse__parseJsonSourceFileConfigFileContent,

    event_program__createProgram,
    event_program__findSourceFile,
    event_program__processRootFiles,
    event_program__processTypeReferenceDirective,
    event_program__processTypeReferences,
    event_program__resolveLibrary,
    event_program__resolveModuleNamesWorker,
    event_program__resolveTypeReferenceDirectiveNamesWorker,
    event_program__shouldProgramCreateNewSourceFiles,
    event_program__tryReuseStructureFromOldProgram,

    event_bind__bindSourceFile,

    event_check__checkExpression,
    event_check__checkSourceFile,
    event_check__checkVariableDeclaration,
    event_check__checkDeferredNode,
    event_check__checkSourceFileNodes,

    event_checktypes__checkTypeParameterDeferred,
    event_checktypes__getVariancesWorker,
    event_checktypes__structuredTypeRelatedTo,

    ...depthLimits,

    event_emit__emit,
    event_emit__emitBuildInfo,
    event_emit__emitDeclarationFileOrBundle,
    event_emit__emitJsFileOrBundle,
    event_emit__transformNodes,

    event_session__cancellationThrown,
    event_session__commandCanceled,
    event_session__commandError,
    event_session__createConfiguredProject,
    event_session__createdDocumentRegistryBucket,
    event_session__documentRegistryBucketOverlap,
    event_session__executeCommand,
    event_session__finishCachingPerDirectoryResolution,
    event_session__getPackageJsonAutoImportProvider,
    event_session__getUnresolvedImports,
    event_session__loadConfiguredProject,
    event_session__regionSemanticCheck,
    event_session__request,
    event_session__response,
    event_session__semanticCheck,
    event_session__stepAction,
    event_session__stepCanceled,
    event_session__stepError,
    event_session__suggestionCheck,
    event_session__syntacticCheck,
    event_session__updateGraph,
  ],
  {
    // errorMap: (issue, ctx) => ({
    // 	// prettier-ignore
    // 	message: issue.code === "invalid_union_discriminator" ?
    // 			`Invalid discriminator value. Expected ${issue.options.map(opt => `'${String(opt)}'`).join(' | ')}, got '${ctx.data.type}'.`
    // 			: ctx.defaultError,
    // }),
  },
);

export type TraceEvent = z.infer<typeof traceEvent>;
export const traceJsonSchema = z.array(traceEvent);
export type TraceJsonSchema = z.infer<typeof traceJsonSchema>;
