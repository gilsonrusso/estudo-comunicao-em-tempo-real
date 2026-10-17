import React, { useRef, useEffect } from 'react';
import { EditorState, StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import { EditorView, lineNumbers, keymap, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { StreamLanguage, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { AuthorHighlight, DeltaOperation, RemoteCursor, SaveStatus } from '../types/collab.js';
import { CheckCircle2, Clock, CloudUpload, UserCheck, Trash2, Code2 } from 'lucide-react';

interface Props {
  content: string;
  version: number;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  remoteCursors: RemoteCursor[];
  authorHighlights: AuthorHighlight[];
  activeEditor: { userName: string; color: string; action: string } | null;
  onApplyLocalDelta: (delta: Omit<DeltaOperation, 'userId' | 'userName' | 'timestamp'>) => void;
  onCursorMove: (position: number) => void;
  onClearHighlights: () => void;
}

// Widget visual para o cursor de outro colaborador
class CursorWidget extends WidgetType {
  constructor(readonly userName: string, readonly color: string) {
    super();
  }

  toDOM() {
    const wrap = document.createElement('span');
    wrap.style.position = 'relative';
    wrap.style.display = 'inline-block';
    wrap.style.width = '0';
    wrap.style.height = '1.2em';
    wrap.style.verticalAlign = 'text-bottom';

    const bar = document.createElement('span');
    bar.style.position = 'absolute';
    bar.style.left = '0';
    bar.style.top = '0';
    bar.style.width = '2px';
    bar.style.height = '100%';
    bar.style.backgroundColor = this.color;
    bar.style.boxShadow = `0 0 6px ${this.color}`;

    const flag = document.createElement('span');
    flag.innerText = this.userName;
    flag.style.position = 'absolute';
    flag.style.bottom = '100%';
    flag.style.left = '0';
    flag.style.backgroundColor = this.color;
    flag.style.color = '#0b0f19';
    flag.style.fontSize = '10px';
    flag.style.fontWeight = 'bold';
    flag.style.padding = '1px 5px';
    flag.style.borderRadius = '3px 3px 3px 0';
    flag.style.whiteSpace = 'nowrap';
    flag.style.pointerEvents = 'none';
    flag.style.zIndex = '20';
    flag.style.transform = 'translateY(-2px)';

    wrap.appendChild(bar);
    wrap.appendChild(flag);
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

// StateEffects para atualizar cursores e realces sem recriar o editor
const setRemoteCursorsEffect = StateEffect.define<RemoteCursor[]>();
const setHighlightsEffect = StateEffect.define<AuthorHighlight[]>();

// Campo do CodeMirror para renderizar cursores remotos
const remoteCursorsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setRemoteCursorsEffect)) {
        const builder = new RangeSetBuilder<Decoration>();
        const docLen = tr.newDoc.length;

        // Ordena por posição para a API RangeSet
        const sorted = [...effect.value]
          .filter((c) => c.position >= 0 && c.position <= docLen)
          .sort((a, b) => a.position - b.position);

        for (const cursor of sorted) {
          const deco = Decoration.widget({
            widget: new CursorWidget(cursor.userName, cursor.color),
            side: 1,
          });
          builder.add(cursor.position, cursor.position, deco);
        }
        return builder.finish();
      }
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Campo do CodeMirror para renderizar realce de autoria (blame inline)
const authorHighlightsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHighlightsEffect)) {
        const builder = new RangeSetBuilder<Decoration>();
        const docLen = tr.newDoc.length;

        const sorted = [...effect.value]
          .filter((h) => h.start < docLen)
          .sort((a, b) => a.start - b.start);

        let lastTo = 0;
        for (const h of sorted) {
          const from = Math.max(lastTo, Math.min(h.start, docLen));
          const to = Math.min(Math.max(from, h.end), docLen);

          if (to > from) {
            const markDeco = Decoration.mark({
              attributes: {
                style: `background-color: ${h.color}35; border-bottom: 2px solid ${h.color}; border-radius: 2px;`,
                title: `Editado por ${h.authorName}`,
              },
            });
            builder.add(from, to, markDeco);
            lastTo = to;
          }
        }
        return builder.finish();
      }
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Tema escuro com fontes de código para LaTeX
const codeMirrorDarkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0b0f19',
    color: '#e2e8f0',
    fontSize: '13.5px',
    height: '100%',
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  },
  '.cm-content': {
    caretColor: '#38bdf8',
    padding: '12px 0',
  },
  '.cm-line': {
    padding: '0 12px',
    lineHeight: '1.65',
  },
  '.cm-gutters': {
    backgroundColor: '#0a0d14',
    color: '#475569',
    borderRight: '1px solid #1e293b',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#38bdf8',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(56, 189, 248, 0.25) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
  },
});

