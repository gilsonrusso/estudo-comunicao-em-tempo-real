export interface BibEntry {
  type: string;
  key: string;
  title?: string;
  author?: string;
  year?: string;
  journal?: string;
}

export function extractBibField(body: string, fieldName: string): string | undefined {
  const fieldRegex = new RegExp(`(?:^|[,\\s])${fieldName}\\s*=\\s*`, 'i');
  const match = fieldRegex.exec(body);
  if (!match) return undefined;

  const startIndex = match.index + match[0].length;
  const firstChar = body[startIndex];

  if (firstChar === '{') {
    let depth = 1;
    let i = startIndex + 1;
    while (i < body.length && depth > 0) {
      if (body[i] === '{') depth++;
      else if (body[i] === '}') depth--;
      i++;
    }
    if (depth === 0) {
      return body
        .slice(startIndex + 1, i - 1)
        .replace(/[\n\r\t]+/g, ' ')
        .trim();
    }
  } else if (firstChar === '"') {
    const endQuote = body.indexOf('"', startIndex + 1);
    if (endQuote !== -1) {
      return body
        .slice(startIndex + 1, endQuote)
        .replace(/[\n\r\t]+/g, ' ')
        .trim();
    }
  } else {
    const simpleMatch = body.slice(startIndex).match(/^([^,\n}]+)/);
    if (simpleMatch) {
      return simpleMatch[1].trim();
    }
  }
  return undefined;
}

export function parseBibEntries(bib: string): Map<string, BibEntry> {
  const entries = new Map<string, BibEntry>();
  const entryRegex = /@([a-zA-Z]+)\s*\{\s*([^,\s]+),([\s\S]*?)(?=\n@|$)/g;
  let match;
  while ((match = entryRegex.exec(bib)) !== null) {
    const type = match[1];
    const key = match[2];
    const body = match[3];
    const title = extractBibField(body, 'title');
    const author = extractBibField(body, 'author');
    const year = extractBibField(body, 'year');
    const journal = extractBibField(body, 'journal') || extractBibField(body, 'booktitle');

    entries.set(key, {
      type,
      key,
      title,
      author,
      year,
      journal,
    });
  }
  return entries;
}

export function extractBibKeys(bibContent: string): string[] {
  const keys: string[] = [];
  const regex = /@[a-zA-Z]+\s*\{\s*([^,\s]+)/g;
  let match;
  while ((match = regex.exec(bibContent)) !== null) {
    if (match[1]) keys.push(match[1]);
  }
  return keys;
}
