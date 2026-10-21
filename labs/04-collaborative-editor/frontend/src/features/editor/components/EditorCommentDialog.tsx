import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import { MessageSquare, X } from 'lucide-react';

export interface SelectionPopupData {
  from: number;
  to: number;
  text: string;
  top: number;
  left: number;
}

export interface EditorCommentDialogProps {
  selectionPopup: SelectionPopupData | null;
  isInlineBoxOpen: boolean;
  inlineCommentInput: string;
  currentUserName?: string;
  currentUserColor?: string;
  onOpenInlineBox: () => void;
  onClose: () => void;
  onCommentChange: (value: string) => void;
  onSaveComment: (from: number, to: number, text: string, content: string) => void;
}

export function EditorCommentDialog({
  selectionPopup,
  isInlineBoxOpen,
  inlineCommentInput,
  currentUserName = 'Você',
  currentUserColor = '#059669',
  onOpenInlineBox,
  onClose,
  onCommentChange,
  onSaveComment,
}: EditorCommentDialogProps) {
  if (!selectionPopup) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: selectionPopup.top,
        left: selectionPopup.left,
        zIndex: 50,
      }}
    >
      {!isInlineBoxOpen ? (
        <Button
          size="small"
          variant="contained"
          onClick={onOpenInlineBox}
          startIcon={<MessageSquare size={13} />}
          sx={{
            fontSize: '0.74rem',
            fontWeight: 600,
            py: 0.4,
            px: 1.2,
            textTransform: 'none',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            backgroundColor: '#059669',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#047857',
            },
          }}
        >
          Comentar
        </Button>
      ) : (
        <Box
          sx={{
            width: 290,
            backgroundColor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            p: 1.5,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <Stack spacing={1.2}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                <Avatar
                  sx={{
                    width: 20,
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: currentUserColor,
                  }}
                >
                  {currentUserName.charAt(0).toUpperCase()}
                </Avatar>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  {currentUserName}
                </Typography>
              </Stack>
              <IconButton size="small" onClick={onClose} sx={{ p: 0.3 }}>
                <X size={14} />
              </IconButton>
            </Stack>

            <Box
              sx={{
                p: 0.8,
                backgroundColor: 'action.hover',
                borderLeft: 3,
                borderColor: '#f59e0b',
                borderRadius: '0 4px 4px 0',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  fontStyle: 'italic',
                  color: 'text.secondary',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                "{selectionPopup.text}"
              </Typography>
            </Box>

            <TextField
              autoFocus
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="Adicionar sugestão ou comentário..."
              value={inlineCommentInput}
              onChange={(e) => onCommentChange(e.target.value)}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: '0.76rem',
                  p: 1,
                },
              }}
            />

            <Stack direction="row" spacing={0.8} sx={{ justifyContent: 'flex-end', pt: 0.5 }}>
              <Button
                size="small"
                onClick={onClose}
                sx={{
                  fontSize: '0.72rem',
                  height: 26,
                  textTransform: 'none',
                  color: 'text.secondary',
                }}
              >
                Cancelar
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!inlineCommentInput.trim()}
                onClick={() => {
                  onSaveComment(
                    selectionPopup.from,
                    selectionPopup.to,
                    selectionPopup.text,
                    inlineCommentInput.trim()
                  );
                }}
                sx={{
                  fontSize: '0.72rem',
                  height: 26,
                  fontWeight: 600,
                  textTransform: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#047857',
                  },
                }}
              >
                Salvar
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
