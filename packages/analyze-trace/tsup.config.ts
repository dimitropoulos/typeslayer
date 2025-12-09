import { defineConfig } from "tsup";

export default defineConfig([
  // Main Node.js build
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    target: "es2024",
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ["zod"],
    noExternal: ["@typeslayer/validate"],
  },
  // Browser-safe build (types only)
  {
    entry: { browser: "src/browser.ts" },
    format: ["esm"],
    target: "es2024",
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    external: ["zod"],
    noExternal: ["@typeslayer/validate"],
  },
]);
