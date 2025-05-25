import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { ResolvedType, TypeId, TypeRegistry } from "@typeslayer/validate";
import type { AbsolutePath, DuplicatedPackage, HotSpot } from "@typeslayer/analyze-trace";

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
	hotSpots: HotSpot[]

	/** get duplicate packages */
	duplicatePackages: DuplicatedPackage[];
}

const serverOptions = {
	/** Whether to make a new temp dir every time */
	makeFresh: false,
};

const createTempDir = () =>
	`${tmpdir()}/typeslayer${serverOptions.makeFresh ? `-${Date.now()}` : ""}`;

export const data = {
	cwd: resolve(`${process.cwd()}/../../testbed/as-simple-as-possible`), // process.cwd(),
	tempDir: createTempDir(),
	sourceFiles: [] as AbsolutePath[],
	rootNames: [] as string[],
	typeRegistry: new Map<TypeId, ResolvedType>(),
	hotSpots: [] as HotSpot[],
	duplicatePackages: [] as DuplicatedPackage[],
} satisfies Data;
