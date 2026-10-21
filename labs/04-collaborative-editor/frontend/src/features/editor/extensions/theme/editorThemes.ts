import { EditorView } from '@codemirror/view';

// Tema Escuro Oficial Overleaf
export const codeMirrorDarkTheme = EditorView.theme({
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
  // Native Placeholder Styling
  '.cm-placeholder': {
    color: '#64748b !important',
    fontStyle: 'italic',
  },
});

// Tema Claro Oficial Overleaf
export const codeMirrorLightTheme = EditorView.theme({
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
  // Native Placeholder Styling
  '.cm-placeholder': {
    color: '#94a3b8 !important',
    fontStyle: 'italic',
  },
});
