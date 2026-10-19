import { useParams } from 'react-router';
import Box from '@mui/material/Box';
import { CollabEditorProvider } from '../context/CollabEditorContext';
import { EditorHeader } from '../components/EditorHeader';
import { EditorWorkspace } from '../components/EditorWorkspace';

export function EditorPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const activeDocumentId = documentId || 'doc-1';

  return (
    <CollabEditorProvider documentId={activeDocumentId}>
      <Box
        id="ide-root"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: 'background.default',
          color: 'text.primary',
        }}
      >
        <EditorHeader />
        <EditorWorkspace />
      </Box>
    </CollabEditorProvider>
  );
}
