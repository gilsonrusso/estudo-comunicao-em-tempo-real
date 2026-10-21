import { snippetCompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { hoverTooltip } from '@codemirror/view';
import { extractBibKeys, parseBibEntries } from '../../utils/bibtexParser.js';

// Tabela de autocompletar LaTeX estilo Overleaf com snippets dinâmicos espelhados
export const BASE_LATEX_COMPLETIONS = [
  // Estrutura do Documento
  snippetCompletion('\\section{${title}}', {
    label: '\\section',
    detail: 'Seção numerada',
    type: 'keyword',
  }),
  snippetCompletion('\\subsection{${title}}', {
    label: '\\subsection',
    detail: 'Subseção',
    type: 'keyword',
  }),
  snippetCompletion('\\subsubsection{${title}}', {
    label: '\\subsubsection',
    detail: 'Sub-subseção',
    type: 'keyword',
  }),
  snippetCompletion('\\paragraph{${title}}', {
    label: '\\paragraph',
    detail: 'Parágrafo',
    type: 'keyword',
  }),
  snippetCompletion('\\chapter{${title}}', {
    label: '\\chapter',
    detail: 'Capítulo',
    type: 'keyword',
  }),
  snippetCompletion('\\tableofcontents', {
    label: '\\tableofcontents',
    detail: 'Sumário',
    type: 'keyword',
  }),

  // Ambientes com espelhamento dinâmico: alterar o nome em \begin altera o \end automaticamente!
  snippetCompletion('\\begin{${1:env}}\n\t${2}\n\\end{${1}}', {
    label: '\\begin',
    detail: 'Ambiente genérico espelhado',
    type: 'type',
  }),
  snippetCompletion('\\begin{equation}\n\t${}\n\\end{equation}', {
    label: '\\begin{equation}',
    detail: 'Equação numerada',
    type: 'type',
  }),
  snippetCompletion('\\begin{equation*}\n\t${}\n\\end{equation*}', {
    label: '\\begin{equation*}',
    detail: 'Equação sem numeração',
    type: 'type',
  }),
  snippetCompletion(
    '\\begin{figure}[htbp]\n\t\\centering\n\t\\includegraphics[width=0.8\\linewidth]{${path}}\n\t\\caption{${caption}}\n\t\\label{fig:${label}}\n\\end{figure}',
    { label: '\\begin{figure}', detail: 'Figura com caption/label', type: 'type' }
  ),
  snippetCompletion(
    '\\begin{table}[htbp]\n\t\\centering\n\t\\caption{${caption}}\n\t\\label{tab:${label}}\n\t\\begin{tabular}{${cols}}\n\t\t${}\n\t\\end{tabular}\n\\end{table}',
    { label: '\\begin{table}', detail: 'Tabela formatada', type: 'type' }
  ),
  snippetCompletion('\\begin{itemize}\n\t\\item ${}\n\\end{itemize}', {
    label: '\\begin{itemize}',
    detail: 'Lista de marcadores',
    type: 'type',
  }),
  snippetCompletion('\\begin{enumerate}\n\t\\item ${}\n\\end{enumerate}', {
    label: '\\begin{enumerate}',
    detail: 'Lista numerada',
    type: 'type',
  }),
  snippetCompletion('\\begin{abstract}\n\t${}\n\\end{abstract}', {
    label: '\\begin{abstract}',
    detail: 'Resumo / Abstract',
    type: 'type',
  }),
  snippetCompletion('\\item ${}', { label: '\\item', detail: 'Item de lista', type: 'keyword' }),

  // Formatação e Tipografia
  snippetCompletion('\\textbf{${text}}', {
    label: '\\textbf',
    detail: 'Texto em Negrito',
    type: 'text',
  }),
  snippetCompletion('\\textit{${text}}', {
    label: '\\textit',
    detail: 'Texto em Itálico',
    type: 'text',
  }),
  snippetCompletion('\\underline{${text}}', {
    label: '\\underline',
    detail: 'Texto Sublinhado',
    type: 'text',
  }),
  snippetCompletion('\\emph{${text}}', { label: '\\emph', detail: 'Ênfase', type: 'text' }),
  snippetCompletion('\\texttt{${code}}', {
    label: '\\texttt',
    detail: 'Texto monoespaçado',
    type: 'text',
  }),

  // Matemática
  snippetCompletion('\\frac{${num}}{${den}}', {
    label: '\\frac',
    detail: 'Fração matemática',
    type: 'function',
  }),
  snippetCompletion('\\sqrt{${arg}}', {
    label: '\\sqrt',
    detail: 'Raiz quadrada',
    type: 'function',
  }),
  snippetCompletion('\\sum_{${i=1}}^{${n}}', {
    label: '\\sum',
    detail: 'Somatório',
    type: 'function',
  }),
  snippetCompletion('\\int_{${a}}^{${b}}', {
    label: '\\int',
    detail: 'Integral definida',
    type: 'function',
  }),
  snippetCompletion('\\lim_{${x} \\to ${a}}', {
    label: '\\lim',
    detail: 'Limite matemático',
    type: 'function',
  }),

  // Citações e Referências Cruzadas
  snippetCompletion('\\cite{${key}}', {
    label: '\\cite',
    detail: 'Citação bibliográfica',
    type: 'constant',
  }),
  snippetCompletion('\\ref{${label}}', {
    label: '\\ref',
    detail: 'Referência a label',
    type: 'constant',
  }),
  snippetCompletion('\\eqref{${eq}}', {
    label: '\\eqref',
    detail: 'Referência a equação',
    type: 'constant',
  }),
  snippetCompletion('\\label{${name}}', {
    label: '\\label',
    detail: 'Definir rótulo',
    type: 'constant',
  }),

  // Letras Gregas e Símbolos
  { label: '\\alpha', detail: 'α', type: 'variable' },
  { label: '\\beta', detail: 'β', type: 'variable' },
  { label: '\\gamma', detail: 'γ', type: 'variable' },
  { label: '\\delta', detail: 'δ', type: 'variable' },
  { label: '\\epsilon', detail: 'ε', type: 'variable' },
  { label: '\\theta', detail: 'θ', type: 'variable' },
  { label: '\\lambda', detail: 'λ', type: 'variable' },
  { label: '\\mu', detail: 'μ', type: 'variable' },
  { label: '\\pi', detail: 'π', type: 'variable' },
  { label: '\\sigma', detail: 'σ', type: 'variable' },
  { label: '\\omega', detail: 'ω', type: 'variable' },
  { label: '\\infty', detail: '∞', type: 'variable' },
  { label: '\\rightarrow', detail: '→', type: 'variable' },
  { label: '\\leftarrow', detail: '←', type: 'variable' },
  { label: '\\leq', detail: '≤', type: 'variable' },
  { label: '\\geq', detail: '≥', type: 'variable' },
  { label: '\\neq', detail: '≠', type: 'variable' },
  { label: '\\times', detail: '×', type: 'variable' },
];

export function createLatexCompletionSource(getBibContent: () => string) {
  return (context: CompletionContext): CompletionResult | null => {
    // 1. Sugestões de referências dentro de \cite{...}
    const citeMatch = context.matchBefore(/\\cite\{([^}]*)$/);
    if (citeMatch) {
      const bibKeys = extractBibKeys(getBibContent());
      return {
        from: citeMatch.from + 6,
        options: bibKeys.map((key) => ({
          label: key,
          detail: 'Referência BibTeX',
          type: 'constant',
        })),
        validFor: /^[^}]*$/,
      };
    }

    // 2. Comandos LaTeX iniciados por barra invertida (ex: \sec, \beg, ou apenas \)
    const word = context.matchBefore(/\\[a-zA-Z]*/);
    if (!word) return null;
    if (word.from === word.to && !context.explicit) return null;

    return {
      from: word.from,
      options: BASE_LATEX_COMPLETIONS,
      validFor: /^\\[a-zA-Z]*$/,
    };
  };
}

