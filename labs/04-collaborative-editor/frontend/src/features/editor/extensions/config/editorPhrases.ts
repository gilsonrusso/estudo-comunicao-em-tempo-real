import { EditorState, Extension } from '@codemirror/state';

// Dicionário oficial de localização em Português do Brasil para o CodeMirror 6
export const portuguesePhrases = {
  // Painel de Busca e Substituição (@codemirror/search)
  Find: 'Localizar',
  Replace: 'Substituir',
  next: 'Próximo',
  previous: 'Anterior',
  all: 'Todos',
  'match case': 'Diferenciar maiúsculas/minúsculas',
  'by word': 'Palavra inteira',
  replace: 'Substituir',
  'replace all': 'Substituir todos',
  close: 'Fechar (Esc)',
  'current match': 'ocorrência atual',
  'on line': 'na linha',

  // Ir para a Linha (@codemirror/search: gotoLine)
  'Go to line': 'Ir para a linha',
  go: 'Ir',

  // Diagnósticos e Linter (@codemirror/lint)
  Diagnostics: 'Diagnósticos de Código',
  'No diagnostics': 'Nenhum erro encontrado',
};

export const editorPortuguesePhrasesExtension: Extension = EditorState.phrases.of(portuguesePhrases);
