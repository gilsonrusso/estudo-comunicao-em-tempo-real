import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import {
  DataGrid,
  DataGridProps,
  GridColDef,
  GridRowIdGetter,
  GridValidRowModel,
} from '@mui/x-data-grid';

export interface GenericDataGridProps<TRow extends GridValidRowModel> {
  rows: readonly TRow[];
  columns: GridColDef<TRow>[];
  getRowId?: GridRowIdGetter<TRow>;
  loading?: boolean;
  height?: number;
  width?: number;
  rowHeight?: number;
  headerToolbarContent?: ReactNode;
  emptyMessage?: string;
  pageSizeOptions?: number[];
  initialPageSize?: number;
  dataGridProps?: Partial<DataGridProps<TRow>>;
}

export function GenericDataGrid<TRow extends GridValidRowModel>({
  rows,
  columns,
  getRowId,
  loading = false,
  height,
  width,
  rowHeight = 60,
  headerToolbarContent,
  emptyMessage = 'Nenhum registro encontrado.',
  pageSizeOptions = [10, 25, 50],
  initialPageSize = 10,
  dataGridProps,
}: GenericDataGridProps<TRow>) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: height ?? '100%',
        width: width ?? '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      {headerToolbarContent}

      <Box sx={{ flex: 1, minHeight: 0, width: '100%' }}>
        <DataGrid<TRow>
          rows={rows}
          columns={columns}
          getRowId={getRowId}
          loading={loading}
          rowHeight={rowHeight}
          pageSizeOptions={pageSizeOptions}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: initialPageSize },
            },
          }}
          disableRowSelectionOnClick
          slots={{
            noRowsOverlay: () => (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  p: 3,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </Box>
            ),
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'action.hover',
              borderBottom: 1,
              borderColor: 'divider',
              fontSize: '0.8125rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: 1,
              borderColor: 'divider',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.hover',
            },
            ...dataGridProps?.sx,
          }}
          {...dataGridProps}
        />
      </Box>
    </Card>
  );
}
