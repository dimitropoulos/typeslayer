#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = import.meta.dirname || join(__filename, "..");
const rootDir = join(__dirname, "..");

// Read main package.json
const mainPackageJsonPath = join(
	rootDir,
	"packages",
	"typeslayer",
	"package.json",
);
const mainPackageJson = JSON.parse(readFileSync(mainPackageJsonPath, "utf-8"));

// Create a minimal package.json for the main builds/typeslayer package
const buildTypeslayerPackage = {
	name: mainPackageJson.name,
	version: mainPackageJson.version,
	description: mainPackageJson.description,
	private: mainPackageJson.private,
	type: mainPackageJson.type,
	license: mainPackageJson.license,
	repository: mainPackageJson.repository,
	bugs: mainPackageJson.bugs,
	homepage: mainPackageJson.homepage,
	bin: mainPackageJson.bin,
	files: mainPackageJson.files,
	os: mainPackageJson.os,
	cpu: mainPackageJson.cpu,
	engines: mainPackageJson.engines,
};

// Ensure builds directory exists
mkdirSync(join(rootDir, "builds"), { recursive: true });

// Write builds/typeslayer/package.json
const buildTypeslayerPath = join(
	rootDir,
	"builds",
	"typeslayer",
	"package.json",
);
mkdirSync(join(rootDir, "builds", "typeslayer"), { recursive: true });
writeFileSync(
	buildTypeslayerPath,
	JSON.stringify(buildTypeslayerPackage, null, "\t") + "\n",
);

console.log(`✅ Created ${buildTypeslayerPath}`);

// Update each platform package.json to reference the correct version
const platforms = ["linux-x64", "darwin-x64", "darwin-arm64", "win32-x64"];
for (const platform of platforms) {
	const platformPackageJsonPath = join(
		rootDir,
		"builds",
		platform,
		"package.json",
	);
	const platformPackageJson = JSON.parse(
		readFileSync(platformPackageJsonPath, "utf-8"),
	);

	// Sync version
	platformPackageJson.version = mainPackageJson.version;

	writeFileSync(
		platformPackageJsonPath,
		JSON.stringify(platformPackageJson, null, "\t") + "\n",
	);
	console.log(
		`✅ Updated ${platformPackageJsonPath} to v${mainPackageJson.version}`,
	);
}

console.log("\n✨ Build packages prepared!");
