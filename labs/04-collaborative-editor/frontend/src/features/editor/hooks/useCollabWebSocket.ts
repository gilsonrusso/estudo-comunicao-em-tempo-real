import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_BASE } from '../../../constants/api.constants';
import {
  Collaborator,
  CollabUpdateJSON,
  DeltaOperation,
  DocumentData,
  DocumentSnapshot,
  RemoteCursor,
  ReviewComment,
} from '../types/collab.types';

export interface UseCollabWebSocketProps {
  documentId: string;
  userId: string;
  userName: string;
  activeFile: string;
  onRemoteDelta: (delta: DeltaOperation, file: string, version: number) => void;
  onRemoteCollabUpdates?: (file: string, version: number, updates: CollabUpdateJSON[]) => void;
  onSyncInit: (
    document: DocumentData,
    collaborators: Collaborator[],
    comments?: ReviewComment[],
    collabVersion?: number
  ) => void;
  onSnapshotSaved: (snapshot: DocumentSnapshot, time: string) => void;
  onCommentAdded?: (comment: ReviewComment) => void;
  onCommentRepliedOrResolved?: (comment: ReviewComment) => void;
  onCommentDeleted?: (commentId: string) => void;
}

export function useCollabWebSocket({
  documentId,
  userId,
  userName,
  activeFile,
  onRemoteDelta,
  onRemoteCollabUpdates,
  onSyncInit,
  onSnapshotSaved,
  onCommentAdded,
  onCommentRepliedOrResolved,
  onCommentDeleted,
}: UseCollabWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [activeEditor, setActiveEditor] = useState<{
    userName: string;
    color: string;
    action: string;
  } | null>(null);
  const activeEditorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = `${WS_BASE}/ws/documents/${documentId}?userId=${userId}&userName=${encodeURIComponent(userName)}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'SYNC_INIT':
            setCollaborators(msg.collaborators);
            onSyncInit(msg.document, msg.collaborators, msg.comments, msg.version);
            break;

          case 'PULL_UPDATES_RESPONSE': {
            const targetFile: string = msg.file || 'main.tex';
            const updates: CollabUpdateJSON[] = msg.updates || [];
            onRemoteCollabUpdates?.(targetFile, msg.version, updates);
            if (msg.author && msg.author.userId !== userId && targetFile === activeFile) {
              setActiveEditor({
                userName: msg.author.userName,
                color: msg.author.color,
                action: `digitou em ${targetFile}`,
              });
              clearTimeout(activeEditorTimeoutRef.current ?? undefined);
              activeEditorTimeoutRef.current = setTimeout(() => {
                setActiveEditor(null);
              }, 2500);
            }
            break;
          }

          case 'COLLABORATOR_JOINED':
          case 'COLLABORATOR_LEFT':
            setCollaborators(msg.collaborators);
            if (msg.type === 'COLLABORATOR_LEFT') {
              setRemoteCursors((prev) => {
                const map = new Map(prev);
                map.delete(msg.userId);
                return map;
              });
            }
            break;

          case 'CURSOR_UPDATE': {
            if (msg.user.userId !== userId) {
              setRemoteCursors((prev) => {
                const map = new Map(prev);
                map.set(msg.user.userId, {
                  userId: msg.user.userId,
                  userName: msg.user.userName,
                  color: msg.user.color,
                  position: msg.user.position,
                  selectionStart: msg.user.selectionStart,
                  selectionEnd: msg.user.selectionEnd,
                  file: msg.user.file || 'main.tex',
                  lastActive: Date.now(),
                });
                return map;
              });
            }
            break;
          }

          case 'DELTA_BROADCAST': {
            const op: DeltaOperation = msg.operation;
            const targetFile: string = msg.file || 'main.tex';
            onRemoteDelta(op, targetFile, msg.version);

            if (msg.author && msg.author.userId !== userId) {
              const newPos = op.position + (op.text ? op.text.length : 0);
              setRemoteCursors((prev) => {
                const map = new Map(prev);
                map.set(msg.author.userId, {
                  userId: msg.author.userId,
                  userName: msg.author.userName,
                  color: msg.author.color,
                  position: newPos,
                  file: targetFile,
                  lastActive: Date.now(),
                });
                return map;
              });

              if (targetFile === activeFile) {
                setActiveEditor({
                  userName: msg.author.userName,
                  color: msg.author.color,
                  action:
                    op.type === 'insert' ? `digitou em ${targetFile}` : `apagou em ${targetFile}`,
                });
                clearTimeout(activeEditorTimeoutRef.current ?? undefined);
                activeEditorTimeoutRef.current = setTimeout(() => {
                  setActiveEditor(null);
                }, 2500);
              }
            }
            break;
          }

          case 'SNAPSHOT_SAVED':
            onSnapshotSaved(msg.snapshot, msg.time);
            break;

          case 'COMMENT_ADDED':
            onCommentAdded?.(msg.comment);
            break;

          case 'COMMENT_REPLIED':
          case 'COMMENT_RESOLVED':
            onCommentRepliedOrResolved?.(msg.comment);
            break;

          case 'COMMENT_DELETED':
            onCommentDeleted?.(msg.commentId);
            break;
        }
      } catch (err) {
        console.error('[Collab WS] Erro ao processar mensagem:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [
    documentId,
    userId,
    userName,
    activeFile,
    onRemoteDelta,
    onRemoteCollabUpdates,
    onSyncInit,
    onSnapshotSaved,
    onCommentAdded,
    onCommentRepliedOrResolved,
    onCommentDeleted,
  ]);

  const sendDelta = useCallback(
    (file: string, delta: Omit<DeltaOperation, 'userId' | 'userName' | 'timestamp'>) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'APPLY_DELTA',
            file,
            delta,
          })
        );
      }
    },
    []
  );
  const sendCollabUpdates = useCallback(
    (file: string, version: number, updates: CollabUpdateJSON[]) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'PUSH_UPDATES',
            file,
            version,
            updates,
          })
        );
      }
    },
    []
  );


  const sendCursorMove = useCallback(
    (position: number, file: string, selectionStart?: number, selectionEnd?: number) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'CURSOR_MOVE',
            position,
            selectionStart,
            selectionEnd,
            file,
          })
        );
      }
    },
    []
  );

  const sendRawMessage = useCallback((payload: unknown) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return {
    isConnected,
    collaborators,
    remoteCursors,
    activeEditor,
    sendDelta,
    sendCollabUpdates,
    sendCursorMove,
    sendRawMessage,
  };
}
