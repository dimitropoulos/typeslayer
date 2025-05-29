import { exec, execSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { initTRPC } from "@trpc/server";
import { analyzeTrace, analyzeTraceOptions } from "@typeslayer/analyze-trace";
import type { ResolvedType } from "@typeslayer/validate";
import { z } from "zod/v4";
import { data, refreshAnalyzeTraceFromDisk, refreshTraceJson, refreshTypesJson } from "./data";
import { settings, settingsInput } from "./settings";
import { getGenerateCommand, getPackageJson } from "./utils";

const t = initTRPC.create();

export const appRouter = t.router({
	getProjectRoot: t.procedure.query(async () => {
		console.log("getProjectRoot", data.projectRoot);
		return data.projectRoot;
	}),

	setProjectRoot: t.procedure.input(z.string()).mutation(async ({ input }) => {
		data.projectRoot = input;
		data.scriptName = null;
		console.log("setProjectRoot", data.projectRoot);
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

	setScriptName: t.procedure.input(z.string()).mutation(async ({ input }) => {
		const { scripts } = await getPackageJson();
		if (!(input in scripts)) {
			throw new Error(
				`Script ${data.scriptName} not found in package.json scripts`,
			);
		}
		data.scriptName = input;

		console.log("setScriptName", data.scriptName);
		return data.scriptName;
	}),

	generateTrace: t.procedure
		.mutation(async ({ input }) => {
			const { projectRoot, tempDir, scriptName } = data;
			console.log("generateTrace", { projectRoot, tempDir, scriptName });

			await mkdir(tempDir, { recursive: true });

			if (!scriptName || scriptName.length === 0) {
				throw new Error("Script name is not set. Please set it first.");
			}

			const command = await getGenerateCommand(scriptName);

			// execute the command with npm from the project root
			const execCommand = `npm exec ${command}`;
			console.log("execCommand", execCommand);

			/* ATTENTION */
			/* ATTENTION */
			/* THIS IS EXTREMELY DANGEROUS BECAUSE IT GIVES RCA VIA PACKAGE.JSON SCRIPTS */
			/* ATTENTION */
			/* ATTENTION */
			execSync(execCommand, {
				cwd: projectRoot.replace(/\/$/, ""),
				stdio: "inherit",
			});

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
				(error, stdout, stderr) => {},
			);
		}),

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
