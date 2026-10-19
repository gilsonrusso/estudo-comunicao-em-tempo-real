import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TemplatesService } from '../services/templates.service';
import { CreateTemplateDTO, TemplateDetail } from '../types/template.types';
import { templateKeys } from '../../../api/queryKeys';

export function useCreateTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation<TemplateDetail, Error, CreateTemplateDTO>({
    mutationFn: (payload) => TemplatesService.createTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}
