import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import {
  Collaborator,
  DeltaOperation,
  DocumentData,
  DocumentSnapshot,
  RemoteCursor,
  ReviewComment,
  SaveStatus,
} from '../types/collab.types';
import { EditorTab } from '../components/EditorTabBar';
import { ProjectFile } from '../components/FileTreeSidebar';
import { EditorSettings, DEFAULT_SETTINGS } from '../../../types/settings';
import { useCollabWebSocket } from '../hooks/useCollabWebSocket';
import { useLatexCompiler } from '../hooks/useLatexCompiler';
import { useDocumentHistoryQuery } from '../hooks/useDocumentHistoryQuery';
import { useFlushDocumentMutation } from '../hooks/useFlushDocumentMutation';
import { EditorService } from '../services/editor.service';

export interface CollabEditorContextValue {
  documentId: string;
  documentData: DocumentData | null;
  userId: string;
  userName: string;
  setUserName: (name: string) => void;
  collaborators: Collaborator[];
  remoteCursors: Map<string, RemoteCursor>;
  activeFileRemoteCursors: RemoteCursor[];
  activeEditor: { userName: string; color: string; action: string } | null;
  saveStatus: SaveStatus;
  secondarySaveStatus: Record<string, SaveStatus>;
  lastSavedAt: string | null;
  isConnected: boolean;
  isFlushing: boolean;
  snapshots: DocumentSnapshot[];
  operations: DeltaOperation[];
  activeFile: string;
  setActiveFile: (file: string) => void;
  openTabs: EditorTab[];
  fileContents: Record<string, string>;
  settings: EditorSettings;
  updateSettings: (newSettings: Partial<EditorSettings>) => void;
  layoutMode: 'split' | 'editor' | 'pdf';
  setLayoutMode: (mode: 'split' | 'editor' | 'pdf') => void;
  showHistory: boolean;
  setShowHistory: (show: boolean | ((prev: boolean) => boolean)) => void;
  showReview: boolean;
  setShowReview: (show: boolean | ((prev: boolean) => boolean)) => void;
  comments: ReviewComment[];
  activeCommentId: string | null;
  setActiveCommentId: (id: string | null) => void;
  // Compiler
  pdfBlobUrl: string | null;
  isCompiling: boolean;
  compileError: string | null;
  lastCompiledAt: string | null;
  recompile: () => Promise<void>;
  // Handlers
  handleApplyLocalDelta: (delta: Omit<DeltaOperation, 'userId' | 'userName' | 'timestamp'>) => void;
  handleSecondaryDelta: (delta: {
    type: 'insert' | 'delete';
    position: number;
    text?: string;
    length?: number;
  }) => void;
  handleCursorMove: (position: number, selectionStart?: number, selectionEnd?: number) => void;
  handleManualFlush: () => Promise<void>;
  handleOpenFile: (file: ProjectFile) => Promise<void>;
  handleCloseTab: (fileName: string) => void;
  handleInsertSnippet: (snippet: string) => void;
  handleAddComment: (
    content: string,
    explicitSelection?: { from: number; to: number; selectedText: string }
  ) => void;
  handleReplyComment: (commentId: string, content: string) => void;
  handleResolveComment: (commentId: string, status: 'open' | 'resolved') => void;
  handleDeleteComment: (commentId: string) => void;
}

const CollabEditorContext = createContext<CollabEditorContextValue | null>(null);

export function useCollabEditor(): CollabEditorContextValue {
  const context = useContext(CollabEditorContext);
  if (!context) {
    throw new Error('useCollabEditor deve ser utilizado dentro de CollabEditorProvider');
  }
  return context;
}

export interface CollabEditorProviderProps {
  documentId: string;
  children: ReactNode;
}

