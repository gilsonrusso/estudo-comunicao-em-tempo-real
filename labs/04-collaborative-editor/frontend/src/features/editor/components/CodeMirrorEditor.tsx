import { useRef, useEffect, useState } from 'react';
import {
  EditorState,
  StateField,
  StateEffect,
  RangeSetBuilder,
  Compartment,
  Text,
} from '@codemirror/state';
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  Decoration,
  DecorationSet,
  WidgetType,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  hoverTooltip,
  showTooltip,
  Tooltip,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  StreamLanguage,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldGutter,
  codeFolding,
  foldKeymap,
  foldService,
  indentOnInput,
} from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import {
  autocompletion,
  snippetCompletion,
  CompletionContext,
  CompletionResult,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { lintGutter, linter, lintKeymap, Diagnostic, forceLinting } from '@codemirror/lint';
import { DeltaOperation, RemoteCursor, SaveStatus, ReviewComment } from '../types/collab.types';
import { checkGrammarAndSpelling } from '../services/languagetool.service.js';
import { EditorSettings, DEFAULT_SETTINGS } from '../../../types/settings.js';
import { getContrastColor, hexToRgba } from '../../../utils/color.js';
import { CheckCircle2, Clock, CloudUpload, UserCheck, Code2, MessageSquare, X } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';

export interface EditorLineLayoutInfo {
  commentLineTops: Record<string, { lineNumber: number; top: number }>;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface CodeMirrorEditorProps {
  content: string;
  version: number;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  remoteCursors: RemoteCursor[];
  activeEditor: { userName: string; color: string; action: string } | null;
  currentUserColor?: string;
  currentUserName?: string;
  theme?: 'dark' | 'light';
  bibContent?: string;
  compileError?: string | null;
  settings?: EditorSettings;
  comments?: ReviewComment[];
  activeCommentId?: string | null;
  pendingCommentSelection?: { from: number; to: number; selectedText: string } | null;
  onLinePositionsChange?: (info: EditorLineLayoutInfo) => void;
  externalScrollTop?: number;
  onSelectComment?: (commentId: string | null) => void;
  onRequestAddComment?: (from: number, to: number, selectedText: string, content?: string) => void;
  onApplyLocalDelta: (delta: Omit<DeltaOperation, 'userId' | 'userName' | 'timestamp'>) => void;
  onCursorMove: (position: number, selectionStart?: number, selectionEnd?: number) => void;
}

// Widget visual para o cursor de outro colaborador
class CursorWidget extends WidgetType {
  constructor(
    readonly userName: string,
    readonly color: string
  ) {
    super();
  }

  eq(other: CursorWidget): boolean {
    return other.userName === this.userName && other.color === this.color;
  }

  toDOM() {
    const wrap = document.createElement('span');
    wrap.className = 'cm-collaborator-cursor';
    wrap.style.position = 'relative';
    wrap.style.display = 'inline-block';
    wrap.style.width = '0';
    wrap.style.height = '1.25em';
    wrap.style.verticalAlign = 'text-bottom';
    wrap.style.pointerEvents = 'none';
    wrap.style.userSelect = 'none';

    // Barra do cursor com exatos 2px de largura em todos os autores (sem distorção de blur/glow)
    const bar = document.createElement('span');
    bar.style.position = 'absolute';
    bar.style.left = '-1px';
    bar.style.top = '0';
    bar.style.width = '2px';
    bar.style.height = '100%';
    bar.style.backgroundColor = this.color;
    bar.style.borderRadius = '1px';
    bar.style.pointerEvents = 'none';
    // Delimitação sutil de 0.5px para destacar em qualquer fundo (light ou dark)
    bar.style.boxShadow = '0 0 0 0.5px rgba(0, 0, 0, 0.3)';

    // Tag suspensa com o nome do autor e cor de texto contrastante
    const flag = document.createElement('span');
    flag.innerText = this.userName;
    flag.style.position = 'absolute';
    flag.style.bottom = '100%';
    flag.style.left = '-1px';
    flag.style.backgroundColor = this.color;
    flag.style.color = getContrastColor(this.color);
    flag.style.fontSize = '10px';
    flag.style.fontWeight = '600';
    flag.style.lineHeight = '1';
    flag.style.padding = '2px 5px';
    flag.style.borderRadius = '3px 3px 3px 0';
    flag.style.whiteSpace = 'nowrap';
    flag.style.pointerEvents = 'none';
    flag.style.userSelect = 'none';
    flag.style.zIndex = '20';
    flag.style.transform = 'translateY(-2px)';
    flag.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';

    wrap.appendChild(bar);
    wrap.appendChild(flag);
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

// StateEffects para atualizar cursores sem recriar o editor
const setRemoteCursorsEffect = StateEffect.define<RemoteCursor[]>();

interface CursorDecoItem {
  from: number;
  to: number;
  deco: Decoration;
}

// Constrói com segurança decorações de cursor, seleção e realce de linha de colaboradores (estilo Overleaf/VSCode)
function buildCursorDecorations(cursors: RemoteCursor[], doc: Text): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  if (!cursors || cursors.length === 0) return builder.finish();

  const items: CursorDecoItem[] = [];
  const linesDecorated = new Set<number>();

  for (const cursor of cursors) {
    const clampedPos = Math.max(0, Math.min(cursor.position, doc.length));
    const line = doc.lineAt(clampedPos);

    // 1. No Overleaf e VSCode, a linha onde o colaborador clica/está fica com realce suave na cor do autor
    if (!linesDecorated.has(line.number)) {
      linesDecorated.add(line.number);
      items.push({
        from: line.from,
        to: line.from,
        deco: Decoration.line({
          attributes: {
            class: 'cm-remote-active-line',
            style: `background-color: ${hexToRgba(cursor.color, 0.12)};`,
          },
        }),
      });
    }

    // 2. Se o autor selecionou um trecho de texto, exibe a seleção remota colorida (estilo Overleaf / Google Docs)
    if (
      cursor.selectionStart !== undefined &&
      cursor.selectionEnd !== undefined &&
      cursor.selectionStart < cursor.selectionEnd
    ) {
      const clampedStart = Math.max(0, Math.min(cursor.selectionStart, doc.length));
      const clampedEnd = Math.max(0, Math.min(cursor.selectionEnd, doc.length));

      if (clampedStart < clampedEnd) {
        items.push({
          from: clampedStart,
          to: clampedEnd,
          deco: Decoration.mark({
            class: 'cm-collaborator-selection',
            attributes: {
              style: `background-color: ${hexToRgba(cursor.color, 0.28)}; border-radius: 2px;`,
            },
          }),
        });
      }
    }

    // 3. Cursor e tag com o nome do colaborador
    items.push({
      from: clampedPos,
      to: clampedPos,
      deco: Decoration.widget({
        widget: new CursorWidget(cursor.userName, cursor.color),
        side: 1,
      }),
    });
  }

  // Ordenação estrita exigida pelo RangeSetBuilder do CodeMirror:
  // 1. Posição `from` ascendente
  // 2. Se a posição `from` for idêntica, ordena pelo startSide interno (line: -200M, widget: 100M, mark: 500M)
  items.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from;
    return a.deco.startSide - b.deco.startSide;
  });

  for (const item of items) {
    builder.add(item.from, item.to, item.deco);
  }

  return builder.finish();
}

interface RemoteCursorsState {
  cursors: RemoteCursor[];
  decorations: DecorationSet;
}

// Campo do CodeMirror para renderizar cursores remotos persistentes durante a digitação
const remoteCursorsField = StateField.define<RemoteCursorsState>({
  create() {
    return { cursors: [], decorations: Decoration.none };
  },
  update(state, tr) {
    let cursors = state.cursors;
    let shouldRebuild = false;

    for (const effect of tr.effects) {
      if (effect.is(setRemoteCursorsEffect)) {
        cursors = effect.value;
        shouldRebuild = true;
      }
    }

    // Reconstrói decorações sempre que novos cursores chegam OU quando o documento muda
    // Isso garante que o cursor e o realce da linha NUNCA desapareçam enquanto o outro autor está digitando!
    if (shouldRebuild || tr.docChanged) {
      return {
        cursors,
        decorations: buildCursorDecorations(cursors, tr.newDoc),
      };
    }

    return state;
  },
  provide: (f) => EditorView.decorations.from(f, (val) => val.decorations),
});

// Efeitos e Campo de Estado para Comentários de Revisão Inline (Estilo Overleaf)
export const setCommentsEffect = StateEffect.define<ReviewComment[]>();
export const setActiveCommentEffect = StateEffect.define<string | null>();
export const setPendingSelectionEffect = StateEffect.define<{
  from: number;
  to: number;
  selectedText: string;
} | null>();

interface CommentsFieldState {
  comments: ReviewComment[];
  activeId: string | null;
  pendingSelection: { from: number; to: number; selectedText: string } | null;
  decorations: DecorationSet;
}

function buildCommentDecorations(
  comments: ReviewComment[],
  activeId: string | null,
  pendingSelection: { from: number; to: number; selectedText: string } | null | undefined,
  doc: Text
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const items: { from: number; to: number; deco: Decoration }[] = [];

  if (comments && comments.length > 0) {
    for (const comment of comments) {
      const from = Math.max(0, Math.min(comment.from, doc.length));
      const to = Math.max(from, Math.min(comment.to, doc.length));

      if (from < to) {
        const isActive = comment.id === activeId;
        const isResolved = comment.status === 'resolved';

        items.push({
          from,
          to,
          deco: Decoration.mark({
            class: `cm-comment-mark ${isActive ? 'cm-comment-mark-active' : isResolved ? 'cm-comment-mark-resolved' : 'cm-comment-mark-open'}`,
            attributes: {
              'data-comment-id': comment.id,
              title: `💬 ${comment.userName}: "${comment.content}"`,
            },
          }),
        });
      }
    }
  }

  // Realce de rascunho enquanto o usuário redige um novo comentário
  if (pendingSelection && pendingSelection.from < pendingSelection.to) {
    const from = Math.max(0, Math.min(pendingSelection.from, doc.length));
    const to = Math.max(from, Math.min(pendingSelection.to, doc.length));
    if (from < to) {
      items.push({
        from,
        to,
        deco: Decoration.mark({
          class: 'cm-comment-mark cm-comment-mark-draft',
          attributes: {
            title: 'Novo comentário / sugestão sendo criado...',
          },
        }),
      });
    }
  }

  items.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from;
    return a.to - b.to;
  });

  for (const item of items) {
    builder.add(item.from, item.to, item.deco);
  }

  return builder.finish();
}

