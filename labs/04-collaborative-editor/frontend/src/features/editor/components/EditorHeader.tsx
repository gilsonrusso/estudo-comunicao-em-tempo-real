import { useNavigate } from 'react-router';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCollabEditor } from '../context/CollabEditorContext';
import { IdeNavbar } from './IdeNavbar';

export function EditorHeader() {
  const navigate = useNavigate();
  const {
    documentData,
    userName,
    userId,
    collaborators,
    remoteCursors,
    activeFile,
    saveStatus,
    lastSavedAt,
    layoutMode,
    showHistory,
    snapshots,
    showReview,
    comments,
    isConnected,
    setLayoutMode,
    setShowHistory,
    setShowReview,
    setUserName,
    handleManualFlush,
    recompile,
    historyStatus,
    handleUndo,
    handleRedo,
  } = useCollabEditor();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Tooltip title="Voltar ao Painel de Artigos">
        <IconButton
          onClick={() => navigate('/')}
          size="small"
          sx={{
            ml: 1,
            mr: 0.5,
            color: 'inherit',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1.5,
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <IdeNavbar
          projectTitle={documentData?.title || 'Artigo Científico LaTeX'}
          userName={userName}
          userId={userId}
          collaborators={collaborators}
          remoteCursors={remoteCursors}
          activeFile={activeFile}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          layoutMode={layoutMode}
          showHistory={showHistory}
          snapshotsCount={snapshots.length}
          showReview={showReview}
          onToggleReview={() => setShowReview((prev) => !prev)}
          commentsCount={comments.filter((c) => c.status === 'open').length}
          isConnected={isConnected}
          onLayoutChange={setLayoutMode}
          onToggleHistory={() => setShowHistory((prev) => !prev)}
          onUserNameChange={setUserName}
          onManualFlush={handleManualFlush}
          onRecompile={recompile}
          canUndo={historyStatus.canUndo}
          canRedo={historyStatus.canRedo}
          undoCount={historyStatus.undoDepth}
          redoCount={historyStatus.redoDepth}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      </Box>
    </Box>
  );
}
