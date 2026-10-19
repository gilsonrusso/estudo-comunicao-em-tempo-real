import { useState, ChangeEvent, DragEvent } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { useCreateTemplateMutation } from '../hooks/useCreateTemplateMutation';
import { useCreateArticleFromZipMutation } from '../hooks/useCreateArticleFromZipMutation';
import { useCreateTemplateFromZipMutation } from '../hooks/useCreateTemplateFromZipMutation';

export interface UploadTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newTemplateId: string) => void;
  onArticleCreated?: (newArticleId: string) => void;
}

export function UploadTemplateDialog({
  open,
  onClose,
  onSuccess,
  onArticleCreated,
}: UploadTemplateDialogProps) {
  const [activeTab, setActiveTab] = useState<'zip' | 'manual'>('zip');
  const [zipTarget, setZipTarget] = useState<'create_article' | 'save_template'>('create_article');
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [customTitle, setCustomTitle] = useState('');

  // Estados para aba manual
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clsFileName, setClsFileName] = useState('custom.cls');
  const [mainContent, setMainContent] = useState(
    `\\documentclass{custom}\n\\title{Novo Artigo com Classe Customizada}\n\\author{Autor}\n\\begin{document}\n\\maketitle\n\\section{Introdução}\nConteúdo com template customizado.\n\\end{document}`
  );
  const [clsContent, setClsContent] = useState(
    `% custom.cls\n\\NeedsTeXFormat{LaTeX2e}\n\\ProvidesClass{custom}[2026/01/01 Custom Style]\n\\DeclareOption*{\\PassOptionsToClass{\\CurrentOption}{article}}\n\\ProcessOptions\\relax\n\\LoadClass{article}\n`
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  const createTemplateMutation = useCreateTemplateMutation();
  const createArticleFromZipMutation = useCreateArticleFromZipMutation();
  const createTemplateFromZipMutation = useCreateTemplateFromZipMutation();

  const isPending =
    createTemplateMutation.isPending ||
    createArticleFromZipMutation.isPending ||
    createTemplateFromZipMutation.isPending;

  const currentError =
    validationError ||
    createArticleFromZipMutation.error?.message ||
    createTemplateFromZipMutation.error?.message ||
    createTemplateMutation.error?.message;

  const handleClose = () => {
    createTemplateMutation.reset();
    createArticleFromZipMutation.reset();
    createTemplateFromZipMutation.reset();
    setValidationError(null);
    setSelectedZipFile(null);
    setCustomTitle('');
    onClose();
  };

  const handleZipFileSelection = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setValidationError('Por favor, selecione um arquivo compactado com extensão .zip');
      return;
    }
    setValidationError(null);
    setSelectedZipFile(file);
    if (!customTitle) {
      setCustomTitle(file.name.replace(/\.zip$/i, ''));
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleZipFileSelection(file);
  };

  const handleClsFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setClsFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) setClsContent(text);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setValidationError(null);

    if (activeTab === 'zip') {
      if (!selectedZipFile) {
        setValidationError('Por favor, selecione ou arraste um arquivo .zip');
        return;
      }

      if (zipTarget === 'create_article') {
        try {
          const article = await createArticleFromZipMutation.mutateAsync({
            file: selectedZipFile,
            title: customTitle.trim() || undefined,
          });
          handleClose();
          if (onArticleCreated) {
            onArticleCreated(article.id);
          }
        } catch {
          // Erro tratado reativamente pela mutation
        }
      } else {
        try {
          const template = await createTemplateFromZipMutation.mutateAsync({
            file: selectedZipFile,
            name: customTitle.trim() || undefined,
            description: 'Template importado a partir de arquivo ZIP',
          });
          handleClose();
          onSuccess(template.id);
        } catch {
          // Erro tratado reativamente pela mutation
        }
      }
    } else {
      if (!name.trim()) {
        setValidationError('Por favor, informe o nome do template.');
        return;
      }
      try {
        const created = await createTemplateMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || 'Template customizado com arquivo de classe .cls',
          category: 'custom',
          mainContent,
          clsContent,
          clsFileName,
        });
        handleClose();
        onSuccess(created.id);
      } catch {
        // Erro tratado reativamente pela mutation
      }
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Importar Template / Projeto LaTeX (Estilo Overleaf)
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => {
            setActiveTab(val);
            setValidationError(null);
          }}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab
            value="zip"
            label="Pacote ZIP (.zip)"
            icon={<FolderZipIcon fontSize="small" />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
          <Tab
            value="manual"
            label="Definir Manualmente (.cls)"
            icon={<CloudUploadIcon fontSize="small" />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
        {currentError && <Alert severity="error">{currentError}</Alert>}

        {activeTab === 'zip' ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Faça o upload de um arquivo compactado <code>.zip</code> (como pacotes oficiais da SBC,
              IEEE, ACM, Springer ou backup de outro projeto). O sistema irá extrair a árvore de
              arquivos, salvar imagens no bucket MinIO e identificar automaticamente o documento LaTeX
              principal.
            </Typography>

            {/* Drag & Drop Area */}
            <label style={{ display: 'block', cursor: 'pointer' }}>
              <input
                type="file"
                accept=".zip,application/zip"
                hidden
                onChange={(e) => handleZipFileSelection(e.target.files?.[0])}
                disabled={isPending}
              />
              <Box
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragging ? 'primary.main' : 'divider',
                  bgcolor: isDragging ? 'action.hover' : 'background.paper',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <FolderZipIcon sx={{ fontSize: 44, color: selectedZipFile ? 'primary.main' : 'text.secondary', mb: 1 }} />
                {selectedZipFile ? (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {selectedZipFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(selectedZipFile.size / 1024).toFixed(1)} KB — Clique ou arraste para substituir
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Clique para selecionar ou arraste o arquivo .zip aqui
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Suporta pacotes completos com .tex, .cls, .sty, .bib e imagens (.png, .jpg)
                    </Typography>
                  </Box>
                )}
              </Box>
            </label>

            <TextField
              label="Título do Artigo / Nome do Template (Opcional)"
              fullWidth
              size="small"
              placeholder="Detectado automaticamente se omitido"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              disabled={isPending}
            />

            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontSize: '0.85rem', fontWeight: 600, mb: 0.5 }}>
                Ação com o arquivo ZIP:
              </FormLabel>
              <RadioGroup
                row
                value={zipTarget}
                onChange={(e) => setZipTarget(e.target.value as 'create_article' | 'save_template')}
              >
                <FormControlLabel
                  value="create_article"
                  control={<Radio size="small" />}
                  label="Criar Artigo e Abrir no Editor"
                />
                <FormControlLabel
                  value="save_template"
                  control={<Radio size="small" />}
                  label="Salvar na Galeria de Modelos"
                />
              </RadioGroup>
            </FormControl>
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              Faça o upload do arquivo de classe <code>.cls</code> para que ele seja armazenado no MinIO
              e copiado automaticamente para todos os novos artigos criados com este modelo.
            </Typography>

            <TextField
              label="Nome do Template"
              fullWidth
              size="small"
              placeholder="Ex: Revista Brasileira de Computação"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isPending}
            />

            <TextField
              label="Descrição"
              fullWidth
              size="small"
              placeholder="Ex: Formato em 2 colunas com margens personalizadas"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
            />

            <Box sx={{ border: '1px dashed', borderColor: 'divider', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Arquivo de Classe LaTeX (.cls):
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  startIcon={<CloudUploadIcon />}
                  disabled={isPending}
                >
                  Selecionar arquivo .cls
                  <input type="file" accept=".cls,.sty" hidden onChange={handleClsFileUpload} />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {clsFileName}
                </Typography>
              </Box>
            </Box>

            <TextField
              label="Conteúdo inicial de main.tex"
              multiline
              rows={3}
              fullWidth
              size="small"
              value={mainContent}
              onChange={(e) => setMainContent(e.target.value)}
              disabled={isPending}
              slotProps={{
                input: {
                  sx: { fontFamily: 'monospace', fontSize: '0.8rem' },
                },
              }}
            />

            <TextField
              label="Conteúdo do arquivo .cls (LaTeX Class)"
              multiline
              rows={4}
              fullWidth
              size="small"
              value={clsContent}
              onChange={(e) => setClsContent(e.target.value)}
              disabled={isPending}
              slotProps={{
                input: {
                  sx: { fontFamily: 'monospace', fontSize: '0.8rem' },
                },
              }}
            />
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} color="inherit" disabled={isPending}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={isPending || (activeTab === 'zip' && !selectedZipFile)}
          startIcon={isPending ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ fontWeight: 600, minWidth: 160 }}
        >
          {isPending
            ? 'Processando...'
            : activeTab === 'zip' && zipTarget === 'create_article'
            ? 'Criar e Abrir no Editor'
            : 'Salvar Modelo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
