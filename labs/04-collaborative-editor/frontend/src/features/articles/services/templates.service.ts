import axios from 'axios';
import { httpClient, getErrorMessage } from '../../../api/httpClient';
import { TemplateItem, TemplateDetail, CreateTemplateDTO } from '../types/template.types';

export type FetchTemplatesRequest = {
  signal?: AbortSignal;
} | void;

export type FetchTemplatesResponse = TemplateItem[];

export type FetchTemplateByIdRequest = {
  id: string;
  signal?: AbortSignal;
};
export type FetchTemplateByIdResponse = TemplateDetail;

export type CreateTemplateRequest = CreateTemplateDTO & {
  signal?: AbortSignal;
};
export type CreateTemplateResponse = TemplateDetail;

export type CreateTemplateFromZipRequest = {
  file: File;
  name?: string;
  description?: string;
  category?: string;
  signal?: AbortSignal;
};

export interface TemplatesServiceType {
  fetchTemplates(request?: FetchTemplatesRequest): Promise<FetchTemplatesResponse>;
  fetchTemplateById(request: FetchTemplateByIdRequest): Promise<FetchTemplateByIdResponse>;
  createTemplate(request: CreateTemplateRequest): Promise<CreateTemplateResponse>;
  createTemplateFromZip(request: CreateTemplateFromZipRequest): Promise<CreateTemplateResponse>;
}

export const TemplatesService: TemplatesServiceType = {
  async fetchTemplates(request?: FetchTemplatesRequest): Promise<FetchTemplatesResponse> {
    const signal = request && typeof request === 'object' ? request.signal : undefined;
    try {
      const response = await httpClient.get<TemplateItem[]>('/api/templates', {
        signal,
      });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao carregar templates'));
    }
  },

  async fetchTemplateById(request: FetchTemplateByIdRequest): Promise<FetchTemplateByIdResponse> {
    const { id, signal } = request;
    try {
      const response = await httpClient.get<TemplateDetail>(`/api/templates/${id}`, {
        signal,
      });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, `Template ${id} não encontrado`));
    }
  },

  async createTemplate(request: CreateTemplateRequest): Promise<CreateTemplateResponse> {
    const { signal, ...payload } = request;
    try {
      const response = await httpClient.post<TemplateDetail>('/api/templates', payload, { signal });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao registrar template'));
    }
  },

  async createTemplateFromZip(request: CreateTemplateFromZipRequest): Promise<CreateTemplateResponse> {
    const { file, name, description, category, signal } = request;
    const formData = new FormData();
    formData.append('file', file);
    if (name && name.trim()) formData.append('name', name.trim());
    if (description && description.trim()) formData.append('description', description.trim());
    if (category) formData.append('category', category);

    try {
      const response = await httpClient.post<TemplateDetail>('/api/templates/upload-zip', formData, {
        signal,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao registrar template a partir do arquivo ZIP'));
    }
  },
};
