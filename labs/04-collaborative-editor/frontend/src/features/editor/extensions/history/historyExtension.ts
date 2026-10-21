import { Compartment, Extension, EditorState } from '@codemirror/state';
import {
  history,
  historyKeymap,
  historyField,
  undo,
  redo,
  undoSelection,
  redoSelection,
  undoDepth,
  redoDepth,
  canUndoSelection,
  canRedoSelection,
  isolateHistory,
  invertedEffects,
} from '@codemirror/commands';
import { Prec } from '@codemirror/state';
import { keymap, EditorView } from '@codemirror/view';

export { isolateHistory, invertedEffects, historyField };

export interface HistoryConfig {
  minDepth?: number;
  newGroupDelay?: number;
}

export interface HistoryStatus {
  canUndo: boolean;
  canRedo: boolean;
  undoDepth: number;
  redoDepth: number;
  canUndoSelection: boolean;
  canRedoSelection: boolean;
}

export const historyCompart = new Compartment();

export function createHistoryExtension(config: HistoryConfig = {}): Extension {
  const depth = config.minDepth ?? 300;
  const delay = config.newGroupDelay ?? 500;

  return [
    historyCompart.of(history({ minDepth: depth, newGroupDelay: delay })),
    Prec.default(keymap.of(historyKeymap)),
  ];
}

export function getHistoryStatus(state: EditorState): HistoryStatus {
  const uDepth = undoDepth(state);
  const rDepth = redoDepth(state);
  return {
    canUndo: uDepth > 0,
    canRedo: rDepth > 0,
    undoDepth: uDepth,
    redoDepth: rDepth,
    canUndoSelection: canUndoSelection(state),
    canRedoSelection: canRedoSelection(state),
  };
}

export function triggerUndo(view: EditorView): boolean {
  return undo(view);
}

export function triggerRedo(view: EditorView): boolean {
  return redo(view);
}

export function triggerUndoSelection(view: EditorView): boolean {
  return undoSelection(view);
}

export function triggerRedoSelection(view: EditorView): boolean {
  return redoSelection(view);
}
