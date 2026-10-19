/**
 * Centralized Query Key Factories seguindo as melhores práticas do TanStack Query.
 * Permite invalidação granular ou em cascata (e.g. invalidateQueries({ queryKey: articleKeys.all })).
 */

export const articleKeys = {
  all: ['articles'] as const,
  lists: () => [...articleKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...articleKeys.lists(), { ...(filters || {}) }] as const,
  details: () => [...articleKeys.all, 'detail'] as const,
  detail: (id: string) => [...articleKeys.details(), id] as const,
};

export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
};

export const editorKeys = {
  all: ['editor'] as const,
  document: (documentId: string) => [...editorKeys.all, 'document', documentId] as const,
  files: (documentId: string) => [...editorKeys.document(documentId), 'files'] as const,
  fileContent: (documentId: string, fileId: string) =>
    [...editorKeys.files(documentId), fileId, 'content'] as const,
  history: (documentId: string) => [...editorKeys.document(documentId), 'history'] as const,
};
