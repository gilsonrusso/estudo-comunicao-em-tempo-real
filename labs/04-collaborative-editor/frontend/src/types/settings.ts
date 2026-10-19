export type UiLanguage = 'pt-BR' | 'en';
export type SpellcheckLanguage = 'pt-BR' | 'en-US';
export type EditorFontSize = '12px' | '13.5px' | '15px' | '16.5px' | '18px';
export type EditorLineHeight = '1.4' | '1.65' | '1.9'; // Compact, Normal, Relaxed

export interface EditorSettings {
  // Idioma e Ortografia
  uiLanguage: UiLanguage;
  spellcheck: boolean;
  spellcheckLanguage: SpellcheckLanguage;

  // Editor
  autoComplete: boolean;
  autoCloseBrackets: boolean;
  nonBlinkingCursor: boolean;
  wordWrap: boolean;
  codeCheck: boolean; // Linter

  // Aparência
  fontSize: EditorFontSize;
  lineHeight: EditorLineHeight;
  invertPdfDark: boolean;

  // Compilador
  engine: 'pdflatex' | 'xelatex' | 'lualatex';
  draftMode: boolean; // Skip images
  stopOnError: boolean;
  autoCompile: boolean;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  uiLanguage: 'pt-BR',
  spellcheck: true,
  spellcheckLanguage: 'pt-BR',

  autoComplete: true,
  autoCloseBrackets: true,
  nonBlinkingCursor: false,
  wordWrap: true,
  codeCheck: true,

  fontSize: '13.5px',
  lineHeight: '1.65',
  invertPdfDark: true,

  engine: 'pdflatex',
  draftMode: false,
  stopOnError: false,
  autoCompile: false,
};
