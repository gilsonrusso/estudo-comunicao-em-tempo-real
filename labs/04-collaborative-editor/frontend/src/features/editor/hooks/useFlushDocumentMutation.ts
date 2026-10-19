import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EditorService, FlushDocumentResponse } from '../services/editor.service';
import { editorKeys } from '../../../api/queryKeys';

export function useFlushDocumentMutation(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation<FlushDocumentResponse, Error, void>({
    mutationFn: () => EditorService.flushDocument({ documentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: editorKeys.history(documentId) });
    },
  });
}
