import {
  Search,
  History,
  Settings,
  Sun,
  Moon,
  FolderTree,
} from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

export type ActiveSidebarPanel = 'files' | 'search' | 'history' | null;

export interface ActivityRailProps {
  activePanel: ActiveSidebarPanel;
  onSelectPanel: (panel: ActiveSidebarPanel) => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  snapshotsCount?: number;
}

export function ActivityRail({
  activePanel,
  onSelectPanel,
  themeMode,
  onToggleTheme,
  snapshotsCount = 0,
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
      badge: null,
    },
    {
      id: 'search' as const,
      label: 'Buscar no Projeto',
      icon: Search,
      badge: null,
    },
    {
      id: 'history' as const,
      label: 'Histórico & Snapshots',
      icon: History,
      badge: snapshotsCount > 0 ? snapshotsCount : null,
    },
  ];

  return (
    <nav
      className="ide-rail"
      aria-label="Activity Rail"
      style={{
        width: '44px',
        minWidth: '44px',
        height: '100%',
        backgroundColor: 'var(--bg-paper)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 0',
        zIndex: 20,
        userSelect: 'none',
      }}
    >
      {/* Top Group: Ferramentas do IDE */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.35rem',
          width: '100%',
        }}
      >
        {topItems.map((item) => {
          const isActive = activePanel === item.id;
          const Icon = item.icon;

          return (
            <Tooltip key={item.id} title={item.label} placement="right" arrow>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '15%',
                      bottom: '15%',
                      width: '3px',
                      backgroundColor: 'var(--primary-main)',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                <IconButton
                  size="small"
                  onClick={() => handlePanelClick(item.id)}
                  aria-label={item.label}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '6px',
                    color: isActive
                      ? 'var(--primary-main)'
                      : 'var(--text-secondary)',
                    backgroundColor: isActive
                      ? 'rgba(9, 136, 66, 0.12)'
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(128, 128, 128, 0.1)',
                      color: 'var(--text-primary)',
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                </IconButton>

                {item.badge !== null && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '4px',
                      backgroundColor: 'var(--primary-main)',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      padding: '0 4px',
                      height: '14px',
                      lineHeight: '14px',
                      pointerEvents: 'none',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Bottom Group: Tema & Configurações */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.35rem',
          width: '100%',
        }}
      >
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
              borderRadius: '6px',
              color:
                themeMode === 'dark'
                  ? 'var(--yellow-40, #f59e0b)'
                  : 'var(--blue-50, #3b82f6)',
              '&:hover': {
                backgroundColor: 'rgba(128, 128, 128, 0.1)',
              },
            }}
          >
            {themeMode === 'dark' ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Configurações LaTeX" placement="right" arrow>
          <IconButton
            size="small"
            aria-label="Configurações"
            sx={{
              width: 34,
              height: 34,
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              '&:hover': {
                backgroundColor: 'rgba(128, 128, 128, 0.1)',
                color: 'var(--text-primary)',
              },
            }}
          >
            <Settings size={18} />
          </IconButton>
        </Tooltip>
      </div>
    </nav>
  );
}
