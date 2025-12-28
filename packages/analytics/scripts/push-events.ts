#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENDPOINTS = {
  local: "http://localhost:8787/collect",
  remote: "https://typeslayer-analytics.typeslayer.workers.dev/collect",
} as const;

type Environment = keyof typeof ENDPOINTS;

async function pushEvents(
  ndjsonPath: string,
  environment: Environment = "local",
  batchSize = 50
) {
  console.log(`📥 Reading events from: ${ndjsonPath}`);
  
  let content: string;
  try {
    content = readFileSync(ndjsonPath, "utf-8");
  } catch (err: unknown) {
    console.error(`❌ Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const lines = content.split("\n").filter((line) => line.trim());
  console.log(`📊 Found ${lines.length} events`);

  const events: unknown[] = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      const event = JSON.parse(lines[i]);
      events.push(event);
    } catch (err: unknown) {
      console.warn(`⚠️  Skipped invalid JSON at line ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (events.length === 0) {
    console.log("✅ No events to push");
    return;
  }

  console.log(`🚀 Pushing ${events.length} events to ${environment} endpoint...`);
  const endpoint = ENDPOINTS[environment];

  // Health check first
  try {
    const healthCheck = await fetch(endpoint.replace("/collect", "/health"), {
      method: "GET",
    });
    if (!healthCheck.ok) {
      console.error(`❌ Endpoint not healthy (${healthCheck.status})`);
      if (environment === "local") {
        console.error(`   Make sure dev server is running: pnpm dev`);
      }
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error(`❌ Cannot reach ${environment} endpoint: ${err instanceof Error ? err.message : String(err)}`);
    if (environment === "local") {
      console.error(`   Make sure dev server is running: pnpm dev`);
      console.error(`   Or try: pnpm push:remote`);
    }
    process.exit(1);
  }

  let success = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(events.length / batchSize);
    
    process.stdout.write(`\r📦 Batch ${batchNum}/${totalBatches}... `);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });

      if (response.ok) {
        success += batch.length;
      } else {
        const text = await response.text();
        console.error(`\n❌ Batch ${batchNum} failed (${response.status}): ${text}`);
        failed += batch.length;
      }
    } catch (err: unknown) {
      console.error(`\n❌ Batch ${batchNum} error: ${err instanceof Error ? err.message : String(err)}`);
      failed += batch.length;
    }
  }

  console.log(`\n\n✅ Success: ${success} events`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} events`);
  }
}

// CLI
const args = process.argv.slice(2);
const envArg = args.find((a) => a === "--local" || a === "--remote");
const environment: Environment = envArg === "--remote" ? "remote" : "local";

const pathArg = args.find((a) => !a.startsWith("--"));
const defaultPath = resolve(
  process.env.HOME || "~",
  ".local/share/typeslayer/events.ndjson"
);

const ndjsonPath = pathArg ? resolve(pathArg) : defaultPath;

pushEvents(ndjsonPath, environment).catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
