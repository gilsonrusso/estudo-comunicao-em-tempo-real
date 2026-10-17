import { FastifyPluginAsync } from 'fastify';
import { WebSocket } from 'ws';
import { DocumentsService } from './documents.service.js';
import { DeltaOperation, DocumentSnapshot } from './documents.schema.js';

interface ClientMeta {
  ws: WebSocket;
  userId: string;
  userName: string;
  documentId: string;
  color: string;
}

// Mapa de salas de documentos: documentId => Set de sockets conectados
const documentRooms = new Map<string, Set<ClientMeta>>();

// Paleta de cores para cursores de usuários
const USER_COLORS = ['#38bdf8', '#a855f7', '#22c55e', '#f59e0b', '#ec4899', '#6366f1'];

function getDocumentClients(documentId: string): ClientMeta[] {
  const room = documentRooms.get(documentId);
  return room ? Array.from(room) : [];
}

function broadcastToRoom(documentId: string, payload: unknown, excludeWs?: WebSocket) {
  const room = documentRooms.get(documentId);
  if (!room) return;

  const data = JSON.stringify(payload);
  for (const client of room) {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

export const documentsWebSocketPlugin: FastifyPluginAsync = async (fastify) => {
  const service = new DocumentsService();

  fastify.get('/ws/documents/:documentId', { websocket: true }, async (socket, req) => {
    const { documentId } = req.params as { documentId: string };
    const query = req.query as { userId?: string; userName?: string };

    const userId = query.userId || Math.random().toString(36).substring(2, 9);
    const userName = query.userName || `Usuário-${userId.substring(0, 4)}`;
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

    const client: ClientMeta = {
      ws: socket,
      userId,
      userName,
      documentId,
      color,
    };

    if (!documentRooms.has(documentId)) {
      documentRooms.set(documentId, new Set());
    }
    documentRooms.get(documentId)!.add(client);

    console.log(`[Collab WS] 👤 ${userName} (${userId}) conectou ao documento ${documentId}`);

    // Registra listeners de forma síncrona para não perder eventos iniciais
    socket.on('message', async (raw: WebSocket.RawData) => {
      try {
        const message = JSON.parse(raw.toString());

        switch (message.type) {
          // Cliente enviou um delta de texto atômico (insert ou delete)
          case 'APPLY_DELTA': {
            const delta: DeltaOperation = {
              type: message.delta.type,
              position: message.delta.position,
              text: message.delta.text,
              length: message.delta.length,
              userId,
              userName,
              timestamp: Date.now(),
            };

            // Aplica no serviço e obtém o novo estado consolidado
            const { operation, newContent, newVersion } = await service.applyDelta(
              documentId,
              delta,
              (snapshot: DocumentSnapshot) => {
                // Notifica toda a sala quando o debounce expira e o snapshot é gravado no banco!
                broadcastToRoom(documentId, {
                  type: 'SNAPSHOT_SAVED',
                  snapshot,
                  version: snapshot.version,
                  time: new Date().toLocaleTimeString(),
                });
              }
            );

            // Informa a todos na sala sobre o delta aplicado
            broadcastToRoom(
              documentId,
              {
                type: 'DELTA_BROADCAST',
                operation,
                version: newVersion,
                author: { userId, userName, color },
                status: 'pending_debounce', // Indica que está no buffer em RAM aguardando debounce de 3s
              },
              socket // Não precisa re-enviar para o autor que já aplicou localmente
            );

            // Confirmação para o próprio autor com a nova versão
            socket.send(
              JSON.stringify({
                type: 'ACK_DELTA',
                operationId: operation.id,
                version: newVersion,
                status: 'pending_debounce',
              })
            );
            break;
          }

          // Atualização de posição de cursor para presença visual com isolamento por arquivo
          case 'CURSOR_MOVE': {
            broadcastToRoom(
              documentId,
              {
                type: 'CURSOR_UPDATE',
                user: {
                  userId,
                  userName,
                  color,
                  position: message.position,
                  file: message.file || 'main.tex',
                },
              },
              socket
            );
            break;
          }
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error('[Collab WS] Erro ao processar mensagem:', error.message);
      }
    });

    // 3. Desconexão
    socket.on('close', () => {
      const room = documentRooms.get(documentId);
      if (room) {
        room.delete(client);
        if (room.size === 0) {
          documentRooms.delete(documentId);
        }
      }

      console.log(`[Collab WS] 🚪 ${userName} desconectou do documento ${documentId}`);

      broadcastToRoom(documentId, {
        type: 'COLLABORATOR_LEFT',
        userId,
        userName,
        collaborators: getDocumentClients(documentId).map((c) => ({
          userId: c.userId,
          userName: c.userName,
          color: c.color,
        })),
      });
    });

    // 4. Envia estado inicial do documento para o cliente recém-conectado
    try {
      const doc = await service.getDocument(documentId);
      socket.send(
        JSON.stringify({
          type: 'SYNC_INIT',
          document: doc,
          collaborators: getDocumentClients(documentId).map((c) => ({
            userId: c.userId,
            userName: c.userName,
            color: c.color,
          })),
        })
      );
    } catch (err: unknown) {
      const error = err as Error;
      socket.send(JSON.stringify({ type: 'ERROR', message: error.message }));
      socket.close();
      return;
    }

    // Notifica os outros colaboradores que alguém entrou
    broadcastToRoom(
      documentId,
      {
        type: 'COLLABORATOR_JOINED',
        user: { userId, userName, color },
        collaborators: getDocumentClients(documentId).map((c) => ({
          userId: c.userId,
          userName: c.userName,
          color: c.color,
        })),
      },
      socket
    );
  });
};
