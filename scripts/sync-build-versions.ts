#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = import.meta.dirname || join(__filename, "..");
const rootDir = join(__dirname, "..");

const bumpType = process.argv[2];

if (!bumpType || !["patch", "minor", "major"].includes(bumpType)) {
	console.error("❌ Usage: sync-build-versions.ts <patch|minor|major>");
	process.exit(1);
}

function bumpVersion(version: string, type: string): string {
	const parts = version.split(".");
	const major = parseInt(parts[0], 10);
	const minor = parseInt(parts[1], 10);
	const patch = parseInt(parts[2], 10);

	if (type === "major") {
		return `${major + 1}.0.0`;
	} else if (type === "minor") {
		return `${major}.${minor + 1}.0`;
	} else {
		return `${major}.${minor}.${patch + 1}`;
	}
}

// Read main package version
const mainPackageJsonPath = join(rootDir, "npm", "typeslayer", "package.json");
const mainPackageJson = JSON.parse(readFileSync(mainPackageJsonPath, "utf-8"));
const oldMainVersion = mainPackageJson.version;
const newMainVersion = bumpVersion(oldMainVersion, bumpType);

mainPackageJson.version = newMainVersion;

// Also update optionalDependencies versions in main package
if (mainPackageJson.optionalDependencies) {
	for (const [depName] of Object.entries(
		mainPackageJson.optionalDependencies,
	)) {
		mainPackageJson.optionalDependencies[depName] = newMainVersion;
	}
}

writeFileSync(
	mainPackageJsonPath,
	`${JSON.stringify(mainPackageJson, null, "\t")}\n`,
);

console.log(`📦 Bumped main package: ${oldMainVersion} → ${newMainVersion}`);

const platforms = ["linux-x64", "darwin-arm64", "win32-x64"];

for (const platform of platforms) {
	const buildPackageJsonPath = join(rootDir, "npm", platform, "package.json");

	const buildPackageJson = JSON.parse(
		readFileSync(buildPackageJsonPath, "utf-8"),
	);
	const oldVersion = buildPackageJson.version;

	buildPackageJson.version = newMainVersion;
	writeFileSync(
		buildPackageJsonPath,
		`${JSON.stringify(buildPackageJson, null, "\t")}\n`,
	);
	console.log(
		`  ✅ @typeslayer/${platform}: ${oldVersion} → ${newMainVersion}`,
	);
}

console.log("\n✨ All packages bumped and synced!");
