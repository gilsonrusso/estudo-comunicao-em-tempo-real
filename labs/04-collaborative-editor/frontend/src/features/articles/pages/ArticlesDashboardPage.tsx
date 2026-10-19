import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import ArticleIcon from '@mui/icons-material/Article';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { PageContainer } from '../../../components/common/PageContainer';
import { ArticlesTable } from '../components/ArticlesTable';
import { CreateArticleModal } from '../components/CreateArticleModal';
import { useArticlesQuery } from '../hooks/useArticlesQuery';
import { useColorMode } from '../../../theme';

export function ArticlesDashboardPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const {
    data: articles = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useArticlesQuery();
  const { mode, toggleColorMode } = useColorMode();

  return (
    <PageContainer>
      {/* Top Header do Dashboard */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          pb: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 2,
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <ArticleIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Painel de Artigos Científicos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerencie seus projetos LaTeX colaborativos, templates de periódicos e compilação em
              tempo real.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title={`Alternar para tema ${mode === 'dark' ? 'claro' : 'escuro'}`}>
            <IconButton onClick={toggleColorMode} color="inherit">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateModalOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 600, px: 2.5, py: 1 }}
          >
            Novo Artigo
          </Button>
        </Box>
      </Box>

      {isError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'Recarregando...' : 'Tentar novamente'}
            </Button>
          }
        >
          {error?.message ||
            'Falha ao carregar artigos científicos. Verifique sua conexão com o servidor.'}
        </Alert>
      )}

      {/* Tabela MUI DataGrid com padrão datagrid-table-standard */}
      <Box sx={{ flex: 1, minHeight: 0, width: '100%' }}>
        <ArticlesTable
          articles={articles}
          isLoading={isLoading}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />
      </Box>

      {/* Modal de Criação de Artigo */}
      <CreateArticleModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </PageContainer>
  );
}
