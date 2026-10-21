import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorHistoryControls } from './EditorHistoryControls.js';

describe('EditorHistoryControls Component Tests', () => {
  it('should render undo and redo buttons disabled when canUndo and canRedo are false', () => {
    render(
      <EditorHistoryControls
        canUndo={false}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
      />
    );

    const undoBtn = screen.getByRole('button', { name: 'Desfazer' });
    const redoBtn = screen.getByRole('button', { name: 'Refazer' });

    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();
  });

  it('should enable buttons and trigger callbacks on click when canUndo and canRedo are true', () => {
    const handleUndo = vi.fn();
    const handleRedo = vi.fn();

    render(
      <EditorHistoryControls
        canUndo={true}
        canRedo={true}
        undoCount={3}
        redoCount={1}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
    );

    const undoBtn = screen.getByRole('button', { name: 'Desfazer' });
    const redoBtn = screen.getByRole('button', { name: 'Refazer' });

    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).not.toBeDisabled();

    fireEvent.click(undoBtn);
    expect(handleUndo).toHaveBeenCalledTimes(1);

    fireEvent.click(redoBtn);
    expect(handleRedo).toHaveBeenCalledTimes(1);
  });
});
