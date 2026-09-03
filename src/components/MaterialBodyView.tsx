import { useMemo } from 'react';

interface MaterialSection {
  heading: string;
  chunks: MaterialChunk[];
}

type MaterialChunk =
  | { type: 'paragraph'; text: string }
  | { type: 'table'; rows: string[][] };

export function MaterialBodyView({ body }: { body: string }) {
  const sections = useMemo(() => parseMaterialBody(body), [body]);

  return (
    <div className="material-body">
      {sections.map((section, sectionIndex) => (
        <section className="material-section" key={`${section.heading}-${sectionIndex}`}>
          <h4>{section.heading}</h4>
          <div className="material-section-content">
            {section.chunks.map((chunk, chunkIndex) =>
              chunk.type === 'paragraph' ? (
                <p key={`p-${chunkIndex}`}>{chunk.text}</p>
              ) : (
                <div className="material-table-scroll" key={`t-${chunkIndex}`}>
                  <table className="material-table">
                    <thead>
                      <tr>
                        {(chunk.rows[0] ?? []).map((cell, cellIndex) => (
                          <th key={`${cell}-${cellIndex}`}>{cell}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.rows.slice(1).map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`}>
                          {row.map((cell, cellIndex) => (
                            <td key={`${cellIndex}-${cell}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

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
