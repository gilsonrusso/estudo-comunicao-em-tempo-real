export interface ArticleItem {
  id: string;
  title: string;
  content: string;
  version: number;
  updatedAt: string;
  conference?: string;
  templateName?: string;
  hasCls?: boolean;
}

export interface CreateArticleDTO {
  title: string;
  templateId?: string;
  initialContent?: string;
}

export interface ArticleFilters extends Record<string, string> {
  search: string;
  category: string;
}
