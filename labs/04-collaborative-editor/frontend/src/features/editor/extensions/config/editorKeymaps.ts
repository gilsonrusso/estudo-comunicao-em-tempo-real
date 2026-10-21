import { Prec, Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import {
  defaultKeymap,
  indentWithTab,
  toggleComment,
  moveLineUp,
  moveLineDown,
  copyLineUp,
  copyLineDown,
  deleteLine,
  cursorMatchingBracket,
} from '@codemirror/commands';
import { foldKeymap } from '@codemirror/language';
import { searchKeymap, selectNextOccurrence, gotoLine } from '@codemirror/search';
import { closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';

// 1. Alta Precedência: Comandos imediatos de edição, fechamento e seleção
export const highPriorityKeymap: Extension = Prec.high(
  keymap.of([
    ...closeBracketsKeymap,
    { key: 'Mod-/', run: toggleComment },
    { key: 'Mod-d', run: selectNextOccurrence, preventDefault: true },
  ])
);

// 2. Precedência Padrão: Navegação, busca, movimentação de linhas e indentação
export const standardKeymap: Extension = Prec.default(
  keymap.of([
    ...defaultKeymap,
    ...foldKeymap,
    ...searchKeymap,
    indentWithTab,
    { key: 'Alt-g', run: gotoLine },
    { key: 'Alt-ArrowUp', run: moveLineUp },
    { key: 'Alt-ArrowDown', run: moveLineDown },
    { key: 'Shift-Alt-ArrowUp', run: copyLineUp },
    { key: 'Shift-Alt-ArrowDown', run: copyLineDown },
    { key: 'Mod-Shift-k', run: deleteLine },
    { key: 'Ctrl-Shift-\\', run: cursorMatchingBracket },
  ])
);

// 3. Baixa Precedência: Atalhos de linters e ferramentas secundárias
export const lowPriorityKeymap: Extension = Prec.low(keymap.of(lintKeymap));
