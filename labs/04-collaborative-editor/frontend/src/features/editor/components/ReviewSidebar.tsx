import { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import {
  MessageSquare,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Send,
  X,
  Plus,
  Quote,
  MessageCircle,
} from 'lucide-react';
import { ReviewComment, CommentReply } from '../types/collab.types';
import { EditorLineLayoutInfo } from './CodeMirrorEditor.js';

export interface ReviewSidebarProps {
  comments: ReviewComment[];
  activeCommentId: string | null;
  currentFile: string;
  currentUserId: string;
  currentUserName: string;
  currentUserColor: string;
  selectedText?: string;
  lineLayoutInfo?: EditorLineLayoutInfo | null;
  onSelectComment: (commentId: string | null) => void;
  onAddComment: (content: string) => void;
  onReplyComment: (commentId: string, content: string) => void;
  onResolveComment: (commentId: string, status: 'open' | 'resolved') => void;
  onDeleteComment: (commentId: string) => void;
  onClose: () => void;
}

export function ReviewSidebar({
  comments,
  activeCommentId,
  currentFile,
  currentUserId,
  currentUserName,
  currentUserColor,
  selectedText = '',
  lineLayoutInfo = null,
  onSelectComment,
  onAddComment,
  onReplyComment,
  onResolveComment,
  onDeleteComment,
  onClose,
}: ReviewSidebarProps) {
  const [filterFileOnly, setFilterFileOnly] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open'>('open');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sincroniza a rolagem da lista com o scroll do editor CodeMirror 6
  useEffect(() => {
    if (scrollContainerRef.current && lineLayoutInfo && filterFileOnly) {
      if (Math.abs(scrollContainerRef.current.scrollTop - lineLayoutInfo.scrollTop) > 2) {
        scrollContainerRef.current.scrollTop = lineLayoutInfo.scrollTop;
      }
    }
  }, [lineLayoutInfo?.scrollTop, filterFileOnly]);

  // Filtragem dos comentários
  const filteredComments = comments.filter((c) => {
    if (filterFileOnly && c.file !== currentFile) return false;
    if (filterStatus === 'open' && c.status === 'resolved') return false;
    return true;
  });

  // Layout alinhado às linhas do editor (Estilo Overleaf)
  const isLineAligned = filterFileOnly && !!lineLayoutInfo?.commentLineTops;

  const sortedComments = [...filteredComments].sort((a, b) => {
    if (!isLineAligned || !lineLayoutInfo?.commentLineTops) return 0;
    const topA = lineLayoutInfo.commentLineTops[a.id]?.top ?? 0;
    const topB = lineLayoutInfo.commentLineTops[b.id]?.top ?? 0;
    return topA - topB;
  });

  // Algoritmo de cascata anti-colisão (Google Docs & Overleaf)
  let lastBottom = 16;
  const cardTops: Record<string, number> = {};
  if (isLineAligned && lineLayoutInfo?.commentLineTops) {
    for (const c of sortedComments) {
      const targetTop = (lineLayoutInfo.commentLineTops[c.id]?.top ?? 0) + 16;
      const actualTop = Math.max(targetTop, lastBottom + 12);
      cardTops[c.id] = actualTop;
      const estimatedHeight = 130 + (c.replies?.length || 0) * 45;
      lastBottom = actualTop + estimatedHeight;
    }
  }

  const containerTotalHeight = isLineAligned
    ? Math.max(lineLayoutInfo?.scrollHeight || 0, lastBottom + 60)
    : undefined;

  const openCount = comments.filter((c) => c.status === 'open').length;

  const handleCreateComment = () => {
    if (!newCommentText.trim()) return;
    onAddComment(newCommentText.trim());
    setNewCommentText('');
    setIsAddingNew(false);
  };

  const handleSendReply = (commentId: string) => {
    const text = replyInputs[commentId]?.trim();
    if (!text) return;
    onReplyComment(commentId, text);
    setReplyInputs((prev) => ({ ...prev, [commentId]: '' }));
    setReplyOpen((prev) => ({ ...prev, [commentId]: false }));
  };

  return (
    <Box
      sx={{
        width: 340,
        minWidth: 340,
        height: '100%',
        backgroundColor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
        boxShadow: '4px 0 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* 1. Header do Review Panel */}
      <Box
        sx={{
          height: 48,
          minHeight: 48,
          px: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'background.paper',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <MessageSquare size={16} style={{ color: 'var(--primary-main, #098842)' }} />
          <Typography sx={{ fontSize: '0.86rem', fontWeight: 700, color: 'text.primary' }}>
            Review & Comentários
          </Typography>
          <Chip
            label={`${openCount} pendente${openCount !== 1 ? 's' : ''}`}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.68rem',
              fontWeight: 600,
              backgroundColor:
                openCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: openCount > 0 ? '#d97706' : '#059669',
            }}
          />
        </Stack>
        <Tooltip title="Fechar Painel de Review">
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <X size={16} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 2. Barra de Filtros e Ações Rápidas */}
      <Box
        sx={{
          p: 1.2,
          backgroundColor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Stack
          direction="row"
          spacing={0.8}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Stack direction="row" spacing={0.6}>
            <Button
              size="small"
              variant={filterFileOnly ? 'contained' : 'outlined'}
              onClick={() => setFilterFileOnly(true)}
              sx={{
                fontSize: '0.68rem',
                height: 24,
                px: 1,
                minWidth: 'auto',
                textTransform: 'none',
              }}
            >
              Este arquivo ({currentFile})
            </Button>
            <Button
              size="small"
              variant={!filterFileOnly ? 'contained' : 'outlined'}
              onClick={() => setFilterFileOnly(false)}
              sx={{
                fontSize: '0.68rem',
                height: 24,
                px: 1,
                minWidth: 'auto',
                textTransform: 'none',
              }}
            >
              Todo o projeto
            </Button>
          </Stack>

          <Button
            size="small"
            variant="text"
            onClick={() => setFilterStatus(filterStatus === 'open' ? 'all' : 'open')}
            sx={{
              fontSize: '0.68rem',
              height: 24,
              px: 0.6,
              minWidth: 'auto',
              textTransform: 'none',
              color: 'text.secondary',
            }}
          >
            {filterStatus === 'open' ? 'Pendentes' : 'Todos'}
          </Button>
        </Stack>

        {/* Botão para Iniciar Novo Comentário */}
        {!isAddingNew ? (
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<Plus size={14} />}
            onClick={() => setIsAddingNew(true)}
            sx={{
              height: 28,
              fontSize: '0.74rem',
              fontWeight: 600,
              textTransform: 'none',
              borderColor: 'primary.main',
              color: 'primary.main',
              backgroundColor: 'rgba(9, 136, 66, 0.05)',
              '&:hover': {
                backgroundColor: 'rgba(9, 136, 66, 0.12)',
              },
            }}
          >
            {selectedText ? 'Comentar trecho selecionado' : 'Novo Comentário'}
          </Button>
        ) : (
          <Box
            sx={{
              p: 1.2,
              border: 1,
              borderColor: 'primary.main',
              borderRadius: 1.5,
              backgroundColor: 'background.paper',
            }}
          >
            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 1 }}>
              <Avatar
                sx={{
                  width: 20,
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backgroundColor: currentUserColor,
                  color: '#ffffff',
                }}
              >
                {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'U'}
              </Avatar>
              <Typography sx={{ fontSize: '0.74rem', fontWeight: 600 }}>
                {currentUserName}
              </Typography>
              <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                ({currentUserId})
              </Typography>
            </Stack>

            {selectedText && (
              <Box
                sx={{
                  mb: 1,
                  p: 0.8,
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  borderLeft: 3,
                  borderColor: '#f59e0b',
                  borderRadius: '0 4px 4px 0',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  "{selectedText}"
                </Typography>
              </Box>
            )}

            <TextField
              autoFocus
              fullWidth
              multiline
              rows={2}
              placeholder="Escreva sua sugestão ou comentário de revisão..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              variant="outlined"
              size="small"
              sx={{
                mb: 1,
                '& .MuiInputBase-root': {
                  fontSize: '0.76rem',
                  p: 1,
                },
              }}
            />

            <Stack direction="row" spacing={0.8} sx={{ justifyContent: 'flex-end' }}>
              <Button
                size="small"
                onClick={() => {
                  setIsAddingNew(false);
                  setNewCommentText('');
                }}
                sx={{ fontSize: '0.7rem', height: 24, textTransform: 'none' }}
              >
                Cancelar
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleCreateComment}
                disabled={!newCommentText.trim()}
                sx={{
                  fontSize: '0.7rem',
                  height: 24,
                  textTransform: 'none',
                  backgroundColor: 'primary.main',
                }}
              >
                Salvar Comentário
              </Button>
            </Stack>
          </Box>
        )}
      </Box>

      {/* 3. Lista de Comentários / Threads alinhada às linhas do editor */}
      <Box
        ref={scrollContainerRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            p: 1.2,
            minHeight: isLineAligned ? containerTotalHeight : 'auto',
            position: isLineAligned ? 'relative' : 'static',
            display: isLineAligned ? 'block' : 'flex',
            flexDirection: isLineAligned ? undefined : 'column',
            gap: isLineAligned ? undefined : 1.2,
          }}
        >
          {filteredComments.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
                color: 'text.secondary',
                textAlign: 'center',
                gap: 1,
              }}
            >
              <MessageCircle size={32} strokeWidth={1.5} style={{ opacity: 0.5 }} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Nenhum comentário encontrado
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', maxWidth: 220 }}>
                Selecione qualquer trecho no editor e clique em "Adicionar comentário" para iniciar
                uma thread de revisão.
              </Typography>
            </Box>
          ) : (
            sortedComments.map((comment) => {
              const isActive = activeCommentId === comment.id;
              const isResolved = comment.status === 'resolved';
              const lineInfo = lineLayoutInfo?.commentLineTops?.[comment.id];

              return (
                <Box
                  key={comment.id}
                  onClick={() => onSelectComment(comment.id)}
                  sx={{
                    ...(isLineAligned
                      ? {
                          position: 'absolute',
                          top: cardTops[comment.id],
                          left: 10,
                          right: 10,
                        }
                      : {}),
                    p: 1.2,
                    borderRadius: 1.5,
                    backgroundColor: isActive
                      ? 'rgba(245, 158, 11, 0.08)'
                      : isResolved
                        ? 'action.hover'
                        : 'background.paper',
                    border: 1,
                    borderColor: isActive
                      ? '#f59e0b'
                      : isResolved
                        ? 'divider'
                        : 'rgba(245, 158, 11, 0.3)',
                    boxShadow: isActive
                      ? '0 4px 14px rgba(245, 158, 11, 0.2)'
                      : '0 1px 4px rgba(0,0,0,0.04)',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: '#f59e0b',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    },
                  }}
                >
                  {/* Topo do Card: Autor, Linha, Data e Status */}
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}
                  >
                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          width: 22,
                          height: 22,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor: comment.userColor,
                          color: '#ffffff',
                        }}
                      >
                        {comment.userName.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography
                        sx={{ fontSize: '0.76rem', fontWeight: 700, color: 'text.primary' }}
                      >
                        {comment.userName} {comment.userId === currentUserId ? '(Você)' : ''}
                      </Typography>
                      {lineInfo && (
                        <Chip
                          label={`L.${lineInfo.lineNumber}`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: 'rgba(9, 136, 66, 0.1)',
                            color: '#059669',
                          }}
                        />
                      )}
                      <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                        • {comment.createdAt}
                      </Typography>
                    </Stack>

                    <Chip
                      label={isResolved ? 'Resolvido' : 'Pendente'}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        backgroundColor: isResolved
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(245, 158, 11, 0.15)',
                        color: isResolved ? '#10b981' : '#d97706',
                      }}
                    />
                  </Stack>

                  {/* Trecho citado do documento */}
                  {comment.selectedText && (
                    <Box
                      sx={{
                        mb: 0.8,
                        p: 0.6,
                        backgroundColor: 'rgba(245, 158, 11, 0.08)',
                        borderLeft: 2,
                        borderColor: '#f59e0b',
                        borderRadius: '0 4px 4px 0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 0.5,
                      }}
                    >
                      <Quote size={10} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                      <Typography
                        sx={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'text.secondary',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {comment.selectedText}
                      </Typography>
                    </Box>
                  )}

                  {/* Conteúdo do Comentário */}
                  <Typography
                    sx={{
                      fontSize: '0.78rem',
                      color: 'text.primary',
                      lineHeight: 1.45,
                      mb: 1,
                    }}
                  >
                    {comment.content}
                  </Typography>

                  {/* Thread de Respostas */}
                  {comment.replies && comment.replies.length > 0 && (
                    <Stack
                      spacing={0.8}
                      sx={{ pl: 1.5, mb: 1, borderLeft: 1, borderColor: 'divider' }}
                    >
                      {comment.replies.map((reply: CommentReply) => (
                        <Box key={reply.id} sx={{ py: 0.2 }}>
                          <Stack
                            direction="row"
                            spacing={0.6}
                            sx={{ alignItems: 'center', mb: 0.2 }}
                          >
                            <Avatar
                              sx={{
                                width: 16,
                                height: 16,
                                fontSize: '0.55rem',
                                backgroundColor: reply.userColor,
                                color: '#ffffff',
                              }}
                            >
                              {reply.userName.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                              {reply.userName}
                            </Typography>
                            <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                              {reply.createdAt}
                            </Typography>
                          </Stack>
                          <Typography
                            sx={{ fontSize: '0.74rem', color: 'text.secondary', pl: 2.2 }}
                          >
                            {reply.content}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}

                  {/* Input inline de Resposta (quando ativado) */}
                  {replyOpen[comment.id] && (
                    <Box sx={{ mb: 1, mt: 0.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Escreva uma resposta..."
                        value={replyInputs[comment.id] || ''}
                        onChange={(e) =>
                          setReplyInputs((prev) => ({ ...prev, [comment.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(comment.id);
                          }
                        }}
                        sx={{
                          '& .MuiInputBase-root': {
                            fontSize: '0.72rem',
                            height: 28,
                          },
                        }}
                      />
                      <Stack
                        direction="row"
                        spacing={0.6}
                        sx={{ justifyContent: 'flex-end', mt: 0.5 }}
                      >
                        <Button
                          size="small"
                          onClick={() => setReplyOpen((prev) => ({ ...prev, [comment.id]: false }))}
                          sx={{
                            fontSize: '0.65rem',
                            height: 20,
                            minWidth: 'auto',
                            textTransform: 'none',
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Send size={10} />}
                          onClick={() => handleSendReply(comment.id)}
                          disabled={!replyInputs[comment.id]?.trim()}
                          sx={{
                            fontSize: '0.65rem',
                            height: 20,
                            minWidth: 'auto',
                            textTransform: 'none',
                            backgroundColor: 'primary.main',
                          }}
                        >
                          Enviar
                        </Button>
                      </Stack>
                    </Box>
                  )}

                  <Divider sx={{ my: 0.8 }} />

                  {/* Ações do Card */}
                  <Stack
                    direction="row"
                    spacing={0.8}
                    sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyOpen((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }));
                      }}
                      sx={{
                        fontSize: '0.68rem',
                        height: 22,
                        px: 0.8,
                        minWidth: 'auto',
                        textTransform: 'none',
                        color: 'text.secondary',
                      }}
                    >
                      Responder ({comment.replies?.length || 0})
                    </Button>

                    <Stack direction="row" spacing={0.4}>
                      <Tooltip title={isResolved ? 'Reabrir discussão' : 'Marcar como Resolvido'}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onResolveComment(comment.id, isResolved ? 'open' : 'resolved');
                          }}
                          sx={{
                            width: 24,
                            height: 24,
                            color: isResolved ? '#10b981' : 'text.secondary',
                            '&:hover': { color: '#10b981' },
                          }}
                        >
                          {isResolved ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Excluir Comentário">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteComment(comment.id);
                          }}
                          sx={{
                            width: 24,
                            height: 24,
                            color: 'text.secondary',
                            '&:hover': { color: '#ef4444' },
                          }}
                        >
                          <Trash2 size={13} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Box>
  );
}
