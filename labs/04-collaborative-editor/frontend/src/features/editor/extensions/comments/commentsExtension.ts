import { StateField, StateEffect, RangeSetBuilder, Text } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet, showTooltip, Tooltip } from '@codemirror/view';
import { ReviewComment } from '../../types/collab.types.js';

// Efeitos e Campo de Estado para Comentários de Revisão Inline (Estilo Overleaf)
export const setCommentsEffect = StateEffect.define<ReviewComment[]>();
export const setActiveCommentEffect = StateEffect.define<string | null>();
export const setPendingSelectionEffect = StateEffect.define<{
  from: number;
  to: number;
  selectedText: string;
} | null>();

export interface CommentsFieldState {
  comments: ReviewComment[];
  activeId: string | null;
  pendingSelection: { from: number; to: number; selectedText: string } | null;
  decorations: DecorationSet;
}

export function buildCommentDecorations(
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

// Menu Flutuante Nativo do CodeMirror ao Selecionar Texto (Estilo Autêntico Overleaf)
// Usa showTooltip diretamente conectado ao selectionRange, mantendo posição durante a rolagem
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
