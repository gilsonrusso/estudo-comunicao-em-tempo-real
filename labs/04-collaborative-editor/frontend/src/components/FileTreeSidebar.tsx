import { useMemo } from 'react';
import {
  FileCode,
  FileText,
  BookMarked,
  Image as ImageIcon,
  Folder,
  FilePlus,
  FolderPlus,
  Upload,
  X,
  ListTree,
} from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

export interface ProjectFile {
  id: string;
  name: string;
  type: 'tex' | 'bib' | 'image' | 'folder';
  isMain?: boolean;
}

export interface FileTreeSidebarProps {
  activeFile: string;
  onSelectFile: (fileName: string) => void;
  onClose: () => void;
  documentContent?: string;
}

export function FileTreeSidebar({
  activeFile,
  onSelectFile,
  onClose,
  documentContent = '',
}: FileTreeSidebarProps) {
  // Arquivos do template Overleaf
  const files: ProjectFile[] = [
    { id: '1', name: 'main.tex', type: 'tex', isMain: true },
    { id: '2', name: 'references.bib', type: 'bib' },
    { id: '3', name: 'preamble.tex', type: 'tex' },
    { id: '4', name: 'figures/architecture.png', type: 'image' },
  ];

  // Extrai as seções do documento LaTeX dinamicamente
  const outlineItems = useMemo(() => {
    const lines = documentContent.split('\n');
    const items: { line: number; title: string; level: number }[] = [];

    lines.forEach((line, index) => {
      const secMatch = line.match(/\\section\{([^}]+)\}/);
      if (secMatch) {
        items.push({ line: index + 1, title: secMatch[1], level: 1 });
        return;
      }
      const subsecMatch = line.match(/\\subsection\{([^}]+)\}/);
      if (subsecMatch) {
        items.push({ line: index + 1, title: subsecMatch[1], level: 2 });
      }
    });

    return items;
  }, [documentContent]);

  const getFileIcon = (file: ProjectFile) => {
    switch (file.type) {
      case 'tex':
        return <FileCode size={15} style={{ color: 'var(--primary-main)' }} />;
      case 'bib':
        return <BookMarked size={15} style={{ color: '#f59e0b' }} />;
      case 'image':
        return <ImageIcon size={15} style={{ color: '#3b82f6' }} />;
      case 'folder':
        return <Folder size={15} style={{ color: '#eab308' }} />;
      default:
        return <FileText size={15} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  return (
    <aside
      className="ide-file-tree-panel"
      style={{
        width: '230px',
        minWidth: '230px',
        height: '100%',
        backgroundColor: 'var(--bg-paper)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Header da Sidebar do Overleaf */}
      <div
        style={{
          height: '40px',
          padding: '0 0.65rem 0 0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-paper)',
        }}
      >
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 650,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          File tree
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
          <Tooltip title="Novo arquivo" arrow>
            <IconButton size="small" sx={{ width: 26, height: 26, color: 'var(--text-secondary)' }}>
              <FilePlus size={14} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Nova pasta" arrow>
            <IconButton size="small" sx={{ width: 26, height: 26, color: 'var(--text-secondary)' }}>
              <FolderPlus size={14} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Upload" arrow>
            <IconButton size="small" sx={{ width: 26, height: 26, color: 'var(--text-secondary)' }}>
              <Upload size={14} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Fechar painel" arrow>
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ width: 26, height: 26, color: 'var(--text-secondary)' }}
            >
              <X size={14} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Lista de Arquivos */}
      <div style={{ flex: '0 0 auto', padding: '0.5rem 0.35rem', overflowY: 'auto' }}>
        {files.map((file) => {
          const isSelected = activeFile === file.name;
          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                backgroundColor: isSelected
                  ? 'rgba(9, 136, 66, 0.12)'
                  : 'transparent',
                color: isSelected
                  ? 'var(--primary-main)'
                  : 'var(--text-primary)',
                fontWeight: isSelected ? 600 : 400,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {getFileIcon(file)}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </span>
              {file.isMain && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '9px',
                    padding: '1px 4px',
                    backgroundColor: 'rgba(9, 136, 66, 0.15)',
                    color: 'var(--primary-main)',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}
                >
                  main
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Divisor do Outline */}
      <div
        style={{
          borderTop: '1px solid var(--border-color)',
          marginTop: 'auto',
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '120px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '32px',
            padding: '0 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-paper)',
          }}
        >
          <ListTree size={14} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-secondary)' }}>
            Outline
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem 0.35rem' }}>
          {outlineItems.length === 0 ? (
            <div
              style={{
                padding: '0.6rem 0.5rem',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
              }}
            >
              Nenhuma seção encontrada em {activeFile}
            </div>
          ) : (
            outlineItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.45rem',
                  paddingLeft: item.level === 2 ? '1.2rem' : '0.45rem',
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  lineHeight: 1.3,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.08)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <span
                  style={{
                    fontSize: '9px',
                    color: 'var(--text-secondary)',
                    minWidth: '18px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  L{item.line}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
