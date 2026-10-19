import { useQuery } from '@tanstack/react-query';
import { ArticlesService } from '../services/articles.service';
import { ArticleItem } from '../types/article.types';
import { articleKeys } from '../../../api/queryKeys';

export const ARTICLES_QUERY_KEY = articleKeys.lists();

export function useArticlesQuery() {
  return useQuery<ArticleItem[], Error>({
    queryKey: articleKeys.lists(),
    queryFn: ({ signal }) => ArticlesService.fetchArticles({ signal }),
  });
}
