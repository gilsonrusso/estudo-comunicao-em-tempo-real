import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(express.static(path.join(__dirname, 'public')));

// Cria servidor HTTP que suportará tanto requisições Web quanto o Upgrade para WebSocket
const server = http.createServer(app);

// Instancia o servidor WebSocket acoplado ao servidor HTTP
const wss = new WebSocketServer({ server, path: '/ws' });

// Mapa de conexões ativas: ws => { username, room, id }
const clients = new Map();

/**
 * 1. Broadcast Helper: envia dados para clientes em uma mesma sala
 * @param {string} room - Nome da sala
 * @param {object} payload - Dados a serem serializados em JSON
 * @param {WebSocket} [excludeWs] - Socket opcional a ser ignorado (ex: quem originou)
 */
function broadcastToRoom(room, payload, excludeWs = null) {
  const message = JSON.stringify(payload);
  for (const [ws, info] of clients.entries()) {
    if (info.room === room && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

/**
 * Helper para obter a lista de usuários em uma sala
 */
function getRoomUsers(room) {
  const users = [];
  for (const info of clients.values()) {
    if (info.room === room && info.username) {
      users.push(info.username);
    }
  }
  return users;
}

/**
 * 2. Mecanismo de Heartbeat / Ping-Pong para matar conexões zumbis
 */
const heartbeatInterval = setInterval(() => {
  for (const [ws, info] of clients.entries()) {
    if (ws.isAlive === false) {
      console.log(`[Heartbeat] Conexão zumbi detectada para ${info.username || 'Anônimo'}. Terminando socket...`);
      clients.delete(ws);
      ws.terminate();
      continue;
    }

    // Marca como falso e envia Ping; se o cliente responder Pong, volta a true
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

/**
 * 3. Gerenciamento de novas conexões WebSocket
 */
wss.on('connection', (ws, req) => {
  // Inicializa flag de heartbeat
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  const clientId = Math.random().toString(36).substring(2, 9);
  clients.set(ws, { id: clientId, username: null, room: null });

  console.log(`[WS] Novo cliente conectado (ID temporário: ${clientId})`);

  // Trata mensagens recebidas do cliente
  ws.on('message', (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage.toString());
      const clientInfo = clients.get(ws);

      switch (data.type) {
        // Usuário entrando em uma sala
        case 'JOIN_ROOM': {
          const { username, room } = data;
          
          // Se já estava em outra sala, notifica a sala anterior
          if (clientInfo.room) {
            broadcastToRoom(clientInfo.room, {
              type: 'USER_LEFT',
              username: clientInfo.username,
              users: getRoomUsers(clientInfo.room).filter(u => u !== clientInfo.username)
            });
          }

          clientInfo.username = username;
          clientInfo.room = room;

          console.log(`[WS] ${username} entrou na sala #${room}`);

          // Notifica todos na sala que alguém entrou
          broadcastToRoom(room, {
            type: 'USER_JOINED',
            username,
            users: getRoomUsers(room)
          });

          // Envia confirmação e lista de usuários para o próprio usuário
          ws.send(JSON.stringify({
            type: 'JOINED_SUCCESS',
            room,
            users: getRoomUsers(room)
          }));
          break;
        }

        // Mensagem de bate-papo
        case 'CHAT_MESSAGE': {
          if (!clientInfo.room || !clientInfo.username) return;

          const messagePayload = {
            type: 'NEW_MESSAGE',
            id: Date.now().toString(),
            user: clientInfo.username,
            text: data.text,
            timestamp: new Date().toLocaleTimeString(),
            room: clientInfo.room
          };

          // Envia para TODOS na mesma sala (incluindo o próprio autor)
          broadcastToRoom(clientInfo.room, messagePayload);
          break;
        }

        // Indicador de "está digitando..."
        case 'TYPING': {
          if (!clientInfo.room) return;
          broadcastToRoom(clientInfo.room, {
            type: 'USER_TYPING',
            user: clientInfo.username,
            isTyping: data.isTyping
          }, ws); // Não manda de volta para quem está digitando
          break;
        }

        default:
          console.warn('[WS] Tipo de mensagem desconhecido:', data.type);
      }
    } catch (err) {
      console.error('[WS] Erro ao processar mensagem JSON:', err.message);
    }
  });

  // Limpeza na desconexão
  ws.on('close', () => {
    const info = clients.get(ws);
    if (info && info.room && info.username) {
      console.log(`[WS] ${info.username} desconectou da sala #${info.room}`);
      clients.delete(ws);

      broadcastToRoom(info.room, {
        type: 'USER_LEFT',
        username: info.username,
        users: getRoomUsers(info.room)
      });
    } else {
      clients.delete(ws);
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS] Erro no socket:`, err.message);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Lab 02 (WebSocket Chat) rodando em http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
