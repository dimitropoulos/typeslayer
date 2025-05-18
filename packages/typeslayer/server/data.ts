import { tmpdir } from "node:os";
import type { ResolvedType } from "@typeslayer/validate";

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
	typeRegistry: Map<number, ResolvedType>;
}

const serverOptions = {
	/** Whether to make a new temp dir every time */
	makeFresh: false,
};

const createTempDir = () =>
	`${tmpdir()}/typeslayer${serverOptions.makeFresh ? `-${Date.now()}` : ""}`;

export const data = {
	cwd: `${process.cwd()}/testbed/as-simple-as-possible`, // process.cwd(),
	tempDir: createTempDir(),
	sourceFiles: [] as string[],
	rootNames: [] as string[],
	typeRegistry: new Map<number, ResolvedType>(),
} satisfies Data;
