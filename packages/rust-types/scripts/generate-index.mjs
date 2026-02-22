#!/usr/bin/env node

import { readdirSync, writeFileSync } from "node:fs";
import { join, extname, basename } from "node:path";

const outDir = new URL("..", import.meta.url).pathname;

const modules = readdirSync(outDir)
  .filter(fileName => extname(fileName) === ".ts")
  .map(fileName => basename(fileName, ".ts"))
  .filter(moduleName => moduleName !== "index")
  .sort();

const indexContent = `${modules
  .map(moduleName => `export type { ${moduleName} } from "./${moduleName}";`)
  .join("\n")}
`;

writeFileSync(join(outDir, "index.ts"), indexContent, "utf8");
