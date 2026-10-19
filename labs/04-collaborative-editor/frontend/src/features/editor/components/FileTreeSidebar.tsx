import { useState, useRef, useMemo } from 'react';
import {
  FileCode,
  FileText,
  BookMarked,
  Image as ImageIcon,
  Folder,
  FilePlus,
  Upload,
  X,
  ListTree,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { API_BASE } from '../../../constants/api.constants';
import { ProjectFile } from '../types/files.types';
import { useProjectFilesQuery } from '../hooks/useProjectFilesQuery';
import {
  useCreateProjectFileMutation,
  useUploadProjectFileMutation,
  useDeleteProjectFileMutation,
} from '../hooks/useProjectFilesMutations';

export type { ProjectFile };

export interface FileTreeSidebarProps {
  documentId?: string;
  apiBase?: string;
  activeFile: string;
  onSelectFile: (fileName: string) => void;
  onOpenFile?: (file: ProjectFile) => void;
  onClose: () => void;
  documentContent?: string;
  onInsertSnippet?: (snippet: string) => void;
}

export function FileTreeSidebar({
  documentId = 'doc-1',
  apiBase = '',
  activeFile,
  onSelectFile,
  onOpenFile,
  onClose,
  documentContent = '',
  onInsertSnippet,
}: FileTreeSidebarProps) {
  const { data: projectFiles = [] } = useProjectFilesQuery(documentId);
  const createFileMutation = useCreateProjectFileMutation(documentId);
  const uploadFileMutation = useUploadProjectFileMutation(documentId);
  const deleteFileMutation = useDeleteProjectFileMutation(documentId);

  const isUploading = uploadFileMutation.isPending;
  const isCreatingFile = createFileMutation.isPending;

  const [selectedImage, setSelectedImage] = useState<ProjectFile | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Criação de novo arquivo de texto
  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    try {
      const cleanName = newFileName.trim();
      let initialContent = '';
      if (cleanName.endsWith('.bib')) {
        initialContent = '% Arquivo de Referências Bibliográficas BibTeX\n';
      } else if (cleanName.endsWith('.tex')) {
        initialContent = '% Módulo LaTeX complementar\n';
      }

      const created = await createFileMutation.mutateAsync({
        path: cleanName,
        content: initialContent,
      });
      setNewFileDialogOpen(false);
      setNewFileName('');
      if (onOpenFile) {
        onOpenFile(created);
      } else {
        onSelectFile(created.name);
      }
    } catch (err) {
      console.error('Erro ao criar arquivo:', err);
    }
  };

  // Upload de arquivo / imagem para o MinIO
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      for (let i = 0; i < files.length; i++) {
        await uploadFileMutation.mutateAsync(files[i]);
      }
    } catch (err) {
      console.error('Erro na requisição de upload:', err);
    } finally {
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
      await deleteFileMutation.mutateAsync(file.id);
      if (selectedImage?.id === file.id) setSelectedImage(null);
    } catch (err) {
      console.error('Erro ao deletar arquivo:', err);
    }
  };

  // Extrai seções do documento LaTeX para o Outline
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
        return <FileCode size={15} style={{ color: 'var(--primary-main, #098842)' }} />;
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
    <Box
      component="nav"
      aria-label="Árvore de arquivos do projeto"
      sx={{
        width: 240,
        minWidth: 240,
        height: '100%',
        backgroundColor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Input oculto para upload de arquivos */}
      <Box
        component="input"
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept=".png,.jpg,.jpeg,.gif,.svg,.pdf,.bib,.sty,.cls"
        sx={{ display: 'none' }}
      />

      {/* Header da Sidebar */}
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 40,
          px: 1.2,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'text.primary',
            letterSpacing: '-0.01em',
          }}
        >
          File Tree
        </Typography>

        <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
          <Tooltip title="Novo arquivo (.tex, .bib, .sty)" arrow>
            <IconButton
              size="small"
              onClick={() => setNewFileDialogOpen(true)}
              sx={{ width: 26, height: 26, color: 'text.secondary' }}
            >
              <FilePlus size={14} />
            </IconButton>
          </Tooltip>

          <Tooltip
            title={isUploading ? 'Fazendo upload...' : 'Upload de imagem/arquivo (MinIO)'}
            arrow
          >
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              sx={{ width: 26, height: 26, color: 'primary.main' }}
            >
              <Upload size={14} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Fechar painel" arrow>
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ width: 26, height: 26, color: 'text.secondary' }}
            >
              <X size={14} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Lista de Arquivos */}
      <Box sx={{ flex: '0 0 auto', p: 0.75, overflowY: 'auto' }}>
        {allFiles.map((file) => {
          const isSelected = activeFile === file.name;
          return (
            <Box
              key={file.id}
              onClick={() => {
                if (file.type === 'image') {
                  setSelectedImage(file);
                } else if (onOpenFile) {
                  onOpenFile(file);
                } else {
                  onSelectFile(file.name);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.78rem',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'rgba(9, 136, 66, 0.12)' : 'transparent',
                color: isSelected ? 'primary.main' : 'text.primary',
                fontWeight: isSelected ? 600 : 400,
                transition: 'background-color 0.15s ease',
                '&:hover': {
                  backgroundColor: isSelected ? 'rgba(9, 136, 66, 0.15)' : 'action.hover',
                },
              }}
            >
              {getFileIcon(file)}
              <Typography
                component="span"
                sx={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.78rem',
                  fontWeight: 'inherit',
                  color: 'inherit',
                }}
              >
                {file.name}
              </Typography>

              {file.isMain && (
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

              {!file.isMain && (
                <Tooltip title="Excluir arquivo" arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => handleDeleteFile(file, e)}
                    sx={{
                      width: 20,
                      height: 20,
                      p: 0,
                      opacity: 0.5,
                      '&:hover': { opacity: 1, color: 'error.main' },
                    }}
                  >
                    <Trash2 size={12} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Divisor do Outline das Seções */}
      <Box
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          mt: 'auto',
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 120,
          overflow: 'hidden',
        }}
      >
        <Stack
          direction="row"
          spacing={0.8}
          sx={{
            alignItems: 'center',
            height: 32,
            px: 1.2,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <ListTree size={14} style={{ color: 'var(--text-secondary)' }} />
          <Typography
            variant="caption"
            sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}
          >
            Outline
          </Typography>
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 0.75 }}>
          {outlineItems.length === 0 ? (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                p: 1,
                fontSize: '0.72rem',
                color: 'text.secondary',
                fontStyle: 'italic',
              }}
            >
              Nenhuma seção encontrada em {activeFile}
            </Typography>
          ) : (
            outlineItems.map((item, idx) => (
              <Stack
                key={idx}
                direction="row"
                spacing={0.6}
                sx={{
                  alignItems: 'center',
                  px: 0.8,
                  py: 0.4,
                  pl: item.level === 2 ? 2.5 : 0.8,
                  fontSize: '0.74rem',
                  color: 'text.secondary',
                  cursor: 'pointer',
                  borderRadius: 0.75,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    color: 'text.primary',
                  },
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontSize: '9px',
                    color: 'text.disabled',
                    minWidth: 18,
                    fontFamily: 'fontFamilyMonospace',
                  }}
                >
                  L{item.line}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '0.74rem',
                    color: 'inherit',
                  }}
                >
                  {item.title}
                </Typography>
              </Stack>
            ))
          )}
        </Box>
      </Box>

      {/* Modal de Criação de Novo Arquivo */}
      <Dialog
        open={newFileDialogOpen}
        onClose={() => setNewFileDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 600 }}>Novo Arquivo</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Nome do Arquivo"
            placeholder="ex: references.bib ou chapter1.tex"
            fullWidth
            size="small"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFile();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button size="small" onClick={() => setNewFileDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            size="small"
            variant="contained"
            color="success"
            disabled={!newFileName.trim() || isCreatingFile}
            onClick={handleCreateFile}
          >
            {isCreatingFile ? 'Criando...' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

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
            <Box
              sx={{
                width: '100%',
                maxHeight: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'action.hover',
                borderRadius: 1,
                overflow: 'hidden',
                p: 1,
              }}
            >
              <Box
                component="img"
                src={`${apiBase || API_BASE}/api/documents/${documentId}/files/${selectedImage.id}/raw`}
                alt={selectedImage.name}
                sx={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
              />
            </Box>
          )}

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            <strong>Tamanho:</strong>{' '}
            {selectedImage?.sizeBytes ? `${(selectedImage.sizeBytes / 1024).toFixed(1)} KB` : 'N/A'}
          </Typography>

          <Box
            sx={{
              p: 1,
              backgroundColor: 'action.hover',
              borderRadius: 1,
              fontFamily: 'fontFamilyMonospace',
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {`\\includegraphics[width=0.8\\linewidth]{${selectedImage?.name}}`}
          </Box>
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
    </Box>
  );
}
