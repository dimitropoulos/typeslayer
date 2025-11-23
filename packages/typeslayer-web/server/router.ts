import { exec } from "node:child_process";
import { initTRPC } from "@trpc/server";
import { analyzeTrace, analyzeTraceOptions } from "@typeslayer/analyze-trace";
import type { ResolvedType } from "@typeslayer/validate";
import { z } from "zod/v4";
import {
	data,
	refreshAnalyzeTraceFromDisk,
	refreshTraceJson,
	refreshTypesJson,
} from "./data";
import { settings, settingsInput } from "./settings";
import {
	attachAndRun,
	getCpuProfileCommand,
	getGenerateCommand,
	getPackageJson,
} from "./utils";

const t = initTRPC.create();

export const appRouter = t.router({
	getProjectRoot: t.procedure.query(async () => {
		console.log("getProjectRoot", data.projectRoot);
		return data.projectRoot;
	}),

	setProjectRoot: t.procedure
		.input(
			z.object({
				projectRoot: z.string(),
				scriptName: z.string().nullable(),
			}),
		)
		.mutation(async ({ input }) => {
			const { projectRoot, scriptName } = input;
			data.projectRoot = projectRoot;
			data.scriptName = scriptName;
			console.log("setProjectRoot", input);
			await getPackageJson();
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

	getPotentialScripts: t.procedure.query(async () => {
		try {
			const { scripts } = await getPackageJson();
			console.log("getPotentialScripts", scripts);
			return scripts;
		} catch (_error) {
			return null;
		}
	}),

	getScriptName: t.procedure.query(() => {
		console.log("getScriptName", data.scriptName);
		return data.scriptName;
	}),

	setScriptName: t.procedure
		.input(z.string().optional())
		.mutation(async ({ input }) => {
			const { scripts } = await getPackageJson();
			if (!input || input.length === 0) {
				data.scriptName = null;
				console.log("setScriptName cleared");
				return;
			}

			if (!(input in scripts)) {
				throw new Error(
					`Script ${data.scriptName} not found in package.json scripts`,
				);
			}
			data.scriptName = input;

			console.log("setScriptName", data.scriptName);
			return data.scriptName;
		}),

	generateTrace: t.procedure.mutation(async () => {
		await attachAndRun(getGenerateCommand);
		await refreshTraceJson();
		await refreshTypesJson();

		return {
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
				(_error, _stdout, _stderr) => {},
			);
		}),

	cpuProfile: t.procedure.mutation(async () => {
		await attachAndRun(getCpuProfileCommand);
	}),

	analyzeTrace: t.procedure
		.input(analyzeTraceOptions.optional())
		.mutation(async ({ input }) => {
			const traceDir = data.tempDir;
			console.log("starting analyzeTrace", input, traceDir);
			await analyzeTrace({
				traceDir,
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

	getSettings: t.procedure.query(() => {
		console.log("getSettings", settings);
		return settings;
	}),

	setSettings: t.procedure
		.input(settingsInput.partial())
		.mutation(async ({ input }) => {
			if (
				"simplifyPaths" in input &&
				typeof input.simplifyPaths === "boolean"
			) {
				console.log("settings.simplifyPaths", input.simplifyPaths);
				settings.simplifyPaths = input.simplifyPaths;
			}

			console.log("setSettings", { input, settings });
			return settings;
		}),
});

export type AppRouter = typeof appRouter;
