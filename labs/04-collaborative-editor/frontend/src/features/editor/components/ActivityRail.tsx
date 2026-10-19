import { Search, History, Settings, Sun, Moon, FolderTree, MessageSquare } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';

export type ActiveSidebarPanel = 'files' | 'search' | 'history' | 'review' | null;

export interface ActivityRailProps {
  activePanel: ActiveSidebarPanel;
  onSelectPanel: (panel: ActiveSidebarPanel) => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings?: () => void;
  snapshotsCount?: number;
  commentsCount?: number;
}

export function ActivityRail({
  activePanel,
  onSelectPanel,
  themeMode,
  onToggleTheme,
  onOpenSettings,
  snapshotsCount = 0,
  commentsCount = 0,
}: ActivityRailProps) {
  const handlePanelClick = (panel: ActiveSidebarPanel) => {
    if (activePanel === panel) {
      onSelectPanel(null); // Fecha se já estiver aberto
    } else {
      onSelectPanel(panel);
    }
  };

  const topItems = [
    {
      id: 'files' as const,
      label: 'Arquivos do Projeto',
      icon: FolderTree,
      badge: 0,
    },
    {
      id: 'review' as const,
      label: 'Review & Comentários',
      icon: MessageSquare,
      badge: commentsCount > 0 ? commentsCount : 0,
    },
    {
      id: 'search' as const,
      label: 'Buscar no Projeto',
      icon: Search,
      badge: 0,
    },
    {
      id: 'history' as const,
      label: 'Histórico & Snapshots',
      icon: History,
      badge: snapshotsCount > 0 ? snapshotsCount : 0,
    },
  ];

  return (
    <Box
      component="nav"
      aria-label="Activity Rail"
      sx={{
        width: 44,
        minWidth: 44,
        height: '100%',
        backgroundColor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 1,
        zIndex: 20,
        userSelect: 'none',
      }}
    >
      {/* Top Group: Ferramentas do IDE */}
      <Stack spacing={0.5} sx={{ alignItems: 'center', width: '100%' }}>
        {topItems.map((item) => {
          const isActive = activePanel === item.id;
          const Icon = item.icon;

          return (
            <Tooltip key={item.id} title={item.label} placement="right" arrow>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {isActive && (
                  <Box
                    component="span"
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: '15%',
                      bottom: '15%',
                      width: 3,
                      backgroundColor: 'primary.main',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                <Badge
                  badgeContent={item.badge}
                  color="primary"
                  invisible={item.badge === 0}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '9px',
                      height: 14,
                      minWidth: 14,
                      padding: '0 3px',
                      right: 4,
                      top: 4,
                    },
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => handlePanelClick(item.id)}
                    aria-label={item.label}
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 1,
                      color: isActive ? 'primary.main' : 'text.secondary',
                      backgroundColor: isActive ? 'rgba(9, 136, 66, 0.12)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        color: 'text.primary',
                      },
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  </IconButton>
                </Badge>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>

      {/* Bottom Group: Tema & Configurações */}
      <Stack spacing={0.5} sx={{ alignItems: 'center', width: '100%' }}>
        <Tooltip
          title={themeMode === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          placement="right"
          arrow
        >
          <IconButton
            size="small"
            onClick={onToggleTheme}
            aria-label="Alternar Tema"
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1,
              color: themeMode === 'dark' ? '#f59e0b' : '#3b82f6',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            {themeMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Configurações LaTeX" placement="right" arrow>
          <IconButton
            size="small"
            onClick={onOpenSettings}
            aria-label="Configurações"
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1,
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            <Settings size={18} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
