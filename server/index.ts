import Fastify from 'fastify';
import cors from '@fastify/cors';
import { appRouter } from './router';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { data } from './data';
import { join } from 'node:path';
import { lookup } from 'mime-types';

const fastify = Fastify();

await fastify.register(cors, { origin: true, methods: ['GET', 'POST'] });

await fastify.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext: () => ({}) },
});

// Serve anything under /static/*
// THIS IS ABSOLUTELY FUCKING ABSOLUTELY NOT SECURE
// DON"T FUCK AROUND
// - DO NOT -
// why?
// Because someone can trivially execute a directory traversal attack since they can configure the directory to read from
fastify.get('/static/*', async (req, reply) => {
  const relPath = (req.params as { "*": string })['*']; // everything after /static/
  const { tempDir } = data;
  const absPath = join(tempDir, relPath);
  console.log({ relPath, absPath, tempDir })

  // Check file exists
  if (!existsSync(absPath) || !statSync(absPath).isFile()) {
    return reply.code(404).send('Not found');
  }

  const mimeType = lookup(absPath) || 'application/octet-stream';
  reply.header('Content-Type', mimeType);
  return createReadStream(absPath);
});

fastify.listen({ port: 3000 }, () => {
  console.log('🚀 Server listening on http://localhost:3000');
});
