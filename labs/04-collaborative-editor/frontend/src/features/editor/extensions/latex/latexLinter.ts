import { Text } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Diagnostic } from '@codemirror/lint';

// Parser de erros do compilador TeX Live (pdflatex) mapeando para a linha correta no documento
export function parseLatexCompilerError(
  errText: string | null | undefined,
  doc: Text
): Diagnostic[] {
  if (!errText) return [];
  const diagnostics: Diagnostic[] = [];
  const lineMatch =
    errText.match(/l\.(\d+)/i) ||
    errText.match(/line\s+(\d+)/i) ||
    errText.match(/input line\s+(\d+)/i);
  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1], 10);
    if (lineNum >= 1 && lineNum <= doc.lines) {
      const line = doc.line(lineNum);
      const firstLineMsg =
        errText.split('\n').find((l) => l.startsWith('!') || l.includes('Error')) ||
        errText.slice(0, 120);
      diagnostics.push({
        from: line.from,
        to: line.to,
        severity: 'error',
        message: `Compilador TeX Live: ${firstLineMsg.trim()}`,
      });
    }
  }
  return diagnostics;
}

// Validação sintática client-side para alertar tags desbalanceadas antes de compilar
export function validateLatexStructure(doc: Text): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const stack: { env: string; from: number; to: number; line: number }[] = [];

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;

    const beginMatches = text.matchAll(/\\begin\{([a-zA-Z0-9*]+)\}/g);
    for (const m of beginMatches) {
      stack.push({
        env: m[1],
        from: line.from + m.index!,
        to: line.from + m.index! + m[0].length,
        line: i,
      });
    }

    const endMatches = text.matchAll(/\\end\{([a-zA-Z0-9*]+)\}/g);
    for (const m of endMatches) {
      const env = m[1];
      const idx = stack.map((s) => s.env).lastIndexOf(env);
      if (idx !== -1) {
        stack.splice(idx, 1);
      } else {
        diagnostics.push({
          from: line.from + m.index!,
          to: line.from + m.index! + m[0].length,
          severity: 'warning',
          message: `Ambiente '\\end{${env}}' sem '\\begin{${env}}' correspondente.`,
        });
      }
    }
  }

  for (const unclosed of stack) {
    diagnostics.push({
      from: unclosed.from,
      to: unclosed.to,
      severity: 'warning',
      message: `Ambiente '\\begin{${unclosed.env}}' (linha ${unclosed.line}) não foi fechado com '\\end{${unclosed.env}}'.`,
    });
  }

  return diagnostics;
}

export function createLatexLinterSource(getCompileError: () => string | null | undefined) {
  return (view: EditorView): Diagnostic[] => {
    const doc = view.state.doc;
    const diagnostics: Diagnostic[] = [];

    // 1. Diagnóstico do compilador TeX Live (se houver erro ativo)
    const activeError = getCompileError();
    if (activeError) {
      const compilerDiags = parseLatexCompilerError(activeError, doc);
      diagnostics.push(...compilerDiags);
    }

    // 2. Validação sintática client-side (ambientes \begin{...} e \end{...})
    const syntaxDiags = validateLatexStructure(doc);
    diagnostics.push(...syntaxDiags);

    return diagnostics;
  };
}
