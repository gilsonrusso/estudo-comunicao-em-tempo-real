import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArticlesService } from '../services/articles.service';
import { CreateArticleDTO, ArticleItem } from '../types/article.types';
import { articleKeys } from '../../../api/queryKeys';

export function useCreateArticleMutation() {
  const queryClient = useQueryClient();

  return useMutation<ArticleItem, Error, CreateArticleDTO>({
    mutationFn: (payload) => ArticlesService.createArticle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: articleKeys.all });
    },
  });
}
