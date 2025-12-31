import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [react()],
    root: "./src",
    publicDir: "../public",
    build: {
      outDir: "../dist",
      emptyOutDir: true,
    },
    clearScreen: false,
    server: {
      port: 1994,
      strictPort: true,
    },
  };
});
