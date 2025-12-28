import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2024",
  dts: true,
  sourcemap: true,
  clean: true,
});
