import { foldService } from '@codemirror/language';

// Fold Service customizado para dobrar seções LaTeX e ambientes \begin{}...\end{} estilo Overleaf
export const latexFoldService = foldService.of((state, lineStart) => {
  const line = state.doc.lineAt(lineStart);
  const text = line.text;

  // 1. Fold de ambientes \begin{env} ... \end{env}
  const beginMatch = text.match(/\\begin\{([a-zA-Z0-9*]+)\}/);
  if (beginMatch) {
    const env = beginMatch[1];
    let depth = 1;
    for (let i = line.number + 1; i <= state.doc.lines; i++) {
      const nextLine = state.doc.line(i);
      if (nextLine.text.includes(`\\begin{${env}}`)) depth++;
      if (nextLine.text.includes(`\\end{${env}}`)) {
        depth--;
        if (depth === 0) {
          return { from: line.to, to: nextLine.to };
        }
      }
    }
  }

  // 2. Fold de seções: \section, \chapter, \subsection, etc.
  if (/\\(section|chapter|subsection|subsubsection)\{/.test(text)) {
    for (let i = line.number + 1; i <= state.doc.lines; i++) {
      const nextLine = state.doc.line(i);
      if (
        /\\(section|chapter|subsection|subsubsection)\{/.test(nextLine.text) ||
        nextLine.text.includes('\\end{document}')
      ) {
        return { from: line.to, to: nextLine.from - 1 };
      }
    }
    return { from: line.to, to: state.doc.length };
  }

  return null;
});
