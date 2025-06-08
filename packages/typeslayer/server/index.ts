import { createReadStream, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { lookup } from "mime-types";
import { data, refreshAllFiles } from "./data";
import { appRouter } from "./router";
import { attemptAutoDetectTypeCheckScript } from "./utils";

const fastify = Fastify();

await fastify.register(cors, { origin: true, methods: ["GET", "POST"] });

await fastify.register(fastifyTRPCPlugin, {
	prefix: "/trpc",
	trpcOptions: {
		router: appRouter,
		createContext: async () => ({}),
	},
});

// Serve anything under /static/*
// THIS IS ABSOLUTELY FUCKING ABSOLUTELY NOT SECURE
// DON"T FUCK AROUND
// - DO NOT -
// why?
// Because someone can trivially execute a directory traversal attack since they can configure the directory to read from
fastify.get("/static/*", async (req, reply) => {
	const relPath = (req.params as { "*": string })["*"]; // everything after /static/
	const { tempDir } = data;
	const absPath = join(tempDir, relPath);
	console.log({ relPath, absPath, tempDir });

	// Check file exists
	if (!existsSync(absPath) || !statSync(absPath).isFile()) {
		return reply.code(404).send("Not found");
	}

	const mimeType = lookup(absPath) || "application/octet-stream";
	reply.header("Content-Type", mimeType);
	return createReadStream(absPath);
});

try {
	await fastify.listen({ port: 3000 });
	console.log("🚀 Server listening on http://localhost:3000");
	await refreshAllFiles();
	await attemptAutoDetectTypeCheckScript();
	console.log("ready to slay!", {
		projectRoot: data.projectRoot,
		tempDir: data.tempDir,
		scriptName: data.scriptName,
	});
} catch (err) {
	fastify.log.error(err);
	process.exit(1);
}
