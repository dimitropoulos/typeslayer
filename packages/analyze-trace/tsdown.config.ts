import { defineConfig } from "tsdown";

export default defineConfig([
  // Main Node.js build
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    target: "es2024",
    dts: true,
    sourcemap: true,
    clean: true,
  },
  // Browser-safe build (types only)
  {
    entry: { browser: "src/browser.ts" },
    format: ["esm"],
    target: "es2024",
    dts: true,
    sourcemap: true,
    clean: false,
  },
]);
