#!/usr/bin/env node

import { execSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { arch, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const PACKAGE_VERSION = process.env.npm_package_version;

// Allow CI or callers to skip binary download (release assets may not exist yet in same run)
if (process.env.TYPESLAYER_SKIP_POSTINSTALL) {
	console.log(
		"⏭️  Skipping typeslayer binary download (TYPESLAYER_SKIP_POSTINSTALL set).",
	);
	process.exit(0);
}

const getBinaryInfo = () => {
	const plat = platform();
	const architecture = arch();

	let platformDir, binaryName, npmPackage;

	if (plat === "linux" && architecture === "x64") {
		platformDir = "linux-x64";
		binaryName = "typeslayer";
		npmPackage = "@typeslayer/linux-x64";
	} else if (plat === "darwin" && architecture === "arm64") {
		platformDir = "darwin-arm64";
		binaryName = "typeslayer";
		npmPackage = "@typeslayer/darwin-arm64";
	} else if (plat === "win32" && architecture === "x64") {
		platformDir = "win32-x64";
		binaryName = "typeslayer.exe";
		npmPackage = "@typeslayer/win32-x64";
	} else {
		console.warn(`⚠️  Platform ${plat}-${architecture} is not supported`);
		process.exit(0); // Don't fail the install, just skip
	}

	return { platformDir, binaryName, npmPackage };
};

(async () => {
	try {
		const { platformDir, binaryName, npmPackage } = getBinaryInfo();
		const binariesDir = join(__dirname, "..", "binaries", platformDir);
		const binaryPath = join(binariesDir, binaryName);

		// Skip if binary already exists
		if (existsSync(binaryPath)) {
			console.log("✅ Binary already present, skipping download");
			return;
		}

		// Create directory if it doesn't exist
		mkdirSync(binariesDir, { recursive: true });

		// First, try to use the optionalDependency (esbuild pattern)
		// This is the primary mechanism - npm installs the right platform package automatically
		let binaryFound = false;
		try {
			const optionalPkgPath = require.resolve(`${npmPackage}/package.json`);
			const optionalBinaryPath = join(dirname(optionalPkgPath), binaryName);
			if (existsSync(optionalBinaryPath)) {
				console.log(`📦 Using ${npmPackage} from optionalDependencies...`);
				const fs = await import("node:fs/promises");
				await fs.copyFile(optionalBinaryPath, binaryPath);
				if (process.platform !== "win32") {
					chmodSync(binaryPath, 0o755);
				}
				console.log("✅ Binary copied successfully");
				binaryFound = true;
			}
		} catch {
			// optionalDependency not available - fall back to downloading
			console.warn(
				`⚠️  ${npmPackage} not found in optionalDependencies (may have been installed with --no-optional flag)`,
			);
		}

		if (!binaryFound) {
			// Fallback: Install the platform-specific binary package from npm
			console.log(`📦 Downloading ${npmPackage}@${PACKAGE_VERSION}...`);
			execSync(`npm install --no-save "${npmPackage}@${PACKAGE_VERSION}"`, {
				stdio: "inherit",
			});

			// Copy the binary from node_modules to our binaries directory
			const nodeModulesBinaryPath = join(
				__dirname,
				"..",
				"..",
				"..",
				"node_modules",
				npmPackage.replace("@", "").replace("/", "-"),
				binaryName,
			);

			if (!existsSync(nodeModulesBinaryPath)) {
				throw new Error(
					`Binary not found at ${nodeModulesBinaryPath} after npm install`,
				);
			}

			// Copy and make executable
			const fs = await import("node:fs/promises");
			await fs.copyFile(nodeModulesBinaryPath, binaryPath);

			if (process.platform !== "win32") {
				chmodSync(binaryPath, 0o755);
			}

			console.log("✅ Binary installed successfully");
		}
	} catch (error) {
		console.error("❌ Failed to download binary:", error.message);
		console.error(
			"You can manually download the binary from: https://github.com/dimitropoulos/typeslayer/releases",
		);
		// Don't fail the install, just warn
		process.exit(0);
	}
})();
