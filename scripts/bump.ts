#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = import.meta.dirname || join(__filename, "..");
const rootDir = join(__dirname, "..");

const bumpType = process.argv[2] ?? "patch";

if (!bumpType || !["patch", "minor", "major"].includes(bumpType)) {
  console.error("❌ Usage: bump-typeslayer.ts <patch|minor|major>");
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
  `${JSON.stringify(mainPackageJson, null, 2)}\n`,
);

console.log(`📦 Bumped main package: ${oldMainVersion} → ${newMainVersion}`);

// Bump workspace packages
const workspacePackages = ["validate", "analyze-trace", "analytics"];

for (const pkgName of workspacePackages) {
  const pkgPath = join(rootDir, "packages", pkgName, "package.json");
  const pkgJson = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const oldVersion = pkgJson.version;

  pkgJson.version = newMainVersion;
  writeFileSync(pkgPath, `${JSON.stringify(pkgJson, null, 2)}\n`);
  console.log(`  ✅ @typeslayer/${pkgName}: ${oldVersion} → ${newMainVersion}`);
}

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
    `${JSON.stringify(buildPackageJson, null, 2)}\n`,
  );
  console.log(
    `  ✅ @typeslayer/${platform}: ${oldVersion} → ${newMainVersion}`,
  );
}

// Update tauri.conf.json
const tauriConfigPath = join(
  rootDir,
  "packages",
  "typeslayer",
  "src-tauri",
  "tauri.conf.json",
);
const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, "utf-8"));
const oldTauriVersion = tauriConfig.version;
tauriConfig.version = newMainVersion;
writeFileSync(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`);
console.log(`  ✅ tauri.conf.json: ${oldTauriVersion} → ${newMainVersion}`);

// Update Cargo.toml
const cargoTomlPath = join(
  rootDir,
  "packages",
  "typeslayer",
  "src-tauri",
  "Cargo.toml",
);
const cargoToml = readFileSync(cargoTomlPath, "utf-8");
const versionRegex = /^version\s*=\s*"[^"]*"/m;
const oldCargoVersion = cargoToml.match(versionRegex)?.[0];
const updatedCargoToml = cargoToml.replace(
  versionRegex,
  `version = "${newMainVersion}"`,
);
writeFileSync(cargoTomlPath, updatedCargoToml);
console.log(
  `  ✅ Cargo.toml: ${oldCargoVersion} → version = "${newMainVersion}"`,
);

console.log("\n✨ All packages bumped and synced!");
