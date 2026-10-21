import { describe, it, expect } from 'vitest';
import { Text, EditorState } from '@codemirror/state';
import {
  parseBibEntries,
  extractBibKeys,
  parseLatexCompilerError,
  validateLatexStructure,
  getSpellcheckExtension,
  getEditorConfigExtension,
  wordWrapCompart,
  autoCloseBracketsCompart,
  autocompleteCompart,
  linterCompart,
  grammarLinterCompart,
  themeCompart,
  spellcheckCompart,
  editorConfigCompart,
  collabSyncFacet,
} from './CodeMirrorEditor.js';

describe('CodeMirrorEditor Unit Tests', () => {
  describe('BibTeX Parsing Helpers', () => {
    const sampleBib = `
@article{einstein1905,
  author = {Albert Einstein},
  title = {Zur Elektrodynamik bewegter K{\\"o}rper},
  journal = {Annalen der Physik},
  year = {1905}
}

@book{knuth1984,
  author = {Donald E. Knuth},
  title = {The TeXbook},
  year = 1984
}
`;

    it('should extract all BibTeX keys correctly', () => {
      const keys = extractBibKeys(sampleBib);
      expect(keys).toEqual(['einstein1905', 'knuth1984']);
    });

    it('should parse BibTeX entry details correctly', () => {
      const entries = parseBibEntries(sampleBib);
      expect(entries.size).toBe(2);

      const einstein = entries.get('einstein1905');
      expect(einstein).toBeDefined();
      expect(einstein?.key).toBe('einstein1905');
      expect(einstein?.author).toBe('Albert Einstein');
      expect(einstein?.title).toBe('Zur Elektrodynamik bewegter K{\\"o}rper');
      expect(einstein?.year).toBe('1905');
      expect(einstein?.journal).toBe('Annalen der Physik');

      const knuth = entries.get('knuth1984');
      expect(knuth).toBeDefined();
      expect(knuth?.key).toBe('knuth1984');
      expect(knuth?.author).toBe('Donald E. Knuth');
      expect(knuth?.title).toBe('The TeXbook');
      expect(knuth?.year).toBe('1984');
    });

    it('should return empty collection when bib content is empty', () => {
      expect(extractBibKeys('')).toEqual([]);
      expect(parseBibEntries('').size).toBe(0);
    });
  });

  describe('LaTeX Compiler & Structure Validation', () => {
    it('should parse compiler error line from "l.X" pattern', () => {
      const doc = Text.of([
        '\\documentclass{article}',
        '\\begin{document}',
        '\\badcommand',
        '\\end{document}',
      ]);

      const errText = `
! Undefined control sequence.
l.3 \\badcommand
`;
      const diagnostics = parseLatexCompilerError(errText, doc);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].severity).toBe('error');
      expect(diagnostics[0].from).toBe(doc.line(3).from);
      expect(diagnostics[0].to).toBe(doc.line(3).to);
      expect(diagnostics[0].message).toContain('! Undefined control sequence');
    });

    it('should return empty diagnostics when no compiler error string is provided', () => {
      const doc = Text.of(['\\documentclass{article}']);
      expect(parseLatexCompilerError(null, doc)).toEqual([]);
      expect(parseLatexCompilerError('', doc)).toEqual([]);
    });

    it('should detect unclosed LaTeX environments', () => {
      const doc = Text.of([
        '\\documentclass{article}',
        '\\begin{document}',
        '\\begin{equation}',
        '  E = mc^2',
        '\\end{document}',
      ]);

      const diagnostics = validateLatexStructure(doc);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].severity).toBe('warning');
      expect(diagnostics[0].message).toContain("Ambiente '\\begin{equation}'");
      expect(diagnostics[0].message).toContain('não foi fechado');
    });

    it('should detect unmatched \\end environments', () => {
      const doc = Text.of([
        '\\documentclass{article}',
        '\\begin{document}',
        '\\end{table}',
        '\\end{document}',
      ]);

      const diagnostics = validateLatexStructure(doc);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].severity).toBe('warning');
      expect(diagnostics[0].message).toContain(
        "Ambiente '\\end{table}' sem '\\begin{table}' correspondente"
      );
    });

    it('should return no diagnostics for valid balanced structure', () => {
      const doc = Text.of([
        '\\documentclass{article}',
        '\\begin{document}',
        '\\begin{equation}',
        '  E = mc^2',
        '\\end{equation}',
        '\\end{document}',
      ]);

      const diagnostics = validateLatexStructure(doc);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Dynamic Compartments and Extensions', () => {
    it('should export all required compartments', () => {
      expect(themeCompart).toBeDefined();
      expect(spellcheckCompart).toBeDefined();
      expect(editorConfigCompart).toBeDefined();
      expect(wordWrapCompart).toBeDefined();
      expect(autoCloseBracketsCompart).toBeDefined();
      expect(autocompleteCompart).toBeDefined();
      expect(linterCompart).toBeDefined();
      expect(grammarLinterCompart).toBeDefined();
    });

    it('should create valid spellcheck extension and deduplicate by reference', () => {
      const ext1 = getSpellcheckExtension(true, 'pt-BR');
      const ext2 = getSpellcheckExtension(true, 'pt-BR');
      expect(ext1).toBeDefined();
      expect(ext1).toBe(ext2);
    });

    it('should create valid editor configuration extension and deduplicate by reference', () => {
      const ext1 = getEditorConfigExtension('15px', '1.9', true);
      const ext2 = getEditorConfigExtension('15px', '1.9', true);
      expect(ext1).toBeDefined();
      expect(ext1).toBe(ext2);
    });

    it('should provide and read collabSyncFacet config correctly in EditorState', () => {
      const state = EditorState.create({
        doc: 'test doc',
        extensions: [
          collabSyncFacet.of({
            onPush: () => {},
            isRemoteChange: () => false,
            getClientId: () => 'user-1',
            getActiveFile: () => 'main.tex',
          }),
        ],
      });
      const config = state.facet(collabSyncFacet);
      expect(config).toBeDefined();
      expect(config?.getClientId()).toBe('user-1');
      expect(config?.getActiveFile()).toBe('main.tex');
    });
  });
});
