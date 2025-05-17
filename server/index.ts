import Fastify from 'fastify';
import cors from '@fastify/cors';
import { appRouter } from './router';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';

const fastify = Fastify();

await fastify.register(cors, { origin: true });

await fastify.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext: () => ({}) },
});

fastify.listen({ port: 3000 }, () => {
  console.log('🚀 Server listening on http://localhost:3000');
});
