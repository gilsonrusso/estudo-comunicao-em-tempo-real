import axios from 'axios';
import { httpClient, getErrorMessage } from '../../../api/httpClient';
import { ArticleItem, CreateArticleDTO } from '../types/article.types';

export type FetchArticlesRequest = {
  signal?: AbortSignal;
} | void;

export type FetchArticlesResponse = ArticleItem[];

export type FetchArticleByIdRequest = {
  id: string;
  signal?: AbortSignal;
};
export type FetchArticleByIdResponse = ArticleItem;

export type CreateArticleRequest = CreateArticleDTO & {
  signal?: AbortSignal;
};
export type CreateArticleResponse = ArticleItem;

export type CreateArticleFromZipRequest = {
  file: File;
  title?: string;
  signal?: AbortSignal;
};

export interface ArticlesServiceType {
  fetchArticles(request?: FetchArticlesRequest): Promise<FetchArticlesResponse>;
  fetchArticleById(request: FetchArticleByIdRequest): Promise<FetchArticleByIdResponse>;
  createArticle(request: CreateArticleRequest): Promise<CreateArticleResponse>;
  createArticleFromZip(request: CreateArticleFromZipRequest): Promise<CreateArticleResponse>;
}

export const ArticlesService: ArticlesServiceType = {
  async fetchArticles(request?: FetchArticlesRequest): Promise<FetchArticlesResponse> {
    const signal = request && typeof request === 'object' ? request.signal : undefined;
    try {
      const response = await httpClient.get<ArticleItem[]>('/api/documents', {
        signal,
      });
      return response.data.map((doc) => {
        let conference = 'Artigo Padrão';
        let hasCls = false;
        if (
          doc.content.includes('\\documentclass{IEEEtran}') ||
          doc.content.includes('[conference]{IEEEtran}')
        ) {
          conference = 'IEEE Conference';
          hasCls = true;
        } else if (
          doc.content.includes('\\documentclass[12pt]{sbc}') ||
          doc.content.includes('{sbc}')
        ) {
          conference = 'SBC';
          hasCls = true;
        } else if (doc.content.includes('\\documentclass[sigconf]{acmart}')) {
          conference = 'ACM Conference';
          hasCls = true;
        }
        return {
          ...doc,
          conference,
          hasCls,
        };
      });
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao carregar lista de artigos'));
    }
  },

  async fetchArticleById(request: FetchArticleByIdRequest): Promise<FetchArticleByIdResponse> {
    const { id, signal } = request;
    try {
      const response = await httpClient.get<ArticleItem>(`/api/documents/${id}`, {
        signal,
      });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, `Artigo ${id} não encontrado`));
    }
  },

  async createArticle(request: CreateArticleRequest): Promise<CreateArticleResponse> {
    const { signal, ...payload } = request;
    try {
      const response = await httpClient.post<ArticleItem>('/api/documents', payload, {
        signal,
      });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao criar artigo'));
    }
  },

  async createArticleFromZip(request: CreateArticleFromZipRequest): Promise<CreateArticleResponse> {
    const { file, title, signal } = request;
    const formData = new FormData();
    formData.append('file', file);
    if (title && title.trim()) {
      formData.append('title', title.trim());
    }

    try {
      const response = await httpClient.post<ArticleItem>('/api/documents/upload-zip', formData, {
        signal,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao importar artigo a partir do arquivo ZIP'));
    }
  },
};
