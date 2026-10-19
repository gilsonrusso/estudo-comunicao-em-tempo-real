import axios from 'axios';
import { httpClient, getErrorMessage } from '../../../api/httpClient';
import { DocumentSnapshot, DeltaOperation } from '../types/collab.types';
import { ProjectFile, RawProjectFile } from '../types/files.types';

// Tipagens Request / Response estritas com suporte a AbortSignal
export type FetchDocumentHistoryRequest = {
  documentId: string;
  signal?: AbortSignal;
};

export type FetchDocumentHistoryResponse = {
  snapshots: DocumentSnapshot[];
  operations: DeltaOperation[];
};

export type FlushDocumentRequest = {
  documentId: string;
  signal?: AbortSignal;
};

export type FlushDocumentResponse = DocumentSnapshot | null;

export type CompileLatexRequest = {
  documentId: string;
  signal?: AbortSignal;
};

export type CompileLatexResponse = string;

export type FetchFileContentRequest = {
  documentId: string;
  fileId: string;
  signal?: AbortSignal;
};

export type FetchFileContentResponse = string;

export type UpdateFileContentRequest = {
  documentId: string;
  fileId: string;
  content: string;
  signal?: AbortSignal;
};

export type UpdateFileContentResponse = void;

export type FetchProjectFilesRequest = {
  documentId: string;
  signal?: AbortSignal;
};

export type FetchProjectFilesResponse = ProjectFile[];

export type CreateProjectFileRequest = {
  documentId: string;
  path: string;
  content?: string;
  signal?: AbortSignal;
};

export type CreateProjectFileResponse = ProjectFile;

export type UploadProjectFileRequest = {
  documentId: string;
  file: File;
  signal?: AbortSignal;
};

export type UploadProjectFileResponse = ProjectFile;

export type DeleteProjectFileRequest = {
  documentId: string;
  fileId: string;
  signal?: AbortSignal;
};

export type DeleteProjectFileResponse = void;

export interface EditorServiceType {
  fetchDocumentHistory(request: FetchDocumentHistoryRequest): Promise<FetchDocumentHistoryResponse>;
  flushDocument(request: FlushDocumentRequest): Promise<FlushDocumentResponse>;
  compileLatex(request: CompileLatexRequest): Promise<CompileLatexResponse>;
  fetchFileContent(request: FetchFileContentRequest): Promise<FetchFileContentResponse>;
  updateFileContent(request: UpdateFileContentRequest): Promise<UpdateFileContentResponse>;
  fetchProjectFiles(request: FetchProjectFilesRequest): Promise<FetchProjectFilesResponse>;
  createProjectFile(request: CreateProjectFileRequest): Promise<CreateProjectFileResponse>;
  uploadProjectFile(request: UploadProjectFileRequest): Promise<UploadProjectFileResponse>;
  deleteProjectFile(request: DeleteProjectFileRequest): Promise<DeleteProjectFileResponse>;
}

