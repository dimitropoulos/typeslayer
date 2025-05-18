import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function getPackageVersion(packagePath: string) {
	const packageJsonPath = join(packagePath, "package.json");
	console.log("packageJsonPath", packageJsonPath);
	if (!existsSync(packageJsonPath)) {
		console.warn(
			`Package.json not found at ${packageJsonPath}. This may not be a node module.`,
		);
		return "unknown";
	}
	const jsonString = await readFile(packageJsonPath, "utf-8");
	const jsonObj = JSON.parse(jsonString);
	return jsonObj.version;
}

interface DuplicatedPackage {
	name: string;
	instances: DuplicatedPackageInstance[];
}

interface DuplicatedPackageInstance {
	path: string;
	version: string;
}

export const getDuplicateNodeModules = async (
	nodeModulePaths: Map<string, string[]>,
) => {
	const duplicates: DuplicatedPackage[] = [];
	for (const [packageName, packagePaths] of nodeModulePaths.entries()) {
		if (packagePaths.length < 2) continue;
		const instances: DuplicatedPackageInstance[] = [];
		for (const packagePath of packagePaths) {
			instances.push({
				path: packagePath,
				version: await getPackageVersion(packagePath),
			});
		}
		duplicates.push({
			name: packageName,
			instances,
		});
	}

	return duplicates;
};
