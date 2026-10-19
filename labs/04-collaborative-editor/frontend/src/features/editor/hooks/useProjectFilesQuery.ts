import { useQuery } from '@tanstack/react-query';
import { EditorService, FetchProjectFilesResponse } from '../services/editor.service';
import { editorKeys } from '../../../api/queryKeys';

export function useProjectFilesQuery(documentId: string) {
  return useQuery<FetchProjectFilesResponse, Error>({
    queryKey: editorKeys.files(documentId),
    queryFn: ({ signal }) => EditorService.fetchProjectFiles({ documentId, signal }),
    enabled: Boolean(documentId),
  });
}
