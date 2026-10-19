import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  EditorService,
  CreateProjectFileResponse,
  UploadProjectFileResponse,
  DeleteProjectFileResponse,
} from '../services/editor.service';
import { editorKeys } from '../../../api/queryKeys';

export function useCreateProjectFileMutation(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation<CreateProjectFileResponse, Error, { path: string; content?: string }>({
    mutationFn: ({ path, content }) =>
      EditorService.createProjectFile({ documentId, path, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: editorKeys.files(documentId) });
    },
  });
}

export function useUploadProjectFileMutation(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation<UploadProjectFileResponse, Error, File>({
    mutationFn: (file) => EditorService.uploadProjectFile({ documentId, file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: editorKeys.files(documentId) });
    },
  });
}

export function useDeleteProjectFileMutation(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation<DeleteProjectFileResponse, Error, string>({
    mutationFn: (fileId) => EditorService.deleteProjectFile({ documentId, fileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: editorKeys.files(documentId) });
    },
  });
}
