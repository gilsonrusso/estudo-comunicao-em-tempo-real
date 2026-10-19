import { useQuery } from '@tanstack/react-query';
import { TemplatesService } from '../services/templates.service';
import { TemplateItem } from '../types/template.types';
import { templateKeys } from '../../../api/queryKeys';

export const TEMPLATES_QUERY_KEY = templateKeys.lists();

export function useTemplatesQuery() {
  return useQuery<TemplateItem[], Error>({
    queryKey: templateKeys.lists(),
    queryFn: ({ signal }) => TemplatesService.fetchTemplates({ signal }),
  });
}
