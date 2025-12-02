#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { arch, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Store the original directory where the user ran the command
const userCwd = process.cwd();

// Get the binary path based on platform
const getBinaryInfo = () => {
	const plat = platform();
	const architecture = arch();

	let platformDir, binaryName;

	if (plat === "linux" && architecture === "x64") {
		platformDir = "linux-x64";
		binaryName = "typeslayer";
	} else if (plat === "darwin" && architecture === "arm64") {
		platformDir = "darwin-arm64";
		binaryName = "typeslayer";
	} else if (plat === "win32" && architecture === "x64") {
		platformDir = "win32-x64";
		binaryName = "typeslayer.exe";
	} else {
		throw new Error(`Unsupported platform: ${plat}-${architecture}`);
	}

	return {
		path: join(__dirname, "..", "binaries", platformDir, binaryName),
		platform: `${plat}-${architecture}`,
	};
};

try {
	const binaryInfo = getBinaryInfo();

	if (!existsSync(binaryInfo.path)) {
		console.error(
			`\n⚠️ Binary not found for ${binaryInfo.platform}. Attempting download...`,
		);
		const postinstallPath = join(__dirname, "..", "scripts", "postinstall.js");
		const res = spawnSync(process.execPath, [postinstallPath], {
			stdio: "inherit",
			env: process.env,
		});
		if (res.status !== 0) {
			console.error("\n❌ Failed to download platform binary.");
		}
		if (!existsSync(binaryInfo.path)) {
			console.error(
				`\n❌ Binary still unavailable at ${binaryInfo.path}. Please check the release assets or your network.`,
			);
			console.error(
				"You can manually download from: https://github.com/dimitropoulos/typeslayer/releases",
			);
			process.exit(1);
		}
	}

	const proc = spawn(binaryInfo.path, [], {
		stdio: "inherit",
		env: {
			...process.env,
			USER_CWD: userCwd,
		},
	});

	proc.on("exit", (code) => {
		process.exit(code || 0);
	});
} catch (error) {
	console.error("Error:", error.message);
	process.exit(1);
}
