import { useState, useEffect, useRef } from 'react';
import { useColorMode } from './theme/index';
import { IdeNavbar } from './components/IdeNavbar';
import { ActivityRail, type ActiveSidebarPanel } from './components/ActivityRail';
import { FileTreeSidebar } from './components/FileTreeSidebar';
import { CodeMirrorEditor } from './components/CodeMirrorEditor';
import { PdfPreview } from './components/PdfPreview';
import { HistorySidebar } from './components/HistorySidebar';
import {
  AuthorHighlight,
  Collaborator,
  DeltaOperation,
  DocumentData,
  DocumentSnapshot,
  RemoteCursor,
  SaveStatus,
} from './types/collab';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? '' : 'http://localhost:3333');

const WS_BASE =
  import.meta.env.VITE_WS_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    : 'ws://localhost:3333');
const DOC_ID = 'doc-1';

// Ajusta as posições de início e fim dos realces de autoria conforme deltas são aplicados
function adjustHighlightsOnDelta(
  highlights: AuthorHighlight[],
  op: { type: 'insert' | 'delete'; position: number; text?: string; length?: number }
): AuthorHighlight[] {
  const deltaLen = op.type === 'insert' ? (op.text?.length || 0) : -(op.length || 0);

  return highlights
    .map((hl) => {
      if (op.position >= hl.end) {
        return hl;
      }
      if (op.position <= hl.start) {
        return {
          ...hl,
          start: Math.max(0, hl.start + deltaLen),
          end: Math.max(0, hl.end + deltaLen),
        };
      }
      return {
        ...hl,
        end: Math.max(hl.start, hl.end + deltaLen),
      };
    })
    .filter((hl) => hl.end > hl.start);
}

