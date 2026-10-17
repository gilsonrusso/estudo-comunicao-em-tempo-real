import { useRef, useEffect } from 'react';
import { EditorState, StateField, StateEffect, RangeSetBuilder, Compartment } from '@codemirror/state';
import { EditorView, lineNumbers, keymap, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { StreamLanguage, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { AuthorHighlight, DeltaOperation, RemoteCursor, SaveStatus } from '../types/collab.js';
import { CheckCircle2, Clock, CloudUpload, UserCheck, Trash2, Code2 } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export interface CodeMirrorEditorProps {
  content: string;
  version: number;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  remoteCursors: RemoteCursor[];
  authorHighlights: AuthorHighlight[];
  activeEditor: { userName: string; color: string; action: string } | null;
  theme?: 'dark' | 'light';
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
    flag.style.color = '#ffffff';
    flag.style.fontSize = '10px';
    flag.style.fontWeight = '600';
    flag.style.padding = '1px 5px';
    flag.style.borderRadius = '3px 3px 3px 0';
    flag.style.whiteSpace = 'nowrap';
    flag.style.pointerEvents = 'none';
    flag.style.zIndex = '20';
    flag.style.transform = 'translateY(-2px)';
    flag.style.boxShadow = '0 1px 3px rgba(0,0,0,0.25)';

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
                style: `background-color: ${h.color}30; border-bottom: 2px solid ${h.color}; border-radius: 2px;`,
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

// Compartment para alternar temas no CodeMirror sem reinstanciar
const themeCompart = new Compartment();

// Tema Escuro Oficial Overleaf
const codeMirrorDarkTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--bg-editor)',
    color: '#f4f5f6',
    fontSize: '13.5px',
    height: '100%',
    fontFamily: "var(--font-mono)",
  },
  '.cm-content': {
    caretColor: '#098842',
    padding: '12px 0',
  },
  '.cm-line': {
    padding: '0 12px',
    lineHeight: '1.65',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-gutter)',
    color: '#8d96a5',
    borderRight: '1px solid var(--border)',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#098842',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(54, 108, 191, 0.35) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: '#f4f5f6',
    fontWeight: 'bold',
  },
});

// Tema Claro Oficial Overleaf
const codeMirrorLightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#1b222c',
    fontSize: '13.5px',
    height: '100%',
    fontFamily: "var(--font-mono)",
  },
  '.cm-content': {
    caretColor: '#098842',
    padding: '12px 0',
  },
  '.cm-line': {
    padding: '0 12px',
    lineHeight: '1.65',
  },
  '.cm-gutters': {
    backgroundColor: '#fafafb',
    color: '#677283',
    borderRight: '1px solid #e7e9ee',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#098842',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(151, 182, 229, 0.4) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 0, 0, 0.035)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    color: '#1b222c',
    fontWeight: 'bold',
  },
});

export function CodeMirrorEditor({
  content,
  version,
  saveStatus,
  lastSavedAt,
  remoteCursors,
  authorHighlights,
  activeEditor,
  theme = 'dark',
  onApplyLocalDelta,
  onCursorMove,
  onClearHighlights,
}: CodeMirrorEditorProps) {
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
        themeCompart.of(theme === 'light' ? codeMirrorLightTheme : codeMirrorDarkTheme),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet && !isRemoteChangeRef.current) {
            onCursorMove(update.state.selection.main.head);
          }

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
      viewRef.current = null;
    };
  }, []);

  // Reconfigura o tema do CodeMirror dinamicamente quando a prop `theme` mudar
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompart.reconfigure(theme === 'light' ? codeMirrorLightTheme : codeMirrorDarkTheme),
      });
    }
  }, [theme]);

  // Atualiza cursores remotos
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: setRemoteCursorsEffect.of(remoteCursors),
      });
    }
  }, [remoteCursors]);

  // Atualiza realces de autoria
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: setHighlightsEffect.of(authorHighlights),
      });
    }
  }, [authorHighlights]);

  // Sincroniza conteúdo se o documento for substituído externamente
  useEffect(() => {
    if (viewRef.current) {
      const currentDoc = viewRef.current.state.doc.toString();
      if (currentDoc !== content) {
        isRemoteChangeRef.current = true;
        viewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: content },
        });
        isRemoteChangeRef.current = false;
      }
    }
  }, [content]);

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
      {/* Barra de Status e Ferramentas do CodeMirror (Estilo Overleaf) */}
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

          <Typography component="span" sx={{ color: 'divider' }}>•</Typography>

          {saveStatus === 'synced' && (
            <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', color: '#10b981', fontSize: '0.75rem', fontWeight: 500 }}>
              <CheckCircle2 size={13} />
              <Typography component="span" sx={{ fontSize: '0.75rem' }}>Sincronizado</Typography>
            </Stack>
          )}

          {saveStatus === 'pending_debounce' && (
            <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 500 }}>
              <Clock size={13} />
              <Typography component="span" sx={{ fontSize: '0.75rem' }}>Buffer Redis (3s)</Typography>
            </Stack>
          )}

          {saveStatus === 'saving' && (
            <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 500 }}>
              <CloudUpload size={13} />
              <Typography component="span" sx={{ fontSize: '0.75rem' }}>Gravando snapshot...</Typography>
            </Stack>
          )}

          <Typography sx={{ color: 'text.secondary', fontSize: '0.73rem' }}>
            <Box component="span" sx={{ fontWeight: 600 }}>v{version}</Box>
            {lastSavedAt && <Box component="span"> • {lastSavedAt}</Box>}
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
              <Typography component="span" sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'inherit' }}>
                {activeEditor.userName} {activeEditor.action}
              </Typography>
            </Box>
          )}
        </Stack>

        {authorHighlights.length > 0 && (
          <Button
            size="small"
            variant="text"
            onClick={onClearHighlights}
            startIcon={<Trash2 size={12} />}
            sx={{
              fontSize: '0.72rem',
              height: 24,
              textTransform: 'none',
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
              },
            }}
          >
            Limpar Realces ({authorHighlights.length})
          </Button>
        )}
      </Box>

      {/* Container onde o CodeMirror 6 se anexa */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      />
    </Box>
  );
}
