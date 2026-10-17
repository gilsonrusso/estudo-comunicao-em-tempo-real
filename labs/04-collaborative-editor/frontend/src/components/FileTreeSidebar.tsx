import { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileCode,
  FileText,
  BookMarked,
  Image as ImageIcon,
  Folder,
  Upload,
  X,
  ListTree,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

export interface ProjectFile {
  id: string;
  name: string;
  type: 'tex' | 'bib' | 'image' | 'folder' | 'other';
  isMain?: boolean;
  sizeBytes?: number;
  mimeType?: string;
  storageKey?: string;
}

export interface FileTreeSidebarProps {
  documentId?: string;
  apiBase?: string;
  activeFile: string;
  onSelectFile: (fileName: string) => void;
  onClose: () => void;
  documentContent?: string;
  onInsertSnippet?: (snippet: string) => void;
}

export function FileTreeSidebar({
  documentId = 'doc-1',
  apiBase = '',
  activeFile,
  onSelectFile,
  onClose,
  documentContent = '',
  onInsertSnippet,
}: FileTreeSidebarProps) {
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ProjectFile | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega arquivos reais persistidos no backend / MinIO
  const fetchFiles = async () => {
    try {
      const res = await fetch(`${apiBase}/api/documents/${documentId}/files`);
      if (res.ok) {
        const data = await res.json();
        const mapped: ProjectFile[] = data.map((item: any) => ({
          id: item.id,
          name: item.path,
          type: item.fileType === 'image' ? 'image' : item.fileType === 'bib' ? 'bib' : 'other',
          sizeBytes: item.sizeBytes,
          mimeType: item.mimeType,
          storageKey: item.storageKey,
        }));
        setProjectFiles(mapped);
      }
    } catch (err) {
      console.warn('Não foi possível carregar lista de arquivos remotos:', err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [documentId, apiBase]);

  // Lista combinada: main.tex (documento ativo) + arquivos persistidos
  const allFiles: ProjectFile[] = useMemo(() => {
    const mainEntry: ProjectFile = {
      id: 'main',
      name: 'main.tex',
      type: 'tex',
      isMain: true,
    };
    return [mainEntry, ...projectFiles];
  }, [projectFiles]);

  // Manipulador de upload de arquivo para o MinIO
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file, file.name);

        const res = await fetch(`${apiBase}/api/documents/${documentId}/files/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('Falha no upload do arquivo:', errData);
        }
      }
      await fetchFiles();
    } catch (err) {
      console.error('Erro na requisição de upload:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Excluir arquivo
  const handleDeleteFile = async (file: ProjectFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.isMain) return;
    if (!window.confirm(`Deseja excluir "${file.name}" permanentemente?`)) return;

    try {
      const res = await fetch(`${apiBase}/api/documents/${documentId}/files/${file.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedImage?.id === file.id) setSelectedImage(null);
        await fetchFiles();
      }
    } catch (err) {
      console.error('Erro ao deletar arquivo:', err);
    }
  };

  // Extrai as seções do documento LaTeX dinamicamente para o Outline
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

  const copyLaTeXSnippet = (fileName: string) => {
    const snippet = `\\begin{figure}[htbp]
  \\centering
  \\includegraphics[width=0.8\\linewidth]{${fileName}}
  \\caption{Descrição da figura.}
  \\label{fig:${fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')}}
\\end{figure}`;

    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);

    if (onInsertSnippet) {
      onInsertSnippet(snippet);
    }
  };

  return (
    <aside
      className="ide-file-tree-panel"
      style={{
        width: '240px',
        minWidth: '240px',
        height: '100%',
        backgroundColor: 'var(--bg-paper)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Input oculto para upload de arquivos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept=".png,.jpg,.jpeg,.gif,.svg,.pdf,.bib,.sty,.cls"
        style={{ display: 'none' }}
      />

      {/* Header da Sidebar */}
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
          File Tree
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
          <Tooltip title={isUploading ? 'Fazendo upload...' : 'Upload de imagem/arquivo (MinIO)'} arrow>
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              sx={{ width: 26, height: 26, color: 'var(--primary-main)' }}
            >
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
        {allFiles.map((file) => {
          const isSelected = activeFile === file.name;
          return (
            <div
              key={file.id}
              onClick={() => {
                if (file.type === 'image') {
                  setSelectedImage(file);
                } else {
                  onSelectFile(file.name);
                }
              }}
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
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.name}
              </span>

              {file.isMain && (
                <span
                  style={{
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

              {!file.isMain && (
                <Tooltip title="Excluir arquivo" arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => handleDeleteFile(file, e)}
                    sx={{
                      width: 20,
                      height: 20,
                      padding: 0,
                      opacity: 0.5,
                      '&:hover': { opacity: 1, color: '#ef4444' },
                    }}
                  >
                    <Trash2 size={12} />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>

      {/* Divisor do Outline das Seções */}
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

      {/* Modal de Preview de Imagem & Snippet LaTeX */}
      <Dialog
        open={Boolean(selectedImage)}
        onClose={() => setSelectedImage(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 600, pb: 1 }}>
          Visualização de Imagem: {selectedImage?.name}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          {selectedImage && (
            <div
              style={{
                width: '100%',
                maxHeight: '220px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: '8px',
                overflow: 'hidden',
                padding: '0.5rem',
              }}
            >
              <img
                src={`${apiBase}/api/documents/${documentId}/files/${selectedImage.id}/raw`}
                alt={selectedImage.name}
                style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
              />
            </div>
          )}

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <strong>Tamanho:</strong>{' '}
            {selectedImage?.sizeBytes
              ? `${(selectedImage.sizeBytes / 1024).toFixed(1)} KB`
              : 'N/A'}
          </div>

          <div
            style={{
              padding: '0.5rem 0.6rem',
              backgroundColor: 'rgba(128,128,128,0.1)',
              borderRadius: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {`\\includegraphics[width=0.8\\linewidth]{${selectedImage?.name}}`}
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button size="small" onClick={() => setSelectedImage(null)}>
            Fechar
          </Button>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={copiedSnippet ? <Check size={14} /> : <Copy size={14} />}
            onClick={() => selectedImage && copyLaTeXSnippet(selectedImage.name)}
          >
            {copiedSnippet ? 'Copiado!' : 'Copiar Código LaTeX'}
          </Button>
        </DialogActions>
      </Dialog>
    </aside>
  );
}
