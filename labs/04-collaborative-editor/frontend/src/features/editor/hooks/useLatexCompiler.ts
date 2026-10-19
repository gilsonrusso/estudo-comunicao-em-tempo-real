import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { EditorService, CompileLatexResponse } from '../services/editor.service';

export function useLatexCompiler(documentId: string) {
  const [lastCompiledAt, setLastCompiledAt] = useState<string | null>(null);

  const mutation = useMutation<CompileLatexResponse, Error, void>({
    mutationFn: () => EditorService.compileLatex({ documentId }),
    onSuccess: () => {
      setLastCompiledAt(new Date().toLocaleTimeString());
    },
  });

  const recompile = useCallback(async () => {
    try {
      await mutation.mutateAsync();
    } catch {
      // mutation.error já é atualizado reativamente pelo TanStack Query
    }
  }, [mutation]);

  return {
    pdfBlobUrl: mutation.data || null,
    isCompiling: mutation.isPending,
    compileError: mutation.error?.message || null,
    lastCompiledAt,
    recompile,
    compileMutation: mutation,
  };
}
