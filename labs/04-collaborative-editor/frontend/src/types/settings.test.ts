import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from './settings.js';
import { getTranslations, translations } from '../utils/i18n.js';

describe('Editor Settings & i18n', () => {
  it('should have valid DEFAULT_SETTINGS with expected default values', () => {
    expect(DEFAULT_SETTINGS).toBeDefined();
    expect(DEFAULT_SETTINGS.uiLanguage).toBe('pt-BR');
    expect(DEFAULT_SETTINGS.spellcheck).toBe(true);
    expect(DEFAULT_SETTINGS.spellcheckLanguage).toBe('pt-BR');

    // Editor toggles
    expect(DEFAULT_SETTINGS.autoComplete).toBe(true);
    expect(DEFAULT_SETTINGS.autoCloseBrackets).toBe(true);
    expect(DEFAULT_SETTINGS.nonBlinkingCursor).toBe(false);
    expect(DEFAULT_SETTINGS.wordWrap).toBe(true);
    expect(DEFAULT_SETTINGS.codeCheck).toBe(true);

    // Appearance
    expect(DEFAULT_SETTINGS.fontSize).toBe('13.5px');
    expect(DEFAULT_SETTINGS.lineHeight).toBe('1.65');
    expect(DEFAULT_SETTINGS.invertPdfDark).toBe(true);

    // Compiler
    expect(DEFAULT_SETTINGS.engine).toBe('pdflatex');
    expect(DEFAULT_SETTINGS.draftMode).toBe(false);
    expect(DEFAULT_SETTINGS.stopOnError).toBe(false);
    expect(DEFAULT_SETTINGS.autoCompile).toBe(false);
  });

  it('should return complete Portuguese (pt-BR) translations', () => {
    const pt = getTranslations('pt-BR');
    expect(pt).toBeDefined();
    expect(pt.settings.title).toBe('Configurações');
    expect(pt.settings.tabs.editor).toBe('Editor');
    expect(pt.settings.tabs.language).toBe('Idioma e Ortografia');
    expect(pt.settings.tabs.compiler).toBe('Compilador');
    expect(pt.settings.tabs.appearance).toBe('Aparência');

    expect(pt.settings.editor.autocomplete).toBe('Autocompletar automático');
    expect(pt.settings.editor.autoCloseBrackets).toBe('Fechar chaves automaticamente');
    expect(pt.settings.editor.wordWrap).toBe('Quebra de linha suave (Word Wrap)');
    expect(pt.settings.editor.codeCheck).toBe('Verificação de código (Linter)');
    expect(pt.settings.editor.nonBlinkingCursor).toBe('Cursor estático (sem piscar)');

    expect(pt.navbar.recompile).toBe('Recompilar');
    expect(pt.activityRail.files).toBe('Arquivos do Projeto');
  });

  it('should return complete English (en) translations', () => {
    const en = getTranslations('en');
    expect(en).toBeDefined();
    expect(en.settings.title).toBe('Settings');
    expect(en.settings.tabs.editor).toBe('Editor');
    expect(en.settings.tabs.language).toBe('Spelling and language');
    expect(en.settings.tabs.compiler).toBe('Compiler');
    expect(en.settings.tabs.appearance).toBe('Appearance');

    expect(en.settings.editor.autocomplete).toBe('Auto-complete');
    expect(en.settings.editor.autoCloseBrackets).toBe('Auto-close brackets');
    expect(en.settings.editor.wordWrap).toBe('Soft Word Wrap');
    expect(en.settings.editor.codeCheck).toBe('Code check (Linter)');
    expect(en.settings.editor.nonBlinkingCursor).toBe('Non-blinking cursor');

    expect(en.navbar.recompile).toBe('Recompile');
    expect(en.activityRail.files).toBe('Project Files');
  });

  it('should fallback to pt-BR for unsupported language', () => {
    // @ts-expect-error test fallback with invalid code
    const fallback = getTranslations('fr');
    expect(fallback).toEqual(translations['pt-BR']);
  });
});
