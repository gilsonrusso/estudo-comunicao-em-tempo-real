import { ChangeEvent, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import SearchIcon from '@mui/icons-material/Search';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';

export interface SelectOption {
  value: string;
  label: string;
}

export interface TableSelectFilterConfig<TKey = string> {
  id: TKey;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

export interface TableHeaderFilterToolbarProps<TFilterState extends Record<string, string>> {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  selectFilters?: TableSelectFilterConfig<keyof TFilterState>[];
  actions?: ReactNode;
  clearFilters?: {
    visible: boolean;
    onClear: () => void;
    label?: string;
  };
}

export function TableSearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <TextField
      size="small"
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        },
      }}
      sx={{ minWidth: 240, flex: 2 }}
    />
  );
}

export function TableSelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}) {
  return (
    <FormControl size="small" sx={{ minWidth: 160, flex: 1.2 }}>
      <InputLabel id={`table-select-${label}-label`}>{label}</InputLabel>
      <Select
        labelId={`table-select-${label}-label`}
        value={value}
        label={label}
        onChange={(e: SelectChangeEvent) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export function ClearFiltersButton({
  onClear,
  label = 'Limpar Filtros',
}: {
  onClear: () => void;
  label?: string;
}) {
  return (
    <Button
      size="small"
      variant="outlined"
      color="inherit"
      startIcon={<FilterListOffIcon />}
      onClick={onClear}
      sx={{ textTransform: 'none', height: 40 }}
    >
      {label}
    </Button>
  );
}

export function TableHeaderFilterToolbar<TFilterState extends Record<string, string>>({
  search,
  selectFilters = [],
  actions,
  clearFilters,
}: TableHeaderFilterToolbarProps<TFilterState>) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 2,
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      {search && (
        <TableSearchInput
          value={search.value}
          onChange={search.onChange}
          placeholder={search.placeholder}
        />
      )}

      {selectFilters.map((sel) => (
        <TableSelectFilter
          key={String(sel.id)}
          label={sel.label}
          value={sel.value}
          onChange={sel.onChange}
          options={sel.options}
        />
      ))}

      {clearFilters?.visible && (
        <ClearFiltersButton onClear={clearFilters.onClear} label={clearFilters.label} />
      )}

      {actions && (
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>{actions}</Box>
      )}
    </Paper>
  );
}
