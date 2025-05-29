#!/usr/bin/env node

import { statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process, { exit } from "node:process";
import { analyzeTrace, defaultOptions } from "../dist/index.js";

const { argv } = process;

const traceDirArg = argv[2];

if (!traceDirArg) {
	console.error("Gotta give a trace directory, brah.");
	exit(1);
}

const traceDir = resolve(traceDirArg);

try {
	const stat = statSync(traceDir);
	if (!stat.isDirectory()) {
		console.error(`Trace directory "${traceDir}" is not a directory.`);
		exit(1);
	}
} catch (err) {
	if (err.code === "ENOENT") {
		console.error(`Trace directory "${traceDir}" does not exist.`);
	} else {
		console.error(
			`Error checking trace directory "${traceDir}": ${err.message}`,
		);
	}
	exit(1);
}

console.log({ traceDir });

analyzeTrace({ traceDir, options: defaultOptions }).then((result) => {
	const destination = resolve(traceDir, "analyze-trace.json");
	writeFileSync(destination, JSON.stringify(result, null, 2), "utf-8");
	console.log("Analysis result:", result);
});