export function CollabEditorProvider({ documentId, children }: CollabEditorProviderProps) {
  // Identificação do Usuário
  const [userName, setUserNameState] = useState<string>(() => {
    return (
      localStorage.getItem('collab_username') || `Dev-${Math.floor(Math.random() * 900 + 100)}`
    );
  });
  const [userId] = useState<string>(() => {
    let id = localStorage.getItem('collab_userid');
    if (!id) {
      id = Math.random().toString(36).substring(2, 9);
      localStorage.setItem('collab_userid', id);
    }
    return id;
  });

  const setUserName = (newName: string) => {
    setUserNameState(newName);
    localStorage.setItem('collab_username', newName);
  };

  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [operations, setOperations] = useState<DeltaOperation[]>([]);
  const [snapshots, setSnapshots] = useState<DocumentSnapshot[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('synced');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Queries e Mutations do TanStack Query
  const { data: historyData } = useDocumentHistoryQuery(documentId);
  const flushMutation = useFlushDocumentMutation(documentId);
  const isFlushing = flushMutation.isPending;

  // Arquivos e Abas
  const [activeFile, setActiveFile] = useState<string>('main.tex');
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([
    { id: 'main', name: 'main.tex', type: 'tex', isMain: true },
  ]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const fileContentsRef = useRef<Record<string, string>>({});
  const [secondarySaveStatus, setSecondarySaveStatus] = useState<Record<string, SaveStatus>>({});
  const fileSaveDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Layout e Painéis
  const [layoutMode, setLayoutMode] = useState<'split' | 'editor' | 'pdf'>('split');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // Configurações
  const [settings, setSettings] = useState<EditorSettings>(() => {
    try {
      const saved = localStorage.getItem('sci_latex_editor_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Falha ao carregar configurações salvas:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings: Partial<EditorSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('sci_latex_editor_settings', JSON.stringify(updated));
      } catch (e) {
        console.error('Falha ao salvar configurações:', e);
      }
      return updated;
    });
  };

  // Compilador TeX Live
  const { pdfBlobUrl, isCompiling, compileError, lastCompiledAt, recompile } =
    useLatexCompiler(documentId);

  // Sincroniza histórico inicial quando os dados do TanStack Query chegam
  useEffect(() => {
    if (historyData) {
      if (historyData.snapshots) setSnapshots(historyData.snapshots);
      if (historyData.operations) setOperations(historyData.operations.slice(-30).reverse());
    }
  }, [historyData]);

  // Handlers de WebSocket
  const handleRemoteDelta = useCallback(
    (op: DeltaOperation, targetFile: string, _version: number) => {
      if (targetFile === 'main.tex') {
        setDocumentData((prev) => {
          if (!prev) return prev;
          let content = prev.content;
          const pos = Math.max(0, Math.min(op.position, content.length));
          if (op.type === 'insert' && op.text !== undefined) {
            content = content.slice(0, pos) + op.text + content.slice(pos);
          } else if (op.type === 'delete' && op.length !== undefined) {
            content = content.slice(0, pos) + content.slice(pos + op.length);
          }
          return { ...prev, content };
        });
      } else {
        const current = fileContentsRef.current[targetFile] ?? '';
        let updated = current;
        const pos = Math.max(0, Math.min(op.position, current.length));
        if (op.type === 'insert' && op.text !== undefined) {
          updated = current.slice(0, pos) + op.text + current.slice(pos);
        } else if (op.type === 'delete' && op.length !== undefined) {
          updated = current.slice(0, pos) + current.slice(pos + op.length);
        }
        fileContentsRef.current[targetFile] = updated;
        setFileContents((prev) => ({ ...prev, [targetFile]: updated }));
      }

      setOperations((prev) => [op, ...prev.slice(0, 49)]);
      setSaveStatus('pending_debounce');
    },
    []
  );

  const handleSyncInit = useCallback(
    (doc: DocumentData, _collabs: Collaborator[], initialComments?: ReviewComment[]) => {
      setDocumentData(doc);
      if (initialComments) setComments(initialComments);
    },
    []
  );

  const handleSnapshotSaved = useCallback((snapshot: DocumentSnapshot, time: string) => {
    setSnapshots((prev) => [snapshot, ...prev]);
    setSaveStatus('synced');
    setLastSavedAt(time);
    setDocumentData((prev) => (prev ? { ...prev, version: snapshot.version } : prev));
  }, []);

  const handleCommentAdded = useCallback((comment: ReviewComment) => {
    setComments((prev) => [comment, ...prev.filter((c) => c.id !== comment.id)]);
    setShowReview(true);
    setActiveCommentId(comment.id);
  }, []);

  const handleCommentRepliedOrResolved = useCallback((comment: ReviewComment) => {
    setComments((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
  }, []);

  const handleCommentDeleted = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setActiveCommentId((prev) => (prev === commentId ? null : prev));
  }, []);

  const {
    isConnected,
    collaborators,
    remoteCursors,
    activeEditor,
    sendDelta,
    sendCursorMove,
    sendRawMessage,
  } = useCollabWebSocket({
    documentId,
    userId,
    userName,
    activeFile,
    onRemoteDelta: handleRemoteDelta,
    onSyncInit: handleSyncInit,
    onSnapshotSaved: handleSnapshotSaved,
    onCommentAdded: handleCommentAdded,
    onCommentRepliedOrResolved: handleCommentRepliedOrResolved,
    onCommentDeleted: handleCommentDeleted,
  });

  // Notifica colaboradores na mudança de arquivo ativo
  useEffect(() => {
    sendCursorMove(0, activeFile);
  }, [activeFile, sendCursorMove]);

  // Referência para garantir que a compilação inicial ocorra apenas uma vez por documento (evitando loop infinito de erros)
  const initialCompileAttemptedRef = useRef<string | null>(null);

  // Compilação inicial automática do documento ao carregar
  useEffect(() => {
    if (documentData?.id && initialCompileAttemptedRef.current !== documentData.id) {
      initialCompileAttemptedRef.current = documentData.id;
      recompile();
    }
  }, [documentData?.id, recompile]);

  // Delta local no main.tex
  const handleApplyLocalDelta = useCallback(
    (delta: Omit<DeltaOperation, 'userId' | 'userName' | 'timestamp'>) => {
      setDocumentData((prev) => {
        if (!prev) return prev;
        let content = prev.content;
        const pos = Math.max(0, Math.min(delta.position, content.length));
        if (delta.type === 'insert' && delta.text !== undefined) {
          content = content.slice(0, pos) + delta.text + content.slice(pos);
        } else if (delta.type === 'delete' && delta.length !== undefined) {
          content = content.slice(0, pos) + content.slice(pos + delta.length);
        }
        return { ...prev, content };
      });

      setSaveStatus('pending_debounce');

      const fullDelta: DeltaOperation = {
        ...delta,
        userId,
        userName,
        timestamp: Date.now(),
      };
      setOperations((prev) => [fullDelta, ...prev.slice(0, 49)]);

      sendDelta('main.tex', delta);
    },
    [userId, userName, sendDelta]
  );

  // Delta em arquivos secundários
  const handleSecondaryDelta = useCallback(
    (delta: { type: 'insert' | 'delete'; position: number; text?: string; length?: number }) => {
      const current = fileContentsRef.current[activeFile] ?? fileContents[activeFile] ?? '';
      let updated = current;
      const pos = Math.max(0, Math.min(delta.position, current.length));
      if (delta.type === 'insert' && delta.text) {
        updated = current.slice(0, pos) + delta.text + current.slice(pos);
      } else if (delta.type === 'delete' && delta.length) {
        updated = current.slice(0, pos) + current.slice(pos + delta.length);
      }

      fileContentsRef.current[activeFile] = updated;
      setFileContents((prev) => ({ ...prev, [activeFile]: updated }));
      setSecondarySaveStatus((prev) => ({ ...prev, [activeFile]: 'pending_debounce' }));

      sendDelta(activeFile, delta);

      const tab = openTabs.find((t) => t.name === activeFile);
      if (!tab || tab.isMain) return;

      if (fileSaveDebounceRef.current[activeFile]) {
        clearTimeout(fileSaveDebounceRef.current[activeFile]);
      }

      fileSaveDebounceRef.current[activeFile] = setTimeout(async () => {
        setSecondarySaveStatus((prev) => ({ ...prev, [activeFile]: 'saving' }));
        try {
          const finalContent = fileContentsRef.current[activeFile] ?? updated;
          await EditorService.updateFileContent({
            documentId,
            fileId: tab.id,
            content: finalContent,
          });
          setSecondarySaveStatus((prev) => ({ ...prev, [activeFile]: 'synced' }));
        } catch (err) {
          console.error('[Editor] Erro ao salvar arquivo secundário:', err);
          setSecondarySaveStatus((prev) => ({ ...prev, [activeFile]: 'synced' }));
        }
      }, 1000);
    },
    [activeFile, fileContents, openTabs, documentId, sendDelta]
  );

  const handleCursorMove = useCallback(
    (position: number, selectionStart?: number, selectionEnd?: number) => {
      sendCursorMove(position, activeFile, selectionStart, selectionEnd);
    },
    [activeFile, sendCursorMove]
  );

  const handleManualFlush = useCallback(async () => {
    try {
      const snap = await flushMutation.mutateAsync();
      if (snap) {
        setSnapshots((prev) => [snap, ...prev]);
        setSaveStatus('synced');
        setLastSavedAt(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('[Editor] Erro no flush manual:', err);
    }
  }, [flushMutation]);

  const handleOpenFile = useCallback(
    async (file: ProjectFile) => {
      setOpenTabs((prev) => {
        if (prev.some((t) => t.name === file.name)) return prev;
        return [...prev, { id: file.id, name: file.name, type: file.type, isMain: file.isMain }];
      });

      if (!file.isMain && fileContentsRef.current[file.name] === undefined) {
        if (file.content !== undefined && file.content !== null) {
          fileContentsRef.current[file.name] = file.content;
          setFileContents((prev) => ({ ...prev, [file.name]: file.content! }));
        } else {
          try {
            const content = await EditorService.fetchFileContent({
              documentId,
              fileId: file.id,
            });
            fileContentsRef.current[file.name] = content;
            setFileContents((prev) => ({ ...prev, [file.name]: content }));
          } catch (err) {
            console.error('[Editor] Erro ao buscar conteúdo do arquivo:', err);
          }
        }
      }
      setActiveFile(file.name);
    },
    [documentId]
  );

  const handleCloseTab = useCallback(
    (fileName: string) => {
      if (fileName === 'main.tex') return;
      setOpenTabs((prev) => {
        const filtered = prev.filter((t) => t.name !== fileName);
        if (activeFile === fileName) {
          const next = filtered[filtered.length - 1] || { name: 'main.tex' };
          setActiveFile(next.name);
        }
        return filtered;
      });
    },
    [activeFile]
  );

  const handleInsertSnippet = useCallback(
    (snippet: string) => {
      if (documentData) {
        const insertPos = documentData.content.indexOf('\\end{document}');
        const pos = insertPos !== -1 ? insertPos : documentData.content.length;
        const delta = {
          type: 'insert' as const,
          position: pos,
          text: `\n${snippet}\n`,
          userId,
          userName,
          timestamp: Date.now(),
        };
        sendRawMessage({
          type: 'APPLY_DELTA',
          delta,
        });
      }
    },
    [documentData, userId, userName, sendRawMessage]
  );

  const handleAddComment = useCallback(
    (content: string, explicitSelection?: { from: number; to: number; selectedText: string }) => {
      const newComm = {
        documentId,
        file: activeFile,
        from: explicitSelection ? explicitSelection.from : 0,
        to: explicitSelection ? explicitSelection.to : 0,
        selectedText: explicitSelection ? explicitSelection.selectedText : '',
        content,
      };
      sendRawMessage({
        type: 'ADD_COMMENT',
        comment: newComm,
      });
    },
    [documentId, activeFile, sendRawMessage]
  );

  const handleReplyComment = useCallback(
    (commentId: string, content: string) => {
      sendRawMessage({
        type: 'REPLY_COMMENT',
        commentId,
        content,
      });
    },
    [sendRawMessage]
  );

  const handleResolveComment = useCallback(
    (commentId: string, status: 'open' | 'resolved') => {
      sendRawMessage({
        type: 'RESOLVE_COMMENT',
        commentId,
        status,
      });
    },
    [sendRawMessage]
  );

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      sendRawMessage({
        type: 'DELETE_COMMENT',
        commentId,
      });
    },
    [sendRawMessage]
  );

  const activeFileRemoteCursors = useMemo(() => {
    return Array.from(remoteCursors.values()).filter((c) => (c.file || 'main.tex') === activeFile);
  }, [remoteCursors, activeFile]);

  const value: CollabEditorContextValue = {
    documentId,
    documentData,
    userId,
    userName,
    setUserName,
    collaborators,
    remoteCursors,
    activeFileRemoteCursors,
    activeEditor,
    saveStatus,
    secondarySaveStatus,
    lastSavedAt,
    isConnected,
    isFlushing,
    snapshots,
    operations,
    activeFile,
    setActiveFile,
    openTabs,
    fileContents,
    settings,
    updateSettings,
    layoutMode,
    setLayoutMode,
    showHistory,
    setShowHistory,
    showReview,
    setShowReview,
    comments,
    activeCommentId,
    setActiveCommentId,
    pdfBlobUrl,
    isCompiling,
    compileError,
    lastCompiledAt,
    recompile,
    handleApplyLocalDelta,
    handleSecondaryDelta,
    handleCursorMove,
    handleManualFlush,
    handleOpenFile,
    handleCloseTab,
    handleInsertSnippet,
    handleAddComment,
    handleReplyComment,
    handleResolveComment,
    handleDeleteComment,
  };

  return <CollabEditorContext.Provider value={value}>{children}</CollabEditorContext.Provider>;
}
