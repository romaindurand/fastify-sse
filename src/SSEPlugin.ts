import { FastifyPluginAsync, FastifyReply } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { v4 as uuid } from 'uuid';

const clients: Clients = Object.assign([], {
  send: function send(data: unknown, selectedClients: Client[] = []) {
    if (!selectedClients.length) {
      selectedClients = clients;
    }

    selectedClients.forEach((client) => {
      client.send(data);
    });
  }
});

interface SSEPluginOptions {
  SSEPath?: string;
  decorateClient?: DecorateClient;
  sendClientId?: SendClientId;
}

type SendClientId = (client: Client) => void;
type DecorateClient = (client: Client) => Client;

const defaultSendClientId: SendClientId = (client) => client.send({ type: 'id', id: client.id });
const defaultDecorateClient: DecorateClient = (client) => client;

const SSEPlugin: FastifyPluginAsync<SSEPluginOptions> = async (fastify, opts) => {
  const SSEPath = opts.SSEPath || '/sse';
  const decorateClient = opts.decorateClient || defaultDecorateClient;
  const sendClientId = opts.sendClientId || defaultSendClientId;

  fastify.decorateReply('clients', null);

  fastify.get(SSEPath, (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    reply.raw.write('\n');
    const id = uuid();
    console.log(`client connected: ${id}`)
    const client = decorateClient({
      id,
      send: (data) => {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    })
    sendClientId(client);
    clients.push(client);
    request.raw.on('close', () => {
      const index = clients.findIndex((client) => client.id === id);
      clients.splice(index, 1);
      console.log(`client disconnected: ${id}`)
    });
  })

  fastify.addHook('onRequest', async (request, response) => {
    response.clients = clients;
  })
};



declare module 'fastify' {
  interface FastifyReply {
    /** Clients awaiting for Server Sent Events */
    clients: Clients;
  }
}

interface Client {
  id: string;
  send: (data: unknown) => void;
}

interface Clients extends Array<Client> {
  send: (data: unknown, selectedClients?: Client[]) => void;
}

export default fastifyPlugin(SSEPlugin);