export function App() {
  const { mode: themeMode, toggleColorMode } = useColorMode();

  // Usuário aleatório padrão ou guardado em localStorage
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('collab_username') || `Dev-${Math.floor(Math.random() * 900 + 100)}`;
  });
  const [userId] = useState<string>(() => {
    let id = localStorage.getItem('collab_userid');
    if (!id) {
      id = Math.random().toString(36).substring(2, 9);
      localStorage.setItem('collab_userid', id);
    }
    return id;
  });

  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [operations, setOperations] = useState<DeltaOperation[]>([]);
  const [snapshots, setSnapshots] = useState<DocumentSnapshot[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('synced');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isFlushing, setIsFlushing] = useState<boolean>(false);

  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [authorHighlights, setAuthorHighlights] = useState<AuthorHighlight[]>([]);
  const [activeEditor, setActiveEditor] = useState<{ userName: string; color: string; action: string } | null>(null);
  const activeEditorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estados de Painéis e Layout do Overleaf Redesign
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<ActiveSidebarPanel>('files');
  const [activeFile, setActiveFile] = useState<string>('main.tex');
  const [layoutMode, setLayoutMode] = useState<'split' | 'editor' | 'pdf'>('split');
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Estados da compilação de PDF
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [lastCompiledAt, setLastCompiledAt] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  const handleNameChange = (newName: string) => {
    setUserName(newName);
    localStorage.setItem('collab_username', newName);
  };

  // Carrega histórico inicial do backend via REST
  useEffect(() => {
    fetch(`${API_BASE}/api/documents/${DOC_ID}/history`)
      .then((res) => res.json())
      .then((data) => {
        if (data.snapshots) setSnapshots(data.snapshots);
        if (data.operations) setOperations(data.operations.slice(-30).reverse());
      })
      .catch((err) => console.error('Erro ao carregar histórico REST:', err));
  }, []);

  // Inicializa o WebSocket
  useEffect(() => {
    const wsUrl = `${WS_BASE}/ws/documents/${DOC_ID}?userId=${userId}&userName=${encodeURIComponent(userName)}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('[Collab WS] Conectado ao servidor');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'SYNC_INIT':
            setDocumentData(msg.document);
            setCollaborators(msg.collaborators);
            break;

          case 'COLLABORATOR_JOINED':
            setCollaborators(msg.collaborators);
            break;

          case 'COLLABORATOR_LEFT':
            setCollaborators(msg.collaborators);
            setRemoteCursors((prev) => {
              const map = new Map(prev);
              map.delete(msg.userId);
              return map;
            });
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
                  lastActive: Date.now(),
                });
                return map;
              });
            }
            break;
          }

          case 'DELTA_BROADCAST': {
            const op = msg.operation;
            setDocumentData((prev) => {
              if (!prev) return prev;
              let content = prev.content;
              const pos = Math.max(0, Math.min(op.position, content.length));

              if (op.type === 'insert' && op.text !== undefined) {
                content = content.slice(0, pos) + op.text + content.slice(pos);
              } else if (op.type === 'delete' && op.length !== undefined) {
                content = content.slice(0, pos) + content.slice(pos + op.length);
              }

              return {
                ...prev,
                content,
                version: msg.version,
              };
            });

            // Atualiza posição do cursor do autor do delta
            if (msg.author && msg.author.userId !== userId) {
              const newPos = op.position + (op.text ? op.text.length : 0);
              setRemoteCursors((prev) => {
                const map = new Map(prev);
                map.set(msg.author.userId, {
                  userId: msg.author.userId,
                  userName: msg.author.userName,
                  color: msg.author.color,
                  position: newPos,
                  lastActive: Date.now(),
                });
                return map;
              });

              // Registra o trecho para realce visual e atribuição de autoria
              setAuthorHighlights((prev) => {
                const shifted = adjustHighlightsOnDelta(prev, op);
                if (op.type === 'insert' && op.text && msg.author) {
                  return [
                    ...shifted,
                    {
                      id: Math.random().toString(),
                      start: op.position,
                      end: op.position + op.text.length,
                      authorName: msg.author.userName,
                      color: msg.author.color,
                      timestamp: Date.now(),
                    },
                  ];
                }
                return shifted;
              });

              // Notificação inline visual de quem está editando
              setActiveEditor({
                userName: msg.author.userName,
                color: msg.author.color,
                action: op.type === 'insert' ? 'digitou no documento' : 'apagou texto',
              });

              if (activeEditorTimeoutRef.current) clearTimeout(activeEditorTimeoutRef.current);
              activeEditorTimeoutRef.current = setTimeout(() => {
                setActiveEditor(null);
              }, 2500);
            }

            // Adiciona no stream de operações
            setOperations((prev) => [op, ...prev.slice(0, 49)]);
            setSaveStatus('pending_debounce');
            break;
          }

          case 'SNAPSHOT_SAVED':
            setSnapshots((prev) => [msg.snapshot, ...prev]);
            setSaveStatus('synced');
            setLastSavedAt(msg.time);
            break;

          case 'ACK_DELTA':
            setSaveStatus('pending_debounce');
            break;
        }
      } catch (err) {
        console.error('Erro no parser do WebSocket:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('[Collab WS] Desconectado. Tentando reconectar...');
    };

    return () => {
      ws.close();
    };
  }, [userId, userName]);

  // Aplica delta localmente e transmite via WebSocket
  const handleApplyLocalDelta = (delta: Omit<DeltaOperation, 'userId' | 'userName' | 'timestamp'>) => {
    setDocumentData((prev) => {
      if (!prev) return prev;
      let content = prev.content;
      const pos = Math.max(0, Math.min(delta.position, content.length));

      if (delta.type === 'insert' && delta.text !== undefined) {
        content = content.slice(0, pos) + delta.text + content.slice(pos);
      } else if (delta.type === 'delete' && delta.length !== undefined) {
        content = content.slice(0, pos) + content.slice(pos + delta.length);
      }

      return {
        ...prev,
        content,
        version: prev.version + 1,
      };
    });

    setAuthorHighlights((prev) => {
      const shifted = adjustHighlightsOnDelta(prev, delta);
      if (delta.type === 'insert' && delta.text) {
        return [
          ...shifted,
          {
            id: Math.random().toString(),
            start: delta.position,
            end: delta.position + delta.text.length,
            authorName: `${userName} (Você)`,
            color: '#38bdf8',
            timestamp: Date.now(),
          },
        ];
      }
      return shifted;
    });

    setSaveStatus('pending_debounce');

    const fullDelta: DeltaOperation = {
      ...delta,
      userId,
      userName,
      timestamp: Date.now(),
    };

    setOperations((prev) => [fullDelta, ...prev.slice(0, 49)]);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'APPLY_DELTA',
          delta,
        })
      );
    }
  };

  const handleCursorMove = (position: number) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'CURSOR_MOVE',
          position,
        })
      );
    }
  };

  // Disparar compilação de PDF no micro-serviço TeX Live
  const handleRecompile = async () => {
    setIsCompiling(true);
    setCompileError(null);
    try {
      const res = await fetch(`${API_BASE}/api/documents/${DOC_ID}/compile`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({ error: 'Erro desconhecido na compilação' }))) as {
          error?: string;
          details?: string;
        };
        setCompileError(errJson.details || errJson.error || 'Falha na compilação do LaTeX');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setLastCompiledAt(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      const e = err as Error;
      setCompileError(e.message || 'Erro de conexão com o compilador');
    } finally {
      setIsCompiling(false);
    }
  };

  // Compilação inicial do artigo ao carregar os dados
  useEffect(() => {
    if (documentData && !pdfBlobUrl && !isCompiling) {
      handleRecompile();
    }
  }, [documentData?.id]);

  // Forçar gravação de snapshot imediatamente via REST
  const handleManualFlush = async () => {
    setIsFlushing(true);
    try {
      const res = await fetch(`${API_BASE}/api/documents/${DOC_ID}/flush`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.snapshot) {
        setSnapshots((prev) => [data.snapshot, ...prev]);
        setSaveStatus('synced');
        setLastSavedAt(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Erro no flush manual:', err);
    } finally {
      setIsFlushing(false);
    }
  };

  if (!documentData) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-default)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <p>Conectando ao documento e carregando deltas...</p>
      </div>
    );
  }

  return (
    <div
      id="ide-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-default)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* 1. Top Navbar no Estilo Autêntico Overleaf */}
      <IdeNavbar
        projectTitle={documentData.title || 'SCI-LaTeX Paper'}
        userName={userName}
        userId={userId}
        collaborators={collaborators}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        layoutMode={layoutMode}
        showHistory={showHistory}
        snapshotsCount={snapshots.length}
        isConnected={isConnected}
        onLayoutChange={setLayoutMode}
        onToggleHistory={() => setShowHistory((prev) => !prev)}
        onUserNameChange={handleNameChange}
        onManualFlush={handleManualFlush}
        onRecompile={handleRecompile}
      />

      {/* 2. Área de Trabalho Principal (Activity Rail + File Tree + Split Panes) */}
      <div
        className="ide-redesign-inner"
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Activity Rail (Barra lateral fininha de 44px com ícones) */}
        <ActivityRail
          activePanel={activeSidebarPanel}
          onSelectPanel={(panel) => {
            setActiveSidebarPanel(panel);
            if (panel === 'history') {
              setShowHistory(true);
            }
          }}
          themeMode={themeMode}
          onToggleTheme={toggleColorMode}
          snapshotsCount={snapshots.length}
        />

        {/* Sidebar Panel: File Tree (Colapsável) */}
        {activeSidebarPanel === 'files' && (
          <FileTreeSidebar
            activeFile={activeFile}
            onSelectFile={setActiveFile}
            onClose={() => setActiveSidebarPanel(null)}
            documentContent={documentData.content}
          />
        )}

        {/* Workspace Central: Code Editor & PDF Viewer */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-default)',
          }}
        >
          {/* Lado Esquerdo: Editor CodeMirror 6 */}
          {(layoutMode === 'split' || layoutMode === 'editor') && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRight:
                  layoutMode === 'split' ? '1px solid var(--border-color)' : 'none',
              }}
            >
              {/* Breadcrumb / Tab bar no topo do editor */}
              <div
                style={{
                  height: '32px',
                  backgroundColor: 'var(--bg-paper)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 0.75rem',
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                  gap: '0.4rem',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {activeFile}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>•</span>
                <span style={{ fontSize: '0.7rem' }}>
                  {saveStatus === 'saving' ? 'Gravando deltas...' : 'Sincronizado em tempo real'}
                </span>
              </div>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                <CodeMirrorEditor
                  content={documentData.content}
                  version={documentData.version}
                  saveStatus={saveStatus}
                  lastSavedAt={lastSavedAt}
                  remoteCursors={Array.from(remoteCursors.values())}
                  authorHighlights={authorHighlights}
                  activeEditor={activeEditor}
                  theme={themeMode}
                  onApplyLocalDelta={handleApplyLocalDelta}
                  onCursorMove={handleCursorMove}
                  onClearHighlights={() => setAuthorHighlights([])}
                />
              </div>
            </div>
          )}

          {/* Lado Direito: Visualizador de PDF com TeX Live Recompile */}
          {(layoutMode === 'split' || layoutMode === 'pdf') && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <PdfPreview
                pdfBlobUrl={pdfBlobUrl}
                isCompiling={isCompiling}
                compileError={compileError}
                lastCompiledAt={lastCompiledAt}
                onRecompile={handleRecompile}
              />
            </div>
          )}

          {/* Sidebar do Histórico de Deltas & Snapshots */}
          {showHistory && (
            <HistorySidebar
              documentId={DOC_ID}
              operations={operations}
              snapshots={snapshots}
              onManualFlush={handleManualFlush}
              isFlushing={isFlushing}
            />
          )}
        </main>
      </div>
    </div>
  );
}
