import { describe, it, expect } from 'vitest';
import { chromatogram, ftirCurve, stickSpectrum, cosine } from '../src/spectral.js';

describe('chromatogram', () => {
  it('normalizes peak height to 100', () => {
    const { x, y } = chromatogram([{ rt: 5, amp: 10 }], { n: 200 });
    expect(x.length).toBe(200);
    expect(Math.max(...y)).toBeCloseTo(100, 5);
  });
  it('peaks near the given retention time', () => {
    const { x, y } = chromatogram([{ rt: 5, amp: 10 }], { n: 900 });
    const maxIdx = y.indexOf(Math.max(...y));
    expect(x[maxIdx]).toBeCloseTo(5, 0);
  });
});

describe('ftirCurve', () => {
  it('produces a curve peaking near the band center', () => {
    const { x, y } = ftirCurve([[1700, 1, 20]], { n: 1100 });
    const maxIdx = y.indexOf(Math.max(...y));
    expect(x[maxIdx]).toBeCloseTo(1700, -1);
  });
});

describe('stickSpectrum', () => {
  it('normalizes to base peak = 100 and sorts by m/z', () => {
    const sticks = stickSpectrum([[200, 50], [100, 100], [150, 25]]);
    expect(sticks.map(s => s.mz)).toEqual([100, 150, 200]);
    expect(sticks.find(s => s.mz === 100)!.i).toBeCloseTo(100, 5);
    expect(sticks.find(s => s.mz === 200)!.i).toBeCloseTo(50, 5);
  });
});

describe('cosine', () => {
  it('is 1 for identical spectra', () => {
    const a = stickSpectrum([[100, 100], [150, 50]]);
    expect(cosine(a, a)).toBeCloseTo(1, 5);
  });
  it('is 0 for spectra with no overlapping peaks', () => {
    const a = stickSpectrum([[100, 100]]);
    const b = stickSpectrum([[300, 100]]);
    expect(cosine(a, b)).toBe(0);
  });
});
