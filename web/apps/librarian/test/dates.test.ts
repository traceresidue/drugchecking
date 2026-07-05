import { describe, expect, it } from 'vitest';
import { formatDateForDisplay, parseCardDate } from '../src/lib/dates';

describe('lib/dates', () => {
  it('parses the lab card date format DDMonYYYY', () => {
    const d = parseCardDate('20Oct2022');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2022);
    expect(d!.getMonth()).toBe(9); // October, 0-indexed
    expect(d!.getDate()).toBe(20);
  });

  it('handles single-digit days and returns null for garbage', () => {
    expect(parseCardDate('1Jan2023')?.getDate()).toBe(1);
    expect(parseCardDate('not-a-date')).toBeNull();
    expect(parseCardDate(null)).toBeNull();
    expect(parseCardDate(undefined)).toBeNull();
  });

  it('formats for display as yyyy-mm-dd', () => {
    expect(formatDateForDisplay('20Oct2022')).toBe('2022-10-20');
    expect(formatDateForDisplay(null)).toBe('—');
  });
});
