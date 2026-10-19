import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewSidebar } from './ReviewSidebar.js';
import { ReviewComment } from '../types/collab.types';

describe('ReviewSidebar Component', () => {
  const mockComments: ReviewComment[] = [
    {
      id: 'comm-1',
      documentId: 'doc-1',
      file: 'main.tex',
      from: 10,
      to: 25,
      selectedText: 'documentclass{article}',
      content: 'Poderíamos usar documentclass{report} aqui?',
      userId: 'user-123',
      userName: 'Alice',
      userColor: '#3b82f6',
      createdAt: '10:00',
      status: 'open',
      replies: [
        {
          id: 'rep-1',
          userId: 'user-456',
          userName: 'Bob',
          userColor: '#10b981',
          content: 'Concordo, report é mais adequado.',
          createdAt: '10:02',
        },
      ],
    },
    {
      id: 'comm-2',
      documentId: 'doc-1',
      file: 'main.tex',
      from: 50,
      to: 60,
      selectedText: 'bibliography',
      content: 'Verificar referências ABNT.',
      userId: 'user-456',
      userName: 'Bob',
      userColor: '#10b981',
      createdAt: '10:05',
      status: 'resolved',
      replies: [],
    },
  ];

  it('should render review panel header and pending count', () => {
    const handleClose = vi.fn();
    render(
      <ReviewSidebar
        comments={mockComments}
        activeCommentId={null}
        currentFile="main.tex"
        currentUserId="user-123"
        currentUserName="Alice"
        currentUserColor="#3b82f6"
        onSelectComment={vi.fn()}
        onAddComment={vi.fn()}
        onReplyComment={vi.fn()}
        onResolveComment={vi.fn()}
        onDeleteComment={vi.fn()}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Review & Comentários')).toBeInTheDocument();
    expect(screen.getByText('1 pendente')).toBeInTheDocument();
    expect(screen.getByText('Poderíamos usar documentclass{report} aqui?')).toBeInTheDocument();
  });

  it('should display quoted text and replies for a comment', () => {
    render(
      <ReviewSidebar
        comments={mockComments}
        activeCommentId="comm-1"
        currentFile="main.tex"
        currentUserId="user-123"
        currentUserName="Alice"
        currentUserColor="#3b82f6"
        onSelectComment={vi.fn()}
        onAddComment={vi.fn()}
        onReplyComment={vi.fn()}
        onResolveComment={vi.fn()}
        onDeleteComment={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('documentclass{article}')).toBeInTheDocument();
    expect(screen.getByText('Concordo, report é mais adequado.')).toBeInTheDocument();
  });

  it('should render line number badge when lineLayoutInfo is provided', () => {
    const mockLineLayout = {
      commentLineTops: {
        'comm-1': { lineNumber: 14, top: 280 },
      },
      scrollTop: 0,
      scrollHeight: 1000,
      clientHeight: 500,
    };

    render(
      <ReviewSidebar
        comments={mockComments}
        activeCommentId={null}
        currentFile="main.tex"
        currentUserId="user-123"
        currentUserName="Alice"
        currentUserColor="#3b82f6"
        lineLayoutInfo={mockLineLayout}
        onSelectComment={vi.fn()}
        onAddComment={vi.fn()}
        onReplyComment={vi.fn()}
        onResolveComment={vi.fn()}
        onDeleteComment={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('L.14')).toBeInTheDocument();
  });

  it('should trigger onResolveComment and onDeleteComment actions', () => {
    const handleResolve = vi.fn();
    const handleDelete = vi.fn();

    render(
      <ReviewSidebar
        comments={mockComments}
        activeCommentId={null}
        currentFile="main.tex"
        currentUserId="user-123"
        currentUserName="Alice"
        currentUserColor="#3b82f6"
        onSelectComment={vi.fn()}
        onAddComment={vi.fn()}
        onReplyComment={vi.fn()}
        onResolveComment={handleResolve}
        onDeleteComment={handleDelete}
        onClose={vi.fn()}
      />
    );

    const resolveBtn = screen.getByLabelText('Marcar como Resolvido');
    fireEvent.click(resolveBtn);
    expect(handleResolve).toHaveBeenCalledWith('comm-1', 'resolved');

    const deleteBtns = screen.getAllByLabelText('Excluir Comentário');
    fireEvent.click(deleteBtns[0]);
    expect(handleDelete).toHaveBeenCalledWith('comm-1');
  });
});
