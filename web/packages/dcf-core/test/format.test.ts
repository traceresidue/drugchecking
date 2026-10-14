import { describe, it, expect } from 'vitest';
import { fmt } from '../src/format.js';

describe('fmt', () => {
  it('formats m/z with no decimals', () => {
    expect(fmt.mz(336.4)).toBe('336');
  });
  it('formats retention time to 2 decimals', () => {
    expect(fmt.rt(4.5)).toBe('4.50');
  });
  it('formats percentages', () => {
    expect(fmt.pct(42.7)).toBe('43%');
  });
  it('formats integers with thousands separators', () => {
    expect(fmt.int(6580)).toBe('6,580');
  });
  it('formats month strings', () => {
    expect(fmt.month('2026-03')).toBe('Mar 26');
  });
});
