import { httpClient } from '../../../api/httpClient.js';

export interface LanguageToolReplacement {
  value: string;
}

export interface LanguageToolRule {
  id: string;
  description: string;
  issueType?: string;
  category?: {
    id?: string;
    name?: string;
  };
}

export interface LanguageToolMatch {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  rule: LanguageToolRule;
  replacements: LanguageToolReplacement[];
}

export interface CheckGrammarResponse {
  matches: LanguageToolMatch[];
  status: 'ok' | 'unavailable';
  message?: string;
}

/**
 * Prepara o documento LaTeX para verificação ortográfica e gramatical.
 * Mascara comandos estruturais, metadados de pacotes, identificadores de citação/referência
 * e expressões matemáticas ($...$), substituindo-os por espaços equivalentes.
 *
 * CRUCIAL: Mantém a contagem exata de caracteres e quebras de linha para que
 * os offsets (from, to) do LanguageTool coincidam 100% com as posições no CodeMirror.
 */
export function prepareLatexForLint(text: string): string {
  if (!text) return '';

  let masked = text;

  // 1. Mascara comentários (% até o fim da linha, mantendo a quebra de linha)
  masked = masked.replace(/%[^\r\n]*/g, (match) => ' '.repeat(match.length));

  // 2. Mascara blocos de matemática display ($$...$$ ou \[...\])
  masked = masked.replace(/\$\$[\s\S]*?\$\$/g, (match) =>
    match.replace(/[^\r\n]/g, ' ')
  );
  masked = masked.replace(/\\\[[\s\S]*?\\\]/g, (match) =>
    match.replace(/[^\r\n]/g, ' ')
  );

  // 3. Mascara matemática inline ($...$ ou \(...\))
  masked = masked.replace(/\$[^$\r\n]+\$/g, (match) => ' '.repeat(match.length));
  masked = masked.replace(/\\\([\s\S]*?\\\)/g, (match) =>
    match.replace(/[^\r\n]/g, ' ')
  );

  // 4. Mascara comandos técnicos com seus argumentos (identificadores não são texto natural)
  // Ex: \documentclass[...]{...}, \usepackage{...}, \begin{...}, \end{...}, \cite{...}, \ref{...}, \label{...}
  const technicalCommandRegex =
    /\\(?:documentclass|usepackage|begin|end|cite|citep|citet|ref|pageref|label|input|include|bibliography|bibliographystyle)\*?(?:\[[^\]]*\])?(?:\{[^}]*\})?/g;
  masked = masked.replace(technicalCommandRegex, (match) =>
    match.replace(/[^\r\n]/g, ' ')
  );

  // 5. Mascara outros comandos LaTeX iniciados por barra (ex: \textbf, \section, \item, etc.),
  // preservando o texto interno dentro das chaves para que seja devidamente corrigido
  masked = masked.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, (match) =>
    ' '.repeat(match.length)
  );

  return masked;
}

/**
 * Envia texto limpo/mascarado para o LanguageTool através da rota de API do backend
 * com fallback direto para servidor local ou público.
 */
export async function checkGrammarAndSpelling(
  text: string,
  language = 'pt-BR',
  options?: { signal?: AbortSignal; customUrl?: string }
): Promise<LanguageToolMatch[]> {
  if (!text || !text.trim()) return [];

  const maskedText = prepareLatexForLint(text);

  // 1. Tenta rota do backend Fastify (/api/languagetool/check)
  try {
    const res = await httpClient.post<CheckGrammarResponse>(
      '/api/languagetool/check',
      {
        text: maskedText,
        language,
      },
      {
        signal: options?.signal,
        timeout: 7000,
      }
    );

    if (res.data && Array.isArray(res.data.matches)) {
      return res.data.matches;
    }
  } catch (backendErr: unknown) {
    // Se a requisição foi abortada pelo usuário ao digitar mais caracteres, não faz fallback
    if (backendErr instanceof Error && backendErr.name === 'CanceledError') {
      return [];
    }
  }

  // 2. Fallback direto caso o backend esteja em modo headless ou customUrl seja fornecida
  const directEndpoint =
    options?.customUrl ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8081/v2/check'
      : null);

  if (directEndpoint) {
    try {
      const params = new URLSearchParams({
        text: maskedText,
        language,
        enabledOnly: 'false',
      });

      const directRes = await fetch(directEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
        signal: options?.signal,
      });

      if (directRes.ok) {
        const json = (await directRes.json()) as { matches?: LanguageToolMatch[] };
        if (Array.isArray(json.matches)) {
          return json.matches;
        }
      }
    } catch {
      // Falha silenciosa quando LanguageTool local não está ativo
    }
  }

  return [];
}
