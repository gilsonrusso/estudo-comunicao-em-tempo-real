import { useQuery } from '@tanstack/react-query';
import { EditorService, FetchDocumentHistoryResponse } from '../services/editor.service';
import { editorKeys } from '../../../api/queryKeys';

export function useDocumentHistoryQuery(documentId: string) {
  return useQuery<FetchDocumentHistoryResponse, Error>({
    queryKey: editorKeys.history(documentId),
    queryFn: ({ signal }) => EditorService.fetchDocumentHistory({ documentId, signal }),
    enabled: Boolean(documentId),
  });
}
