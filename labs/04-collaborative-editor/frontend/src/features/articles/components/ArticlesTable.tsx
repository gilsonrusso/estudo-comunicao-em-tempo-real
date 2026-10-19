import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import Button from '@mui/material/Button';
import type { GridColDef } from '@mui/x-data-grid';
import { GenericDataGrid } from '../../../components/common/GenericDataGrid';
import { TableContainer } from '../../../components/common/TableContainer';
import { TableHeaderFilterToolbar } from '../../../components/common/TableFilters';
import {
  createTitleSubtitleColumn,
  createChipColumn,
  createDateColumn,
  createBoldColumn,
  createActionsColumn,
} from '../../../components/common/dataGridColumns';
import { useTableFilters } from '../../../hooks/useTableFilters';
import { ArticleItem, ArticleFilters } from '../types/article.types';

export interface ArticlesTableProps {
  articles: ArticleItem[];
  isLoading: boolean;
  onOpenCreateModal: () => void;
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas as Categorias' },
  { value: 'SBC', label: 'SBC' },
  { value: 'IEEE Conference', label: 'IEEE' },
  { value: 'ACM Conference', label: 'ACM' },
  { value: 'Artigo Padrão', label: 'Artigo Geral' },
];

export function ArticlesTable({ articles, isLoading, onOpenCreateModal }: ArticlesTableProps) {
  const navigate = useNavigate();

  const { filters, debouncedSearch, isFiltered, resetFilters, searchProps, bindSelect } =
    useTableFilters<ArticleFilters>({
      search: '',
      category: '',
    });

  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesSearch =
        !debouncedSearch ||
        art.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        art.id.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesCategory = !filters.category || art.conference === filters.category;

      return matchesSearch && matchesCategory;
    });
  }, [articles, debouncedSearch, filters.category]);

  const columns = useMemo<GridColDef<ArticleItem>[]>(
    () => [
      createTitleSubtitleColumn<ArticleItem>(
        {
          field: 'title',
          headerName: 'Artigo Científico',
          flex: 2.2,
          minWidth: 280,
        },
        (params) => ({
          title: params.row.title,
          subtitle: `ID: ${params.row.id.substring(0, 8)}... • ${params.row.content.length} caracteres`,
          icon: <DescriptionIcon color="primary" fontSize="small" />,
        })
      ),
      createChipColumn<ArticleItem>(
        {
          field: 'conference',
          headerName: 'Template / Formato',
          flex: 1.2,
          minWidth: 160,
        },
        (params) => {
          const conf = params.row.conference || 'Geral';
          const color = conf.includes('IEEE')
            ? 'primary'
            : conf.includes('SBC')
              ? 'success'
              : conf.includes('ACM')
                ? 'secondary'
                : 'default';
          return {
            label: conf,
            color,
          };
        }
      ),
      createChipColumn<ArticleItem>(
        {
          field: 'hasCls',
          headerName: 'Classe (.cls)',
          flex: 1,
          minWidth: 130,
        },
        (params) => ({
          label: params.row.hasCls ? 'Incluso no Projeto' : 'Padrão LaTeX',
          color: params.row.hasCls ? 'info' : 'default',
          variant: 'outlined',
        })
      ),
      createBoldColumn<ArticleItem>({
        field: 'version',
        headerName: 'Versão',
        flex: 0.7,
        minWidth: 90,
      }),
      createDateColumn<ArticleItem>(
        {
          field: 'updatedAt',
          headerName: 'Última Edição',
          flex: 1.3,
          minWidth: 170,
        },
        (row) => row.updatedAt
      ),
      createActionsColumn<ArticleItem>(
        {
          field: 'actions',
          headerName: 'Ação',
          flex: 1.1,
          minWidth: 150,
        },
        [
          {
            label: 'Editar Artigo',
            icon: <EditIcon fontSize="small" />,
            color: 'primary',
            variant: 'contained',
            onClick: (row) => navigate(`/editor/${row.id}`),
          },
        ]
      ),
    ],
    [navigate]
  );

  return (
    <TableContainer>
      <AutoSizer
        renderProp={({ height = 600, width = 800 }: { height?: number; width?: number }) => (
          <GenericDataGrid<ArticleItem>
            rows={filteredArticles}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            height={height}
            width={width}
            rowHeight={64}
            emptyMessage="Nenhum artigo científico encontrado com os filtros selecionados."
            headerToolbarContent={
              <TableHeaderFilterToolbar<ArticleFilters>
                search={{
                  ...searchProps,
                  placeholder: 'Buscar por título do artigo científico...',
                }}
                selectFilters={[
                  {
                    id: 'category',
                    label: 'Template',
                    options: CATEGORY_OPTIONS,
                    ...bindSelect('category'),
                  },
                ]}
                actions={
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={onOpenCreateModal}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Novo Artigo
                  </Button>
                }
                clearFilters={{
                  visible: isFiltered,
                  onClear: resetFilters,
                }}
              />
            }
          />
        )}
      />
    </TableContainer>
  );
}
