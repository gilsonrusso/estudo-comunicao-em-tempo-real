import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  prepareLatexForLint,
  checkGrammarAndSpelling,
} from './languagetool.service.js';
import { httpClient } from '../../../api/httpClient.js';

describe('LanguageTool Service & LaTeX Preprocessor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('prepareLatexForLint', () => {
    it('should preserve total length and character offsets exactly', () => {
      const original = '\\section{Introdução}\nEste é um texto com % comentário\n$E = mc^2$ no meio.';
      const masked = prepareLatexForLint(original);

      expect(masked.length).toBe(original.length);
      expect(masked.split('\n').length).toBe(original.split('\n').length);
    });

    it('should mask LaTeX comments while keeping line breaks', () => {
      const input = 'Linha de texto % este é um comentário\nNova linha';
      const masked = prepareLatexForLint(input);

      expect(masked.length).toBe(input.length);
      expect(masked).toContain('Linha de texto ');
      expect(masked).not.toContain('% este é um comentário');
      expect(masked.split('\n')[0].length).toBe(input.split('\n')[0].length);
    });

    it('should mask inline and display math expressions', () => {
      const input = 'A equação $x^2 + y^2 = z^2$ é famosa. Já $$a^2 + b^2 = c^2$$ é Pitágoras.';
      const masked = prepareLatexForLint(input);

      expect(masked.length).toBe(input.length);
      expect(masked).not.toContain('$x^2 + y^2 = z^2$');
      expect(masked).not.toContain('$$a^2 + b^2 = c^2$$');
      expect(masked).toContain('A equação ');
      expect(masked).toContain('é famosa.');
    });

    it('should mask structural and citation commands completely', () => {
      const input = '\\begin{equation}\n1+1=2\n\\end{equation}\n\\cite{einstein1905}';
      const masked = prepareLatexForLint(input);

      expect(masked.length).toBe(input.length);
      expect(masked).not.toContain('\\begin{equation}');
      expect(masked).not.toContain('\\end{equation}');
      expect(masked).not.toContain('\\cite{einstein1905}');
    });

    it('should mask formatting command names but preserve text content for spellchecking', () => {
      const input = '\\textbf{exenplo de palavra}';
      const masked = prepareLatexForLint(input);

      expect(masked.length).toBe(input.length);
      expect(masked).not.toContain('\\textbf');
      expect(masked).toContain('exenplo de palavra');
    });

    it('should handle empty or null strings safely', () => {
      expect(prepareLatexForLint('')).toBe('');
    });
  });

  describe('checkGrammarAndSpelling', () => {
    it('should return empty array if text is blank', async () => {
      const matches = await checkGrammarAndSpelling('   ');
      expect(matches).toEqual([]);
    });

    it('should fetch matches from backend API endpoint', async () => {
      const mockMatches = [
        {
          message: 'Possível erro ortográfico',
          offset: 10,
          length: 7,
          rule: { id: 'GERMAN_SPELLER_RULE', description: 'Erro ortográfico', issueType: 'misspelling' },
          replacements: [{ value: 'exemplo' }],
        },
      ];

      vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
        data: { matches: mockMatches, status: 'ok' },
      } as any);

      const matches = await checkGrammarAndSpelling('Este é um exenplo', 'pt-BR');
      expect(matches).toEqual(mockMatches);
      expect(httpClient.post).toHaveBeenCalledWith(
        '/api/languagetool/check',
        expect.objectContaining({ language: 'pt-BR' }),
        expect.any(Object)
      );
    });

    it('should handle network errors gracefully without throwing', async () => {
      vi.spyOn(httpClient, 'post').mockRejectedValueOnce(new Error('Network error'));

      const matches = await checkGrammarAndSpelling('Texto de teste', 'pt-BR');
      expect(matches).toEqual([]);
    });
  });
});
