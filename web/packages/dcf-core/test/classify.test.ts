import { describe, it, expect } from 'vitest';
import { classify } from '../src/classify.js';
import { TOKENS } from '../src/tokens.js';

describe('classify', () => {
  it('classifies fentanyl analogs as fent', () => {
    expect(classify('Acetylfentanyl')).toMatchObject({ cls: 'fent', color: TOKENS.fent, family: 'opioid' });
  });
  it('classifies xylazine as xyl', () => {
    expect(classify('Xylazine')).toMatchObject({ cls: 'xyl', color: TOKENS.xyl, family: 'xyl' });
  });
  it('classifies cuts', () => {
    expect(classify('Caffeine')).toMatchObject({ cls: 'cut', family: 'cut' });
  });
  it('classifies benzodiazepines', () => {
    expect(classify('Bromazolam')).toMatchObject({ cls: 'benzo', family: 'benzo' });
  });
  it('classifies stimulants', () => {
    expect(classify('Methamphetamine')).toMatchObject({ cls: 'stim', family: 'stim' });
  });
  it('falls back to other for unknown substances', () => {
    expect(classify('Unobtainium')).toMatchObject({ cls: 'other', family: 'other' });
  });
  it('is case-insensitive', () => {
    expect(classify('FENTANYL').cls).toBe('fent');
  });
});
