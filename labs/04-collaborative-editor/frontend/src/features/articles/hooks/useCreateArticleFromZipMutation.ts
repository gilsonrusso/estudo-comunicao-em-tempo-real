import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArticlesService, CreateArticleFromZipRequest } from '../services/articles.service';
import { ArticleItem } from '../types/article.types';
import { articleKeys } from '../../../api/queryKeys';

export function useCreateArticleFromZipMutation() {
  const queryClient = useQueryClient();

  return useMutation<ArticleItem, Error, CreateArticleFromZipRequest>({
    mutationFn: (payload) => ArticlesService.createArticleFromZip(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: articleKeys.all });
    },
  });
}
