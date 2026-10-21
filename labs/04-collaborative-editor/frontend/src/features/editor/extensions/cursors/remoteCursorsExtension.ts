import { StateField, StateEffect, RangeSetBuilder, Text } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { RemoteCursor } from '../../types/collab.types.js';
import { getContrastColor, hexToRgba } from '../../../../utils/color.js';

// Widget visual para o cursor de outro colaborador
export class CursorWidget extends WidgetType {
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
export const setRemoteCursorsEffect = StateEffect.define<RemoteCursor[]>();

interface CursorDecoItem {
  from: number;
  to: number;
  deco: Decoration;
}

// Constrói com segurança decorações de cursor, seleção e realce de linha de colaboradores (estilo Overleaf/VSCode)
export function buildCursorDecorations(cursors: RemoteCursor[], doc: Text): DecorationSet {
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
export const remoteCursorsField = StateField.define<RemoteCursorsState>({
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
