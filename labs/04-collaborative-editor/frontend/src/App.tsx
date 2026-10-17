import React, { useState, useEffect, useRef } from 'react';
import { CollaboratorsBar } from './components/CollaboratorsBar.js';
import { CodeMirrorEditor } from './components/CodeMirrorEditor.js';
import { PdfPreview } from './components/PdfPreview.js';
import { HistorySidebar } from './components/HistorySidebar.js';
import {
  AuthorHighlight,
  Collaborator,
  DeltaOperation,
  DocumentData,
  DocumentSnapshot,
  RemoteCursor,
  SaveStatus,
} from './types/collab.js';
import { FileText, Wifi, WifiOff, Columns, Code, FileOutput, History, Sun, Moon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3333';
const DOC_ID = 'doc-1';

// Ajusta as posições de início e fim dos realces de autoria conforme deltas são aplicados
const adjustHighlightsOnDelta = (
  highlights: AuthorHighlight[],
  op: { type: 'insert' | 'delete'; position: number; text?: string; length?: number }
): AuthorHighlight[] => {
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
};

export const App: React.FC = () => {
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

  // Estados da compilação de PDF e Layout Split Screen
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [lastCompiledAt, setLastCompiledAt] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'split' | 'editor' | 'pdf'>('split');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('collab_theme') as 'dark' | 'light') || 'dark';
  });

  // Aplica tema no elemento raiz do documento
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('collab_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const socketRef = useRef<WebSocket | null>(null);

  // Salva apelido
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserName(val);
    localStorage.setItem('collab_username', val);
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
    // 1. Atualização Otimista local do estado do documento
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

    // Registra highlight visual de autoria para a edição local com ajuste dinâmico
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

    // Adiciona na visualização local de operações
    setOperations((prev) => [fullDelta, ...prev.slice(0, 49)]);

    // 2. Envia apenas a operação atômica via WebSocket
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
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Conectando ao documento e carregando deltas...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header Principal Oficial Overleaf */}
      <header
        style={{
          height: '48px',
          padding: '0 1rem',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
          <FileText size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
              }}
            >
              {documentData.title}
            </h1>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                marginTop: '1px',
              }}
            >
              <span style={{ fontWeight: 500 }}>Overleaf TeX Live</span>
              <span>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                {isConnected ? (
                  <>
                    <Wifi size={10} style={{ color: 'var(--green-50)' }} />
                    <span style={{ color: 'var(--green-50)', fontWeight: 500 }}>Conectado</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={10} style={{ color: 'var(--red-50)' }} />
                    <span style={{ color: 'var(--red-50)', fontWeight: 500 }}>Desconectado</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controles Centrais: Alternar Split Screen / Editor / PDF */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-card)',
              padding: '2px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              onClick={() => setLayoutMode('split')}
              title="Tela Dividida (Código + PDF)"
              className={`btn-overleaf btn-overleaf-ghost ${layoutMode === 'split' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
            >
              <Columns size={13} />
              <span>Split</span>
            </button>

            <button
              onClick={() => setLayoutMode('editor')}
              title="Apenas Editor de Código"
              className={`btn-overleaf btn-overleaf-ghost ${layoutMode === 'editor' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
            >
              <Code size={13} />
              <span>Código</span>
            </button>

            <button
              onClick={() => setLayoutMode('pdf')}
              title="Apenas Visualizador de PDF"
              className={`btn-overleaf btn-overleaf-ghost ${layoutMode === 'pdf' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
            >
              <FileOutput size={13} />
              <span>PDF</span>
            </button>
          </div>

          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className={`btn-overleaf ${showHistory ? 'btn-overleaf-secondary' : 'btn-overleaf-ghost'}`}
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
            title="Exibir histórico de deltas e snapshots"
          >
            <History size={13} />
            <span>Histórico ({snapshots.length})</span>
          </button>
        </div>

        {/* Lado Direito: Alternador de Tema, Apelido e Colaboradores */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            className="btn-overleaf btn-overleaf-ghost"
            style={{ padding: '0.3rem', width: '30px', height: '30px', justifyContent: 'center' }}
          >
            {theme === 'dark' ? (
              <Sun size={15} style={{ color: 'var(--yellow-40)' }} />
            ) : (
              <Moon size={15} style={{ color: 'var(--blue-50)' }} />
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Você:</span>
            <input
              type="text"
              value={userName}
              onChange={handleNameChange}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-main)',
                padding: '0.2rem 0.45rem',
                borderRadius: 'var(--radius-base)',
                fontSize: '0.75rem',
                width: '100px',
                outline: 'none',
              }}
            />
          </div>

          <CollaboratorsBar collaborators={collaborators} currentUserId={userId} />
        </div>
      </header>

      {/* Corpo: CodeMirror 6 + PDF Preview + History Sidebar */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {(layoutMode === 'split' || layoutMode === 'editor') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <CodeMirrorEditor
              content={documentData.content}
              version={documentData.version}
              saveStatus={saveStatus}
              lastSavedAt={lastSavedAt}
              remoteCursors={Array.from(remoteCursors.values())}
              authorHighlights={authorHighlights}
              activeEditor={activeEditor}
              theme={theme}
              onApplyLocalDelta={handleApplyLocalDelta}
              onCursorMove={handleCursorMove}
              onClearHighlights={() => setAuthorHighlights([])}
            />
          </div>
        )}

        {(layoutMode === 'split' || layoutMode === 'pdf') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <PdfPreview
              pdfBlobUrl={pdfBlobUrl}
              isCompiling={isCompiling}
              compileError={compileError}
              lastCompiledAt={lastCompiledAt}
              onRecompile={handleRecompile}
            />
          </div>
        )}

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
  );
};
