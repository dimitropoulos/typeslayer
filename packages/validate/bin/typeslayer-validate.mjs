#!/usr/bin/env node

import { resolve } from "node:path";
import process, { exit } from "node:process";
import {
  TRACE_JSON_FILENAME,
  TYPES_JSON_FILENAME,
  traceJsonSchema,
  typesJsonSchema,
} from "../dist/index.mjs";
import { grabFile } from "../dist/node.mjs";

const usage = () => {
  console.log(`Usage:
  npx @typeslayer/validate --trace ./trace.json
  npx @typeslayer/validate --types ./types.json

Flags:
  --trace <path>   Validate a trace.json file
  --types <path>   Validate a types.json file
  --help           Show this help message`);
};

const parseArgs = argv => {
  let tracePath;
  let typesPath;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      return { help: true };
    }
    if (arg === "--trace") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --trace");
      }
      tracePath = value;
      i++;
      continue;
    }
    if (arg === "--types") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --types");
      }
      typesPath = value;
      i++;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { tracePath, typesPath, help: false };
};

const main = async () => {
  let parsed;
  try {
    parsed = parseArgs(process.argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    usage();
    exit(1);
    return;
  }

  if (parsed.help) {
    usage();
    return;
  }

  if ((parsed.tracePath && parsed.typesPath)) {
    console.error("you can't use --trace and --types at the same time");
    usage();
    exit(1);
    return;
  }

  if (!parsed.tracePath && !parsed.typesPath) {
    console.error("Provide either --trace or --types.");
    usage();
    exit(1);
    return;
  }

  if (parsed.tracePath) {
    const filePath = resolve(parsed.tracePath);
    await grabFile(filePath, traceJsonSchema);
    console.log(`✅ Valid ${TRACE_JSON_FILENAME}: ${filePath}`);
    return;
  }

  const filePath = resolve(parsed.typesPath);
  await grabFile(filePath, typesJsonSchema);
  console.log(`✅ Valid ${TYPES_JSON_FILENAME}: ${filePath}`);
};

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  exit(1);
});