export const EditorService: EditorServiceType = {
  async fetchDocumentHistory(
    request: FetchDocumentHistoryRequest
  ): Promise<FetchDocumentHistoryResponse> {
    const { documentId, signal } = request;
    try {
      const response = await httpClient.get<{
        snapshots: DocumentSnapshot[];
        operations: DeltaOperation[];
      }>(`/api/documents/${documentId}/history`, { signal });
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao carregar histórico do documento'));
    }
  },

  async flushDocument(request: FlushDocumentRequest): Promise<FlushDocumentResponse> {
    const { documentId, signal } = request;
    try {
      const response = await httpClient.post<{ snapshot?: DocumentSnapshot }>(
        `/api/documents/${documentId}/flush`,
        {},
        { signal }
      );
      return response.data.snapshot || null;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao gravar snapshot'));
    }
  },

  async compileLatex(request: CompileLatexRequest): Promise<CompileLatexResponse> {
    const { documentId, signal } = request;
    try {
      const response = await httpClient.post<Blob>(
        `/api/documents/${documentId}/compile`,
        {},
        { responseType: 'blob', signal }
      );
      return URL.createObjectURL(response.data);
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        let errorDetails: string | null = null;
        try {
          const text = await error.response.data.text();
          const errJson = JSON.parse(text) as { error?: string; details?: string };
          errorDetails = errJson.details || errJson.error || null;
        } catch {
          // Resposta não é JSON
        }
        if (errorDetails) {
          throw new Error(errorDetails);
        }
      }
      throw new Error(getErrorMessage(error, 'Erro na compilação do LaTeX'));
    }
  },

  async fetchFileContent(request: FetchFileContentRequest): Promise<FetchFileContentResponse> {
    const { documentId, fileId, signal } = request;
    try {
      const response = await httpClient.get<{ content?: string }>(
        `/api/documents/${documentId}/files/${fileId}/content`,
        { signal }
      );
      return response.data.content || '';
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao carregar conteúdo do arquivo'));
    }
  },

  async updateFileContent(request: UpdateFileContentRequest): Promise<UpdateFileContentResponse> {
    const { documentId, fileId, content, signal } = request;
    try {
      await httpClient.put(
        `/api/documents/${documentId}/files/${fileId}/content`,
        { content },
        { signal }
      );
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao atualizar arquivo'));
    }
  },

  async fetchProjectFiles(request: FetchProjectFilesRequest): Promise<FetchProjectFilesResponse> {
    const { documentId, signal } = request;
    try {
      const response = await httpClient.get<RawProjectFile[]>(
        `/api/documents/${documentId}/files`,
        { signal }
      );
      return response.data.map((item) => ({
        id: item.id,
        name: item.path,
        type:
          item.fileType === 'image'
            ? 'image'
            : item.fileType === 'bib'
              ? 'bib'
              : item.fileType === 'tex'
                ? 'tex'
                : 'other',
        sizeBytes: item.sizeBytes,
        mimeType: item.mimeType,
        storageKey: item.storageKey ?? undefined,
        content: item.content,
      }));
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao listar arquivos do projeto'));
    }
  },

  async createProjectFile(request: CreateProjectFileRequest): Promise<CreateProjectFileResponse> {
    const { documentId, path, content = '', signal } = request;
    try {
      const response = await httpClient.post<RawProjectFile>(
        `/api/documents/${documentId}/files/create`,
        { path, content },
        { signal }
      );
      const created = response.data;
      return {
        id: created.id,
        name: created.path,
        type: path.endsWith('.bib') ? 'bib' : path.endsWith('.tex') ? 'tex' : 'other',
        content: created.content,
        sizeBytes: created.sizeBytes,
        mimeType: created.mimeType,
        storageKey: created.storageKey ?? undefined,
      };
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao criar arquivo no projeto'));
    }
  },

  async uploadProjectFile(request: UploadProjectFileRequest): Promise<UploadProjectFileResponse> {
    const { documentId, file, signal } = request;
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);

      const response = await httpClient.post<RawProjectFile>(
        `/api/documents/${documentId}/files/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal,
        }
      );
      const uploaded = response.data;
      return {
        id: uploaded.id,
        name: uploaded.path,
        type:
          uploaded.fileType === 'image'
            ? 'image'
            : uploaded.fileType === 'bib'
              ? 'bib'
              : uploaded.fileType === 'tex'
                ? 'tex'
                : 'other',
        sizeBytes: uploaded.sizeBytes,
        mimeType: uploaded.mimeType,
        storageKey: uploaded.storageKey ?? undefined,
        content: uploaded.content,
      };
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha no upload do arquivo'));
    }
  },

  async deleteProjectFile(request: DeleteProjectFileRequest): Promise<DeleteProjectFileResponse> {
    const { documentId, fileId, signal } = request;
    try {
      await httpClient.delete(`/api/documents/${documentId}/files/${fileId}`, {
        signal,
      });
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(getErrorMessage(error, 'Falha ao deletar arquivo'));
    }
  },
};
