import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TemplatesService, CreateTemplateFromZipRequest } from '../services/templates.service';
import { TemplateDetail } from '../types/template.types';
import { templateKeys } from '../../../api/queryKeys';

export function useCreateTemplateFromZipMutation() {
  const queryClient = useQueryClient();

  return useMutation<TemplateDetail, Error, CreateTemplateFromZipRequest>({
    mutationFn: (payload) => TemplatesService.createTemplateFromZip(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}
