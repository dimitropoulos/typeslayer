import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { z } from "zod";
import type { ResolvedType, TraceEvent } from "@typeslayer/validate";

export interface Project {
	configFilePath?: string;
	tracePath: string;
	typesPath: string;
}

export interface ProjectResult {
	project: Project;
	stdout: string;
	stderr: string;
	exitCode: number | undefined;
	signal: NodeJS.Signals | undefined;
}

export interface HotType {
	resolvedType: ResolvedType;
	children: HotType[];
}

export interface HotFrame {
	children: HotFrame[];
	description: string;
	timeMs: number;

	path?: string;
	types?: HotType[];

	startLine?: number;
	startChar?: number;
	startOffset?: number;

	endLine?: number;
	endChar?: number;
	endOffset?: number;
}

export interface DuplicatedPackage {
	name: string;
	instances: DuplicatedPackageInstance[];
}

export interface DuplicatedPackageInstance {
	path: string;
	version: string;
}

export interface AnalyzeTraceResult {
	unterminatedEvents: TraceEvent[];
	hotSpots: HotFrame[];
	duplicatePackages: DuplicatedPackage[];
	nodeModulePaths: NodeModulePaths;
}

export interface RootSpan {
	name: "root";
	cat: "program";
}

export interface EventSpan {
	event: TraceEvent | RootSpan;
	start: number;
	end: number;
	duration: number;
	children: EventSpan[];
}

export type Microseconds = number;

type PackageName = string;
type PackagePath = string;

/** This is a map where the key corresponds to an NPM package and the value is an array of all files in that package that were used */
export type NodeModulePaths = Map<PackageName, PackagePath[]>;

export interface ParseResult {
	firstSpanStart: number;
	lastSpanEnd: number;
	spans: EventSpan[];
	unclosedStack: TraceEvent[];
}

export type AnalyzeTraceOptions = {
	/** Events of at least this duration (in milliseconds) will reported unconditionally */
	forceMillis: number;

	/** Events of less than this duration (in milliseconds) will suppressed unconditionally */
	skipMillis: number;

	/** Expand types when printing */
	expandTypes: boolean;

	/** force showing spans that are some percentage of their parent, independent of parent time */
	minSpanParentPercentage: number;

	/** the minimum number of emitted imports from a declaration file or bundle */
	importExpressionThreshold: number;
};

/** A Zod for the schema */
export const analyzeTraceOptions = z.object({
	forceMillis: z.number().optional(),
	skipMillis: z.number().optional(),
	expandTypes: z.boolean().optional(),
	minSpanParentPercentage: z.number().optional(),
	importExpressionThreshold: z.number().optional(),
})

export type AbsolutePath = string;

export const isFile = async (path: string) => {
	return stat(path)
		.then((stats) => stats.isFile())
		.catch((_) => false);
};

export const throwIfNotDirectory = async (path: string) => {
	if (!existsSync(path) || !(await stat(path))?.isDirectory()) {
		throw new Error(`${path} is not a directory`);
	}
	return path;
};
