import { z } from "zod";
import { absolutePath, typeId } from "./utils";

export const eventPhase = {
	begin: "B",
	end: "E",
	complete: "X",
	metadata: "M",
} as const;

const durationEvent = {
	ph: z.union([z.literal(eventPhase.begin), z.literal(eventPhase.end)]),
};

const completeEvent = {
	ph: z.literal(eventPhase.complete),
	dur: z.number().positive(),
};

const category = {
	bind: {
		cat: z.literal("bind"),
	},
	check: {
		cat: z.literal("check"),
	},
	program: {
		cat: z.literal("program"),
	},
	parse: {
		cat: z.literal("parse"),
	},
	emit: {
		cat: z.literal("emit"),
	},
	checkTypes: {
		cat: z.literal("checkTypes"),
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

const event_metadata__TracingStartedInBrowser = z
	.object({
		...eventCommon,
		cat: z.literal("disabled-by-default-devtools.timeline"),
		name: z.literal("TracingStartedInBrowser"),
		ph: z.literal(eventPhase.metadata),
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
			path: absolutePath,
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

const events_check = [
	event_check__checkExpression,
	event_check__checkSourceFile,
	event_check__checkVariableDeclaration,
];

/*
 * CHECKTYPES PHASE EVENTS
 */
const event_checktypes__getVariancesWorker = z
	.object({
		...eventCommon,
		...category.checkTypes,
		...completeEvent,
		name: z.literal("getVariancesWorker"),
		dur: z.number(),
		args: z.object({
			arity: z.number().int().positive(),
			id: z.number().int().positive(),
			results: z.object({
				variances: z.array(
					z.union([
						z.literal("out"),
						z.literal("in out (unreliable)"),
						z.literal("out (unreliable)"),
					]),
				),
			}),
		}),
	})
	.strict();

const event_checktypes__structuredTypeRelatedTo = z.object({
	...eventCommon,
	...category.checkTypes,
	...completeEvent,
	name: z.literal("structuredTypeRelatedTo"),
	args: z.object({
		sourceId: typeId,
		targetId: typeId,
	}),
});

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
			directive: z.union([z.literal("node"), z.literal("react")]),
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

const event_program__resolveLibrary = z.object({
	...eventCommon,
	...category.program,
	...completeEvent,
	name: z.literal("resolveLibrary"),
	args: z.object({
		resolveFrom: absolutePath,
	}),
});

const event_program__resolveModuleNamesWorker = z.object({
	...eventCommon,
	...category.program,
	...completeEvent,
	name: z.literal("resolveModuleNamesWorker"),
	args: z.object({
		containingFileName: absolutePath,
	}),
});

const event_program__resolveTypeReferenceDirectiveNamesWorker = z.object({
	...eventCommon,
	...category.program,
	...completeEvent,
	name: z.literal("resolveTypeReferenceDirectiveNamesWorker"),
	args: z.object({
		containingFileName: absolutePath,
	}),
});

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

const event_emit__transformNodes = z.object({
	...eventCommon,
	...category.emit,
	...completeEvent,
	name: z.literal("transformNodes"),
	args: z.object({
		path: absolutePath,
	}),
});

export const traceEvent = z.discriminatedUnion("name", [
	event_bind__bindSourceFile,
	...events_check,
	event_checktypes__getVariancesWorker,
	event_checktypes__structuredTypeRelatedTo,
	event_emit__emit,
	event_emit__emitJsFileOrBundle,
	event_emit__transformNodes,
	event_metadata__TracingStartedInBrowser,
	event_metadata__process_name,
	event_metadata__thread_name,
	event_parse__createSourceFile,
	event_program__createProgram,
	event_program__findSourceFile,
	event_program__processRootFiles,
	event_program__processTypeReferenceDirective,
	event_program__processTypeReferences,
	event_program__resolveLibrary,
	event_program__resolveModuleNamesWorker,
	event_program__resolveTypeReferenceDirectiveNamesWorker,
]);

export type TraceEvent = z.infer<typeof traceEvent>;
export const traceJsonFile = z.array(traceEvent);
export type TraceJsonFile = z.infer<typeof traceJsonFile>;
