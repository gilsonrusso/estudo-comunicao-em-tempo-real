import { useState, useRef, useCallback, useEffect, ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import { ChevronRight, ChevronDown, GripVertical, GripHorizontal } from 'lucide-react';

export type SplitDirection = 'horizontal' | 'vertical';
export type SplitMode = 'split' | 'primary' | 'secondary';

export interface ResizableSplitLayoutProps {
  /** Painel primário (ex: Editor de código) */
  primary: ReactNode;
  /** Painel secundário (ex: Visualizador de PDF) */
  secondary: ReactNode;
  /** Direção de divisão: 'horizontal' (colunas lado a lado) ou 'vertical' (linhas empilhadas) */
  direction?: SplitDirection;
  /** Proporção padrão inicial do painel primário em porcentagem (0 a 100). Padrão: 50 */
  defaultRatio?: number;
  /** Proporção mínima em porcentagem para o painel primário. Padrão: 15 */
  minPrimaryRatio?: number;
  /** Proporção mínima em porcentagem para o painel secundário. Padrão: 15 */
  minSecondaryRatio?: number;
  /** Chave para persistir a proporção no localStorage (estilo autoSaveId do Overleaf) */
  storageKey?: string;
  /** Modo de exibição: 'split' (ambos visíveis), 'primary' (só primário), ou 'secondary' (só secundário) */
  mode?: SplitMode;
  /** Callback acionado quando a proporção do painel primário muda */
  onRatioChange?: (newRatio: number) => void;
  /** Callback acionado ao solicitar colapsar/expandir o painel secundário */
  onToggleSecondary?: () => void;
  /** Rótulo do tooltip do botão de colapsar/expandir */
  toggleTooltip?: string;
  /** Elementos extras a serem inseridos dentro do divisor (ex: controles de SyncTeX) */
  handleExtras?: ReactNode;
  /** Desabilita o redimensionamento manual */
  disabled?: boolean;
}

/**
 * Componente reutilizável e type-safe para layouts de divisão com redimensionamento contínuo
 * (Split Pane), com suporte a persistência no localStorage, duplo-clique para reset e
 * integração com o design system do Material-UI.
 */
export function ResizableSplitLayout({
  primary,
  secondary,
  direction = 'horizontal',
  defaultRatio = 50,
  minPrimaryRatio = 15,
  minSecondaryRatio = 15,
  storageKey,
  mode = 'split',
  onRatioChange,
  onToggleSecondary,
  toggleTooltip,
  handleExtras,
  disabled = false,
}: ResizableSplitLayoutProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Inicializa o ratio a partir do localStorage ou do defaultRatio fornecido
  const [ratio, setRatio] = useState<number>(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved !== null) {
          const parsed = parseFloat(saved);
          if (!Number.isNaN(parsed) && parsed >= minPrimaryRatio && parsed <= 100 - minSecondaryRatio) {
            return parsed;
          }
        }
      } catch {
        // Fallback para defaultRatio caso o localStorage esteja inacessível
      }
    }
    return defaultRatio;
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isHorizontal = direction === 'horizontal';

  // Persistir no localStorage quando o ratio muda
  const updateRatio = useCallback(
    (newRatio: number) => {
      const clamped = Math.max(minPrimaryRatio, Math.min(100 - minSecondaryRatio, newRatio));
      setRatio(clamped);
      onRatioChange?.(clamped);

      if (typeof window !== 'undefined' && storageKey) {
        try {
          window.localStorage.setItem(storageKey, clamped.toFixed(2));
        } catch {
          // Ignora erros de escrita no localStorage
        }
      }
    },
    [minPrimaryRatio, minSecondaryRatio, onRatioChange, storageKey]
  );

  // Manipulação de Pointer Events para arraste suave
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || mode !== 'split' || event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    },
    [disabled, mode]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let calculatedRatio: number;

      if (isHorizontal) {
        const pointerX = event.clientX - rect.left;
        calculatedRatio = (pointerX / rect.width) * 100;
      } else {
        const pointerY = event.clientY - rect.top;
        calculatedRatio = (pointerY / rect.height) * 100;
      }

      updateRatio(calculatedRatio);
    },
    [isDragging, isHorizontal, updateRatio]
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignora caso o ponteiro já tenha sido liberado
      }
      setIsDragging(false);
    },
    [isDragging]
  );

  // Duplo-clique no divisor restaura para 50/50 (ou defaultRatio)
  const handleDoubleClick = useCallback(() => {
    if (disabled || mode !== 'split') return;
    updateRatio(defaultRatio);
  }, [defaultRatio, disabled, mode, updateRatio]);

  // Se o usuário alternar para modo primary ou secondary, as porcentagens são ignoradas
  const showPrimary = mode === 'split' || mode === 'primary';
  const showSecondary = mode === 'split' || mode === 'secondary';

  const primaryFlexBasis = mode === 'split' ? `${ratio}%` : '100%';
  const secondaryFlexBasis = mode === 'split' ? `${100 - ratio}%` : '100%';

  // Prevenção de seleção de texto durante o arraste
  useEffect(() => {
    if (isDragging) {
      const originalUserSelect = document.body.style.userSelect;
      const originalCursor = document.body.style.cursor;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';

      return () => {
        document.body.style.userSelect = originalUserSelect;
        document.body.style.cursor = originalCursor;
      };
    }
  }, [isDragging, isHorizontal]);

  return (
    <Box
      ref={containerRef}
      data-testid="resizable-split-container"
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'background.default',
      }}
    >
      {/* Painel Primário */}
      {showPrimary && (
        <Box
          data-testid="split-primary-panel"
          sx={{
            flexGrow: 0,
            flexShrink: 0,
            flexBasis: primaryFlexBasis,
            width: isHorizontal ? primaryFlexBasis : '100%',
            height: isHorizontal ? '100%' : primaryFlexBasis,
            display: 'flex',
            overflow: 'hidden',
            position: 'relative',
            // Desativa pointer-events em iframes/canvas durante o dragging para não prender o mouse
            pointerEvents: isDragging ? 'none' : 'auto',
          }}
        >
          {primary}
        </Box>
      )}

      {/* Divisor Interativo (Resize Handle) */}
      {mode === 'split' && (
        <Box
          role="separator"
          aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
          aria-valuenow={Math.round(ratio)}
          aria-valuemin={minPrimaryRatio}
          aria-valuemax={100 - minSecondaryRatio}
          aria-label="Divisor de painéis redimensionável"
          tabIndex={0}
          data-testid="split-resize-handle"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          sx={{
            flexShrink: 0,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            cursor: disabled ? 'default' : isHorizontal ? 'col-resize' : 'row-resize',
            backgroundColor: isDragging
              ? alpha(theme.palette.primary.main, 0.25)
              : theme.palette.divider,
            transition: isDragging ? 'none' : 'background-color 0.2s ease',
            touchAction: 'none',
            ...(isHorizontal
              ? {
                  width: '9px',
                  height: '100%',
                  mx: '-4px', // Permite que a área de toque seja de 9px mantendo a linha fina visual
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: '4px',
                    width: '1px',
                    backgroundColor: isDragging
                      ? theme.palette.primary.main
                      : theme.palette.divider,
                  },
                }
              : {
                  height: '9px',
                  width: '100%',
                  my: '-4px',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '4px',
                    height: '1px',
                    backgroundColor: isDragging
                      ? theme.palette.primary.main
                      : theme.palette.divider,
                  },
                }),
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.2),
              '&::after': {
                backgroundColor: theme.palette.primary.main,
              },
            },
          }}
        >
          {/* Grip central sutil */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: isHorizontal ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDragging ? 'primary.main' : 'text.disabled',
              pointerEvents: 'none',
            }}
          >
            {isHorizontal ? <GripVertical size={12} /> : <GripHorizontal size={12} />}
          </Box>

          {/* Botão de Toggle embutido (Estilo Overleaf) */}
          {onToggleSecondary && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: isHorizontal ? '50%' : undefined,
                transform: isHorizontal ? 'translateX(-50%)' : undefined,
                zIndex: 11,
              }}
            >
              <Tooltip title={toggleTooltip ?? 'Recolher / Expandir'} placement={isHorizontal ? 'right' : 'bottom'}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSecondary();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  sx={{
                    width: 20,
                    height: 20,
                    padding: 0,
                    backgroundColor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    boxShadow: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  {isHorizontal ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Elementos Extras (ex: Controles SyncTeX) */}
          {handleExtras && (
            <Box
              sx={{
                position: 'absolute',
                top: 40,
                left: isHorizontal ? '50%' : undefined,
                transform: isHorizontal ? 'translateX(-50%)' : undefined,
                zIndex: 11,
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {handleExtras}
            </Box>
          )}
        </Box>
      )}

      {/* Painel Secundário */}
      {showSecondary && (
        <Box
          data-testid="split-secondary-panel"
          sx={{
            flexGrow: 0,
            flexShrink: 0,
            flexBasis: secondaryFlexBasis,
            width: isHorizontal ? secondaryFlexBasis : '100%',
            height: isHorizontal ? '100%' : secondaryFlexBasis,
            display: 'flex',
            overflow: 'hidden',
            position: 'relative',
            pointerEvents: isDragging ? 'none' : 'auto',
          }}
        >
          {secondary}
        </Box>
      )}
    </Box>
  );
}
