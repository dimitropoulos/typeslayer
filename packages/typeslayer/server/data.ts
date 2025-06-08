import { tmpdir } from "node:os";
import {
	type AbsolutePath,
	analyzeTraceResult,
	type DuplicatedPackage,
	type HotSpot,
} from "@typeslayer/analyze-trace";
import {
	createTypeRegistry,
	type EventChecktypes__InstantiateType_DepthLimit,
	type EventChecktypes__RecursiveTypeRelatedTo_DepthLimit,
	type EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit,
	type ResolvedType,
	type TypeId,
	type TypeRegistry,
	traceJsonSchema,
	typesJsonSchema,
} from "@typeslayer/validate";
import { grabFile } from "@typeslayer/validate/node";
import type { z } from "zod/v4";

export interface Data {
	/** the current working directory for the trace */
	projectRoot: string;

	/** the path to the temporary storage */
	tempDir: string;

	/** the tsc (or tsgo) script in a user's project */
	scriptName: string | null;

	/** all the files that were considered in the compilation */
	sourceFiles: string[];

	/** the files that were inputs to the compilation */
	rootNames: string[];

	/** a way to lookup types */
	typeRegistry: TypeRegistry;

	/** the hot spots that were found */
	hotSpots: HotSpot[];

	/** get duplicate packages */
	duplicatePackages: DuplicatedPackage[];

	typeInstantiationLimits: EventChecktypes__InstantiateType_DepthLimit[];
	recursiveTypeRelatedToLimits: EventChecktypes__RecursiveTypeRelatedTo_DepthLimit[];
	typeRelatedToDiscriminatedTypeLimits: EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit[];
}

const serverOptions = {
	/** Whether to make a new temp dir every time */
	makeFresh: false,
};

interface KnownFile {
	name: string;
	validator: z.ZodType;
}

const knownFiles = {
	analyzeTrace: {
		name: "analyze-trace.json",
		validator: analyzeTraceResult,
	},
	typesJson: {
		name: "types.json",
		validator: typesJsonSchema,
	},
	traceJson: {
		name: "trace.json",
		validator: traceJsonSchema,
	},
} satisfies Record<string, KnownFile>;

const createTempDir = () =>
	`${tmpdir()}/typeslayer${serverOptions.makeFresh ? `-${Date.now()}` : ""}`;

const initProjectRoot = () => {
	const projectRoot = process.cwd();
	const argumentRoot = process.argv[2];
	const result = argumentRoot ?? projectRoot;

	if (!result.endsWith("/")) {
		return `${result}/`;
	}
	return result;
};

export const data = {
	projectRoot: initProjectRoot(),
	tempDir: createTempDir(),
	scriptName: null as string | null,
	sourceFiles: [] as AbsolutePath[],
	rootNames: [] as string[],
	typeRegistry: new Map<TypeId, ResolvedType>(),
	hotSpots: [] as HotSpot[],
	duplicatePackages: [] as DuplicatedPackage[],
	typeInstantiationLimits: [] as EventChecktypes__InstantiateType_DepthLimit[],
	recursiveTypeRelatedToLimits:
		[] as EventChecktypes__RecursiveTypeRelatedTo_DepthLimit[],
	typeRelatedToDiscriminatedTypeLimits:
		[] as EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit[],
} satisfies Data;

export const refreshAnalyzeTraceFromDisk = async () => {
	const filePath = `${data.tempDir}/${knownFiles.analyzeTrace.name}`;
	try {
		const { duplicatePackages, hotSpots } = await grabFile(
			filePath,
			knownFiles.analyzeTrace.validator,
		);
		data.duplicatePackages = duplicatePackages;
		data.hotSpots = hotSpots;
		console.log("refreshAnalyzeTraceFromDisk");
	} catch (error) {
		console.log("error processing file", filePath, error);
	}
};

export const refreshTypesJson = async () => {
	const filePath = `${data.tempDir}/${knownFiles.typesJson.name}`;
	try {
		const typesJson = await grabFile(filePath, knownFiles.typesJson.validator);
		data.typeRegistry = createTypeRegistry(typesJson);
	} catch (error) {
		console.log(`error processing file`, filePath, error);
	}
};

export const refreshTraceJson = async () => {
	const filePath = `${data.tempDir}/${knownFiles.traceJson.name}`;
	try {
		const traceJson = await grabFile(filePath, knownFiles.traceJson.validator);

		data.typeInstantiationLimits = [];
		data.recursiveTypeRelatedToLimits = [];
		data.typeRelatedToDiscriminatedTypeLimits = [];

		for (const event of traceJson) {
			switch (event.name) {
				case "instantiateType_DepthLimit":
					data.typeInstantiationLimits.push(event);
					break;
				case "recursiveTypeRelatedTo_DepthLimit":
					data.recursiveTypeRelatedToLimits.push(event);
					break;
				case "typeRelatedToDiscriminatedType_DepthLimit":
					data.typeRelatedToDiscriminatedTypeLimits.push(event);
					break;
				default:
					// Ignore other events
					break;
			}
		}

		data.recursiveTypeRelatedToLimits.sort(
			(a, b) => b.args.depth - a.args.depth,
		);

		console.log("refreshTraceJson", {
			typeInstantiationLimits: data.typeInstantiationLimits.length,
			recursiveTypeRelatedToLimits: data.recursiveTypeRelatedToLimits.length,
			typeRelatedToDiscriminatedTypeLimits:
				data.typeRelatedToDiscriminatedTypeLimits.length,
		});
	} catch (error) {
		console.log("error processing file", filePath, error);
	}
};

export const refreshAllFiles = async () => {
	await refreshTypesJson();
	await refreshAnalyzeTraceFromDisk();
	await refreshTraceJson();
	console.log("Data refreshed from disk");
};
