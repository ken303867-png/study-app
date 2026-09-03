export interface MaterialSection {
  heading: string;
  chunks: MaterialChunk[];
}

export type MaterialChunk =
  | { type: 'paragraph'; text: string }
  | { type: 'table'; rows: string[][] };

export function parseMaterialBody(body: string): MaterialSection[] {
  return body
    .split(/\n\s*\n/g)
    .map((rawSection) => rawSection.trim())
    .filter(Boolean)
    .map((rawSection) => {
      const lines = rawSection
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const heading = lines[0] ?? '学習内容';
      return {
        heading,
        chunks: parseMaterialChunks(lines.slice(1))
      };
    });
}

function parseMaterialChunks(lines: string[]): MaterialChunk[] {
  const chunks: MaterialChunk[] = [];
  let paragraphLines: string[] = [];
  let tableRows: string[][] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    chunks.push({ type: 'paragraph', text: paragraphLines.join('\n') });
    paragraphLines = [];
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    chunks.push({ type: 'table', rows: tableRows });
    tableRows = [];
  };

  for (const line of lines) {
    if (line.includes(' | ')) {
      flushParagraph();
      tableRows.push(line.split(' | ').map((cell) => cell.trim()));
    } else {
      flushTable();
      paragraphLines.push(line);
    }
  }
  flushParagraph();
  flushTable();
  return chunks;
}
