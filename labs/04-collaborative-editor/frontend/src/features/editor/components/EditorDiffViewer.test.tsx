import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorDiffViewer } from './EditorDiffViewer.js';
import { DocumentSnapshot } from '../types/collab.types.js';

describe('EditorDiffViewer Component Tests', () => {
  beforeEach(() => {
    // Polyfill mocks para JSDOM do CodeMirror
    if (typeof window.requestAnimationFrame === 'undefined') {
      window.requestAnimationFrame = (cb: FrameRequestCallback) =>
        window.setTimeout(() => cb(performance.now()), 0);
    }
  });

  const mockSnapshot: DocumentSnapshot = {
    id: 'snap-1',
    documentId: 'doc-1',
    version: 3,
    content: '\\documentclass{article}\n\\begin{document}\nVersão anterior\n\\end{document}',
    savedBy: 'Alice',
    reason: 'checkpoint_manual',
    createdAt: new Date().toISOString(),
  };

  it('should not render anything when open is false or snapshot is null', () => {
    const { container } = render(
      <EditorDiffViewer
        open={false}
        snapshot={mockSnapshot}
        currentContent="conteudo atual"
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render dialog header, version info and mode buttons when open is true', () => {
    render(
      <EditorDiffViewer
        open={true}
        snapshot={mockSnapshot}
        currentContent="conteudo atual modificado"
        onClose={vi.fn()}
        onRestoreVersion={vi.fn()}
      />
    );

    expect(screen.getByText(/Comparando Versão 3 com a Versão Atual/i)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lado a Lado/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inline \(Unificado\)/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Restaurar para esta Versão/i })
    ).toBeInTheDocument();
  });

  it('should toggle view mode when clicking mode buttons', () => {
    render(
      <EditorDiffViewer
        open={true}
        snapshot={mockSnapshot}
        currentContent="conteudo atual modificado"
        onClose={vi.fn()}
      />
    );

    const inlineBtn = screen.getByRole('button', { name: /Inline \(Unificado\)/i });
    fireEvent.click(inlineBtn);

    // No modo inline, a legenda dividida de 2 colunas não é mais exibida
    expect(screen.queryByText(/📜 Versão 3 \(Histórico Congelado\)/i)).toBeNull();

    const splitBtn = screen.getByRole('button', { name: /Lado a Lado/i });
    fireEvent.click(splitBtn);
    expect(screen.getByText(/📜 Versão 3 \(Histórico Congelado\)/i)).toBeInTheDocument();
  });

  it('should trigger onRestoreVersion when clicking restore button', () => {
    const handleRestore = vi.fn();
    const handleClose = vi.fn();

    render(
      <EditorDiffViewer
        open={true}
        snapshot={mockSnapshot}
        currentContent="conteudo atual modificado"
        onClose={handleClose}
        onRestoreVersion={handleRestore}
      />
    );

    const restoreBtn = screen.getByRole('button', { name: /Restaurar para esta Versão/i });
    fireEvent.click(restoreBtn);

    expect(handleRestore).toHaveBeenCalledWith(mockSnapshot);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
