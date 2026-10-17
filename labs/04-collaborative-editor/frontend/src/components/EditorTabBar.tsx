import {
  FileCode,
  BookMarked,
  FileText,
  X,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

export interface EditorTab {
  id: string;
  name: string;
  type: string;
  isMain?: boolean;
}

export interface EditorTabBarProps {
  openTabs: EditorTab[];
  activeFile: string;
  onSelectTab: (fileName: string) => void;
  onCloseTab: (fileName: string) => void;
  saveStatus: 'synced' | 'saving' | 'offline';
  lastSavedAt?: string | null;
}

export function EditorTabBar({
  openTabs,
  activeFile,
  onSelectTab,
  onCloseTab,
  saveStatus,
  lastSavedAt,
}: EditorTabBarProps) {
  const getTabIcon = (type: string) => {
    switch (type) {
      case 'tex':
        return <FileCode size={14} style={{ color: 'var(--primary-main)' }} />;
      case 'bib':
        return <BookMarked size={14} style={{ color: '#f59e0b' }} />;
      default:
        return <FileText size={14} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  return (
    <Box
      sx={{
        height: 36,
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Abas Abertas (Tabs) */}
      <Stack
        direction="row"
        sx={{
          alignItems: 'flex-end',
          height: '100%',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {openTabs.map((tab) => {
          const isActive = tab.name === activeFile;
          return (
            <Box
              key={tab.id}
              onClick={() => onSelectTab(tab.name)}
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 0.6,
                px: 1.5,
                fontSize: '0.75rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'text.primary' : 'text.secondary',
                backgroundColor: isActive ? 'background.default' : 'transparent',
                borderRight: 1,
                borderColor: 'divider',
                borderTop: 2,
                borderTopColor: isActive ? 'primary.main' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                '&:hover': {
                  backgroundColor: isActive ? 'background.default' : 'action.hover',
                },
              }}
            >
              {getTabIcon(tab.type)}
              <Typography
                component="span"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 'inherit',
                  color: 'inherit',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.name}
              </Typography>

              {tab.isMain && (
                <Box
                  component="span"
                  sx={{
                    fontSize: '9px',
                    px: 0.5,
                    py: 0.1,
                    backgroundColor: 'rgba(9, 136, 66, 0.15)',
                    color: 'primary.main',
                    borderRadius: '3px',
                    fontWeight: 700,
                  }}
                >
                  main
                </Box>
              )}

              {/* Botão Fechar Aba (✕) */}
              {openTabs.length > 1 && !tab.isMain && (
                <Tooltip title="Fechar aba" arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.name);
                    }}
                    sx={{
                      width: 16,
                      height: 16,
                      p: 0,
                      ml: 0.5,
                      color: 'text.secondary',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        color: 'text.primary',
                      },
                    }}
                  >
                    <X size={11} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Stack>

      {/* Indicador de Status de Salvamento */}
      <Stack
        direction="row"
        spacing={0.6}
        sx={{
          alignItems: 'center',
          px: 1.5,
          color: 'text.secondary',
          flexShrink: 0,
        }}
      >
        {saveStatus === 'saving' ? (
          <>
            <Clock size={12} style={{ color: '#f59e0b' }} />
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              Salvando...
            </Typography>
          </>
        ) : (
          <>
            <CheckCircle2 size={12} style={{ color: 'var(--primary-main, #098842)' }} />
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              {lastSavedAt ? `Salvo às ${lastSavedAt}` : 'Sincronizado'}
            </Typography>
          </>
        )}
      </Stack>
    </Box>
  );
}
