#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = import.meta.dirname || join(__filename, "..");
const rootDir = join(__dirname, "..");

function getVersion(pkgPath: string): string {
  const pkgJson = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return pkgJson.version;
}

// Get main package version
const mainVersion = getVersion(
  join(rootDir, "npm", "typeslayer", "package.json"),
);

console.log(`\n📌 Validating all packages are at version ${mainVersion}...\n`);

const packages = [
  {
    name: "@typeslayer/validate",
    path: join(rootDir, "packages", "validate", "package.json"),
  },
  {
    name: "@typeslayer/analyze-trace",
    path: join(rootDir, "packages", "analyze-trace", "package.json"),
  },
  {
    name: "@typeslayer/linux-x64",
    path: join(rootDir, "npm", "linux-x64", "package.json"),
  },
  {
    name: "@typeslayer/darwin-arm64",
    path: join(rootDir, "npm", "darwin-arm64", "package.json"),
  },
  {
    name: "@typeslayer/win32-x64",
    path: join(rootDir, "npm", "win32-x64", "package.json"),
  },
  {
    name: "tauri.conf.json",
    path: join(rootDir, "packages", "typeslayer", "src-tauri", "tauri.conf.json"),
  },
];

let allMatch = true;
for (const pkg of packages) {
  const version = getVersion(pkg.path);
  if (version === mainVersion) {
    console.log(`✅ ${pkg.name}: ${version}`);
  } else {
    console.log(`❌ ${pkg.name}: ${version} (expected ${mainVersion})`);
    allMatch = false;
  }
}

if (!allMatch) {
  console.error("\n❌ Not all packages are at the same version!");
  process.exit(1);
}

console.log(`\n📝 Tags to create:\n`);

const tags = [
  `typeslayer-v${mainVersion}`,
  `analyze-trace-v${mainVersion}`,
  `validate-v${mainVersion}`,
];

for (const tag of tags) {
  console.log(`  - ${tag}`);
}

console.log();

// Ask for confirmation
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  "Press Enter to confirm and create tags, or Ctrl+C to cancel: ",
  () => {
    rl.close();

    console.log(`\n🏷️  Creating tags...\n`);

    for (const tag of tags) {
      execSync(`git tag --force ${tag}`, { cwd: rootDir, stdio: "inherit" });
      console.log(`✅ Created tag: ${tag}`);
    }

    console.log(`\n📤 Pushing tags...\n`);

    const tagRefs = tags.map(tag => `refs/tags/${tag}`).join(" ");
    execSync(`git push origin --force ${tagRefs}`, {
      cwd: rootDir,
      stdio: "inherit",
    });

    console.log(`\n✨ All tags created and pushed!`);
  },
);
