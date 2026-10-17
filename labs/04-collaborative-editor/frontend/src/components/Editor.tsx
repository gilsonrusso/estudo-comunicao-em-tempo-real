import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AuthorHighlight, DeltaOperation, RemoteCursor, SaveStatus } from '../types/collab.js';
import { CheckCircle2, Clock, CloudUpload, UserCheck, Eye, Edit3, Trash2 } from 'lucide-react';

export interface EditorProps {
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

interface CursorCoord {
  left: number;
  top: number;
}

export function Editor({
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
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const prevContentRef = useRef<string>(content);

  const [cursorCoords, setCursorCoords] = useState<Map<string, CursorCoord>>(new Map());
  const [viewMode, setViewMode] = useState<'editor' | 'blame'>('editor');

  useEffect(() => {
    prevContentRef.current = content;
  }, [content]);

  // Sincroniza a rolagem do backdrop com o textarea
  const syncScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Medição precisa do caractere para os cursores flutuantes
  const getCoordinates = useCallback((charIndex: number): CursorCoord | null => {
    const textarea = textareaRef.current;
    if (!textarea) return null;

    if (!mirrorRef.current) {
      const mirror = document.createElement('div');
      mirror.style.position = 'absolute';
      mirror.style.top = '-9999px';
      mirror.style.left = '-9999px';
      mirror.style.visibility = 'hidden';
      mirror.style.whiteSpace = 'pre-wrap';
      mirror.style.wordWrap = 'break-word';
      mirror.style.overflowWrap = 'break-word';
      document.body.appendChild(mirror);
      mirrorRef.current = mirror;
    }

    const mirror = mirrorRef.current;
    const computed = window.getComputedStyle(textarea);

    mirror.style.fontFamily = computed.fontFamily;
    mirror.style.fontSize = computed.fontSize;
    mirror.style.fontWeight = computed.fontWeight;
    mirror.style.lineHeight = computed.lineHeight;
    mirror.style.letterSpacing = computed.letterSpacing;
    mirror.style.padding = computed.padding;
    mirror.style.border = computed.border;
    mirror.style.boxSizing = computed.boxSizing;
    mirror.style.width = `${textarea.clientWidth}px`;

    const clampedIndex = Math.max(0, Math.min(charIndex, content.length));
    const textBefore = content.substring(0, clampedIndex);
    const textAfter = content.substring(clampedIndex);

    mirror.textContent = '';
    const spanBefore = document.createTextNode(textBefore);
    const marker = document.createElement('span');
    marker.textContent = '|';
    const spanAfter = document.createTextNode(textAfter);

    mirror.appendChild(spanBefore);
    mirror.appendChild(marker);
    mirror.appendChild(spanAfter);

    const rect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    const relativeLeft = rect.left - mirrorRect.left;
    const relativeTop = rect.top - mirrorRect.top;

    return {
      left: relativeLeft - textarea.scrollLeft + textarea.offsetLeft,
      top: relativeTop - textarea.scrollTop + textarea.offsetTop,
    };
  }, [content]);

  // Recalcula posições dos cursores
  const updateRemoteCoords = useCallback(() => {
    const coords = new Map<string, CursorCoord>();
    for (const cursor of remoteCursors) {
      const pos = getCoordinates(cursor.position);
      if (pos) {
        coords.set(cursor.userId, pos);
      }
    }
    setCursorCoords(coords);
  }, [remoteCursors, getCoordinates]);

  useEffect(() => {
    updateRemoteCoords();
  }, [updateRemoteCoords, remoteCursors, content]);

  useEffect(() => {
    return () => {
      if (mirrorRef.current) {
        document.body.removeChild(mirrorRef.current);
        mirrorRef.current = null;
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const oldText = prevContentRef.current;

    if (newText === oldText) return;

    let start = 0;
    while (start < oldText.length && start < newText.length && oldText[start] === newText[start]) {
      start++;
    }

    let oldEnd = oldText.length - 1;
    let newEnd = newText.length - 1;

    while (oldEnd >= start && newEnd >= start && oldText[oldEnd] === newText[newEnd]) {
      oldEnd--;
      newEnd--;
    }

    if (newEnd >= start) {
      const insertedText = newText.slice(start, newEnd + 1);
      onApplyLocalDelta({
        type: 'insert',
        position: start,
        text: insertedText,
      });
    }

    if (oldEnd >= start) {
      const deletedLength = oldEnd - start + 1;
      onApplyLocalDelta({
        type: 'delete',
        position: start,
        length: deletedLength,
      });
    }

    prevContentRef.current = newText;
    onCursorMove(e.target.selectionStart || 0);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    onCursorMove(target.selectionStart);
  };

  const handleScroll = () => {
    syncScroll();
    updateRemoteCoords();
  };

  // Gera o HTML do backdrop que destaca os trechos editados por cada pessoa
  const renderedBackdropContent = useMemo(() => {
    if (authorHighlights.length === 0) {
      return <span>{content}</span>;
    }

    // Ordena os realces por posição
    const sorted = [...authorHighlights]
      .filter((h) => h.start < content.length)
      .sort((a, b) => a.start - b.start);

    const segments: React.ReactNode[] = [];
    let currentIndex = 0;

    sorted.forEach((hl, i) => {
      const start = Math.max(currentIndex, Math.min(hl.start, content.length));
      const end = Math.min(Math.max(start, hl.end), content.length);

      if (start > currentIndex) {
        segments.push(
          <span key={`plain-${currentIndex}-${start}`}>
            {content.substring(currentIndex, start)}
          </span>
        );
      }

      if (end > start) {
        segments.push(
          <mark
            key={`hl-${hl.id}-${i}`}
            title={`Editado por ${hl.authorName}`}
            style={{
              backgroundColor: `${hl.color}55`, // realce nítido e translúcido
              borderBottom: `2.5px solid ${hl.color}`,
              color: 'transparent',
              borderRadius: '3px',
              padding: '2px 0',
            }}
          >
            {content.substring(start, end)}
          </mark>
        );
      }

      currentIndex = Math.max(currentIndex, end);
    });

    if (currentIndex < content.length) {
      segments.push(
        <span key={`plain-end-${currentIndex}`}>
          {content.substring(currentIndex)}
        </span>
      );
    }

    return segments;
  }, [content, authorHighlights]);

  // Modo Blame: renderiza texto com etiquetas visíveis de quem escreveu cada trecho
  const renderedBlameContent = useMemo(() => {
    if (authorHighlights.length === 0) {
      return (
        <div style={{ color: 'var(--text-muted)', lineHeight: '1.8' }}>
          {content}
        </div>
      );
    }

    const sorted = [...authorHighlights]
      .filter((h) => h.start < content.length)
      .sort((a, b) => a.start - b.start);

    const elements: React.ReactNode[] = [];
    let lastIdx = 0;

    sorted.forEach((hl, i) => {
      const start = Math.max(lastIdx, Math.min(hl.start, content.length));
      const end = Math.min(Math.max(start, hl.end), content.length);

      if (start > lastIdx) {
        elements.push(
          <span key={`blame-plain-${lastIdx}`} style={{ color: 'var(--text-muted)' }}>
            {content.substring(lastIdx, start)}
          </span>
        );
      }

      if (end > start) {
        elements.push(
          <span
            key={`blame-hl-${hl.id}-${i}`}
            style={{
              backgroundColor: `${hl.color}20`,
              borderLeft: `3px solid ${hl.color}`,
              padding: '0.15rem 0.4rem',
              margin: '0 0.15rem',
              borderRadius: '3px',
              display: 'inline-block',
              lineHeight: '1.6',
            }}
          >
            <span style={{ color: 'var(--text-main)' }}>{content.substring(start, end)}</span>
            <small
              style={{
                marginLeft: '0.4rem',
                color: hl.color,
                fontWeight: 700,
                fontSize: '0.7rem',
              }}
            >
              [{hl.authorName}]
            </small>
          </span>
        );
      }

      lastIdx = Math.max(lastIdx, end);
    });

    if (lastIdx < content.length) {
      elements.push(
        <span key={`blame-tail-${lastIdx}`} style={{ color: 'var(--text-muted)' }}>
          {content.substring(lastIdx)}
        </span>
      );
    }

    return elements;
  }, [content, authorHighlights]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Barra de Status e Controles de Visualização */}
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
          {saveStatus === 'synced' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--green)' }}>
              <CheckCircle2 size={15} />
              <span>Sincronizado no PostgreSQL</span>
            </div>
          )}

          {saveStatus === 'pending_debounce' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--yellow)' }}>
              <Clock size={15} />
              <span>Em buffer (Redis / RAM) • Debounce de 3s ativo</span>
            </div>
          )}

          {saveStatus === 'saving' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent)' }}>
              <CloudUpload size={15} />
              <span>Gravando snapshot no banco...</span>
            </div>
          )}

          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
            <span style={{ fontWeight: 600 }}>v{version}</span>
            {lastSavedAt && <span> • Salvo às {lastSavedAt}</span>}
          </div>

          {/* Notificação inline de quem está editando no momento */}
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

        {/* Alternador de Modo de Visualização e Limpar Realces */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

          <div style={{ display: 'flex', backgroundColor: 'var(--bg-primary)', padding: '2px', borderRadius: '0.4rem', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('editor')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.65rem',
                backgroundColor: viewMode === 'editor' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'editor' ? 'var(--accent)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '0.3rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Edit3 size={13} />
              <span>Editor com Realces</span>
            </button>

            <button
              onClick={() => setViewMode('blame')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.65rem',
                backgroundColor: viewMode === 'blame' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'blame' ? 'var(--accent)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '0.3rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Eye size={13} />
              <span>Blame / Autoria</span>
            </button>
          </div>
        </div>
      </div>

      {/* Área Principal de Edição */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {viewMode === 'editor' ? (
          <>
            {/* Camada 1: Backdrop de Realce Colorido (fica atrás do texto do textarea) */}
            <div
              ref={backdropRef}
              style={{
                position: 'absolute',
                top: '1.5rem',
                left: '1.5rem',
                right: '1.5rem',
                bottom: '1.5rem',
                padding: '1rem',
                fontSize: '1rem',
                lineHeight: '1.7',
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                overflow: 'hidden',
                pointerEvents: 'none',
                color: 'transparent',
                backgroundColor: 'rgba(18, 24, 38, 0.7)',
                boxSizing: 'border-box',
                border: '1px solid transparent',
                borderRadius: '0.5rem',
              }}
            >
              {renderedBackdropContent}
            </div>

            {/* Camada 2: Textarea transparente com texto legível */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onSelect={handleSelect}
              onKeyUp={handleSelect}
              onClick={handleSelect}
              onScroll={handleScroll}
              placeholder="Comece a digitar seu documento colaborativo..."
              spellCheck={false}
              style={{
                flex: 1,
                width: '100%',
                color: 'var(--text-main)',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                outline: 'none',
                resize: 'none',
                fontSize: '1rem',
                lineHeight: '1.7',
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                padding: '1rem',
                borderRadius: '0.5rem',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 2,
              }}
            />

            {/* Camada 3: Cursores Flutuantes com Bandeiras */}
            {remoteCursors.map((cursor) => {
              const coord = cursorCoords.get(cursor.userId);
              if (!coord) return null;

              return (
                <div
                  key={cursor.userId}
                  style={{
                    position: 'absolute',
                    left: `${coord.left}px`,
                    top: `${coord.top}px`,
                    width: '2px',
                    height: '1.5rem',
                    backgroundColor: cursor.color,
                    pointerEvents: 'none',
                    zIndex: 20,
                    transition: 'left 0.1s ease-out, top 0.1s ease-out',
                    boxShadow: `0 0 8px ${cursor.color}`,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      backgroundColor: cursor.color,
                      color: '#0a0d14',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px 4px 4px 0',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                      transform: 'translateY(-2px)',
                    }}
                  >
                    <span>{cursor.userName}</span>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          /* Modo Blame: Visualização Completa de Autoria */
          <div
            style={{
              flex: 1,
              width: '100%',
              backgroundColor: 'rgba(18, 24, 38, 0.6)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              padding: '1.25rem',
              overflowY: 'auto',
              lineHeight: '1.8',
              fontSize: '1rem',
              whiteSpace: 'pre-wrap',
            }}
          >
            <div
              style={{
                paddingBottom: '0.75rem',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>
                📋 Modo Blame de Autoria: Cada trecho é rotulado com a cor e o nome de quem o escreveu
              </span>
            </div>
            {renderedBlameContent}
          </div>
        )}
      </div>
    </div>
  );
};
