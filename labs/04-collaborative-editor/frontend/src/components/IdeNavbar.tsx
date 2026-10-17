import { useState, type MouseEvent, type ChangeEvent } from 'react';
import {
  History,
  Columns,
  Code,
  FileOutput,
  ChevronDown,
  UserPlus,
  Check,
  Clock,
} from 'lucide-react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import { CollaboratorsBar } from './CollaboratorsBar';
import { Collaborator, SaveStatus } from '../types/collab';

export interface IdeNavbarProps {
  projectTitle: string;
  userName: string;
  userId: string;
  collaborators: Collaborator[];
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  layoutMode: 'split' | 'editor' | 'pdf';
  showHistory: boolean;
  snapshotsCount: number;
  isConnected?: boolean;
  onLayoutChange: (mode: 'split' | 'editor' | 'pdf') => void;
  onToggleHistory: () => void;
  onUserNameChange: (name: string) => void;
  onManualFlush: () => void;
  onRecompile?: () => void;
}

export function IdeNavbar({
  projectTitle,
  userName,
  userId,
  collaborators,
  saveStatus,
  lastSavedAt,
  layoutMode,
  showHistory,
  snapshotsCount,
  isConnected = true,
  onLayoutChange,
  onToggleHistory,
  onUserNameChange,
  onManualFlush,
  onRecompile,
}: IdeNavbarProps) {
  // Estados dos menus dropdown
  const [fileMenuAnchor, setFileMenuAnchor] = useState<null | HTMLElement>(null);
  const [editMenuAnchor, setEditMenuAnchor] = useState<null | HTMLElement>(null);
  const [viewMenuAnchor, setViewMenuAnchor] = useState<null | HTMLElement>(null);
  const [projectMenuAnchor, setProjectMenuAnchor] = useState<null | HTMLElement>(null);

  const handleOpenMenu = (
    setter: (el: HTMLElement | null) => void,
    event: MouseEvent<HTMLElement>
  ) => {
    setter(event.currentTarget);
  };

  const handleCloseMenu = (setter: (el: null) => void) => {
    setter(null);
  };

  return (
    <nav
      className="ide-redesign-toolbar"
      style={{
        height: '40px',
        minHeight: '40px',
        backgroundColor: 'var(--bg-paper)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 0.85rem',
        userSelect: 'none',
        zIndex: 30,
      }}
    >
      {/* Lado Esquerdo: Logo Overleaf + Menubar (File, Edit, View) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {/* Overleaf Leaf Brand Logo */}
        <div
          title={isConnected ? "SCI-LaTeX Studio • Conectado via WebSocket" : "SCI-LaTeX Studio • Desconectado"}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            paddingRight: '0.4rem',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 50C10 27.9086 27.9086 10 50 10C72.0914 10 90 27.9086 90 50C90 72.0914 72.0914 90 50 90C27.9086 90 10 72.0914 10 50Z"
              fill="var(--primary-main)"
            />
            <path
              d="M32 68C32 68 44 65 52 53C60 41 68 28 68 28C68 28 54 36 44 46C34 56 32 68 32 68Z"
              fill="#ffffff"
            />
          </svg>
          <span
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '3px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#ef4444',
              border: '1.5px solid var(--bg-paper)',
            }}
          />
        </div>

        {/* Desktop Menubar */}
        <div
          role="menubar"
          style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}
        >
          <button
            onClick={(e) => handleOpenMenu(setFileMenuAnchor, e)}
            className="btn-overleaf btn-overleaf-ghost"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', height: '26px' }}
          >
            File
          </button>
          <Menu
            anchorEl={fileMenuAnchor}
            open={Boolean(fileMenuAnchor)}
            onClose={() => handleCloseMenu(setFileMenuAnchor)}
            sx={{ '& .MuiPaper-root': { fontSize: '0.8rem', minWidth: '180px' } }}
          >
            <MenuItem
              onClick={() => {
                onManualFlush();
                handleCloseMenu(setFileMenuAnchor);
              }}
            >
              Salvar Snapshot (Flush)
            </MenuItem>
            {onRecompile && (
              <MenuItem
                onClick={() => {
                  onRecompile();
                  handleCloseMenu(setFileMenuAnchor);
                }}
              >
                Recompilar PDF (Ctrl+Enter)
              </MenuItem>
            )}
            <Divider />
            <MenuItem onClick={() => handleCloseMenu(setFileMenuAnchor)}>
              Download PDF
            </MenuItem>
            <MenuItem onClick={() => handleCloseMenu(setFileMenuAnchor)}>
              Exportar Source (.zip)
            </MenuItem>
          </Menu>

          <button
            onClick={(e) => handleOpenMenu(setEditMenuAnchor, e)}
            className="btn-overleaf btn-overleaf-ghost"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', height: '26px' }}
          >
            Edit
          </button>
          <Menu
            anchorEl={editMenuAnchor}
            open={Boolean(editMenuAnchor)}
            onClose={() => handleCloseMenu(setEditMenuAnchor)}
            sx={{ '& .MuiPaper-root': { fontSize: '0.8rem', minWidth: '160px' } }}
          >
            <MenuItem onClick={() => handleCloseMenu(setEditMenuAnchor)}>Desfazer (Ctrl+Z)</MenuItem>
            <MenuItem onClick={() => handleCloseMenu(setEditMenuAnchor)}>Refazer (Ctrl+Y)</MenuItem>
            <Divider />
            <MenuItem onClick={() => handleCloseMenu(setEditMenuAnchor)}>Localizar (Ctrl+F)</MenuItem>
          </Menu>

          <button
            onClick={(e) => handleOpenMenu(setViewMenuAnchor, e)}
            className="btn-overleaf btn-overleaf-ghost"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', height: '26px' }}
          >
            View
          </button>
          <Menu
            anchorEl={viewMenuAnchor}
            open={Boolean(viewMenuAnchor)}
            onClose={() => handleCloseMenu(setViewMenuAnchor)}
            sx={{ '& .MuiPaper-root': { fontSize: '0.8rem', minWidth: '160px' } }}
          >
            <MenuItem
              onClick={() => {
                onLayoutChange('split');
                handleCloseMenu(setViewMenuAnchor);
              }}
            >
              Split Screen (Editor + PDF)
            </MenuItem>
            <MenuItem
              onClick={() => {
                onLayoutChange('editor');
                handleCloseMenu(setViewMenuAnchor);
              }}
            >
              Apenas Editor
            </MenuItem>
            <MenuItem
              onClick={() => {
                onLayoutChange('pdf');
                handleCloseMenu(setViewMenuAnchor);
              }}
            >
              Apenas PDF
            </MenuItem>
          </Menu>
        </div>
      </div>

      {/* Centro: Título do Projeto & Dropdown de Opções */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={(e) => handleOpenMenu(setProjectMenuAnchor, e)}
          className="btn-overleaf btn-overleaf-ghost"
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '0.25rem 0.6rem',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            gap: '0.35rem',
            maxWidth: '320px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{projectTitle}</span>
          <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
        </button>

        <Menu
          anchorEl={projectMenuAnchor}
          open={Boolean(projectMenuAnchor)}
          onClose={() => handleCloseMenu(setProjectMenuAnchor)}
          sx={{ '& .MuiPaper-root': { fontSize: '0.8rem', minWidth: '220px' } }}
        >
          <MenuItem onClick={() => handleCloseMenu(setProjectMenuAnchor)}>
            Baixar como PDF
          </MenuItem>
          <MenuItem onClick={() => handleCloseMenu(setProjectMenuAnchor)}>
            Baixar código fonte (.zip)
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleCloseMenu(setProjectMenuAnchor)}>
            Contagem de palavras
          </MenuItem>
          <MenuItem onClick={() => handleCloseMenu(setProjectMenuAnchor)}>
            Renomear projeto
          </MenuItem>
        </Menu>

        {/* Indicador de Salvamento Real-time */}
        <div
          title={lastSavedAt ? `Última sincronização: ${lastSavedAt}` : 'Sincronizado via WebSocket'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            cursor: 'default',
          }}
        >
          {saveStatus === 'saving' && (
            <>
              <Clock size={12} style={{ color: 'var(--yellow-40, #f59e0b)' }} />
              <span>Salvando...</span>
            </>
          )}
          {saveStatus === 'synced' && (
            <>
              <Check size={12} style={{ color: 'var(--primary-main)' }} />
              <span>Salvo</span>
            </>
          )}
        </div>
      </div>

      {/* Lado Direito: Layout Switcher, History, Nickname, Collaborators e Botão Share */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Alternador de Layout Visual (Split, Editor, PDF) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(128, 128, 128, 0.08)',
            padding: '2px',
            borderRadius: '6px',
            gap: '2px',
          }}
        >
          <Tooltip title="Visualização Dividida (Editor + PDF)" arrow>
            <button
              onClick={() => onLayoutChange('split')}
              className={`btn-overleaf btn-overleaf-ghost ${layoutMode === 'split' ? 'active' : ''}`}
              style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', height: '24px' }}
            >
              <Columns size={13} />
            </button>
          </Tooltip>

          <Tooltip title="Apenas Editor" arrow>
            <button
              onClick={() => onLayoutChange('editor')}
              className={`btn-overleaf btn-overleaf-ghost ${layoutMode === 'editor' ? 'active' : ''}`}
              style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', height: '24px' }}
            >
              <Code size={13} />
            </button>
          </Tooltip>

          <Tooltip title="Apenas PDF" arrow>
            <button
              onClick={() => onLayoutChange('pdf')}
              className={`btn-overleaf btn-overleaf-ghost ${layoutMode === 'pdf' ? 'active' : ''}`}
              style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', height: '24px' }}
            >
              <FileOutput size={13} />
            </button>
          </Tooltip>
        </div>

        {/* Botão de Histórico */}
        <Tooltip title="Histórico de alterações e Snapshots" arrow>
          <button
            onClick={onToggleHistory}
            className={`btn-overleaf ${showHistory ? 'btn-overleaf-secondary' : 'btn-overleaf-ghost'}`}
            style={{ fontSize: '0.74rem', padding: '0.25rem 0.55rem', height: '26px' }}
          >
            <History size={13} />
            <span>Histórico ({snapshotsCount})</span>
          </button>
        </Tooltip>

        {/* Input Apelido */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Você:</span>
          <input
            type="text"
            value={userName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onUserNameChange(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-default)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.74rem',
              width: '90px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Pilha de Avatares dos Colaboradores */}
        <CollaboratorsBar collaborators={collaborators} currentUserId={userId} />

        {/* Botão Primário Verde "Share" (Marca do Overleaf) */}
        <Button
          variant="contained"
          size="small"
          startIcon={<UserPlus size={14} />}
          onClick={() => alert(`Link de compartilhamento para o projeto: ${window.location.href}`)}
          sx={{
            height: '28px',
            fontSize: '0.76rem',
            fontWeight: 600,
            textTransform: 'none',
            backgroundColor: 'var(--primary-main)',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '0 12px',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: 'var(--primary-main)',
              filter: 'brightness(0.92)',
              boxShadow: 'none',
            },
          }}
        >
          Share
        </Button>
      </div>
    </nav>
  );
}
