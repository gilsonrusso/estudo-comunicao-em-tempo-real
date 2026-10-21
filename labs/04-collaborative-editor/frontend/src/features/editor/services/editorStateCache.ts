import { EditorState } from '@codemirror/state';
import { historyField } from '@codemirror/commands';

export interface SerializedFileEditorState {
  doc?: string;
  selection?: { anchor: number; head?: number };
  history?: unknown;
  [key: string]: unknown;
}

class EditorStateCacheService {
  private cache = new Map<string, SerializedFileEditorState>();

  saveFileState(fileKey: string, state: EditorState): void {
    if (!fileKey) return;
    try {
      const serialized = state.toJSON({ history: historyField }) as SerializedFileEditorState;
      this.cache.set(fileKey, serialized);
    } catch {
      // Fallback seguro caso algum campo customizado não suporte toJSON
      this.cache.set(fileKey, {
        doc: state.doc.toString(),
        selection: { anchor: state.selection.main.anchor, head: state.selection.main.head },
      });
    }
  }

  getFileState(fileKey: string): SerializedFileEditorState | undefined {
    return this.cache.get(fileKey);
  }

  removeFileState(fileKey: string): boolean {
    return this.cache.delete(fileKey);
  }

  clear(): void {
    this.cache.clear();
  }

  hasFileState(fileKey: string): boolean {
    return this.cache.has(fileKey);
  }
}

export const editorStateCache = new EditorStateCacheService();
