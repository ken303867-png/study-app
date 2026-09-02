import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';

describe('App', () => {
  it('renders the schema 0.5 master-import application shell', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '学習アプリ v0.7.1' })).toBeInTheDocument();
    expect(screen.getByText('LOCAL ONLY')).toBeInTheDocument();
    expect(screen.getByText(/Delivery Schema 0\.5/)).toBeInTheDocument();
  });
});
