import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
	createTypeRegistry,
	traceJsonFile,
	typesJsonFile,
	type ResolvedType,
	type TypeId,
	type TypeRegistry,
	type EventChecktypes__InstantiateType_DepthLimit,
	type EventChecktypes__RecursiveTypeRelatedTo_DepthLimit,
	type EventChecktypes__TypeRelatedToDiscriminatedType_DepthLimit,
} from "@typeslayer/validate";
import {
	analyzeTraceResult,
	type AbsolutePath,
	type DuplicatedPackage,
	type HotSpot,
} from "@typeslayer/analyze-trace";
import { readFile } from "node:fs/promises";
import type { z } from "zod/v4";

export interface Data {
	/** the current working directory for the trace */
	cwd: string;

	/** the path to the temporary storage */
	tempDir: string;

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
		validator: typesJsonFile,
	},
	traceJson: {
		name: "trace.json",
		validator: traceJsonFile,
	},
} satisfies Record<string, KnownFile>;

const createTempDir = () =>
	`${tmpdir()}/typeslayer${serverOptions.makeFresh ? `-${Date.now()}` : ""}`;

export const data = {
	cwd: "/tmp/typeslayer", // process.cwd(),
	tempDir: createTempDir(),
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

const grabFile = async <V extends z.ZodType>(
	filePath: string,
	validator: V,
) => {
	const { tempDir } = data;
	const file = `${tempDir}/${filePath}`;
	const fileString = await readFile(file, "utf8");
	const json = JSON.parse(fileString) as z.infer<V>;
	const parsed = validator.safeParse(json);
	if (!parsed.success) {
		console.error("Error parsing file", { file, parsed });
		throw new Error(`Error parsing file ${file}`);
	}
	return parsed.data;
};

export const refreshAnalyzeTraceFromDisk = async () => {
	try {
		const { duplicatePackages, hotSpots } = await grabFile(
			knownFiles.analyzeTrace.name,
			knownFiles.analyzeTrace.validator,
		);
		data.duplicatePackages = duplicatePackages;
		data.hotSpots = hotSpots;
		console.log("refreshAnalyzeTraceFromDisk");
	} catch (error) {
		console.log("no analyze trace file found, skipping", error);
	}
};

export const refreshTypesJson = async () => {
	try {
		const typesJson = await grabFile(
			knownFiles.typesJson.name,
			knownFiles.typesJson.validator,
		);
		data.typeRegistry = createTypeRegistry(typesJson);
	} catch (error) {
		console.log("no types.json file found, skipping", error);
	}
};

export const refreshTraceJson = async () => {
	try {
		const traceJson = await grabFile(
			knownFiles.traceJson.name,
			knownFiles.traceJson.validator,
		);

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

		console.log("refreshTraceJson", {
			typeInstantiationLimits: data.typeInstantiationLimits.length,
			recursiveTypeRelatedToLimits: data.recursiveTypeRelatedToLimits.length,
			typeRelatedToDiscriminatedTypeLimits:
				data.typeRelatedToDiscriminatedTypeLimits.length,
		});

	} catch (error) {
		console.log("no types.json file found, skipping", error);
	}
};

export const refreshAllFiles = async () => {
	await refreshTypesJson();
	await refreshAnalyzeTraceFromDisk();
	await refreshTraceJson();
	console.log("Data refreshed from disk");
};
