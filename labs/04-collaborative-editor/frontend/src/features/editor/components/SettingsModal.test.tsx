import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from './SettingsModal.js';
import { DEFAULT_SETTINGS } from '../../../types/settings.js';

describe('SettingsModal Component', () => {
  it('should render modal with title and tabs when open is true', () => {
    const handleClose = vi.fn();
    const handleUpdate = vi.fn();

    render(
      <SettingsModal
        open={true}
        onClose={handleClose}
        settings={DEFAULT_SETTINGS}
        onUpdateSettings={handleUpdate}
      />
    );

    expect(screen.getByText('Configurações')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Idioma e Ortografia')).toBeInTheDocument();
    expect(screen.getByText('Compilador')).toBeInTheDocument();
    expect(screen.getByText('Aparência')).toBeInTheDocument();
  });

  it('should trigger onUpdateSettings when toggling switches in Editor tab', () => {
    const handleClose = vi.fn();
    const handleUpdate = vi.fn();

    render(
      <SettingsModal
        open={true}
        onClose={handleClose}
        settings={DEFAULT_SETTINGS}
        onUpdateSettings={handleUpdate}
      />
    );

    // Na aba Editor, encontra os switches renderizados (MUI Switch possui role="switch")
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);

    // O primeiro switch é autoComplete (default: true) -> toggle para false
    fireEvent.click(switches[0]);
    expect(handleUpdate).toHaveBeenCalledWith(expect.objectContaining({ autoComplete: false }));

    // O segundo switch é autoCloseBrackets (default: true) -> toggle para false
    fireEvent.click(switches[1]);
    expect(handleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ autoCloseBrackets: false })
    );
  });

  it('should switch tabs and display language options', () => {
    const handleClose = vi.fn();
    const handleUpdate = vi.fn();

    render(
      <SettingsModal
        open={true}
        onClose={handleClose}
        settings={DEFAULT_SETTINGS}
        onUpdateSettings={handleUpdate}
      />
    );

    const langTabBtn = screen.getByText('Idioma e Ortografia');
    fireEvent.click(langTabBtn);

    expect(screen.getByText('Idioma da Interface')).toBeInTheDocument();
    expect(screen.getByText('Corretor ortográfico')).toBeInTheDocument();
  });

  it('should switch to appearance tab and display appearance options', () => {
    const handleClose = vi.fn();
    const handleUpdate = vi.fn();

    render(
      <SettingsModal
        open={true}
        onClose={handleClose}
        settings={DEFAULT_SETTINGS}
        onUpdateSettings={handleUpdate}
      />
    );

    const appTabBtn = screen.getByText('Aparência');
    fireEvent.click(appTabBtn);

    expect(screen.getByText('Tamanho da fonte do editor')).toBeInTheDocument();
    expect(screen.getByText('Altura da linha do editor')).toBeInTheDocument();
    expect(screen.getByText('Modo escuro no visualizador de PDF')).toBeInTheDocument();
  });

  it('should switch to compiler tab and display compiler options', () => {
    const handleClose = vi.fn();
    const handleUpdate = vi.fn();

    render(
      <SettingsModal
        open={true}
        onClose={handleClose}
        settings={DEFAULT_SETTINGS}
        onUpdateSettings={handleUpdate}
      />
    );

    const compTabBtn = screen.getByText('Compilador');
    fireEvent.click(compTabBtn);

    expect(screen.getByText('Mecanismo LaTeX (Compiler)')).toBeInTheDocument();
    expect(screen.getByText('Modo rascunho (Skip images)')).toBeInTheDocument();
    expect(screen.getByText('Parar no primeiro erro')).toBeInTheDocument();
    expect(screen.getByText('Compilação automática')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    const handleUpdate = vi.fn();

    render(
      <SettingsModal
        open={true}
        onClose={handleClose}
        settings={DEFAULT_SETTINGS}
        onUpdateSettings={handleUpdate}
      />
    );

    const closeBtn = screen.getByLabelText('Fechar');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
