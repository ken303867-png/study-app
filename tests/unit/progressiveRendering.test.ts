import { describe, expect, it } from 'vitest';
import {
  initialVisibleCount,
  nextVisibleCount,
  visibleCountForTarget
} from '../../src/utils/progressiveRendering';

describe('progressiveRendering', () => {
  it('limits the initial render to one batch', () => {
    expect(initialVisibleCount(709, 30)).toBe(30);
    expect(initialVisibleCount(12, 30)).toBe(12);
  });

  it('adds one batch without exceeding the total', () => {
    expect(nextVisibleCount(30, 709, 30)).toBe(60);
    expect(nextVisibleCount(690, 709, 30)).toBe(709);
  });

  it('expands only as far as needed to include a direct-navigation target', () => {
    expect(visibleCountForTarget(0, 709, 30)).toBe(30);
    expect(visibleCountForTarget(29, 709, 30)).toBe(30);
    expect(visibleCountForTarget(30, 709, 30)).toBe(60);
    expect(visibleCountForTarget(708, 709, 30)).toBe(709);
  });

  it('falls back to the initial batch when the target does not exist', () => {
    expect(visibleCountForTarget(-1, 709, 30)).toBe(30);
  });
});
