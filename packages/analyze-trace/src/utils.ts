import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { z } from "zod/v4";
import { resolvedType, traceEvent } from "@typeslayer/validate";

export const absolutePath = z.string().refine((path) => {
	return path.startsWith("/") || path.startsWith("C:\\") || path.startsWith("D:\\");
}, {
	message: "Path must be absolute",
});
export type AbsolutePath = z.infer<typeof absolutePath>;

export const project = z.object({
	configFilePath: absolutePath.optional(),
	tracePath: absolutePath,
	typesPath: absolutePath,
});
export type Project = z.infer<typeof project>;

export const projectResult = z.object({
	project: project,
	stdout: z.string(),
	stderr: z.string(),
	exitCode: z.number().optional(),
	signal: z.enum(["SIGINT", "SIGTERM"]).optional(),
});
export type ProjectResult = z.infer<typeof projectResult>;

const Category = z.object({
  name: z.string(),
  get subcategories(){
    return z.array(Category)
  }
});
type Category = z.infer<typeof Category>;

export const hotType = z.object({
	resolvedType: resolvedType,
	get children(){
		return z.array(hotType)
	},
});
export type HotType = z.infer<typeof hotType>;

export const hotSpot = z.object({
	description: z.string(),
	timeMs: z.number(),
	get children(){
		return z.array(hotSpot)
	},

	path: absolutePath.optional(),
	types: hotType.optional(),
	startLine: z.number().optional(),
	startChar: z.number().optional(),
	startOffset: z.number().optional(),
	endLine: z.number().optional(),
	endChar: z.number().optional(),
	endOffset: z.number().optional(),
});
export type HotSpot = z.infer<typeof hotSpot>;

export const duplicatedPackageInstance = z.object({
	path: absolutePath,
	version: z.string(),
});
export type DuplicatedPackageInstance = z.infer<typeof duplicatedPackageInstance>;

export const duplicatedPackage = z.object({
	name: z.string(),
	instances: z.array(duplicatedPackageInstance),
});
export type DuplicatedPackage = z.infer<typeof duplicatedPackage>;

export const rootSpan = z.object({
	name: z.literal("root"),
	cat: z.literal("program"),
});
export type RootSpan = z.infer<typeof rootSpan>;

export const eventSpan = z.object({
	event: z.union([traceEvent, rootSpan]),
	start: z.number(),
	end: z.number(),
	duration: z.number(),
	get children() { return z.array(eventSpan) },
});
export type EventSpan = z.infer<typeof eventSpan>;

export const microseconds = z.number();
export type Microseconds = z.infer<typeof microseconds>;

export const packageName = z.string();
type PackageName = z.infer<typeof packageName>;

export const packagePath = z.string();
type PackagePath = z.infer<typeof packagePath>;

export const nodeModulePaths = z.record(packageName, z.array(packagePath));
/** This is a map where the key corresponds to an NPM package and the value is an array of all files in that package that were used */
export type NodeModulePaths = z.infer<typeof nodeModulePaths>;

export const parseResult = z.object({
	firstSpanStart: z.number(),
	lastSpanEnd: z.number(),
	spans: z.array(eventSpan),
	unclosedStack: z.array(traceEvent),
});
export type ParseResult = z.infer<typeof parseResult>;

export const analyzeTraceOptions = z.object({
	/** Events of at least this duration (in milliseconds) will reported unconditionally */
	forceMillis: z.number(),
	/** Events of less than this duration (in milliseconds) will suppressed unconditionally */
	skipMillis: z.number(),
	/** Expand types when printing */
	expandTypes: z.boolean(),
	/** force showing spans that are some percentage of their parent, independent of parent time */
	minSpanParentPercentage: z.number(),
	/** the minimum number of emitted imports from a declaration file or bundle */
	importExpressionThreshold: z.number(),
})
export type AnalyzeTraceOptions = z.infer<typeof analyzeTraceOptions>;

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

export const analyzeTraceResult = z.object({

	/** Events that were not closed */
	unterminatedEvents: z.array(traceEvent),
	/** Hot spots in the trace */
	hotSpots: z.array(hotSpot),
	/** Packages that are duplicated in the trace */
	duplicatePackages: z.array(duplicatedPackage),
	/** Paths to all node modules used in the trace */
	nodeModulePaths: nodeModulePaths,
});
export type AnalyzeTraceResult = z.infer<typeof analyzeTraceResult>;
