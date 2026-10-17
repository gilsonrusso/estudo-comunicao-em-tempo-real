import fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { documentsRoutes } from './modules/documents/documents.routes.js';
import { documentsWebSocketPlugin } from './modules/documents/documents.websocket.js';
import { initRedis } from './infra/redis.js';

const PORT = parseInt(process.env.PORT || '3333', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Inicializa o cluster Redis
await initRedis();

const app = fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
}).withTypeProvider<ZodTypeProvider>();

// Configura compiladores do Zod para rotas REST tipadas com Zod
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// Plugins de infraestrutura
await app.register(cors, {
  origin: true, // Permite conexões do frontend React Vite (ex: localhost:5173)
});

await app.register(websocket, {
  options: {
    maxPayload: 1048576, // 1 MB
  },
});

// Rotas da aplicação
await app.register(documentsRoutes);
await app.register(documentsWebSocketPlugin);

// Healthcheck
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`\n================================================================`);
  console.log(`🚀 Fastify Backend Colaborativo rodando em http://${HOST}:${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://${HOST}:${PORT}/ws/documents/:documentId`);
  console.log(`================================================================\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