export const commentsField = StateField.define<CommentsFieldState>({
  create() {
    return { comments: [], activeId: null, pendingSelection: null, decorations: Decoration.none };
  },
  update(state, tr) {
    let comments = state.comments;
    let activeId = state.activeId;
    let pendingSelection = state.pendingSelection;
    let shouldRebuild = false;

    for (const effect of tr.effects) {
      if (effect.is(setCommentsEffect)) {
        comments = effect.value;
        shouldRebuild = true;
      }
      if (effect.is(setActiveCommentEffect)) {
        activeId = effect.value;
        shouldRebuild = true;
      }
      if (effect.is(setPendingSelectionEffect)) {
        pendingSelection = effect.value;
        shouldRebuild = true;
      }
    }

    if (shouldRebuild || tr.docChanged) {
      return {
        comments,
        activeId,
        pendingSelection,
        decorations: buildCommentDecorations(comments, activeId, pendingSelection, tr.newDoc),
      };
    }

    return state;
  },
  provide: (f) => EditorView.decorations.from(f, (val) => val.decorations),
});

// Ref de callback global para a tooltip de seleção chamar a criação de comentário
export const onRequestAddCommentCallbackRef = {
  current: null as ((from: number, to: number, selectedText: string) => void) | null,
};

// Menu Flutuante ao Selecionar Texto (Estilo Autêntico Overleaf)
// Quando o usuário seleciona um trecho, exibe botão flutuante para comentar/sugerir imediatamente
export const selectionCommentTooltipField = StateField.define<readonly Tooltip[]>({
  create: () => [],
  update(tooltips, tr) {
    if (!tr.docChanged && !tr.selection) return tooltips;
    const sel = tr.state.selection.main;
    if (sel.empty) return [];

    const from = Math.min(sel.anchor, sel.head);
    const to = Math.max(sel.anchor, sel.head);
    const selectedText = tr.state.sliceDoc(from, to).trim();
    if (!selectedText) return [];

    return [
      {
        pos: to,
        above: true,
        arrow: true,
        create(view) {
          const dom = document.createElement('div');
          dom.className = 'cm-selection-comment-bubble';

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'cm-selection-comment-btn';
          btn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>💬 Comentar</span>
          `;
          btn.title = 'Adicionar comentário ou sugestão neste trecho selecionado';

          btn.onmousedown = (e) => {
            // Previne perda de seleção no CodeMirror
            e.preventDefault();
            e.stopPropagation();
          };

          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const currentSel = view.state.selection.main;
            const s = Math.min(currentSel.anchor, currentSel.head);
            const end = Math.max(currentSel.anchor, currentSel.head);
            if (s < end && onRequestAddCommentCallbackRef.current) {
              const txt = view.state.sliceDoc(s, end);
              onRequestAddCommentCallbackRef.current(s, end, txt);
            }
          };

          dom.appendChild(btn);
          return { dom };
        },
      },
    ];
  },
  provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
});

// Compartments para alternar configurações e temas no CodeMirror sem reinstanciar
export const themeCompart = new Compartment();
export const spellcheckCompart = new Compartment();
export const editorConfigCompart = new Compartment();
export const wordWrapCompart = new Compartment();
export const autoCloseBracketsCompart = new Compartment();
export const autocompleteCompart = new Compartment();
export const linterCompart = new Compartment();
export const grammarLinterCompart = new Compartment();

export function getSpellcheckExtension(enabled: boolean, lang: string) {
  return EditorView.contentAttributes.of({
    spellcheck: enabled ? 'true' : 'false',
    lang: lang || 'pt-BR',
    autocorrect: 'off',
    autocapitalize: 'off',
  });
}

export function getEditorConfigExtension(
  fontSize: string,
  lineHeight: string,
  nonBlinkingCursor: boolean
) {
  return EditorView.theme({
    '&': {
      fontSize: `${fontSize || '13.5px'} !important`,
    },
    '.cm-line': {
      lineHeight: `${lineHeight || '1.65'} !important`,
    },
    ...(nonBlinkingCursor
      ? {
          '.cm-cursor, &.cm-focused .cm-cursor': {
            animation: 'none !important',
            opacity: '1 !important',
          },
        }
      : {}),
  });
}

// Tabela de autocompletar LaTeX estilo Overleaf
const BASE_LATEX_COMPLETIONS = [
  // Estrutura do Documento
  snippetCompletion('\\section{${title}}', {
    label: '\\section',
    detail: 'Seção numerada',
    type: 'keyword',
  }),
  snippetCompletion('\\subsection{${title}}', {
    label: '\\subsection',
    detail: 'Subseção',
    type: 'keyword',
  }),
  snippetCompletion('\\subsubsection{${title}}', {
    label: '\\subsubsection',
    detail: 'Sub-subseção',
    type: 'keyword',
  }),
  snippetCompletion('\\paragraph{${title}}', {
    label: '\\paragraph',
    detail: 'Parágrafo',
    type: 'keyword',
  }),
  snippetCompletion('\\chapter{${title}}', {
    label: '\\chapter',
    detail: 'Capítulo',
    type: 'keyword',
  }),
  snippetCompletion('\\tableofcontents', {
    label: '\\tableofcontents',
    detail: 'Sumário',
    type: 'keyword',
  }),

  // Ambientes
  snippetCompletion('\\begin{${env}}\n\t${}\n\\end{${env}}', {
    label: '\\begin',
    detail: 'Ambiente genérico',
    type: 'type',
  }),
  snippetCompletion('\\begin{equation}\n\t${}\n\\end{equation}', {
    label: '\\begin{equation}',
    detail: 'Equação numerada',
    type: 'type',
  }),
  snippetCompletion('\\begin{equation*}\n\t${}\n\\end{equation*}', {
    label: '\\begin{equation*}',
    detail: 'Equação sem numeração',
    type: 'type',
  }),
  snippetCompletion(
    '\\begin{figure}[htbp]\n\t\\centering\n\t\\includegraphics[width=0.8\\linewidth]{${path}}\n\t\\caption{${caption}}\n\t\\label{fig:${label}}\n\\end{figure}',
    { label: '\\begin{figure}', detail: 'Figura com caption/label', type: 'type' }
  ),
  snippetCompletion(
    '\\begin{table}[htbp]\n\t\\centering\n\t\\caption{${caption}}\n\t\\label{tab:${label}}\n\t\\begin{tabular}{${cols}}\n\t\t${}\n\t\\end{tabular}\n\\end{table}',
    { label: '\\begin{table}', detail: 'Tabela formatada', type: 'type' }
  ),
  snippetCompletion('\\begin{itemize}\n\t\\item ${}\n\\end{itemize}', {
    label: '\\begin{itemize}',
    detail: 'Lista de marcadores',
    type: 'type',
  }),
  snippetCompletion('\\begin{enumerate}\n\t\\item ${}\n\\end{enumerate}', {
    label: '\\begin{enumerate}',
    detail: 'Lista numerada',
    type: 'type',
  }),
  snippetCompletion('\\begin{abstract}\n\t${}\n\\end{abstract}', {
    label: '\\begin{abstract}',
    detail: 'Resumo / Abstract',
    type: 'type',
  }),
  snippetCompletion('\\item ${}', { label: '\\item', detail: 'Item de lista', type: 'keyword' }),

  // Formatação e Tipografia
  snippetCompletion('\\textbf{${text}}', {
    label: '\\textbf',
    detail: 'Texto em Negrito',
    type: 'text',
  }),
  snippetCompletion('\\textit{${text}}', {
    label: '\\textit',
    detail: 'Texto em Itálico',
    type: 'text',
  }),
  snippetCompletion('\\underline{${text}}', {
    label: '\\underline',
    detail: 'Texto Sublinhado',
    type: 'text',
  }),
  snippetCompletion('\\emph{${text}}', { label: '\\emph', detail: 'Ênfase', type: 'text' }),
  snippetCompletion('\\texttt{${code}}', {
    label: '\\texttt',
    detail: 'Texto monoespaçado',
    type: 'text',
  }),

  // Matemática
  snippetCompletion('\\frac{${num}}{${den}}', {
    label: '\\frac',
    detail: 'Fração matemática',
    type: 'function',
  }),
  snippetCompletion('\\sqrt{${arg}}', {
    label: '\\sqrt',
    detail: 'Raiz quadrada',
    type: 'function',
  }),
  snippetCompletion('\\sum_{${i=1}}^{${n}}', {
    label: '\\sum',
    detail: 'Somatório',
    type: 'function',
  }),
  snippetCompletion('\\int_{${a}}^{${b}}', {
    label: '\\int',
    detail: 'Integral definida',
    type: 'function',
  }),
  snippetCompletion('\\lim_{${x} \\to ${a}}', {
    label: '\\lim',
    detail: 'Limite matemático',
    type: 'function',
  }),

  // Citações e Referências Cruzadas
  snippetCompletion('\\cite{${key}}', {
    label: '\\cite',
    detail: 'Citação bibliográfica',
    type: 'constant',
  }),
  snippetCompletion('\\ref{${label}}', {
    label: '\\ref',
    detail: 'Referência a label',
    type: 'constant',
  }),
  snippetCompletion('\\eqref{${eq}}', {
    label: '\\eqref',
    detail: 'Referência a equação',
    type: 'constant',
  }),
  snippetCompletion('\\label{${name}}', {
    label: '\\label',
    detail: 'Definir rótulo',
    type: 'constant',
  }),

  // Letras Gregas e Símbolos
  { label: '\\alpha', detail: 'α', type: 'variable' },
  { label: '\\beta', detail: 'β', type: 'variable' },
  { label: '\\gamma', detail: 'γ', type: 'variable' },
  { label: '\\delta', detail: 'δ', type: 'variable' },
  { label: '\\epsilon', detail: 'ε', type: 'variable' },
  { label: '\\theta', detail: 'θ', type: 'variable' },
  { label: '\\lambda', detail: 'λ', type: 'variable' },
  { label: '\\mu', detail: 'μ', type: 'variable' },
  { label: '\\pi', detail: 'π', type: 'variable' },
  { label: '\\sigma', detail: 'σ', type: 'variable' },
  { label: '\\omega', detail: 'ω', type: 'variable' },
  { label: '\\infty', detail: '∞', type: 'variable' },
  { label: '\\rightarrow', detail: '→', type: 'variable' },
  { label: '\\leftarrow', detail: '←', type: 'variable' },
  { label: '\\leq', detail: '≤', type: 'variable' },
  { label: '\\geq', detail: '≥', type: 'variable' },
  { label: '\\neq', detail: '≠', type: 'variable' },
  { label: '\\times', detail: '×', type: 'variable' },
];

// Parser detalhado de entradas BibTeX para o Hover Preview e Autocomplete
interface BibEntry {
  type: string;
  key: string;
  title?: string;
  author?: string;
  year?: string;
  journal?: string;
}

function extractBibField(body: string, fieldName: string): string | undefined {
  const fieldRegex = new RegExp(`(?:^|[,\\s])${fieldName}\\s*=\\s*`, 'i');
  const match = fieldRegex.exec(body);
  if (!match) return undefined;

  const startIndex = match.index + match[0].length;
  const firstChar = body[startIndex];

  if (firstChar === '{') {
    let depth = 1;
    let i = startIndex + 1;
    while (i < body.length && depth > 0) {
      if (body[i] === '{') depth++;
      else if (body[i] === '}') depth--;
      i++;
    }
    if (depth === 0) {
      return body
        .slice(startIndex + 1, i - 1)
        .replace(/[\n\r\t]+/g, ' ')
        .trim();
    }
  } else if (firstChar === '"') {
    const endQuote = body.indexOf('"', startIndex + 1);
    if (endQuote !== -1) {
      return body
        .slice(startIndex + 1, endQuote)
        .replace(/[\n\r\t]+/g, ' ')
        .trim();
    }
  } else {
    const simpleMatch = body.slice(startIndex).match(/^([^,\n}]+)/);
    if (simpleMatch) {
      return simpleMatch[1].trim();
    }
  }
  return undefined;
}

export function parseBibEntries(bib: string): Map<string, BibEntry> {
  const entries = new Map<string, BibEntry>();
  const entryRegex = /@([a-zA-Z]+)\s*\{\s*([^,\s]+),([\s\S]*?)(?=\n@|$)/g;
  let match;
  while ((match = entryRegex.exec(bib)) !== null) {
    const type = match[1];
    const key = match[2];
    const body = match[3];
    const title = extractBibField(body, 'title');
    const author = extractBibField(body, 'author');
    const year = extractBibField(body, 'year');
    const journal = extractBibField(body, 'journal') || extractBibField(body, 'booktitle');

    entries.set(key, {
      type,
      key,
      title,
      author,
      year,
      journal,
    });
  }
  return entries;
}

export function extractBibKeys(bibContent: string): string[] {
  const keys: string[] = [];
  const regex = /@[a-zA-Z]+\s*\{\s*([^,\s]+)/g;
  let match;
  while ((match = regex.exec(bibContent)) !== null) {
    if (match[1]) keys.push(match[1]);
  }
  return keys;
}

// Fold Service customizado para dobrar seções LaTeX e ambientes \begin{}...\end{} estilo Overleaf
const latexFoldService = foldService.of((state, lineStart) => {
  const line = state.doc.lineAt(lineStart);
  const text = line.text;

  // 1. Fold de ambientes \begin{env} ... \end{env}
  const beginMatch = text.match(/\\begin\{([a-zA-Z0-9*]+)\}/);
  if (beginMatch) {
    const env = beginMatch[1];
    let depth = 1;
    for (let i = line.number + 1; i <= state.doc.lines; i++) {
      const nextLine = state.doc.line(i);
      if (nextLine.text.includes(`\\begin{${env}}`)) depth++;
      if (nextLine.text.includes(`\\end{${env}}`)) {
        depth--;
        if (depth === 0) {
          return { from: line.to, to: nextLine.to };
        }
      }
    }
  }

  // 2. Fold de seções: \section, \subsection, etc.
  if (/\\(section|chapter|subsection|subsubsection)\{/.test(text)) {
    for (let i = line.number + 1; i <= state.doc.lines; i++) {
      const nextLine = state.doc.line(i);
      if (
        /\\(section|chapter|subsection|subsubsection)\{/.test(nextLine.text) ||
        nextLine.text.includes('\\end{document}')
      ) {
        return { from: line.to, to: nextLine.from - 1 };
      }
    }
    return { from: line.to, to: state.doc.length };
  }

  return null;
});

// Parser de erros do compilador TeX Live (pdflatex) mapeando para a linha correta no documento
export function parseLatexCompilerError(
  errText: string | null | undefined,
  doc: Text
): Diagnostic[] {
  if (!errText) return [];
  const diagnostics: Diagnostic[] = [];
  const lineMatch =
    errText.match(/l\.(\d+)/i) ||
    errText.match(/line\s+(\d+)/i) ||
    errText.match(/input line\s+(\d+)/i);
  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1], 10);
    if (lineNum >= 1 && lineNum <= doc.lines) {
      const line = doc.line(lineNum);
      const firstLineMsg =
        errText.split('\n').find((l) => l.startsWith('!') || l.includes('Error')) ||
        errText.slice(0, 120);
      diagnostics.push({
        from: line.from,
        to: line.to,
        severity: 'error',
        message: `Compilador TeX Live: ${firstLineMsg.trim()}`,
      });
    }
  }
  return diagnostics;
}

// Validação sintática client-side para alertar tags desbalanceadas antes de compilar
export function validateLatexStructure(doc: Text): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const stack: { env: string; from: number; to: number; line: number }[] = [];

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;

    const beginMatches = text.matchAll(/\\begin\{([a-zA-Z0-9*]+)\}/g);
    for (const m of beginMatches) {
      stack.push({
        env: m[1],
        from: line.from + m.index!,
        to: line.from + m.index! + m[0].length,
        line: i,
      });
    }

    const endMatches = text.matchAll(/\\end\{([a-zA-Z0-9*]+)\}/g);
    for (const m of endMatches) {
      const env = m[1];
      const idx = stack.map((s) => s.env).lastIndexOf(env);
      if (idx !== -1) {
        stack.splice(idx, 1);
      } else {
        diagnostics.push({
          from: line.from + m.index!,
          to: line.from + m.index! + m[0].length,
          severity: 'warning',
          message: `Ambiente '\\end{${env}}' sem '\\begin{${env}}' correspondente.`,
        });
      }
    }
  }

  for (const unclosed of stack) {
    diagnostics.push({
      from: unclosed.from,
      to: unclosed.to,
      severity: 'warning',
      message: `Ambiente '\\begin{${unclosed.env}}' (linha ${unclosed.line}) não foi fechado com '\\end{${unclosed.env}}'.`,
    });
  }

  return diagnostics;
}

// Tema Escuro Oficial Overleaf
const codeMirrorDarkTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--bg-editor)',
    color: '#f4f5f6',
    fontSize: 'var(--cm-font-size, 13.5px)',
    height: '100%',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-content': {
    caretColor: 'var(--cm-cursor-color, #059669)',
    padding: '12px 0',
  },
  '.cm-line': {
    padding: '0 12px',
    lineHeight: 'var(--cm-line-height, 1.65)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-gutter)',
    color: '#8d96a5',
    borderRight: '1px solid var(--border)',
  },
  '.cm-cursor, &.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--cm-cursor-color, #059669)',
    borderLeftWidth: '2px',
    borderLeftStyle: 'solid',
    marginLeft: '-1px',
    animation: 'var(--cm-cursor-animation, cm-blink 1.2s ease-in-out infinite)',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(54, 108, 191, 0.35) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.055) !important',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.08) !important',
    color: '#ffffff !important',
    fontWeight: 'bold',
  },
  '.cm-remote-active-line': {
    transition: 'background-color 0.15s ease',
  },
  '.cm-collaborator-selection': {
    borderRadius: '2px',
  },
  // Search & Replace Panel
  '.cm-search': {
    backgroundColor: '#1e2430 !important',
    border: '1px solid #3b4252 !important',
    borderRadius: '6px',
    color: '#e2e8f0 !important',
    padding: '6px 12px !important',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
  },
  '.cm-search input': {
    backgroundColor: 'rgba(0, 0, 0, 0.3) !important',
    border: '1px solid #475569 !important',
    color: '#ffffff !important',
    borderRadius: '4px',
    padding: '3px 8px',
    outline: 'none',
  },
  '.cm-search button': {
    backgroundColor: '#334155 !important',
    color: '#e2e8f0 !important',
    borderRadius: '4px',
    border: 'none',
    padding: '3px 9px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.15s ease',
  },
  '.cm-search button:hover': {
    backgroundColor: '#059669 !important',
    color: '#ffffff !important',
  },
  '.cm-search label': {
    color: '#94a3b8 !important',
    fontSize: '11px',
    marginLeft: '4px',
  },
  // Selection Match
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(255, 255, 255, 0.18) !important',
    borderRadius: '2px',
  },
  // Bracket Matching
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(16, 185, 129, 0.28) !important',
    color: '#10b981 !important',
    outline: '1px solid #10b981',
    borderRadius: '2px',
  },
  '.cm-nonmatchingBracket': {
    backgroundColor: 'rgba(239, 68, 68, 0.35) !important',
    color: '#ef4444 !important',
    outline: '1px solid #ef4444',
    borderRadius: '2px',
  },
  // Code Folding Gutter
  '.cm-foldGutter span': {
    color: '#8d96a5',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'color 0.15s ease',
  },
  '.cm-foldGutter span:hover': {
    color: '#10b981',
  },
  // Tooltip
  '.cm-tooltip': {
    backgroundColor: '#1e2430 !important',
    border: '1px solid #3b4252 !important',
    borderRadius: '6px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
    color: '#e2e8f0',
  },
  '.cm-tooltip.cm-tooltip-autocomplete': {
    maxHeight: '260px',
    fontFamily: 'var(--font-mono)',
    fontSize: '12.5px',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    maxHeight: '260px',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
    padding: '4px 10px',
    color: '#e2e8f0',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: '#059669 !important',
    color: '#ffffff !important',
  },
  '.cm-completionLabel': {
    fontWeight: '600',
  },
  '.cm-completionDetail': {
    fontStyle: 'italic',
    color: '#94a3b8 !important',
    marginLeft: '8px',
  },
  // Inline Comment Marks (Overleaf Style)
  '.cm-comment-mark-open': {
    backgroundColor: 'rgba(245, 158, 11, 0.22) !important',
    borderBottom: '2px solid #f59e0b',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  '.cm-comment-mark-open:hover': {
    backgroundColor: 'rgba(245, 158, 11, 0.35) !important',
  },
  '.cm-comment-mark-active': {
    backgroundColor: 'rgba(245, 158, 11, 0.45) !important',
    borderBottom: '2px solid #d97706',
    outline: '1px solid #d97706',
    borderRadius: '2px',
    cursor: 'pointer',
  },
  '.cm-comment-mark-resolved': {
    backgroundColor: 'rgba(148, 163, 184, 0.12) !important',
    borderBottom: '1px dashed #94a3b8',
    borderRadius: '2px',
    cursor: 'pointer',
  },
});

// Tema Claro Oficial Overleaf
const codeMirrorLightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#1b222c',
    fontSize: 'var(--cm-font-size, 13.5px)',
    height: '100%',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-content': {
    caretColor: 'var(--cm-cursor-color, #059669)',
    padding: '12px 0',
  },
  '.cm-line': {
    padding: '0 12px',
    lineHeight: 'var(--cm-line-height, 1.65)',
  },
  '.cm-gutters': {
    backgroundColor: '#fafafb',
    color: '#677283',
    borderRight: '1px solid #e7e9ee',
  },
  '.cm-cursor, &.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--cm-cursor-color, #059669)',
    borderLeftWidth: '2px',
    borderLeftStyle: 'solid',
    marginLeft: '-1px',
    animation: 'var(--cm-cursor-animation, cm-blink 1.2s ease-in-out infinite)',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(151, 182, 229, 0.4) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 0, 0, 0.045) !important',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(0, 0, 0, 0.065) !important',
    color: '#0f172a !important',
    fontWeight: 'bold',
  },
  '.cm-remote-active-line': {
    transition: 'background-color 0.15s ease',
  },
  '.cm-collaborator-selection': {
    borderRadius: '2px',
  },
  // Search & Replace Panel
  '.cm-search': {
    backgroundColor: '#ffffff !important',
    border: '1px solid #cbd5e1 !important',
    borderRadius: '6px',
    color: '#1e293b !important',
    padding: '6px 12px !important',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
  },
  '.cm-search input': {
    backgroundColor: '#f8fafc !important',
    border: '1px solid #cbd5e1 !important',
    color: '#0f172a !important',
    borderRadius: '4px',
    padding: '3px 8px',
    outline: 'none',
  },
  '.cm-search button': {
    backgroundColor: '#f1f5f9 !important',
    color: '#334155 !important',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    padding: '3px 9px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.15s ease',
  },
  '.cm-search button:hover': {
    backgroundColor: '#059669 !important',
    color: '#ffffff !important',
    borderColor: '#059669',
  },
  '.cm-search label': {
    color: '#64748b !important',
    fontSize: '11px',
    marginLeft: '4px',
  },
  // Selection Match
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(16, 185, 129, 0.2) !important',
    borderRadius: '2px',
  },
  // Bracket Matching
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(16, 185, 129, 0.22) !important',
    color: '#047857 !important',
    outline: '1px solid #059669',
    borderRadius: '2px',
  },
  '.cm-nonmatchingBracket': {
    backgroundColor: 'rgba(239, 68, 68, 0.25) !important',
    color: '#b91c1c !important',
    outline: '1px solid #ef4444',
    borderRadius: '2px',
  },
  // Code Folding Gutter
  '.cm-foldGutter span': {
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'color 0.15s ease',
  },
  '.cm-foldGutter span:hover': {
    color: '#059669',
  },
  // Tooltip
  '.cm-tooltip': {
    backgroundColor: '#ffffff !important',
    border: '1px solid #e2e8f0 !important',
    borderRadius: '6px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    color: '#1e293b',
  },
  '.cm-tooltip.cm-tooltip-autocomplete': {
    maxHeight: '260px',
    fontFamily: 'var(--font-mono)',
    fontSize: '12.5px',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    maxHeight: '260px',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
    padding: '4px 10px',
    color: '#1e293b',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: '#059669 !important',
    color: '#ffffff !important',
  },
  '.cm-completionLabel': {
    fontWeight: '600',
  },
  '.cm-completionDetail': {
    fontStyle: 'italic',
    color: '#64748b !important',
    marginLeft: '8px',
  },
  // Inline Comment Marks (Overleaf Style)
  '.cm-comment-mark-open': {
    backgroundColor: 'rgba(245, 158, 11, 0.25) !important',
    borderBottom: '2px solid #f59e0b',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  '.cm-comment-mark-open:hover': {
    backgroundColor: 'rgba(245, 158, 11, 0.38) !important',
  },
  '.cm-comment-mark-active': {
    backgroundColor: 'rgba(245, 158, 11, 0.48) !important',
    borderBottom: '2px solid #d97706',
    outline: '1px solid #d97706',
    borderRadius: '2px',
    cursor: 'pointer',
  },
  '.cm-comment-mark-resolved': {
    backgroundColor: 'rgba(148, 163, 184, 0.14) !important',
    borderBottom: '1px dashed #64748b',
    borderRadius: '2px',
    cursor: 'pointer',
  },
});

export function CodeMirrorEditor({
  content,
  version: _version = 1,
  saveStatus,
  lastSavedAt,
  remoteCursors,
  activeEditor,
  currentUserColor,
  currentUserName = 'Você',
  theme = 'dark',
  bibContent = '',
  compileError = null,
  settings = DEFAULT_SETTINGS,
  comments = [],
  activeCommentId = null,
  pendingCommentSelection = null,
  onLinePositionsChange,
  externalScrollTop,
  onSelectComment,
  onRequestAddComment,
  onApplyLocalDelta,
  onCursorMove,
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isRemoteChangeRef = useRef<boolean>(false);
  const bibContentRef = useRef<string>(bibContent);
  bibContentRef.current = bibContent;
  const compileErrorRef = useRef<string | null>(compileError);
  compileErrorRef.current = compileError;
  const onSelectCommentRef = useRef(onSelectComment);
  onSelectCommentRef.current = onSelectComment;
  const onLinePositionsChangeRef = useRef(onLinePositionsChange);
  onLinePositionsChangeRef.current = onLinePositionsChange;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [selectionPopup, setSelectionPopup] = useState<{
    from: number;
    to: number;
    text: string;
    top: number;
    left: number;
  } | null>(null);
  const [isInlineBoxOpen, setIsInlineBoxOpen] = useState<boolean>(false);
  const [inlineCommentInput, setInlineCommentInput] = useState<string>('');
  const isInlineBoxOpenRef = useRef(isInlineBoxOpen);
  isInlineBoxOpenRef.current = isInlineBoxOpen;

  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const isMouseDownRef = useRef(false);
  const isProgrammaticSelectionRef = useRef(false);
  const lastScrolledCommentIdRef = useRef<string | null>(null);
  const lastSentLayoutRef = useRef<{ scrollTop: number; topsKey: string }>({
    scrollTop: -1,
    topsKey: '',
  });

  const latexCompletionSource = (context: CompletionContext): CompletionResult | null => {
    // 1. Sugestões de referências dentro de \cite{...}
    const citeMatch = context.matchBefore(/\\cite\{([^}]*)$/);
    if (citeMatch) {
      const bibKeys = extractBibKeys(bibContentRef.current);
      return {
        from: citeMatch.from + 6,
        options: bibKeys.map((key) => ({
          label: key,
          detail: 'Referência BibTeX',
          type: 'constant',
        })),
      };
    }

    // 2. Comandos LaTeX iniciados por barra invertida (ex: \sec, \beg, ou apenas \)
    const word = context.matchBefore(/\\[a-zA-Z]*/);
    if (!word) return null;
    if (word.from === word.to && !context.explicit) return null;

    return {
      from: word.from,
      options: BASE_LATEX_COMPLETIONS,
      validFor: /^\\[a-zA-Z]*$/,
    };
  };

  // Hover Tooltip para inspecionar citações \cite{...} em tempo real mostrando autor, título e ano
  const bibHoverTooltip = hoverTooltip((view, pos) => {
    const line = view.state.doc.lineAt(pos);
    const offsetInLine = pos - line.from;
    const lineText = line.text;

    const citeRegex = /\\(?:cite|citep|citet)\{([^}]+)\}/g;
    let match;
    while ((match = citeRegex.exec(lineText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (offsetInLine >= start && offsetInLine <= end) {
        const keys = match[1].split(',').map((k) => k.trim());
        const bibEntries = parseBibEntries(bibContentRef.current);
        const foundEntry = keys.map((k) => bibEntries.get(k)).find(Boolean);

        return {
          pos: line.from + start,
          end: line.from + end,
          above: true,
          create() {
            const dom = document.createElement('div');
            dom.className = 'cm-tooltip-bib-preview';
            if (!foundEntry) {
              dom.innerHTML = `
                <div style="padding: 6px 10px; font-size: 11.5px; color: #f59e0b;">
                  ⚠️ Citação [<strong>${keys.join(', ')}</strong>] não encontrada em references.bib
                </div>`;
            } else {
              dom.innerHTML = `
                <div style="font-weight: 700; color: #10b981; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                  <span>📚</span> <span>${foundEntry.title || foundEntry.key}</span>
                </div>
                ${foundEntry.author ? `<div style="color: #94a3b8; font-size: 11.5px; margin-bottom: 3px;">✍️ <em>${foundEntry.author}</em></div>` : ''}
                <div style="display: flex; gap: 8px; color: #64748b; font-size: 11px; flex-wrap: wrap;">
                  ${foundEntry.journal ? `<span>🏛️ ${foundEntry.journal}</span>` : ''}
                  ${foundEntry.year ? `<span>📅 ${foundEntry.year}</span>` : ''}
                  <span>🏷️ [${foundEntry.key}]</span>
                </div>
              `;
            }
            return { dom };
          },
        };
      }
    }
    return null;
  });

  // Fonte de diagnóstico para o Linter do CodeMirror 6
  const latexLinterSource = (view: EditorView): Diagnostic[] => {
    const doc = view.state.doc;
    const diagnostics: Diagnostic[] = [];

    // 1. Diagnóstico do compilador TeX Live (se houver erro ativo)
    if (compileErrorRef.current) {
      const compilerDiags = parseLatexCompilerError(compileErrorRef.current, doc);
      diagnostics.push(...compilerDiags);
    }

    // 2. Validação sintática client-side (ambientes \begin{...} e \end{...})
    const syntaxDiags = validateLatexStructure(doc);
    diagnostics.push(...syntaxDiags);

    return diagnostics;
  };

  // Fonte de diagnóstico assíncrona para o LanguageTool (Gramática e Ortografia)
  const grammarLinterSource = async (view: EditorView): Promise<Diagnostic[]> => {
    const currentSettings = settingsRef.current;
    if (!currentSettings.spellcheck) return [];
    const text = view.state.doc.toString();
    if (!text.trim()) return [];

    try {
      const matches = await checkGrammarAndSpelling(
        text,
        currentSettings.spellcheckLanguage || 'pt-BR'
      );
      const docLength = view.state.doc.length;

      return matches.map((match): Diagnostic => {
        const from = Math.min(match.offset, docLength);
        const to = Math.min(match.offset + match.length, docLength);
        const isSpelling = match.rule?.issueType === 'misspelling';
        const severity: 'error' | 'warning' = isSpelling ? 'error' : 'warning';

        return {
          from,
          to,
          severity,
          message: match.message,
          actions: match.replacements.slice(0, 3).map((rep) => ({
            name: `Substituir por "${rep.value}"`,
            apply(targetView, actionFrom, actionTo) {
              targetView.dispatch({
                changes: { from: actionFrom, to: actionTo, insert: rep.value },
              });
            },
          })),
        };
      });
    } catch {
      return [];
    }
  };

  // Inicializa o CodeMirror 6 na montagem com todas as extensões de produtividade
  useEffect(() => {
    if (!containerRef.current) return;

    const startState = EditorState.create({
      doc: content,
      extensions: [
        // Linhas e régua ativa
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        wordWrapCompart.of(settings.wordWrap ? EditorView.lineWrapping : []),

        // Code Folding de Seções e Ambientes LaTeX
        latexFoldService,
        foldGutter(),
        codeFolding(),

        // Multi-Seleções e Edição em Bloco
        EditorState.allowMultipleSelections.of(true),
        rectangularSelection(),
        crosshairCursor(),
        dropCursor(),
        highlightSelectionMatches(), // Realça seleções idênticas no texto

        // Pareamento e Fechamento Automático de Chaves e Indentação
        bracketMatching(),
        autoCloseBracketsCompart.of(
          settings.autoCloseBrackets ? [closeBrackets(), keymap.of(closeBracketsKeymap)] : []
        ),
        indentOnInput(),

        // Busca, Substituição e Histórico
        history(),
        search({ top: true }),

        // Diagnósticos e Linter de Código LaTeX (Compilador & Sintaxe)
        linterCompart.of(
          settings.codeCheck
            ? [lintGutter(), linter(latexLinterSource), keymap.of(lintKeymap)]
            : settings.spellcheck
              ? [lintGutter(), keymap.of(lintKeymap)]
              : []
        ),

        // Verificação Gramatical e Ortográfica Inteligente (LanguageTool)
        grammarLinterCompart.of(
          settings.spellcheck ? [linter(grammarLinterSource, { delay: 800 })] : []
        ),

        // Tooltips de Citações e Documentação
        bibHoverTooltip,

        // Mapeamentos de Teclado
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),

        StreamLanguage.define(stex), // Parser nativo de sintaxe LaTeX
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        autocompleteCompart.of(
          settings.autoComplete
            ? autocompletion({
                override: [latexCompletionSource],
                defaultKeymap: true,
              })
            : []
        ),
        remoteCursorsField,
        commentsField,
        themeCompart.of(theme === 'light' ? codeMirrorLightTheme : codeMirrorDarkTheme),
        spellcheckCompart.of(
          getSpellcheckExtension(settings.spellcheck, settings.spellcheckLanguage)
        ),
        editorConfigCompart.of(
          getEditorConfigExtension(
            settings.fontSize,
            settings.lineHeight,
            settings.nonBlinkingCursor
          )
        ),
        EditorView.domEventHandlers({
          click(event) {
            const target = event.target as HTMLElement | null;
            const mark = target?.closest('.cm-comment-mark') as HTMLElement | null;
            if (mark) {
              const commentId = mark.getAttribute('data-comment-id');
              if (commentId && onSelectCommentRef.current) {
                onSelectCommentRef.current(commentId);
              }
            }
          },
        }),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet && !isRemoteChangeRef.current) {
            const main = update.state.selection.main;
            const start = Math.min(main.anchor, main.head);
            const end = Math.max(main.anchor, main.head);
            onCursorMove(
              main.head,
              start !== end ? start : undefined,
              start !== end ? end : undefined
            );

            // Se o cursor foi colapsado (clique simples sem seleção), fecha o popup
            if (start === end && !isInlineBoxOpenRef.current) {
              setSelectionPopup(null);
            }
          }

          if (update.docChanged && !isRemoteChangeRef.current) {
            updateLinePositions(update.view);
            update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
              const insertedText = inserted.toString();
              const deletedLength = toA - fromA;

              if (deletedLength > 0) {
                onApplyLocalDelta({
                  type: 'delete',
                  position: fromA,
                  length: deletedLength,
                });
              }

              if (insertedText.length > 0) {
                onApplyLocalDelta({
                  type: 'insert',
                  position: fromA,
                  text: insertedText,
                });
              }
            });
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;

    // Controla abertura do balão flutuante estritamente ao clicar, arrastar seleção e soltar (mouseup)
    const handleMouseDown = () => {
      isMouseDownRef.current = true;
      if (!isInlineBoxOpenRef.current) {
        setSelectionPopup(null);
      }
    };

    const handleMouseUp = () => {
      if (!isMouseDownRef.current) return;
      isMouseDownRef.current = false;

      setTimeout(() => {
        const currentView = viewRef.current;
        if (!currentView || isProgrammaticSelectionRef.current) return;

        const main = currentView.state.selection.main;
        const start = Math.min(main.anchor, main.head);
        const end = Math.max(main.anchor, main.head);

        if (start < end) {
          const selText = currentView.state.sliceDoc(start, end).trim();
          if (selText.length > 0) {
            const headCoords = currentView.coordsAtPos(end);
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (headCoords && containerRect) {
              const top = Math.max(8, headCoords.bottom - containerRect.top + 6);
              const left = Math.max(
                12,
                Math.min(headCoords.left - containerRect.left - 40, containerRect.width - 320)
              );
              setSelectionPopup({
                from: start,
                to: end,
                text: selText,
                top,
                left,
              });
              setIsInlineBoxOpen(false);
            }
          } else if (!isInlineBoxOpenRef.current) {
            setSelectionPopup(null);
          }
        } else if (!isInlineBoxOpenRef.current) {
          setSelectionPopup(null);
        }
      }, 20);
    };

    const dom = view.dom;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Reconfigura o tema do CodeMirror dinamicamente quando a prop `theme` mudar
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompart.reconfigure(
          theme === 'light' ? codeMirrorLightTheme : codeMirrorDarkTheme
        ),
      });
    }
  }, [theme]);

  // Reconfigura dinamicamente todas as extensões baseadas nas configurações do usuário
  useEffect(() => {
    if (viewRef.current && settings) {
      viewRef.current.dispatch({
        effects: [
          wordWrapCompart.reconfigure(settings.wordWrap ? EditorView.lineWrapping : []),
          autoCloseBracketsCompart.reconfigure(
            settings.autoCloseBrackets ? [closeBrackets(), keymap.of(closeBracketsKeymap)] : []
          ),
          autocompleteCompart.reconfigure(
            settings.autoComplete
              ? autocompletion({ override: [latexCompletionSource], defaultKeymap: true })
              : []
          ),
          linterCompart.reconfigure(
            settings.codeCheck
              ? [lintGutter(), linter(latexLinterSource), keymap.of(lintKeymap)]
              : settings.spellcheck
                ? [lintGutter(), keymap.of(lintKeymap)]
                : []
          ),
          grammarLinterCompart.reconfigure(
            settings.spellcheck
              ? [linter(grammarLinterSource, { delay: 800 })]
              : []
          ),
          spellcheckCompart.reconfigure(
            getSpellcheckExtension(settings.spellcheck, settings.spellcheckLanguage)
          ),
          editorConfigCompart.reconfigure(
            getEditorConfigExtension(
              settings.fontSize,
              settings.lineHeight,
              settings.nonBlinkingCursor
            )
          ),
        ],
      });
    }
  }, [
    settings?.wordWrap,
    settings?.autoCloseBrackets,
    settings?.autoComplete,
    settings?.codeCheck,
    settings?.spellcheck,
    settings?.spellcheckLanguage,
    settings?.fontSize,
    settings?.lineHeight,
    settings?.nonBlinkingCursor,
  ]);

  // Atualiza cursores remotos
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: setRemoteCursorsEffect.of(remoteCursors),
      });
    }
  }, [remoteCursors]);

  // Força atualização dos diagnósticos de lint quando houver erro de compilação
  useEffect(() => {
    if (viewRef.current) {
      forceLinting(viewRef.current);
    }
  }, [compileError]);

  // Sincroniza comentários de revisão no CodeMirror
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: setCommentsEffect.of(comments),
      });
    }
  }, [comments]);

  // Atualiza comentário ativo e rola até ele se selecionado UMA ÚNICA VEZ (sem loop)
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: setActiveCommentEffect.of(activeCommentId || null),
      });
      if (activeCommentId && activeCommentId !== lastScrolledCommentIdRef.current) {
        lastScrolledCommentIdRef.current = activeCommentId;
        const currentComments = commentsRef.current;
        const comm = currentComments.find((c) => c.id === activeCommentId);
        if (comm) {
          const doc = viewRef.current.state.doc;
          const from = Math.max(0, Math.min(comm.from, doc.length));
          const to = Math.max(from, Math.min(comm.to, doc.length));
          isProgrammaticSelectionRef.current = true;
          viewRef.current.dispatch({
            selection: { anchor: from, head: to },
            effects: EditorView.scrollIntoView(from, { y: 'center' }),
          });
          setTimeout(() => {
            isProgrammaticSelectionRef.current = false;
          }, 100);
        }
      } else if (!activeCommentId) {
        lastScrolledCommentIdRef.current = null;
      }
    }
  }, [activeCommentId]);

  // Sincroniza conteúdo se o documento for substituído externamente
  useEffect(() => {
    if (viewRef.current) {
      const currentDoc = viewRef.current.state.doc.toString();
      if (currentDoc !== content) {
        isRemoteChangeRef.current = true;
        viewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: content },
          effects: setRemoteCursorsEffect.of(remoteCursors),
        });
        isRemoteChangeRef.current = false;
      }
    }
  }, [content, remoteCursors]);

  // Calcula posições verticais (em pixels) e número da linha de cada comentário para alinhar o painel de Review
  const updateLinePositions = (viewInstance?: EditorView) => {
    const view = viewInstance || viewRef.current;
    if (!view || !onLinePositionsChangeRef.current) return;
    const doc = view.state.doc;
    const currentComments = commentsRef.current;
    const commentLineTops: Record<string, { lineNumber: number; top: number }> = {};

    let topsKey = '';
    for (const c of currentComments) {
      const clamped = Math.max(0, Math.min(c.from, doc.length));
      const line = doc.lineAt(clamped);
      const lineBlock = view.lineBlockAt(line.from);
      commentLineTops[c.id] = {
        lineNumber: line.number,
        top: lineBlock.top,
      };
      topsKey += `${c.id}:${line.number}:${Math.round(lineBlock.top)};`;
    }

    const currentScrollTop = Math.round(view.scrollDOM.scrollTop);
    const currentScrollHeight = view.scrollDOM.scrollHeight;
    const currentClientHeight = view.scrollDOM.clientHeight;

    // Evita disparar render no App se as posições e o scroll não mudaram significativamente
    const last = lastSentLayoutRef.current;
    if (last.topsKey === topsKey && Math.abs(last.scrollTop - currentScrollTop) < 3) {
      return;
    }

    lastSentLayoutRef.current = {
      scrollTop: currentScrollTop,
      topsKey,
    };

    onLinePositionsChangeRef.current({
      commentLineTops,
      scrollTop: currentScrollTop,
      scrollHeight: currentScrollHeight,
      clientHeight: currentClientHeight,
    });
  };

  // Atualiza posições das linhas quando comentários ou conteúdo mudarem
  useEffect(() => {
    updateLinePositions();
  }, [comments, content]);

  // Monitora rolagem do editor com requestAnimationFrame para sincronizar o painel de Review lateral suavemente
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    let rafId: number | null = null;
    const handleScroll = () => {
      if (!isInlineBoxOpenRef.current) {
        setSelectionPopup(null);
      }
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (viewRef.current) {
          updateLinePositions(viewRef.current);
        }
      });
    };

    const scrollDOM = view.scrollDOM;
    scrollDOM.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      scrollDOM.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Sincroniza rolagem externa quando solicitada pelo painel de Review
  useEffect(() => {
    if (viewRef.current && externalScrollTop !== undefined) {
      if (Math.abs(viewRef.current.scrollDOM.scrollTop - externalScrollTop) > 2) {
        viewRef.current.scrollDOM.scrollTop = externalScrollTop;
      }
    }
  }, [externalScrollTop]);

  // Se houver seleção pendente externa, abre o inline box nas coordenadas correspondentes
  useEffect(() => {
    if (pendingCommentSelection && viewRef.current && containerRef.current) {
      const headCoords = viewRef.current.coordsAtPos(pendingCommentSelection.to);
      const containerRect = containerRef.current.getBoundingClientRect();
      if (headCoords) {
        setSelectionPopup({
          from: pendingCommentSelection.from,
          to: pendingCommentSelection.to,
          text: pendingCommentSelection.selectedText,
          top: Math.max(8, headCoords.bottom - containerRect.top + 6),
          left: Math.max(
            12,
            Math.min(headCoords.left - containerRect.left - 40, containerRect.width - 320)
          ),
        });
        setIsInlineBoxOpen(true);
      }
    }
  }, [pendingCommentSelection]);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* Barra de Status e Ferramentas do CodeMirror (Estilo Overleaf - sem botões espalhados de comentário) */}
      <Box
        sx={{
          height: 36,
          px: 1.5,
          backgroundColor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
        }}
      >
        <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              alignItems: 'center',
              color: 'text.primary',
              fontWeight: 600,
              fontSize: '0.78rem',
            }}
          >
            <Code2 size={15} style={{ color: 'var(--primary-main, #098842)' }} />
            <Typography component="span" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
              LaTeX (sTeX)
            </Typography>
          </Stack>

          <Typography component="span" sx={{ color: 'divider' }}>
            •
          </Typography>

          {saveStatus === 'synced' && (
            <Stack
              direction="row"
              spacing={0.4}
              sx={{ alignItems: 'center', color: '#10b981', fontSize: '0.75rem', fontWeight: 500 }}
            >
              <CheckCircle2 size={13} />
              <Typography component="span" sx={{ fontSize: '0.75rem' }}>
                Sincronizado
              </Typography>
            </Stack>
          )}

          {saveStatus === 'pending_debounce' && (
            <Stack
              direction="row"
              spacing={0.4}
              sx={{ alignItems: 'center', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 500 }}
            >
              <Clock size={13} />
              <Typography component="span" sx={{ fontSize: '0.75rem' }}>
                Buffer Redis (3s)
              </Typography>
            </Stack>
          )}

          {saveStatus === 'saving' && (
            <Stack
              direction="row"
              spacing={0.4}
              sx={{ alignItems: 'center', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 500 }}
            >
              <CloudUpload size={13} />
              <Typography component="span" sx={{ fontSize: '0.75rem' }}>
                Gravando snapshot...
              </Typography>
            </Stack>
          )}

          <Typography sx={{ color: 'text.secondary', fontSize: '0.73rem' }}>
            {lastSavedAt ? `Salvo às ${lastSavedAt}` : 'Sincronizado'}
          </Typography>

          {activeEditor && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                backgroundColor: 'background.paper',
                border: 1,
                borderColor: activeEditor.color,
                px: 0.8,
                py: 0.2,
                borderRadius: 2,
                color: activeEditor.color,
                fontSize: '0.72rem',
                fontWeight: 600,
              }}
            >
              <UserCheck size={12} />
              <Typography
                component="span"
                sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'inherit' }}
              >
                {activeEditor.userName} {activeEditor.action}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>

      {/* Container relativo onde o CodeMirror 6 se anexa e o menu flutuante de seleção é projetado */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          ref={containerRef}
          sx={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            '--cm-cursor-color': currentUserColor || '#059669',
            '--cm-font-size': settings.fontSize || '13.5px',
            '--cm-line-height': settings.lineHeight || '1.65',
            '--cm-cursor-animation': settings.nonBlinkingCursor
              ? 'none !important'
              : 'cm-blink 1.2s ease-in-out infinite',
          }}
        />

        {/* Menu Flutuante de Seleção / Caixa Inline de Comentário (Estilo Overleaf / Google Docs) */}
        {selectionPopup && (
          <Box
            sx={{
              position: 'absolute',
              top: selectionPopup.top,
              left: selectionPopup.left,
              zIndex: 100,
              pointerEvents: 'auto',
            }}
          >
            {!isInlineBoxOpen ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  border: 1,
                  borderColor: 'divider',
                  p: 0.5,
                  gap: 0.5,
                }}
              >
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<MessageSquare size={13} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInlineBoxOpen(true);
                  }}
                  sx={{
                    height: 28,
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    boxShadow: 'none',
                    '&:hover': {
                      backgroundColor: '#047857',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Adicionar comentário
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  width: 310,
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  border: 1,
                  borderColor: '#059669',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                }}
              >
                <Stack spacing={1.2}>
                  <Stack
                    direction="row"
                    spacing={0.8}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          width: 22,
                          height: 22,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor: currentUserColor || '#059669',
                          color: '#ffffff',
                        }}
                      >
                        {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'U'}
                      </Avatar>
                      <Typography
                        sx={{ fontSize: '0.76rem', fontWeight: 600, color: 'text.primary' }}
                      >
                        Novo comentário
                      </Typography>
                    </Stack>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setIsInlineBoxOpen(false);
                        setSelectionPopup(null);
                        setInlineCommentInput('');
                      }}
                      sx={{ p: 0.3, color: 'text.secondary' }}
                    >
                      <X size={14} />
                    </IconButton>
                  </Stack>

                  <Box
                    sx={{
                      p: 0.8,
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      borderLeft: 3,
                      borderColor: '#f59e0b',
                      borderRadius: '0 4px 4px 0',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.7rem',
                        fontStyle: 'italic',
                        color: 'text.secondary',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      "{selectionPopup.text}"
                    </Typography>
                  </Box>

                  <TextField
                    autoFocus
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    placeholder="Adicionar sugestão ou comentário..."
                    value={inlineCommentInput}
                    onChange={(e) => setInlineCommentInput(e.target.value)}
                    sx={{
                      '& .MuiInputBase-root': {
                        fontSize: '0.76rem',
                        p: 1,
                      },
                    }}
                  />

                  <Stack direction="row" spacing={0.8} sx={{ justifyContent: 'flex-end', pt: 0.5 }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setIsInlineBoxOpen(false);
                        setSelectionPopup(null);
                        setInlineCommentInput('');
                      }}
                      sx={{
                        fontSize: '0.72rem',
                        height: 26,
                        textTransform: 'none',
                        color: 'text.secondary',
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!inlineCommentInput.trim()}
                      onClick={() => {
                        if (onRequestAddComment) {
                          onRequestAddComment(
                            selectionPopup.from,
                            selectionPopup.to,
                            selectionPopup.text,
                            inlineCommentInput.trim()
                          );
                        }
                        setIsInlineBoxOpen(false);
                        setSelectionPopup(null);
                        setInlineCommentInput('');
                      }}
                      sx={{
                        fontSize: '0.72rem',
                        height: 26,
                        fontWeight: 600,
                        textTransform: 'none',
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#047857',
                        },
                      }}
                    >
                      Salvar
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
