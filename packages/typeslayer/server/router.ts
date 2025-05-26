import { exec } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { initTRPC } from "@trpc/server";
import { analyzeTrace, analyzeTraceOptions } from "@typeslayer/analyze-trace";
import type { ResolvedType } from "@typeslayer/validate";
import ts from "typescript";
import { z } from "zod/v4";
import {
	data,
	refreshAllFiles,
	refreshAnalyzeTraceFromDisk,
	refreshTypesJson,
} from "./data";
import { getAllFiles, updateLogFile } from "./utils";
import { get } from "node:http";

const t = initTRPC.create();

export const appRouter = t.router({
	getCWD: t.procedure.query(() => {
		console.log("getCWD", data.cwd);
		console.log("tempDir", data.tempDir);
		return data.cwd;
	}),

	setCWD: t.procedure.input(z.string()).mutation(async ({ input }) => {
		data.cwd = input;
		console.log("setCWD", data.cwd);
		await refreshAllFiles();
		return data.cwd;
	}),

	getTempDir: t.procedure.query(() => {
		console.log("getTempDir", data.tempDir);
		return data.tempDir;
	}),

	setTempDir: t.procedure.input(z.string()).mutation(async ({ input }) => {
		data.tempDir = input;
		console.log("setTempDir", data.tempDir);
		return data.tempDir;
	}),

	generateTrace: t.procedure
		.input(
			z.object({
				incremental: z.boolean(),
			}),
		)
		.mutation(async ({ input }) => {
			const { incremental } = input;
			const { cwd, tempDir } = data;
			console.log("generateTrace", { cwd, tempDir, incremental });

			await mkdir(tempDir, { recursive: true });

			// resolve all files at the cwd and below
			const rootNames = await getAllFiles(cwd);
			data.rootNames = rootNames;

			const program = ts.createProgram({
				rootNames,
				options: {
					outDir: `${tempDir}/outDir`,
					incremental,
					tsBuildInfoFile: `${tempDir}/tsbuildinfo.json`,
				},
			});

			const result = program.emit();
			// TODO: if there are any errors/diagnostics, we should fail
			const instantiations = program.getInstantiationCount();

			const sourceFiles = program.getSourceFiles().map((file) => file.fileName);
			data.sourceFiles = sourceFiles;

			console.log("result", { result, instantiations, sourceFiles });
			updateLogFile(tempDir);

			await refreshTypesJson();

			return {
				result,
				sourceFiles,
				instantiations,
				cwd,
				tempDir,
				rootNames,
				typeRegistryEntries: Array.from<[number, ResolvedType]>(
					data.typeRegistry.entries(),
				),
			};
		}),

	searchType: t.procedure.input(z.number()).query(async ({ input }) => {
		const { typeRegistry } = data;
		const type = typeRegistry.get(input);
		if (!type) {
			throw new Error(`Type ${input} not found`);
		}
		console.log("searchType", { input, type });
		return { type };
	}),

	getTypeRegistry: t.procedure.query(() => {
		const { typeRegistry } = data;
		const entries = Array.from<[number, ResolvedType]>(typeRegistry.entries());
		return entries;
	}),

	openFile: t.procedure
		.input(
			z.object({
				path: z.string(),
				line: z.number().positive().optional(),
				character: z.number().positive().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const { path, line, character } = input;
			exec(
				`code --goto ${path}:${line ?? 1}:${character ?? 1}`,
				(error, stdout, stderr) => {},
			);
		}),

	// TODO
	cpuProfile: t.procedure.mutation(async () => {
		const { tempDir } = data;
		console.log("analyzeTrace", { tempDir });
		await mkdir(tempDir, { recursive: true });
		exec(
			`trace-processor analyze --out ${tempDir}/trace.pftrace ${tempDir}/trace.json`,
			(error, stdout, stderr) => {
				console.log({ error, stdout, stderr });
			},
		);
	}),

	analyzeTrace: t.procedure
		.input(analyzeTraceOptions.optional())
		.mutation(async ({ input }) => {
			await analyzeTrace({
				traceDir: data.tempDir,
				options: input,
			});
			await refreshAnalyzeTraceFromDisk();
			console.log("analyzeTrace complete");
		}),

	getHotSpots: t.procedure.query(() => {
		const { hotSpots } = data;
		console.log("getHotSpots");
		return hotSpots;
	}),

	getDuplicatePackages: t.procedure.query(() => {
		const { duplicatePackages } = data;
		console.log("getDuplicatePackages");
		return duplicatePackages;
	}),

	getTypeInstantiationLimits: t.procedure.query(() => {
		const { typeInstantiationLimits } = data;
		console.log("getTypeInstantiationLimits");
		return typeInstantiationLimits;
	}),

	getRecursiveTypeRelatedToLimits: t.procedure.query(() => {
		const { recursiveTypeRelatedToLimits } = data;
		console.log("getRecursiveTypeRelatedToLimits");
		return recursiveTypeRelatedToLimits;
	}),
	
	getTypeRelatedToDiscriminatedTypeLimits: t.procedure.query(() => {
		const { typeRelatedToDiscriminatedTypeLimits } = data;
		console.log("getTypeRelatedToDiscriminatedTypeLimits");
		return typeRelatedToDiscriminatedTypeLimits;
	}),
});

export type AppRouter = typeof appRouter;
