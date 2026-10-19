import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip, { ChipProps } from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button, { ButtonProps } from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { GridColDef, GridRenderCellParams, GridValidRowModel } from '@mui/x-data-grid';

export interface TitleSubtitleProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}

export function createTitleSubtitleColumn<TRow extends GridValidRowModel>(
  config: Partial<GridColDef<TRow>> & { field: string },
  getProps: (params: GridRenderCellParams<TRow>) => TitleSubtitleProps
): GridColDef<TRow> {
  return {
    ...config,
    renderCell: (params: GridRenderCellParams<TRow>) => {
      const { title, subtitle, icon } = getProps(params);
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
          {icon && <Box sx={{ display: 'flex', alignItems: 'center' }}>{icon}</Box>}
          <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      );
    },
  };
}

export interface ChipColumnProps {
  label: string;
  color?: ChipProps['color'];
  variant?: ChipProps['variant'];
}

export function createChipColumn<TRow extends GridValidRowModel>(
  config: Partial<GridColDef<TRow>> & { field: string },
  getProps: (params: GridRenderCellParams<TRow>) => ChipColumnProps
): GridColDef<TRow> {
  return {
    ...config,
    renderCell: (params: GridRenderCellParams<TRow>) => {
      const { label, color = 'default', variant = 'filled' } = getProps(params);
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip label={label} color={color} variant={variant} size="small" />
        </Box>
      );
    },
  };
}

export interface ActionItem<TRow extends GridValidRowModel> {
  label: string;
  icon?: ReactNode;
  color?: ButtonProps['color'];
  variant?: ButtonProps['variant'];
  onClick: (row: TRow) => void;
  disabled?: (row: TRow) => boolean;
}

export function createActionsColumn<TRow extends GridValidRowModel>(
  config: Partial<GridColDef<TRow>> & { field: string },
  actions: ActionItem<TRow>[] | ((row: TRow) => ActionItem<TRow>[])
): GridColDef<TRow> {
  return {
    ...config,
    sortable: false,
    filterable: false,
    renderCell: (params: GridRenderCellParams<TRow>) => {
      const resolvedActions = typeof actions === 'function' ? actions(params.row) : actions;
      return (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
          {resolvedActions.map((action, idx) => {
            const isDisabled = action.disabled ? action.disabled(params.row) : false;
            if (action.icon && !action.label) {
              return (
                <Tooltip key={idx} title={action.label || 'Ação'}>
                  <span>
                    <IconButton
                      size="small"
                      color={action.color || 'primary'}
                      onClick={() => action.onClick(params.row)}
                      disabled={isDisabled}
                    >
                      {action.icon}
                    </IconButton>
                  </span>
                </Tooltip>
              );
            }
            return (
              <Button
                key={idx}
                size="small"
                variant={action.variant || 'contained'}
                color={action.color || 'primary'}
                startIcon={action.icon}
                onClick={() => action.onClick(params.row)}
                disabled={isDisabled}
                sx={{ textTransform: 'none', fontWeight: 600, py: 0.5 }}
              >
                {action.label}
              </Button>
            );
          })}
        </Stack>
      );
    },
  };
}

export function createDateColumn<TRow extends GridValidRowModel>(
  config: Partial<GridColDef<TRow>> & { field: string },
  getDateString?: (row: TRow) => string | null | undefined
): GridColDef<TRow> {
  return {
    ...config,
    renderCell: (params: GridRenderCellParams<TRow>) => {
      const raw = getDateString ? getDateString(params.row) : (params.value as string);
      if (!raw)
        return (
          <Typography variant="caption" color="text.secondary">
            -
          </Typography>
        );
      const parsedDate = new Date(raw);
      const formatted = isNaN(parsedDate.getTime())
        ? String(raw)
        : parsedDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" color="text.secondary">
            {formatted}
          </Typography>
        </Box>
      );
    },
  };
}

export function createBoldColumn<TRow extends GridValidRowModel>(
  config: Partial<GridColDef<TRow>> & { field: string }
): GridColDef<TRow> {
  return {
    ...config,
    renderCell: (params: GridRenderCellParams<TRow>) => {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {String(params.value ?? '')}
          </Typography>
        </Box>
      );
    },
  };
}
