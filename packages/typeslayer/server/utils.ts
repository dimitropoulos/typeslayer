import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CPU_PROFILE_FILENAME } from "@typeslayer/validate";
import { data } from "./data";

export const getAllFiles = async (dir: string): Promise<string[]> => {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				return getAllFiles(fullPath);
			}
			return fullPath;
		}),
	);
	return files.flat();
};

export const updateLogFile = (tempDir: string) => {
	return writeFile(
		`${tempDir}/typeslayer.json`,
		JSON.stringify(
			{
				completed: Date.now(),
			},
			null,
			2,
		),
	);
};

export const getPackageJson = async () => {
	const packageJsonPath = join(data.projectRoot, "package.json");
	if (!existsSync(packageJsonPath)) {
		throw new Error(
			`Project root ${data.projectRoot} does not contain package.json`,
		);
	}
	const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
	if (!("name" in packageJson) && typeof packageJson.name !== "string") {
		throw new Error(
			`Project root ${data.projectRoot} does not contain a valid package.json with a name field`,
		);
	}
	if (!("scripts" in packageJson) || typeof packageJson.scripts !== "object") {
		throw new Error(
			`Project root ${data.projectRoot} does not contain a valid package.json with a scripts field`,
		);
	}
	return packageJson as {
		name: string;
		scripts: Record<string, string>;
	};
};

const autodetectScripts = [
	"tsc --noEmit",
	"tsc -p tsconfig.json",
	"tsc -p tsconfig.json --noEmit",
	"tsc -b --noEmit",
	"tsc -p . --noEmit",
]

export const attemptAutoDetectTypeCheckScript = async () => {
	const { scripts } = await getPackageJson();
	const typeCheckScript = Object.entries(scripts).find(
		([_name, command]) => autodetectScripts.includes(command),
	);
	if (typeCheckScript) {
		const [name] = typeCheckScript;
		data.scriptName = name;
		console.log("Auto-detected type-check script:", name);
		return name;
	}
	return null;
}

export const getValidatedCommand = async (scriptName: string) => {
	const { scripts } = await getPackageJson();
	if (!(scriptName in scripts)) {
		throw new Error(`Script ${scriptName} not found in package.json scripts`);
	}
	const command = scripts[scriptName];
	if (!command) {
		throw new Error(`Script ${scriptName} is empty in package.json`);
	}
	return command;
};

export const commonAddOns = " --incremental false --noErrorTruncation";

export const getGenerateCommand = async (scriptName: string) => {
	const command = await getValidatedCommand(scriptName);
	const addOn = `${commonAddOns} --generateTrace ${data.tempDir}`;
	return `${command}${addOn}`;
};

export const getCpuProfileCommand = async (scriptName: string) => {
	const command = await getValidatedCommand(scriptName);
	const addOn = `${commonAddOns} --generateCpuProfile ${data.tempDir}/${CPU_PROFILE_FILENAME}`;
	return `${command}${addOn}`;
};
