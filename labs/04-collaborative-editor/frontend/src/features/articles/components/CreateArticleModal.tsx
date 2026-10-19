import { useState } from 'react';
import { useNavigate } from 'react-router';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CircularProgress from '@mui/material/CircularProgress';
import { TemplateSelector } from './TemplateSelector';
import { UploadTemplateDialog } from './UploadTemplateDialog';
import { useTemplatesQuery } from '../hooks/useTemplatesQuery';
import { useCreateArticleMutation } from '../hooks/useCreateArticleMutation';

export interface CreateArticleModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateArticleModal({ open, onClose }: CreateArticleModalProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('sbc');
  const [isUploadTemplateOpen, setIsUploadTemplateOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: templates = [], isLoading: isLoadingTemplates } = useTemplatesQuery();
  const createMutation = useCreateArticleMutation();

  const errorMessage = validationError || createMutation.error?.message;

  const handleClose = () => {
    createMutation.reset();
    setValidationError(null);
    onClose();
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setValidationError('Por favor, informe o título do artigo.');
      return;
    }
    setValidationError(null);
    try {
      const created = await createMutation.mutateAsync({
        title: title.trim(),
        templateId: selectedTemplateId,
      });
      handleClose();
      navigate(`/editor/${created.id}`);
    } catch {
      // createMutation.error já é atualizado reativamente pelo TanStack Query
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Novo Artigo Científico em LaTeX</DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <Typography variant="body2" color="text.secondary">
            Informe o título da sua pesquisa e selecione o modelo de publicação. O projeto será
            inicializado com o código-fonte LaTeX e todos os arquivos de estilo (.cls e
            bibliografia) prontos para edição colaborativa em tempo real.
          </Typography>

          <TextField
            autoFocus
            label="Título do Artigo Científico"
            fullWidth
            placeholder="Ex: Sistemas Distribuídos em Tempo Real: Um Estudo com OT e TeX Live"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={createMutation.isPending}
            required
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Modelo de Artigo
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<CloudUploadIcon />}
              onClick={() => setIsUploadTemplateOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              Importar Template / ZIP (.zip)
            </Button>
          </Box>

          {isLoadingTemplates ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <TemplateSelector
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={setSelectedTemplateId}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} color="inherit" disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            color="primary"
            disabled={createMutation.isPending || !title.trim()}
            sx={{ fontWeight: 600, minWidth: 140 }}
          >
            {createMutation.isPending ? 'Criando Artigo...' : 'Criar Artigo'}
          </Button>
        </DialogActions>
      </Dialog>

      <UploadTemplateDialog
        open={isUploadTemplateOpen}
        onClose={() => setIsUploadTemplateOpen(false)}
        onSuccess={(newId) => {
          setSelectedTemplateId(newId);
        }}
        onArticleCreated={(newArticleId) => {
          handleClose();
          navigate(`/editor/${newArticleId}`);
        }}
      />
    </>
  );
}
