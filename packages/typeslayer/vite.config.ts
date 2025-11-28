import * as fs from "node:fs";
import * as path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
	plugins: [
		react(),
		{
			name: "serve-temp-files",
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					const start = "/tmp-files/";
					if (req.url?.startsWith(start)) {
						const fileName = req.url.slice(start.length);
						const tempDir = "/tmp/typeslayer";
						const filePath = path.join(tempDir, fileName);

						fs.readFile(filePath, (err, data) => {
							if (err) {
								res.statusCode = 404;
								res.end("Not found");
								return;
							}

							const ext = path.extname(fileName);
							const contentType =
								ext === ".json"
									? "application/json"
									: "application/octet-stream";

							res.setHeader("Content-Type", contentType);
							res.setHeader("Access-Control-Allow-Origin", "*");
							res.end(data);
						});
					} else {
						next();
					}
				});
			},
		},
	],
	root: "./src",
	publicDir: "../public",
	build: {
		outDir: "../dist", // place build output where tauri.conf expects
		emptyOutDir: true,
	},

	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	//
	// 1. prevent Vite from obscuring rust errors
	clearScreen: false,
	// 2. tauri expects a fixed port, fail if that port is not available
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: "ws",
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			// 3. tell Vite to ignore watching `src-tauri`
			ignored: ["**/src-tauri/**"],
		},
	},
}));
