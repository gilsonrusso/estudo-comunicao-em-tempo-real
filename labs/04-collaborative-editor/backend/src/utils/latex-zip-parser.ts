import AdmZip from 'adm-zip';

export interface ParsedZipFile {
  path: string;
  isBinary: boolean;
  fileType: 'tex' | 'style' | 'bib' | 'image' | 'other';
  mimeType: string;
  content?: string;
  buffer?: Buffer;
  sizeBytes: number;
}

export interface ParsedLatexProject {
  rootDoc: {
    path: string;
    content: string;
  };
  detectedTitle?: string;
  files: ParsedZipFile[];
}

function resolveMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'tex':
      return 'text/x-tex';
    case 'cls':
    case 'sty':
      return 'text/x-tex';
    case 'bib':
      return 'text/x-bibtex';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'pdf':
      return 'application/pdf';
    case 'eps':
      return 'application/postscript';
    case 'svg':
      return 'image/svg+xml';
    case 'txt':
    case 'bbl':
    case 'bst':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

function resolveFileType(filePath: string): 'tex' | 'style' | 'bib' | 'image' | 'other' {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (ext === 'tex') return 'tex';
  if (ext === 'cls' || ext === 'sty') return 'style';
  if (ext === 'bib' || ext === 'bbl' || ext === 'bst') return 'bib';
  if (['png', 'jpg', 'jpeg', 'pdf', 'eps', 'svg'].includes(ext)) return 'image';
  return 'other';
}

function extractLatexTitle(content: string): string | undefined {
  // Encontra a diretiva \title{...} ou \title[short]{full}
  const match = content.match(/\\title(?:\s*\[[^\]]*\])?\s*\{([\s\S]*?)\}(?:\n|\r|\s*\\author|\s*\\begin)/m);
  if (!match || !match[1]) return undefined;

  const title = match[1]
    .replace(/%.*$/gm, '') // Remove comentários LaTeX
    .replace(/\\[a-zA-Z]+(\[[^\]]*\])?(\{([^}]*)\})?/g, '$3') // Remove macros LaTeX comuns
    .replace(/\\\\/g, ' ') // Substitui quebras de linha TeX
    .replace(/[{}]/g, '') // Remove chaves remanescentes
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();

  return title.length > 3 ? title : undefined;
}

export function parseLatexZip(zipBuffer: Buffer): ParsedLatexProject {
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();

  if (!zipEntries || zipEntries.length === 0) {
    throw new Error('O arquivo ZIP está vazio ou corrompido.');
  }

  const parsedFiles: ParsedZipFile[] = [];
  const texFiles: Array<{ path: string; content: string }> = [];

  for (const entry of zipEntries) {
    // Descarta diretórios puros e arquivos de sistema indesejados
    if (
      entry.isDirectory ||
      entry.entryName.includes('__MACOSX') ||
      entry.name.startsWith('.') ||
      entry.name === 'Thumbs.db'
    ) {
      continue;
    }

    // Normaliza o caminho relativo seguro (remove leading / ou ../)
    const normalizedPath = entry.entryName.replace(/^(\.\.[/\\])+/, '').replace(/^[\\/]+/, '');
    if (!normalizedPath) continue;

    const fileType = resolveFileType(normalizedPath);
    const mimeType = resolveMimeType(normalizedPath);
    const rawBuffer = entry.getData();
    const sizeBytes = rawBuffer.length;

    const isText = ['tex', 'style', 'bib'].includes(fileType) || mimeType.startsWith('text/');

    if (isText) {
      const textContent = rawBuffer.toString('utf-8');
      parsedFiles.push({
        path: normalizedPath,
        isBinary: false,
        fileType,
        mimeType,
        content: textContent,
        sizeBytes,
      });

      if (fileType === 'tex') {
        texFiles.push({
          path: normalizedPath,
          content: textContent,
        });
      }
    } else {
      parsedFiles.push({
        path: normalizedPath,
        isBinary: true,
        fileType,
        mimeType,
        buffer: rawBuffer,
        sizeBytes,
      });
    }
  }

  if (texFiles.length === 0) {
    throw new Error('O pacote ZIP não contém nenhum documento LaTeX com extensão .tex.');
  }

  // Heurística de Overleaf para identificar o documento principal (rootDoc)
  let chosenRoot: { path: string; content: string } | null = null;

  // 1. Arquivo com \documentclass nomeado main.tex, root.tex, paper.tex ou bare_jrnl.tex
  const priorityNames = ['main.tex', 'root.tex', 'paper.tex', 'bare_jrnl.tex', 'artigo.tex'];
  for (const pName of priorityNames) {
    const found = texFiles.find(
      (f) =>
        (f.path.toLowerCase() === pName || f.path.toLowerCase().endsWith('/' + pName)) &&
        f.content.includes('\\documentclass')
    );
    if (found) {
      chosenRoot = found;
      break;
    }
  }

  // 2. Qualquer arquivo .tex que contenha \documentclass
  if (!chosenRoot) {
    chosenRoot = texFiles.find((f) => f.content.includes('\\documentclass')) || null;
  }

  // 3. Arquivo nomeado main.tex mesmo sem \documentclass explícito
  if (!chosenRoot) {
    chosenRoot = texFiles.find((f) => f.path.toLowerCase().endsWith('main.tex')) || null;
  }

  // 4. Primeiro arquivo .tex na raiz do ZIP
  if (!chosenRoot) {
    chosenRoot = texFiles.find((f) => !f.path.includes('/')) || texFiles[0];
  }

  const detectedTitle = extractLatexTitle(chosenRoot.content);

  // Remove o rootDoc da lista de arquivos auxiliares para evitar duplicidade de persistência
  const auxiliaryFiles = parsedFiles.filter((f) => f.path !== chosenRoot!.path);

  return {
    rootDoc: chosenRoot,
    detectedTitle,
    files: auxiliaryFiles,
  };
}
