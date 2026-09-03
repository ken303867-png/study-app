import { useMemo } from 'react';
import { parseMaterialBody } from '../utils/materialBodyParser';

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
                  <table className="material-table" role="table">
                    <thead>
                      <tr>
                        {(chunk.rows[0] ?? []).map((cell, cellIndex) => (
                          <th
                            key={`${cell}-${cellIndex}`}
                            scope="col"
                            role="columnheader"
                          >
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.rows.slice(1).map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`}>
                          {row.map((cell, cellIndex) => (
                            <td key={`${cellIndex}-${cell}`} role="cell">
                              {cell}
                            </td>
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
