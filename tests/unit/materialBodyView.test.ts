import { describe, expect, it } from 'vitest';
import { parseMaterialBody } from '../../src/utils/materialBodyParser';

describe('MaterialBodyView parser', () => {
  it('preserves section order and separates paragraph/table chunks', () => {
    const sections = parseMaterialBody(
      [
        '① 最初に覚えること',
        '正本を先に確定する。',
        '',
        '② 比較表',
        '項目 | 正式内容',
        'Schema | 0.5',
        'Formal | 1.2',
        '',
        '③ 注意点',
        '推測リンクを作らない。'
      ].join('\n')
    );

    expect(sections.map((section) => section.heading)).toEqual([
      '① 最初に覚えること',
      '② 比較表',
      '③ 注意点'
    ]);
    expect(sections[0]?.chunks).toEqual([
      { type: 'paragraph', text: '正本を先に確定する。' }
    ]);
    expect(sections[1]?.chunks).toEqual([
      {
        type: 'table',
        rows: [
          ['項目', '正式内容'],
          ['Schema', '0.5'],
          ['Formal', '1.2']
        ]
      }
    ]);
  });
});
