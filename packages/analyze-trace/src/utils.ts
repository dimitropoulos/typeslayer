import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import type { TraceEvent } from "@typeslayer/validate";

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

export interface Result {
	unterminatedEvents: TraceEvent[];
	hotSpots: object[] | undefined;
	duplicatePackages: object[] | undefined;
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

	/** Color the output to make it easier to read */
	color: boolean;

	/** force showing spans that are some percentage of their parent, independent of parent time */
	minSpanParentPercentage: number;

	/** the minimum number of emitted imports from a declaration file or bundle */
	importExpressionThreshold: number;
};

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
