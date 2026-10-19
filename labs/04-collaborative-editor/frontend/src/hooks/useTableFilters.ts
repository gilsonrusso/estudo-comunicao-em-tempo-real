import { useState, useMemo, useEffect, useCallback } from 'react';

export interface UseTableFiltersReturn<TFilterState extends Record<string, string>> {
  filters: TFilterState;
  debouncedSearch: string;
  isFiltered: boolean;
  setSearch: (value: string) => void;
  setFilter: <K extends keyof TFilterState>(key: K, value: TFilterState[K]) => void;
  resetFilters: () => void;
  searchProps: {
    value: string;
    onChange: (value: string) => void;
  };
  bindSelect: <K extends keyof TFilterState>(
    key: K
  ) => {
    value: string;
    onChange: (value: string) => void;
  };
}

export function useTableFilters<TFilterState extends Record<string, string>>(
  initialFilters: TFilterState,
  debounceMs = 300
): UseTableFiltersReturn<TFilterState> {
  const [filters, setFilters] = useState<TFilterState>(initialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(initialFilters.search || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search || '');
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [filters.search, debounceMs]);

  const setSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  const setFilter = useCallback(<K extends keyof TFilterState>(key: K, value: TFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const isFiltered = useMemo(() => {
    return Object.keys(initialFilters).some((key) => {
      return filters[key] !== initialFilters[key];
    });
  }, [filters, initialFilters]);

  const searchProps = useMemo(
    () => ({
      value: filters.search || '',
      onChange: setSearch,
    }),
    [filters.search, setSearch]
  );

  const bindSelect = useCallback(
    <K extends keyof TFilterState>(key: K) => ({
      value: filters[key] || '',
      onChange: (value: string) => setFilter(key, value as TFilterState[K]),
    }),
    [filters, setFilter]
  );

  return {
    filters,
    debouncedSearch,
    isFiltered,
    setSearch,
    setFilter,
    resetFilters,
    searchProps,
    bindSelect,
  };
}
