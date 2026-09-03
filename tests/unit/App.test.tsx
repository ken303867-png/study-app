import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';

describe('App', () => {
  it('renders the schema 0.5 one-question practice application shell', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '学習アプリ v0.10.0' })).toBeInTheDocument();
    expect(screen.getByText('LOCAL ONLY')).toBeInTheDocument();
    expect(screen.getByText(/Delivery Schema 0\.5/)).toBeInTheDocument();
    expect(screen.getByText(/One Question Practice & Local Learning State/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '演習' })).toBeInTheDocument();
  });
});
