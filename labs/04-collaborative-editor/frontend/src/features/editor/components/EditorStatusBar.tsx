import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CheckCircle2, Clock, CloudUpload, UserCheck, Code2 } from 'lucide-react';
import { SaveStatus } from '../types/collab.types.js';

export interface EditorStatusBarProps {
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  activeEditor: { userName: string; color: string; action: string } | null;
}

export function EditorStatusBar({
  saveStatus,
  lastSavedAt,
  activeEditor,
}: EditorStatusBarProps) {
  return (
    <Box
      sx={{
        height: 36,
        px: 1.5,
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.8rem',
      }}
    >
      <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            alignItems: 'center',
            color: 'text.primary',
            fontWeight: 600,
            fontSize: '0.78rem',
          }}
        >
          <Code2 size={15} style={{ color: 'var(--primary-main, #098842)' }} />
          <Typography component="span" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
            LaTeX (sTeX)
          </Typography>
        </Stack>

        <Typography component="span" sx={{ color: 'divider' }}>
          •
        </Typography>

        {saveStatus === 'synced' && (
          <Stack
            direction="row"
            spacing={0.4}
            sx={{ alignItems: 'center', color: '#10b981', fontSize: '0.75rem', fontWeight: 500 }}
          >
            <CheckCircle2 size={13} />
            <Typography component="span" sx={{ fontSize: '0.75rem' }}>
              Sincronizado
            </Typography>
          </Stack>
        )}

        {saveStatus === 'pending_debounce' && (
          <Stack
            direction="row"
            spacing={0.4}
            sx={{ alignItems: 'center', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 500 }}
          >
            <Clock size={13} />
            <Typography component="span" sx={{ fontSize: '0.75rem' }}>
              Buffer Redis (3s)
            </Typography>
          </Stack>
        )}

        {saveStatus === 'saving' && (
          <Stack
            direction="row"
            spacing={0.4}
            sx={{ alignItems: 'center', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 500 }}
          >
            <CloudUpload size={13} />
            <Typography component="span" sx={{ fontSize: '0.75rem' }}>
              Gravando snapshot...
            </Typography>
          </Stack>
        )}

        <Typography sx={{ color: 'text.secondary', fontSize: '0.73rem' }}>
          {lastSavedAt ? `Salvo às ${lastSavedAt}` : 'Sincronizado'}
        </Typography>

        {activeEditor && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              backgroundColor: 'background.paper',
              border: 1,
              borderColor: activeEditor.color,
              px: 0.8,
              py: 0.2,
              borderRadius: 2,
              color: activeEditor.color,
              fontSize: '0.72rem',
              fontWeight: 600,
            }}
          >
            <UserCheck size={12} />
            <Typography
              component="span"
              sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'inherit' }}
            >
              {activeEditor.userName} {activeEditor.action}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
