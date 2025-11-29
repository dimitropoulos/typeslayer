#!/usr/bin/env node

import { chmodSync, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { get } from "node:https";
import { arch, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_VERSION = process.env.npm_package_version;

const getBinaryInfo = () => {
	const plat = platform();
	const architecture = arch();

	let platformDir, binaryName, releaseAssetName;

	if (plat === "linux" && architecture === "x64") {
		platformDir = "linux-x64";
		binaryName = "typeslayer";
		releaseAssetName = "typeslayer-linux-x64";
	} else if (plat === "darwin" && architecture === "x64") {
		platformDir = "darwin-x64";
		binaryName = "typeslayer";
		releaseAssetName = "typeslayer-darwin-x64";
	} else if (plat === "darwin" && architecture === "arm64") {
		platformDir = "darwin-arm64";
		binaryName = "typeslayer";
		releaseAssetName = "typeslayer-darwin-arm64";
	} else if (plat === "win32" && architecture === "x64") {
		platformDir = "win32-x64";
		binaryName = "typeslayer.exe";
		releaseAssetName = "typeslayer-win32-x64.exe";
	} else {
		console.warn(`⚠️  Platform ${plat}-${architecture} is not supported`);
		process.exit(0); // Don't fail the install, just skip
	}

	return { platformDir, binaryName, releaseAssetName };
};

const downloadBinary = (url, destPath) => {
	return new Promise((resolve, reject) => {
		console.log(`📦 Downloading binary from ${url}...`);

		get(url, (response) => {
			if (response.statusCode === 302 || response.statusCode === 301) {
				// Follow redirect
				return downloadBinary(response.headers.location, destPath).then(
					resolve,
					reject,
				);
			}

			if (response.statusCode !== 200) {
				reject(
					new Error(
						`Failed to download: ${response.statusCode} ${response.statusMessage}`,
					),
				);
				return;
			}

			const fileStream = createWriteStream(destPath);
			response.pipe(fileStream);

			fileStream.on("finish", () => {
				fileStream.close();
				// Make executable on Unix-like systems
				if (process.platform !== "win32") {
					chmodSync(destPath, 0o755);
				}
				console.log("✅ Binary downloaded successfully");
				resolve();
			});

			fileStream.on("error", (err) => {
				reject(err);
			});
		}).on("error", (err) => {
			reject(err);
		});
	});
};

(async () => {
	try {
		const { platformDir, binaryName, releaseAssetName } = getBinaryInfo();
		const binariesDir = join(__dirname, "..", "binaries", platformDir);
		const binaryPath = join(binariesDir, binaryName);

		// Skip if binary already exists
		if (existsSync(binaryPath)) {
			console.log("✅ Binary already present, skipping download");
			return;
		}

		// Create directory if it doesn't exist
		mkdirSync(binariesDir, { recursive: true });

		// Download from GitHub release
		const releaseUrl = `https://github.com/dimitropoulos/typeslayer/releases/download/typeslayer-v${PACKAGE_VERSION}/${releaseAssetName}`;

		await downloadBinary(releaseUrl, binaryPath);
	} catch (error) {
		console.error("❌ Failed to download binary:", error.message);
		console.error(
			"You can manually download the binary from: https://github.com/dimitropoulos/typeslayer/releases",
		);
		// Don't fail the install, just warn
		process.exit(0);
	}
})();
