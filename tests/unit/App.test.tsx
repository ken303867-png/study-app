import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';

describe('App', () => {
  it('renders the schema 0.5 material-navigation application shell', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '学習アプリ v0.8.0' })).toBeInTheDocument();
    expect(screen.getByText('LOCAL ONLY')).toBeInTheDocument();
    expect(screen.getByText(/Delivery Schema 0\.5/)).toBeInTheDocument();
    expect(screen.getByText(/Material Navigation UI/)).toBeInTheDocument();
  });
});
