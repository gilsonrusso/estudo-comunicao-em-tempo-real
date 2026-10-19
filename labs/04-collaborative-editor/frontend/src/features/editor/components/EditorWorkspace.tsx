import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useColorMode } from '../../../theme';
import { useCollabEditor } from '../context/CollabEditorContext';
import { DeltaOperation } from '../types/collab.types';
import { ActivityRail, ActiveSidebarPanel } from './ActivityRail';
import { FileTreeSidebar } from './FileTreeSidebar';
import { EditorTabBar } from './EditorTabBar';
import { CodeMirrorEditor, EditorLineLayoutInfo } from './CodeMirrorEditor';
import { PdfPreview } from './PdfPreview';
import { HistorySidebar } from './HistorySidebar';
import { ReviewSidebar } from './ReviewSidebar';
import { SettingsModal } from './SettingsModal';
import { ResizableSplitLayout } from '../../../components/common/ResizableSplitLayout';
import { API_BASE } from '../../../constants/api.constants';

export function EditorWorkspace() {
  const { mode: themeMode, toggleColorMode } = useColorMode();
  const {
    documentId,
    documentData,
    userId,
    userName,
    collaborators,
    activeFileRemoteCursors,
    activeEditor,
    saveStatus,
    lastSavedAt,
    isConnected,
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
    handleOpenFile,
    handleCloseTab,
    handleInsertSnippet,
    handleAddComment,
    handleReplyComment,
    handleResolveComment,
    handleDeleteComment,
    handleManualFlush,
    isFlushing,
  } = useCollabEditor();

  const [activeSidebarPanel, setActiveSidebarPanel] = useState<ActiveSidebarPanel>('files');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [lineLayoutInfo, setLineLayoutInfo] = useState<EditorLineLayoutInfo | null>(null);
  const [pendingCommentSelection, setPendingCommentSelection] = useState<{
    from: number;
    to: number;
    selectedText: string;
  } | null>(null);

  if (!documentData) {
    return (
      <Box
        sx={{
          display: 'flex',
          height: 'calc(100vh - 56px)',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'background.default',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">Conectando ao documento e carregando deltas...</Typography>
      </Box>
    );
  }

  const isMainFile = activeFile === 'main.tex';
  const currentEditorContent = isMainFile ? documentData.content : (fileContents[activeFile] ?? '');
  const currentUserColor = collaborators.find((c) => c.userId === userId)?.color;
  const currentSaveStatus: 'synced' | 'saving' | 'offline' = !isConnected
    ? 'offline'
    : isMainFile
      ? saveStatus === 'synced'
        ? 'synced'
        : 'saving'
      : 'synced';

  const handleCommentSelectionRequest = (
    from: number,
    to: number,
    selectedText: string,
    content?: string
  ) => {
    if (content && content.trim()) {
      handleAddComment(content.trim(), { from, to, selectedText });
      setShowReview(true);
    } else {
      setPendingCommentSelection({ from, to, selectedText });
      setShowReview(true);
    }
  };

  return (
    <Box
      className="ide-redesign-inner"
      sx={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'background.default',
      }}
    >
      {/* Activity Rail lateral */}
      <ActivityRail
        activePanel={activeSidebarPanel}
        onSelectPanel={(panel: ActiveSidebarPanel) => {
          setActiveSidebarPanel(panel);
          if (panel === 'history') setShowHistory(true);
          if (panel === 'review') setShowReview((prev) => !prev);
        }}
        themeMode={themeMode}
        onToggleTheme={toggleColorMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        snapshotsCount={snapshots.length}
        commentsCount={comments.filter((c) => c.status === 'open').length}
      />

      {/* Sidebar: Árvore de Arquivos (com .cls, .bib, imagens do MinIO) */}
      {activeSidebarPanel === 'files' && (
        <FileTreeSidebar
          documentId={documentId}
          apiBase={API_BASE}
          activeFile={activeFile}
          onSelectFile={setActiveFile}
          onOpenFile={handleOpenFile}
          onClose={() => setActiveSidebarPanel(null)}
          documentContent={documentData.content}
          onInsertSnippet={handleInsertSnippet}
        />
      )}

      {/* Área Central: Code Editor e/ou PDF Viewer com redimensionamento contínuo estilo Overleaf */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          backgroundColor: 'background.default',
        }}
      >
        <ResizableSplitLayout
          mode={layoutMode === 'split' ? 'split' : layoutMode === 'editor' ? 'primary' : 'secondary'}
          storageKey="overleaf-editor-pdf-split-ratio"
          defaultRatio={50}
          minPrimaryRatio={20}
          minSecondaryRatio={20}
          toggleTooltip={layoutMode === 'split' ? 'Ocultar visualizador PDF' : 'Expandir para tela cheia'}
          onToggleSecondary={() => {
            if (layoutMode === 'split') {
              setLayoutMode('editor');
            } else {
              setLayoutMode('split');
            }
          }}
          primary={
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                width: '100%',
                height: '100%',
              }}
            >
              <EditorTabBar
                openTabs={openTabs}
                activeFile={activeFile}
                onSelectTab={setActiveFile}
                onCloseTab={handleCloseTab}
                saveStatus={currentSaveStatus}
                lastSavedAt={lastSavedAt}
              />

              <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {showReview && (
                  <ReviewSidebar
                    comments={comments}
                    activeCommentId={activeCommentId}
                    currentFile={activeFile}
                    currentUserId={userId}
                    currentUserName={userName}
                    currentUserColor={currentUserColor || '#059669'}
                    selectedText={pendingCommentSelection?.selectedText}
                    lineLayoutInfo={lineLayoutInfo}
                    onSelectComment={setActiveCommentId}
                    onAddComment={handleAddComment}
                    onReplyComment={handleReplyComment}
                    onResolveComment={handleResolveComment}
                    onDeleteComment={handleDeleteComment}
                    onClose={() => setShowReview(false)}
                  />
                )}

                <Box sx={{ flex: 1, overflow: 'hidden', height: '100%' }}>
                  <CodeMirrorEditor
                    key={activeFile}
                    content={currentEditorContent}
                    version={documentData.version}
                    saveStatus={isMainFile ? saveStatus : 'synced'}
                    lastSavedAt={lastSavedAt}
                    remoteCursors={activeFileRemoteCursors}
                    activeEditor={activeEditor}
                    currentUserColor={currentUserColor}
                    currentUserName={userName}
                    theme={themeMode}
                    settings={settings}
                    comments={comments}
                    activeCommentId={activeCommentId}
                    onSelectComment={setActiveCommentId}
                    onRequestAddComment={handleCommentSelectionRequest}
                    onLinePositionsChange={setLineLayoutInfo}
                    onCursorMove={handleCursorMove}
                    onApplyLocalDelta={(
                      delta: Omit<DeltaOperation, 'userId' | 'userName' | 'timestamp'>
                    ) => {
                      if (isMainFile) {
                        handleApplyLocalDelta(delta);
                      } else {
                        handleSecondaryDelta(delta);
                      }
                    }}
                  />
                </Box>
              </Box>
            </Box>
          }
          secondary={
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                width: '100%',
                height: '100%',
                backgroundColor: 'background.paper',
              }}
            >
              <PdfPreview
                pdfBlobUrl={pdfBlobUrl}
                isCompiling={isCompiling}
                compileError={compileError}
                lastCompiledAt={lastCompiledAt}
                onRecompile={recompile}
              />
            </Box>
          }
        />
      </Box>

      {/* Sidebar do Histórico de Snapshots */}
      {showHistory && (
        <HistorySidebar
          documentId={documentId}
          snapshots={snapshots}
          operations={operations}
          onManualFlush={handleManualFlush}
          isFlushing={isFlushing}
        />
      )}

      {/* Modal de Configurações */}
      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />
    </Box>
  );
}
