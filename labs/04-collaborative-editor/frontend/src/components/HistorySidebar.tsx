import { DeltaOperation, DocumentSnapshot } from '../types/collab.js';
import { History, Database, Cpu, HardDriveDownload } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';

export interface HistorySidebarProps {
  documentId: string;
  operations: DeltaOperation[];
  snapshots: DocumentSnapshot[];
  onManualFlush: () => void;
  isFlushing: boolean;
}

export function HistorySidebar({
  operations,
  snapshots,
  onManualFlush,
  isFlushing,
}: HistorySidebarProps) {
  return (
    <Box
      component="aside"
      sx={{
        width: 360,
        backgroundColor: 'background.paper',
        borderLeft: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header da Sidebar */}
      <Box
        sx={{
          height: 36,
          px: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'background.paper',
        }}
      >
        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
          <History size={16} style={{ color: 'var(--primary-main, #098842)' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
            Histórico & Deltas
          </Typography>
        </Stack>

        <Button
          size="small"
          variant="outlined"
          onClick={onManualFlush}
          disabled={isFlushing}
          startIcon={<HardDriveDownload size={13} />}
          sx={{
            fontSize: '0.72rem',
            height: 24,
            px: 1,
            textTransform: 'none',
            color: 'primary.main',
            borderColor: 'divider',
          }}
        >
          {isFlushing ? 'Gravando...' : 'Flush'}
        </Button>
      </Box>

      {/* Explicação Didática */}
      <Paper
        variant="outlined"
        sx={{
          m: 1.5,
          p: 1.2,
          backgroundColor: 'action.hover',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
          Arquitetura Overleaf:
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 0.3 }}>
          1. Cada tecla gera um <strong>Delta</strong> minúsculo via WebSocket (RAM / Redis).
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
          2. Após <strong>3 segundos</strong> sem digitação (debounce), o servidor consolida o <strong>Snapshot</strong> no PostgreSQL.
        </Typography>
      </Paper>

      {/* Seção 1: Snapshots / Checkpoints no Banco de Dados */}
      <Box sx={{ px: 1.5, mb: 1 }}>
        <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mb: 0.8 }}>
          <Database size={13} style={{ color: '#3b82f6' }} />
          <Typography
            sx={{
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              color: 'text.secondary',
              fontWeight: 600,
            }}
          >
            Snapshots no Banco ({snapshots.length})
          </Typography>
        </Stack>

        <Stack spacing={0.6} sx={{ maxHeight: 150, overflowY: 'auto' }}>
          {snapshots.map((s) => (
            <Paper
              key={s.id}
              variant="outlined"
              sx={{
                p: 0.8,
                backgroundColor: 'background.default',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: 'primary.main' }}>
                  Versão {s.version}
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                  {new Date(s.createdAt).toLocaleTimeString()}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.2 }}>
                Salvo por: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{s.savedBy}</Box> ({s.reason})
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Box>

      {/* Seção 2: Stream de Operações Atômicas */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: 1.5, pb: 1.5, overflow: 'hidden' }}>
        <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mb: 0.8 }}>
          <Cpu size={13} style={{ color: 'var(--primary-main, #098842)' }} />
          <Typography
            sx={{
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              color: 'text.secondary',
              fontWeight: 600,
            }}
          >
            Stream de Deltas ({operations.length})
          </Typography>
        </Stack>

        <Stack
          spacing={0.5}
          sx={{
            flex: 1,
            overflowY: 'auto',
            flexDirection: 'column-reverse',
          }}
        >
          {operations.length === 0 ? (
            <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.78rem', p: 2 }}>
              Nenhuma alteração recente ainda. Comece a digitar!
            </Typography>
          ) : (
            operations.map((op, idx) => (
              <Paper
                key={idx}
                variant="outlined"
                sx={{
                  p: 0.6,
                  backgroundColor: 'background.default',
                  borderColor: 'divider',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary', fontSize: '0.7rem' }}>
                  <Typography component="span" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.7rem' }}>
                    {op.userName}
                  </Typography>
                  <Typography component="span" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                    {new Date(op.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    mt: 0.3,
                    fontSize: '0.7rem',
                    color: op.type === 'insert' ? '#10b981' : '#ef4444',
                    fontFamily: 'monospace',
                  }}
                >
                  {op.type === 'insert' ? (
                    <>+ INSERT pos <strong>{op.position}</strong>: "{op.text}"</>
                  ) : (
                    <>- DELETE pos <strong>{op.position}</strong> (len {op.length})</>
                  )}
                </Typography>
              </Paper>
            ))
          )}
        </Stack>
      </Box>
    </Box>
  );
}