export const CodeMirrorEditor: React.FC<Props> = ({
  content,
  version,
  saveStatus,
  lastSavedAt,
  remoteCursors,
  authorHighlights,
  activeEditor,
  onApplyLocalDelta,
  onCursorMove,
  onClearHighlights,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isRemoteChangeRef = useRef<boolean>(false);

  // Inicializa o CodeMirror 6 na montagem
  useEffect(() => {
    if (!containerRef.current) return;

    const startState = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        StreamLanguage.define(stex), // Parser nativo de sintaxe LaTeX
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        remoteCursorsField,
        authorHighlightsField,
        codeMirrorDarkTheme,
        EditorView.updateListener.of((update) => {
          // Captura movimentos de cursor local
          if (update.selectionSet && !isRemoteChangeRef.current) {
            onCursorMove(update.state.selection.main.head);
          }

          // Captura edições do usuário local e extrai deltas atômicos
          if (update.docChanged && !isRemoteChangeRef.current) {
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

    return () => {
      view.destroy();
    };
  }, []);

  // Sincroniza o conteúdo quando chega delta remoto sem sobrescrever o cursor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== content) {
      isRemoteChangeRef.current = true;
      try {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: content },
        });
      } finally {
        isRemoteChangeRef.current = false;
      }
    }
  }, [content]);

  // Atualiza cursores remotos no CodeMirror
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      view.dispatch({
        effects: setRemoteCursorsEffect.of(remoteCursors),
      });
    }
  }, [remoteCursors]);

  // Atualiza realces de autoria no CodeMirror
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      view.dispatch({
        effects: setHighlightsEffect.of(authorHighlights),
      });
    }
  }, [authorHighlights]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Barra de Status e Ferramentas do CodeMirror */}
      <div
        style={{
          padding: '0.6rem 1.25rem',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)', fontWeight: 600 }}>
            <Code2 size={16} />
            <span>CodeMirror 6 • LaTeX (sTeX)</span>
          </div>

          <span style={{ color: 'var(--border)' }}>|</span>

          {saveStatus === 'synced' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--green)' }}>
              <CheckCircle2 size={15} />
              <span>Sincronizado</span>
            </div>
          )}

          {saveStatus === 'pending_debounce' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--yellow)' }}>
              <Clock size={15} />
              <span>Buffer Redis (Debounce 3s)</span>
            </div>
          )}

          {saveStatus === 'saving' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)' }}>
              <CloudUpload size={15} />
              <span>Gravando snapshot...</span>
            </div>
          )}

          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <span style={{ fontWeight: 600 }}>v{version}</span>
            {lastSavedAt && <span> • {lastSavedAt}</span>}
          </div>

          {activeEditor && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${activeEditor.color}`,
                padding: '0.15rem 0.6rem',
                borderRadius: '0.35rem',
                color: activeEditor.color,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <UserCheck size={13} />
              <span>{activeEditor.userName} {activeEditor.action}</span>
            </div>
          )}
        </div>

        {authorHighlights.length > 0 && (
          <button
            onClick={onClearHighlights}
            title="Limpar realces coloridos da tela"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={12} />
            <span>Limpar Realces ({authorHighlights.length})</span>
          </button>
        )}
      </div>

      {/* Container onde o CodeMirror 6 se anexa */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      />
    </div>
  );
};
