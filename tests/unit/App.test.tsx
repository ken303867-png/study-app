import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';

describe('App', () => {
  it('renders the v0.7 application shell', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '学習アプリ v0.7.0' })).toBeInTheDocument();
    expect(screen.getByText('LOCAL ONLY')).toBeInTheDocument();
  });
});
