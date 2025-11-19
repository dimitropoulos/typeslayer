import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { CLIENT_PORT } from "./components/constants";

export default defineConfig({
	plugins: [react()],
	root: "./client",
	server: {
		port: CLIENT_PORT,
	},
});
