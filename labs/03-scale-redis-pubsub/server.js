import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from 'redis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '5001', 10);
const NODE_NAME = process.env.NODE_NAME || `Instância-${PORT}`;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_CHANNEL = 'cluster:chat:events';

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para o frontend exibir a qual nó ele está conectado
app.get('/api/node-info', (req, res) => {
  res.json({ nodeName: NODE_NAME, port: PORT });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Sockets locais conectados EXCLUSIVAMENTE a este nó
const localClients = new Map(); // ws => { id, username, room }

// 1. Inicialização dos Clientes Redis (Pub e Sub) com política de reconexão
const redisConfig = {
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 500, 3000)
  }
};

const pubClient = createClient(redisConfig);
const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error(`[${NODE_NAME}] Erro no Redis PUB:`, err.message));
subClient.on('error', (err) => console.error(`[${NODE_NAME}] Erro no Redis SUB:`, err.message));

async function initCluster() {
  let connected = false;
  while (!connected) {
    try {
      if (!pubClient.isOpen) await pubClient.connect();
      if (!subClient.isOpen) await subClient.connect();
      connected = true;
      console.log(`[${NODE_NAME}] ✅ Conectado ao cluster Redis em ${REDIS_URL}`);
    } catch (err) {
      console.warn(`[${NODE_NAME}] ⏳ Tentando conectar ao Redis em ${REDIS_URL} (${err.message})... nova tentativa em 2s`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // 2. Escuta mensagens publicadas no Redis por QUALQUER nó do cluster
  await subClient.subscribe(REDIS_CHANNEL, (rawMessage) => {
    try {
      const event = JSON.parse(rawMessage);
      const { originNode, room, type, payload } = event;

      // Localiza clientes conectados NESTA instância que pertencem à sala
      let deliveredCount = 0;
      const outgoing = JSON.stringify({ type, originNode, ...payload });

      for (const [ws, info] of localClients.entries()) {
        if (info.room === room && ws.readyState === WebSocket.OPEN) {
          ws.send(outgoing);
          deliveredCount++;
        }
      }

      console.log(`[Redis ➔ ${NODE_NAME}] Recebido evento "${type}" originado por [${originNode}]. Entregue localmente para ${deliveredCount} clientes na sala #${room}.`);
    } catch (err) {
      console.error(`[${NODE_NAME}] Erro ao processar mensagem do Redis:`, err.message);
    }
  });
}

/**
 * 3. Helper para publicar um evento no Redis
 */
async function publishToCluster(type, room, payload) {
  if (!pubClient.isOpen) {
    console.warn(`[${NODE_NAME}] ⚠️ Redis PUB não está conectado no momento. Descartando publicação do evento "${type}".`);
    return;
  }

  const envelope = {
    originNode: NODE_NAME,
    room,
    type,
    payload,
    timestamp: Date.now()
  };

  console.log(`[${NODE_NAME} ➔ Redis] Publicando evento "${type}" na sala #${room}...`);
  await pubClient.publish(REDIS_CHANNEL, JSON.stringify(envelope));
}

// 4. WebSocket Server
wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substring(2, 9);
  localClients.set(ws, { id: clientId, username: null, room: null });

  console.log(`[${NODE_NAME}] Novo socket conectado localmente (ID: ${clientId})`);

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const client = localClients.get(ws);

      switch (data.type) {
        case 'JOIN_ROOM': {
          client.username = data.username;
          client.room = data.room;

          // Confirmação para o próprio cliente
          ws.send(JSON.stringify({
            type: 'JOINED_SUCCESS',
            room: data.room,
            nodeName: NODE_NAME
          }));

          // Notifica o cluster que um novo usuário entrou
          await publishToCluster('USER_JOINED', data.room, {
            username: data.username,
            node: NODE_NAME
          });
          break;
        }

        case 'CHAT_MESSAGE': {
          if (!client.room || !client.username) return;

          // Publica a mensagem para todo o cluster Redis
          await publishToCluster('NEW_MESSAGE', client.room, {
            user: client.username,
            text: data.text,
            time: new Date().toLocaleTimeString(),
            node: NODE_NAME
          });
          break;
        }
      }
    } catch (err) {
      console.error(`[${NODE_NAME}] Erro no processamento de mensagem WS:`, err.message);
    }
  });

  ws.on('close', async () => {
    const client = localClients.get(ws);
    if (client && client.room && client.username) {
      console.log(`[${NODE_NAME}] Socket fechado para ${client.username}`);
      localClients.delete(ws);

      await publishToCluster('USER_LEFT', client.room, {
        username: client.username,
        node: NODE_NAME
      });
    } else {
      localClients.delete(ws);
    }
  });
});

// Inicialização com suporte a modo standalone caso Redis esteja offline
initCluster().catch((err) => {
  console.warn(`[${NODE_NAME}] ⚠️ Atenção: Não foi possível conectar ao Redis (${err.message}). O laboratório precisa do Redis rodando para sincronizar instâncias.`);
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 ${NODE_NAME} rodando em http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
