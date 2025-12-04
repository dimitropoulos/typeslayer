import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2024",
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
});
