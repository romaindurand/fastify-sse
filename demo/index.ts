import path from 'node:path';
import * as url from 'node:url';
import fastifyStatic from '@fastify/static';
import fastify from 'fastify';

import SSEPlugin from '../src/SSEPlugin.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const server = fastify();

server.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
});

server.register(SSEPlugin);

// sends a SSE event to all clients when called
server.get('/ping', async (request, reply) => {
  const data = { ping: 'pong' };
  reply.clients.send(data);
});

server.listen({ port: 3000 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});