export function createBibHoverTooltip(getBibContent: () => string) {
  return hoverTooltip((view, pos) => {
    const line = view.state.doc.lineAt(pos);
    const offsetInLine = pos - line.from;
    const lineText = line.text;

    const citeRegex = /\\(?:cite|citep|citet)\{([^}]+)\}/g;
    let match;
    while ((match = citeRegex.exec(lineText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (offsetInLine >= start && offsetInLine <= end) {
        const keys = match[1].split(',').map((k) => k.trim());
        const bibEntries = parseBibEntries(getBibContent());
        const foundEntry = keys.map((k) => bibEntries.get(k)).find(Boolean);

        return {
          pos: line.from + start,
          end: line.from + end,
          above: true,
          create() {
            const dom = document.createElement('div');
            dom.className = 'cm-tooltip-bib-preview';
            if (!foundEntry) {
              dom.innerHTML = `
                <div style="padding: 6px 10px; font-size: 11.5px; color: #f59e0b;">
                  ⚠️ Citação [<strong>${keys.join(', ')}</strong>] não encontrada em references.bib
                </div>`;
            } else {
              dom.innerHTML = `
                <div style="font-weight: 700; color: #10b981; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                  <span>📚</span> <span>${foundEntry.title || foundEntry.key}</span>
                </div>
                ${foundEntry.author ? `<div style="color: #94a3b8; font-size: 11.5px; margin-bottom: 3px;">✍️ <em>${foundEntry.author}</em></div>` : ''}
                <div style="display: flex; gap: 8px; color: #64748b; font-size: 11px; flex-wrap: wrap;">
                  ${foundEntry.journal ? `<span>🏛️ ${foundEntry.journal}</span>` : ''}
                  ${foundEntry.year ? `<span>📅 ${foundEntry.year}</span>` : ''}
                  <span>🏷️ [${foundEntry.key}]</span>
                </div>
              `;
            }
            return { dom };
          },
        };
      }
    }
    return null;
  });
}
