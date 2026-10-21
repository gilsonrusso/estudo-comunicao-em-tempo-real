import { useRef, useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ButtonGroup from '@mui/material/ButtonGroup';
import Chip from '@mui/material/Chip';
import { Columns, AlignJustify, RotateCcw, X, GitCompare } from 'lucide-react';
import { MergeView, unifiedMergeView } from '@codemirror/merge';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { StreamLanguage, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { codeMirrorDarkTheme, codeMirrorLightTheme } from '../extensions/theme/editorThemes.js';
import { DocumentSnapshot } from '../types/collab.types.js';

export interface EditorDiffViewerProps {
  open: boolean;
  snapshot: DocumentSnapshot | null;
  currentContent: string;
  themeMode?: 'dark' | 'light';
  onClose: () => void;
  onRestoreVersion?: (snapshot: DocumentSnapshot) => void;
}

export function EditorDiffViewer({
  open,
  snapshot,
  currentContent,
  themeMode = 'dark',
  onClose,
  onRestoreVersion,
}: EditorDiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  useEffect(() => {
    if (!open || !snapshot || !containerRef.current) return;

    containerRef.current.innerHTML = '';
    const isLight = themeMode === 'light';
    const activeTheme = isLight ? codeMirrorLightTheme : codeMirrorDarkTheme;
    const languageExtension = [
      StreamLanguage.define(stex),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    ];

    if (viewMode === 'split') {
      const mergeView = new MergeView({
        a: {
          doc: snapshot.content,
          extensions: [
            lineNumbers(),
            EditorState.readOnly.of(true),
            activeTheme,
            ...languageExtension,
          ],
        },
        b: {
          doc: currentContent,
          extensions: [
            lineNumbers(),
            EditorState.readOnly.of(true),
            activeTheme,
            ...languageExtension,
          ],
        },
        parent: containerRef.current,
        orientation: 'a-b',
        highlightChanges: true,
        gutter: true,
      });

      return () => {
        mergeView.destroy();
      };
    } else {
      const state = EditorState.create({
        doc: currentContent,
        extensions: [
          lineNumbers(),
          EditorState.readOnly.of(true),
          activeTheme,
          ...languageExtension,
          unifiedMergeView({
            original: snapshot.content,
            highlightChanges: true,
            gutter: true,
          }),
        ],
      });

      const view = new EditorView({
        state,
        parent: containerRef.current,
      });

      return () => {
        view.destroy();
      };
    }
  }, [open, snapshot, currentContent, themeMode, viewMode]);

  if (!snapshot) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          height: '88vh',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.paper',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle
        sx={{
          py: 1.5,
          px: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <GitCompare size={20} style={{ color: 'var(--primary-main, #098842)' }} />
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.92rem' }}>
                Comparando Versão {snapshot.version} com a Versão Atual
              </Typography>
              <Chip
                label={snapshot.reason || 'Snapshot'}
                size="small"
                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.73rem' }}>
              Salvo por <strong>{snapshot.savedBy || 'Sistema'}</strong> em{' '}
              {new Date(snapshot.createdAt).toLocaleString()}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {/* Alternador de Modo: Lado a Lado (Split) vs Unificado (Inline) */}
          <ButtonGroup size="small" sx={{ height: 28 }}>
            <Button
              variant={viewMode === 'split' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setViewMode('split')}
              startIcon={<Columns size={13} />}
              sx={{
                fontSize: '0.72rem',
                textTransform: 'none',
                height: 28,
                px: 1,
              }}
            >
              Lado a Lado
            </Button>
            <Button
              variant={viewMode === 'unified' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setViewMode('unified')}
              startIcon={<AlignJustify size={13} />}
              sx={{
                fontSize: '0.72rem',
                textTransform: 'none',
                height: 28,
                px: 1,
              }}
            >
              Inline (Unificado)
            </Button>
          </ButtonGroup>

          <IconButton size="small" onClick={onClose} aria-label="Fechar comparação">
            <X size={18} />
          </IconButton>
        </Stack>
      </DialogTitle>

      {/* Sub-header com legendas das colunas no modo Split */}
      {viewMode === 'split' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'action.hover',
            px: 2,
            py: 0.6,
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>
            📜 Versão {snapshot.version} (Histórico Congelado)
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'primary.main', pl: 1 }}>
            ✏️ Versão Atual de Trabalho
          </Typography>
        </Box>
      )}

      <DialogContent
        sx={{
          p: 0,
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.default',
        }}
      >
        <Box
          ref={containerRef}
          sx={{
            flex: 1,
            height: '100%',
            overflow: 'auto',
            '& .cm-mergeView': {
              height: '100%',
              overflow: 'auto',
            },
            '& .cm-mergeViewEditors': {
              height: '100%',
            },
            '& .cm-editor': {
              height: '100%',
            },
            '& .cm-scroller': {
              overflow: 'auto',
            },
          }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
          Fechar
        </Button>
        {onRestoreVersion && (
          <Button
            variant="contained"
            color="warning"
            startIcon={<RotateCcw size={14} />}
            onClick={() => {
              onRestoreVersion(snapshot);
              onClose();
            }}
            sx={{ textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 }}
          >
            Restaurar para esta Versão
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
