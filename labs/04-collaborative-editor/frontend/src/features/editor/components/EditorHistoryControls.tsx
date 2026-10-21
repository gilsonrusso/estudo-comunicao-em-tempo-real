import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { Undo2, Redo2 } from 'lucide-react';

export interface EditorHistoryControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  undoCount?: number;
  redoCount?: number;
  onUndo: () => void;
  onRedo: () => void;
  disabled?: boolean;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const undoShortcut = isMac ? '⌘Z' : 'Ctrl+Z';
const redoShortcut = isMac ? '⌘⇧Z' : 'Ctrl+Y';

export function EditorHistoryControls({
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
  disabled = false,
}: Readonly<EditorHistoryControlsProps>) {
  const isUndoDisabled = disabled || !canUndo;
  const isRedoDisabled = disabled || !canRedo;

  const undoTitle = isUndoDisabled
    ? `Desfazer (${undoShortcut})`
    : undoCount !== undefined
      ? `Desfazer (${undoShortcut}) • ${undoCount} na pilha`
      : `Desfazer (${undoShortcut})`;

  const redoTitle = isRedoDisabled
    ? `Refazer (${redoShortcut})`
    : redoCount !== undefined
      ? `Refazer (${redoShortcut}) • ${redoCount} na pilha`
      : `Refazer (${redoShortcut})`;

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Tooltip title={undoTitle} arrow placement="bottom">
        <span>
          <IconButton
            size="small"
            disabled={isUndoDisabled}
            onClick={onUndo}
            aria-label="Desfazer"
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              color: isUndoDisabled ? 'text.disabled' : 'text.primary',
              '&:hover:not(:disabled)': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <Undo2 size={15} />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={redoTitle} arrow placement="bottom">
        <span>
          <IconButton
            size="small"
            disabled={isRedoDisabled}
            onClick={onRedo}
            aria-label="Refazer"
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              color: isRedoDisabled ? 'text.disabled' : 'text.primary',
              '&:hover:not(:disabled)': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <Redo2 size={15} />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
