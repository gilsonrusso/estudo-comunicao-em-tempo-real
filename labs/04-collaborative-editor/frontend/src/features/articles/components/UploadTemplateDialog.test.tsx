import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UploadTemplateDialog } from './UploadTemplateDialog';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('UploadTemplateDialog Component', () => {
  it('deve renderizar a aba de pacote ZIP por padrão com a área de drag-and-drop', () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();
    const handleArticleCreated = vi.fn();

    render(
      <UploadTemplateDialog
        open={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        onArticleCreated={handleArticleCreated}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Importar Template \/ Projeto LaTeX \(Estilo Overleaf\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Pacote ZIP \(\.zip\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Clique para selecionar ou arraste o arquivo \.zip aqui/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Criar Artigo e Abrir no Editor/i)).toBeInTheDocument();
  });

  it('deve alternar para a aba manual e exibir os campos de .cls e main.tex', () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <UploadTemplateDialog
        open={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const manualTab = screen.getByText(/Definir Manualmente \(\.cls\)/i);
    fireEvent.click(manualTab);

    expect(screen.getByLabelText(/Nome do Template/i)).toBeInTheDocument();
    expect(screen.getByText(/Arquivo de Classe LaTeX \(\.cls\):/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Conteúdo inicial de main\.tex/i)).toBeInTheDocument();
  });
});
