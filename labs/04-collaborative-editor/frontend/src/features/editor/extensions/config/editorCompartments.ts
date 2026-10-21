import { Compartment, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

// Compartments para alternar configurações e temas no CodeMirror sem reinstanciar
export const themeCompart = new Compartment();
export const spellcheckCompart = new Compartment();
export const editorConfigCompart = new Compartment();
export const wordWrapCompart = new Compartment();
export const autoCloseBracketsCompart = new Compartment();
export const autocompleteCompart = new Compartment();
export const linterCompart = new Compartment();
export const grammarLinterCompart = new Compartment();

const spellcheckExtensionCache: Record<string, Extension> = {};

export function getSpellcheckExtension(enabled: boolean, lang: string): Extension {
  const key = `${enabled}_${lang || 'pt-BR'}`;
  if (!spellcheckExtensionCache[key]) {
    spellcheckExtensionCache[key] = EditorView.contentAttributes.of({
      spellcheck: enabled ? 'true' : 'false',
      lang: lang || 'pt-BR',
      autocorrect: 'off',
      autocapitalize: 'off',
    });
  }
  return spellcheckExtensionCache[key];
}

const editorConfigThemeCache: Record<string, Extension> = {};

export function getEditorConfigExtension(
  fontSize: string,
  lineHeight: string,
  nonBlinkingCursor: boolean
): Extension {
  const key = `${fontSize || '13.5px'}_${lineHeight || '1.65'}_${Boolean(nonBlinkingCursor)}`;
  if (!editorConfigThemeCache[key]) {
    editorConfigThemeCache[key] = EditorView.theme({
      '&': {
        fontSize: `${fontSize || '13.5px'} !important`,
      },
      '.cm-line': {
        lineHeight: `${lineHeight || '1.65'} !important`,
      },
      ...(nonBlinkingCursor
        ? {
            '.cm-cursor, &.cm-focused .cm-cursor': {
              animation: 'none !important',
              opacity: '1 !important',
            },
          }
        : {}),
    });
  }
  return editorConfigThemeCache[key];
}
