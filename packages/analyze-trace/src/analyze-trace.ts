import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type TraceJsonFile,
	type TypesJsonFile,
	traceJsonFile,
	typesJsonFile,
} from "@typeslayer/validate";
import { getDuplicateNodeModules } from "./get-duplicate-node-modules";
import { getHotspots } from "./get-hotspots";
import { getNodeModulePaths } from "./node-module-paths";
import { createSpanTree, createSpans } from "./spans";
import {
	type AbsolutePath,
	type AnalyzeTraceOptions,
	throwIfNotDirectory,
} from "./utils";
import type { AnalyzeTraceResult } from "./utils";

export function validateOptions(options: AnalyzeTraceOptions) {
	if (options.forceMillis < options.skipMillis) {
		throw new Error("forceMillis cannot be less than skipMillis");
	}
}

const validateTraceDir = async (
	traceDir: AbsolutePath,
): Promise<{
	traceFile: TraceJsonFile;
	typesFile: TypesJsonFile;
}> => {
	await throwIfNotDirectory(traceDir);

	const typesFilePath = join(traceDir, "types.json");
	if (!existsSync(typesFilePath)) {
		throw new Error(
			`types.json must exist in ${traceDir}. first run --generateTrace`,
		);
	}
	const typesFileJson = JSON.parse(await readFile(typesFilePath, "utf8"));
	const typesFile = typesJsonFile.parse(typesFileJson);

	const traceFilePath = join(traceDir, "trace.json");
	if (!existsSync(traceFilePath)) {
		throw new Error(
			`trace.json must exist in ${traceDir}. first run --generateTrace`,
		);
	}
	const traceFileJson = JSON.parse(await readFile(traceFilePath, "utf8"));
	const traceFile = traceJsonFile.parse(traceFileJson);

	return {
		traceFile,
		typesFile,
	};
};

export const defaultOptions: AnalyzeTraceOptions = {
	forceMillis: 500,
	skipMillis: 100,
	expandTypes: true,
	minSpanParentPercentage: 0.6,
	importExpressionThreshold: 10,
};

export const analyzeTrace = async ({
	traceDir,
	options = defaultOptions,
}: {
	traceDir: AbsolutePath;
	options?: AnalyzeTraceOptions;
}) => {
	validateOptions(options);
	const { traceFile, typesFile } = await validateTraceDir(traceDir);

	const nodeModulePaths = getNodeModulePaths(traceFile);

	const spans = createSpans(traceFile);
	const hotPathsTree = createSpanTree(spans, options);
	const hotSpots = await getHotspots(hotPathsTree, typesFile, options);

	const duplicatePackages = await getDuplicateNodeModules(nodeModulePaths);

	const result: AnalyzeTraceResult = {
		nodeModulePaths,
		unterminatedEvents: spans.unclosedStack.reverse(),
		hotSpots,
		duplicatePackages,
	};
	await writeFile(
		join(traceDir, "analyze-trace.json"),
		JSON.stringify(result, null, 2),
	);

	return result;
};
