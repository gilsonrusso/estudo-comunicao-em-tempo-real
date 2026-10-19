import { RefreshCw, ExternalLink, AlertTriangle, FileCheck, Download } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export interface PdfPreviewProps {
  pdfBlobUrl: string | null;
  isCompiling: boolean;
  compileError: string | null;
  lastCompiledAt: string | null;
  themeMode?: 'light' | 'dark';
  invertPdfDark?: boolean;
  onRecompile: () => void;
}

export function PdfPreview({
  pdfBlobUrl,
  isCompiling,
  compileError,
  lastCompiledAt,
  themeMode = 'dark',
  invertPdfDark = true,
  onRecompile,
}: PdfPreviewProps) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'background.default',
        borderLeft: 1,
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* Barra de Ações do PDF (Estilo Overleaf) */}
      <Box
        sx={{
          height: 36,
          px: 1.5,
          backgroundColor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Button
            variant="contained"
            size="small"
            onClick={onRecompile}
            disabled={isCompiling}
            startIcon={<RefreshCw size={14} className={isCompiling ? 'spin' : ''} />}
            sx={{
              height: 26,
              fontSize: '0.75rem',
              textTransform: 'none',
              px: 1.2,
              backgroundColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
            }}
          >
            {isCompiling ? 'Compilando...' : 'Recompile'}
          </Button>

          {lastCompiledAt && !compileError && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: '#10b981' }}>
              <FileCheck size={14} />
              <Typography component="span" sx={{ fontSize: '0.74rem', fontWeight: 500 }}>
                PDF atualizado ({lastCompiledAt})
              </Typography>
            </Stack>
          )}
        </Stack>

        {pdfBlobUrl && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button
              component="a"
              href={pdfBlobUrl}
              download="artigo-overleaf.pdf"
              size="small"
              variant="outlined"
              startIcon={<Download size={13} />}
              sx={{
                height: 24,
                fontSize: '0.72rem',
                textTransform: 'none',
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'text.secondary',
                  color: 'text.primary',
                },
              }}
            >
              Baixar
            </Button>

            <Button
              component="a"
              href={pdfBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="outlined"
              startIcon={<ExternalLink size={13} />}
              sx={{
                height: 24,
                fontSize: '0.72rem',
                textTransform: 'none',
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'text.secondary',
                  color: 'text.primary',
                },
              }}
            >
              Nova Aba
            </Button>
          </Stack>
        )}
      </Box>

      {/* Área de Visualização com suporte a Light e Dark */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {compileError && (
          <Box
            sx={{
              p: 1.5,
              m: 1.5,
              border: 1,
              borderColor: 'error.main',
              borderRadius: 1,
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', color: 'error.main', mb: 1 }}
            >
              <AlertTriangle size={16} />
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Falha de Compilação do LaTeX
              </Typography>
            </Stack>
            <Box
              component="pre"
              sx={{
                backgroundColor: 'background.paper',
                color: 'error.light',
                p: 1,
                borderRadius: 1,
                fontSize: '0.74rem',
                lineHeight: 1.5,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                maxHeight: 280,
                border: 1,
                borderColor: 'divider',
                m: 0,
              }}
            >
              {compileError}
            </Box>
          </Box>
        )}

        {pdfBlobUrl ? (
          <Box
            sx={{
              flex: 1,
              width: '100%',
              height: '100%',
              p: 1,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Box
              component="iframe"
              src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
              title="Pré-visualização do PDF"
              sx={{
                width: '100%',
                height: '100%',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: '#ffffff',
                filter:
                  themeMode === 'dark' && invertPdfDark
                    ? 'invert(0.9) hue-rotate(180deg) contrast(1.05)'
                    : 'none',
                transition: 'filter 0.2s ease',
              }}
            />
          </Box>
        ) : !isCompiling ? (
          <Stack
            spacing={1}
            sx={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              p: 3,
              textAlign: 'center',
            }}
          >
            <FileCheck size={38} />
            <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: 'text.primary' }}>
              Nenhum PDF compilado ainda
            </Typography>
            <Typography
              sx={{ fontSize: '0.78rem', maxWidth: 300, lineHeight: 1.4, color: 'text.secondary' }}
            >
              Clique em <strong>Recompile</strong> acima para compilar o código LaTeX no
              micro-serviço TeX Live.
            </Typography>
          </Stack>
        ) : (
          <Stack
            spacing={1.5}
            sx={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
            }}
          >
            <CircularProgress size={28} color="inherit" />
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'text.primary' }}>
              Compilando documento via pdflatex...
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
