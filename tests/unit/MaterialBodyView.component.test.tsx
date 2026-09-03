import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MaterialBodyView } from '../../src/components/MaterialBodyView';

describe('MaterialBodyView', () => {
  it('renders Delivery material table with semantic headers and cells', () => {
    render(
      <MaterialBodyView
        body={[
          '① 最初に覚えること',
          '正本を先に確定する。',
          '',
          '② 比較表',
          '項目 | 正式内容',
          'Delivery Schema | 0.5',
          'Formal Data Spec | 1.2'
        ].join('\n')}
      />
    );

    expect(screen.getByRole('heading', { name: '② 比較表' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '項目' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '0.5' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '1.2' })).toBeInTheDocument();
  });
});
