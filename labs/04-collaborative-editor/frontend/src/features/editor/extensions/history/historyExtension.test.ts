import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  createHistoryExtension,
  getHistoryStatus,
  triggerUndo,
  triggerRedo,
  historyField,
} from './historyExtension.js';
import { editorStateCache } from '../../services/editorStateCache.js';

describe('historyExtension and editorStateCache Unit Tests', () => {
  it('should track undoDepth and redoDepth correctly as document changes occur', () => {
    const state1 = EditorState.create({
      doc: 'Hello World',
      extensions: [createHistoryExtension({ minDepth: 50, newGroupDelay: 0 })],
    });

    const statusInitial = getHistoryStatus(state1);
    expect(statusInitial.canUndo).toBe(false);
    expect(statusInitial.canRedo).toBe(false);
    expect(statusInitial.undoDepth).toBe(0);

    // Cria uma alteração no documento
    const tr1 = state1.update({ changes: { from: 11, insert: '!' } });
    const state2 = tr1.state;
    const statusAfterInsert = getHistoryStatus(state2);
    expect(statusAfterInsert.canUndo).toBe(true);
    expect(statusAfterInsert.canRedo).toBe(false);
    expect(statusAfterInsert.undoDepth).toBe(1);
  });

  it('should execute triggerUndo and triggerRedo correctly on an EditorView instance', () => {
    const parent = document.createElement('div');
    const view = new EditorView({
      state: EditorState.create({
        doc: 'Start',
        extensions: [createHistoryExtension({ minDepth: 50, newGroupDelay: 0 })],
      }),
      parent,
    });

    // Digitação do usuário
    view.dispatch({ changes: { from: 5, insert: ' Modified' } });
    expect(view.state.doc.toString()).toBe('Start Modified');
    expect(getHistoryStatus(view.state).canUndo).toBe(true);

    // Executa Undo programaticamente
    const undoSuccess = triggerUndo(view);
    expect(undoSuccess).toBe(true);
    expect(view.state.doc.toString()).toBe('Start');
    expect(getHistoryStatus(view.state).canRedo).toBe(true);

    // Executa Redo programaticamente
    const redoSuccess = triggerRedo(view);
    expect(redoSuccess).toBe(true);
    expect(view.state.doc.toString()).toBe('Start Modified');

    view.destroy();
  });

  it('should preserve and restore undo history across file tab changes via editorStateCache', () => {
    editorStateCache.clear();
    const fileName = 'chapter1.tex';

    // Estado original do arquivo com digitação
    let state = EditorState.create({
      doc: '\\section{Introdução}',
      extensions: [createHistoryExtension()],
    });

    // Usuário edita o texto
    state = state.update({ changes: { from: 20, insert: '\nTexto adicionado.' } }).state;
    expect(getHistoryStatus(state).undoDepth).toBe(1);

    // Simula troca de aba: salva estado no cache
    editorStateCache.saveFileState(fileName, state);
    expect(editorStateCache.hasFileState(fileName)).toBe(true);

    // Simula volta para o arquivo: recupera do cache
    const cachedState = editorStateCache.getFileState(fileName);
    expect(cachedState).toBeDefined();

    const restoredState = EditorState.fromJSON(
      cachedState!,
      { extensions: [createHistoryExtension()] },
      { history: historyField }
    );

    // Comprova que o texto e a profundidade de histórico foram 100% preservados
    expect(restoredState.doc.toString()).toBe('\\section{Introdução}\nTexto adicionado.');
    expect(getHistoryStatus(restoredState).canUndo).toBe(true);
    expect(getHistoryStatus(restoredState).undoDepth).toBe(1);

    // Comprova que desfazer funciona no estado restaurado
    const parent = document.createElement('div');
    const view = new EditorView({ state: restoredState, parent });
    const undone = triggerUndo(view);
    expect(undone).toBe(true);
    expect(view.state.doc.toString()).toBe('\\section{Introdução}');

    view.destroy();
    editorStateCache.clear();
  });
});
