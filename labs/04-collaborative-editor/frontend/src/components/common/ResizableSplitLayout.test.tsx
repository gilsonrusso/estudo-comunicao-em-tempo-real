import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Typography from '@mui/material/Typography';
import { ResizableSplitLayout } from './ResizableSplitLayout';

describe('ResizableSplitLayout Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('deve renderizar ambos os painéis no modo split com 50% de divisão padrão', () => {
    render(
      <ResizableSplitLayout
        primary={<Typography>Painel Editor</Typography>}
        secondary={<Typography>Painel PDF</Typography>}
        mode="split"
      />
    );

    expect(screen.getByText('Painel Editor')).toBeInTheDocument();
    expect(screen.getByText('Painel PDF')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();

    const primaryPanel = screen.getByTestId('split-primary-panel');
    const secondaryPanel = screen.getByTestId('split-secondary-panel');

    expect(primaryPanel).toHaveStyle({ flexBasis: '50%' });
    expect(secondaryPanel).toHaveStyle({ flexBasis: '50%' });
  });

  it('deve renderizar apenas o painel primário quando mode="primary"', () => {
    render(
      <ResizableSplitLayout
        primary={<Typography>Painel Editor</Typography>}
        secondary={<Typography>Painel PDF</Typography>}
        mode="primary"
      />
    );

    expect(screen.getByText('Painel Editor')).toBeInTheDocument();
    expect(screen.queryByText('Painel PDF')).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('deve renderizar apenas o painel secundário quando mode="secondary"', () => {
    render(
      <ResizableSplitLayout
        primary={<Typography>Painel Editor</Typography>}
        secondary={<Typography>Painel PDF</Typography>}
        mode="secondary"
      />
    );

    expect(screen.queryByText('Painel Editor')).not.toBeInTheDocument();
    expect(screen.getByText('Painel PDF')).toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('deve recuperar e salvar a proporção no localStorage quando storageKey for fornecida', () => {
    window.localStorage.setItem('test-split-key', '65');

    render(
      <ResizableSplitLayout
        primary={<Typography>Painel Editor</Typography>}
        secondary={<Typography>Painel PDF</Typography>}
        storageKey="test-split-key"
      />
    );

    const primaryPanel = screen.getByTestId('split-primary-panel');
    const secondaryPanel = screen.getByTestId('split-secondary-panel');

    expect(primaryPanel).toHaveStyle({ flexBasis: '65%' });
    expect(secondaryPanel).toHaveStyle({ flexBasis: '35%' });
  });

  it('deve resetar para o defaultRatio (50%) ao disparar duplo-clique no divisor', () => {
    window.localStorage.setItem('test-split-key', '70');

    render(
      <ResizableSplitLayout
        primary={<Typography>Painel Editor</Typography>}
        secondary={<Typography>Painel PDF</Typography>}
        defaultRatio={50}
        storageKey="test-split-key"
      />
    );

    const separator = screen.getByRole('separator');
    fireEvent.doubleClick(separator);

    const primaryPanel = screen.getByTestId('split-primary-panel');
    expect(primaryPanel).toHaveStyle({ flexBasis: '50%' });
    expect(window.localStorage.getItem('test-split-key')).toBe('50.00');
  });

  it('deve disparar onToggleSecondary quando o botão de colapso for clicado', () => {
    const handleToggle = vi.fn();

    render(
      <ResizableSplitLayout
        primary={<Typography>Painel Editor</Typography>}
        secondary={<Typography>Painel PDF</Typography>}
        onToggleSecondary={handleToggle}
        toggleTooltip="Ocultar PDF"
      />
    );

    const toggleButton = screen.getByRole('button', { name: /ocultar pdf/i });
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });
});
