import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/node.ts"],
  format: ["esm"],
  target: "es2024",
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
});
