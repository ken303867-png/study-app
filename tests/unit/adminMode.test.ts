import { describe, expect, it } from 'vitest';
import { shouldShowAdminTools } from '../../src/utils/adminMode';

describe('shouldShowAdminTools', () => {
  it('hides admin tools on a public host by default', () => {
    expect(
      shouldShowAdminTools({ hostname: 'ken303867-png.github.io', search: '' })
    ).toBe(false);
  });

  it('shows admin tools on localhost for development and existing QA', () => {
    expect(shouldShowAdminTools({ hostname: 'localhost', search: '' })).toBe(true);
    expect(shouldShowAdminTools({ hostname: '127.0.0.1', search: '' })).toBe(true);
  });

  it('supports explicit admin mode on a public host', () => {
    expect(
      shouldShowAdminTools({ hostname: 'ken303867-png.github.io', search: '?admin=1' })
    ).toBe(true);
  });

  it('allows tests to force public-user mode on localhost', () => {
    expect(shouldShowAdminTools({ hostname: 'localhost', search: '?admin=0' })).toBe(false);
  });
});
