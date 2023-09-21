import fastify, {FastifyPluginAsync, type FastifyReply} from 'fastify';
import fastifyStatic from '@fastify/static';
import { v4 as uuid } from 'uuid';
import path from 'node:path';
import * as url from 'node:url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const server = fastify();
server.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
});

const clients: Client[] = [];

// ping route that sends a SSE event to all clients when called
server.get('/ping', async (request, reply) => {
  const data = { ping: 'pong' };
  clients.forEach((client) => {
    client.reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  });
  return data;
});

interface SSEPluginOptions {
  clients: Client[];
}
const SSEPlugin: FastifyPluginAsync<SSEPluginOptions> = async (fastify, opts) => {};

server.get('/sse', (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  reply.raw.write('\n');
  const id = uuid();
  console.log(`client connected: ${id}`)
  // clients.push({
  //   id,

  //   sse: function sse(data: unknown, selectedClients: Client[]) {


  //     selectedClients.forEach((client) => {
  //       client.reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  //     });
  //   }
  // });
  request.raw.on('close', () => {
    const index = clients.findIndex((client) => client.id === id);
    clients.splice(index, 1);
    console.log(`client disconnected: ${id}`)
  });
})

server.listen({ port: 3000 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});

type Client = {
  id: string;
  sse: (data: unknown, selectedClients: Client[]) => void;
}