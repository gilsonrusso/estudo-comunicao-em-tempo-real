import { randomUUID } from 'crypto';
import { FastifyPluginAsync } from 'fastify';
import { WebSocket } from 'ws';
import { DocumentsService, defaultDocumentsService } from './documents.service.js';
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

// Paleta de cores para autores com alto contraste e destaque tanto no tema light quanto no dark
const USER_COLORS = [
  '#2563eb', // Royal Blue
  '#059669', // Overleaf Emerald Green
  '#ea580c', // Laranja Intenso
  '#9333ea', // Roxo Elétrico
  '#e11d48', // Rosa Carmesim
  '#0891b2', // Ciano Oceano
  '#4f46e5', // Índigo Profundo
  '#d97706', // Âmbar Quente
];

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
  const service = defaultDocumentsService;

  fastify.get('/ws/documents/:documentId', { websocket: true }, async (socket, req) => {
    const { documentId } = req.params as { documentId: string };
    const query = req.query as { userId?: string; userName?: string };

    const userId = query.userId || Math.random().toString(36).substring(2, 9);
    const userName = query.userName || `Usuário-${userId.substring(0, 4)}`;

    // Evita atribuir a mesma cor caso já existam autores conectados na mesma sala
    const existingRoom = documentRooms.get(documentId);
    const usedColors = new Set(existingRoom ? Array.from(existingRoom).map((c) => c.color) : []);
    const availableColor = USER_COLORS.find((col) => !usedColors.has(col));
    const color = availableColor || USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

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
          // Cliente enviou atualizações com @codemirror/collab
          case 'PUSH_UPDATES': {
            const targetFile = message.file || 'main.tex';
            const clientVersion = typeof message.version === 'number' ? message.version : 0;
            const updates = Array.isArray(message.updates) ? message.updates : [];

            if (updates.length === 0) {
              break;
            }

            console.log(
              `[WS PUSH_UPDATES] from ${userName} (${userId}) file=${targetFile} ver=${clientVersion} count=${updates.length}`
            );

            const result = await service.pushUpdates(
              documentId,
              targetFile,
              clientVersion,
              updates,
              userId,
              userName,
              (snapshot: DocumentSnapshot) => {
                broadcastToRoom(documentId, {
                  type: 'SNAPSHOT_SAVED',
                  snapshot,
                  version: snapshot.version,
                  time: new Date().toLocaleTimeString(),
                });
              }
            );

            if (result.rebasedUpdates.length > 0) {
              // Transmite as atualizações rebaseadas para todos os clientes da sala
              broadcastToRoom(documentId, {
                type: 'PULL_UPDATES_RESPONSE',
                file: targetFile,
                version: result.newVersion,
                updates: result.rebasedUpdates,
                author: { userId, userName, color },
                status: 'pending_debounce',
              });
            }
            break;
          }

          case 'PULL_UPDATES': {
            const targetFile = message.file || 'main.tex';
            const clientVersion = typeof message.version === 'number' ? message.version : 0;
            const historyUpdates = service.getUpdatesSince(documentId, targetFile, clientVersion);
            socket.send(
              JSON.stringify({
                type: 'PULL_UPDATES_RESPONSE',
                file: targetFile,
                version: service.getCollabVersion(documentId, targetFile),
                updates: historyUpdates,
              })
            );
            break;
          }

          // Cliente enviou um delta de texto atômico (insert ou delete)
          case 'APPLY_DELTA': {
            const targetFile = message.file || (message.delta && message.delta.file) || 'main.tex';
            const delta: DeltaOperation = {
              type: message.delta.type,
              position: message.delta.position,
              text: message.delta.text,
              length: message.delta.length,
              userId,
              userName,
              timestamp: Date.now(),
            };

            if (targetFile === 'main.tex') {
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
                  file: 'main.tex',
                  operation,
                  version: newVersion,
                  author: { userId, userName, color },
                  status: 'pending_debounce',
                },
                socket // Não precisa re-enviar para o autor que já aplicou localmente
              );

              // Confirmação para o próprio autor com a nova versão
              socket.send(
                JSON.stringify({
                  type: 'ACK_DELTA',
                  file: 'main.tex',
                  operationId: operation.id,
                  version: newVersion,
                  status: 'pending_debounce',
                })
              );
            } else {
              // Arquivo secundário (.bib, .tex complementar)
              // Transmite imediatamente para os outros autores na mesma sala
              broadcastToRoom(
                documentId,
                {
                  type: 'DELTA_BROADCAST',
                  file: targetFile,
                  operation: {
                    id: Math.random().toString(36).substring(2, 9),
                    ...delta,
                  },
                  author: { userId, userName, color },
                  status: 'pending_debounce',
                },
                socket
              );
            }
            break;
          }

          // Atualização de posição de cursor e seleção para presença visual com isolamento por arquivo
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
                  selectionStart: message.selectionStart,
                  selectionEnd: message.selectionEnd,
                  file: message.file || 'main.tex',
                },
              },
              socket
            );
            break;
          }

          // Adicionar comentário de revisão
          case 'ADD_COMMENT': {
            const newComment = service.addComment(documentId, {
              id: (message.comment && message.comment.id) || randomUUID(),
              documentId,
              file: (message.comment && message.comment.file) || 'main.tex',
              from: message.comment.from,
              to: message.comment.to,
              selectedText: message.comment.selectedText || '',
              userId,
              userName,
              userColor: color,
              content: message.comment.content,
              status: 'open',
              createdAt: new Date().toLocaleTimeString(),
              replies: [],
            });
            broadcastToRoom(documentId, {
              type: 'COMMENT_ADDED',
              comment: newComment,
            });
            break;
          }

          // Responder a um comentário de revisão
          case 'REPLY_COMMENT': {
            const updated = service.replyComment(documentId, message.commentId, {
              id: randomUUID(),
              userId,
              userName,
              userColor: color,
              content: message.content,
              createdAt: new Date().toLocaleTimeString(),
            });
            if (updated) {
              broadcastToRoom(documentId, {
                type: 'COMMENT_REPLIED',
                comment: updated,
              });
            }
            break;
          }

          // Resolver ou reabrir comentário
          case 'RESOLVE_COMMENT': {
            const updated = service.resolveComment(documentId, message.commentId, message.status);
            if (updated) {
              broadcastToRoom(documentId, {
                type: 'COMMENT_RESOLVED',
                comment: updated,
              });
            }
            break;
          }

          // Excluir comentário
          case 'DELETE_COMMENT': {
            const ok = service.deleteComment(documentId, message.commentId);
            if (ok) {
              broadcastToRoom(documentId, {
                type: 'COMMENT_DELETED',
                commentId: message.commentId,
              });
            }
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
      const comments = service.getComments(documentId);
      socket.send(
        JSON.stringify({
          type: 'SYNC_INIT',
          document: doc,
          version: service.getCollabVersion(documentId, 'main.tex'),
          comments,
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
