import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { ArticlesTable } from './ArticlesTable';
import { ArticleItem } from '../types/article.types';

const mockArticles: ArticleItem[] = [
  {
    id: 'doc-1',
    title: 'Artigo SBC em Sistemas Distribuídos',
    content: '\\documentclass[12pt]{sbc}',
    version: 3,
    updatedAt: '2026-10-18T10:00:00.000Z',
    conference: 'SBC',
    hasCls: true,
  },
  {
    id: 'doc-2',
    title: 'IEEE Transactions on Real-Time Collaboration',
    content: '\\documentclass[conference]{IEEEtran}',
    version: 1,
    updatedAt: '2026-10-18T11:00:00.000Z',
    conference: 'IEEE Conference',
    hasCls: true,
  },
];

describe('ArticlesTable Component (DataGrid Standard)', () => {
  it('deve renderizar a tabela com os artigos e botão de novo artigo', () => {
    const handleOpenModal = vi.fn();

    render(
      <BrowserRouter>
        <div style={{ height: 600, width: 800 }}>
          <ArticlesTable
            articles={mockArticles}
            isLoading={false}
            onOpenCreateModal={handleOpenModal}
          />
        </div>
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText(/buscar por título/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /novo artigo/i })).toBeInTheDocument();
  });
});
