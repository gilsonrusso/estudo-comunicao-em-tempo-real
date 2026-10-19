import { DeltaOperation, DocumentSnapshot } from '../types/collab.types';
import { History, HardDriveDownload, Clock, CheckCircle2 } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';

export interface HistorySidebarProps {
  documentId: string;
  operations?: DeltaOperation[];
  snapshots: DocumentSnapshot[];
  onManualFlush: () => void;
  isFlushing: boolean;
}

function formatReason(reason: string): string {
  if (reason === 'versao_inicial') return 'Versão inicial';
  if (reason.startsWith('checkpoint_')) return 'Salvamento automático';
  if (reason === 'manual' || reason.includes('manual')) return 'Salvamento manual';
  return reason;
}

function formatSnapshotDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString([], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeFormatted = d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${dateFormatted} às ${timeFormatted}`;
  } catch {
    return dateStr;
  }
}

export function HistorySidebar({
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
          height: 48,
          px: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'background.paper',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <History size={18} style={{ color: 'var(--primary-main, #098842)' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
            Histórico de Versões
          </Typography>
          <Chip
            size="small"
            label={snapshots.length}
            sx={{
              height: 20,
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: 'action.hover',
            }}
          />
        </Stack>

        <Button
          size="small"
          variant="outlined"
          onClick={onManualFlush}
          disabled={isFlushing}
          startIcon={<HardDriveDownload size={13} />}
          sx={{
            fontSize: '0.75rem',
            height: 28,
            px: 1.2,
            textTransform: 'none',
            color: 'primary.main',
            borderColor: 'divider',
          }}
        >
          {isFlushing ? 'Salvando...' : 'Salvar Versão'}
        </Button>
      </Box>

      {/* Lista de Versões / Snapshots no Banco */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {snapshots.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 3,
              textAlign: 'center',
              color: 'text.secondary',
            }}
          >
            <Clock size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, mb: 0.5 }}>
              Nenhuma versão registrada
            </Typography>
            <Typography sx={{ fontSize: '0.74rem' }}>
              As versões são criadas automaticamente ao pausar a digitação ou clicando em "Salvar Versão".
            </Typography>
          </Box>
        ) : (
          snapshots.map((s, index) => {
            const isLatest = index === 0;
            return (
              <Paper
                key={s.id}
                variant="outlined"
                sx={{
                  p: 1.2,
                  backgroundColor: isLatest ? 'action.hover' : 'background.default',
                  borderColor: isLatest ? 'primary.main' : 'divider',
                  borderRadius: 1.5,
                  transition: 'border-color 0.2s',
                  '&:hover': {
                    borderColor: 'primary.light',
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 0.6,
                  }}
                >
                  <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                    <Typography
                      sx={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'primary.main',
                      }}
                    >
                      Versão {s.version}
                    </Typography>
                    {isLatest && (
                      <Chip
                        icon={<CheckCircle2 size={11} />}
                        label="Atual"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                      />
                    )}
                  </Stack>
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                    {formatSnapshotDate(s.createdAt)}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mt: 0.3 }}>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                    Autor:
                  </Typography>
                  <Typography
                    component="span"
                    sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'text.primary' }}
                  >
                    {s.savedBy || 'Sistema'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>•</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                    {formatReason(s.reason)}
                  </Typography>
                </Stack>
              </Paper>
            );
          })
        )}
      </Box>
    </Box>
  );
}
