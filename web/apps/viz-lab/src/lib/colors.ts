import { classify, type SubstanceClass } from '@dcf/core';

const CLS_CSS: Record<SubstanceClass, string> = {
  fent: 'var(--c-fent)',
  opioid: 'var(--c-opioid)',
  xyl: 'var(--c-xyl)',
  stim: 'var(--c-stim)',
  coke: 'var(--c-coke)',
  benzo: 'var(--c-benzo)',
  cut: 'var(--c-cut)',
  other: 'var(--c-other)',
};

export function classColor(cls: SubstanceClass): string {
  return CLS_CSS[cls] ?? 'var(--c-other)';
}

export function substanceColor(name: string): string {
  return classColor(classify(name).cls);
}

export function signalColor(kind: 'alert' | 'watch' | 'ok' | 'info'): string {
  return `var(--${kind})`;
}

export const CLASS_LABELS: Array<[SubstanceClass, string]> = [
  ['fent', 'Fentanyl & analogs'],
  ['opioid', 'Opioid'],
  ['xyl', 'Sedative / xylazine'],
  ['stim', 'Stimulant'],
  ['coke', 'Cocaine'],
  ['benzo', 'Benzodiazepine'],
  ['cut', 'Cut / diluent'],
  ['other', 'Other'],
];

export const CLASS_COLORS = Object.fromEntries(CLASS_LABELS.map(([k]) => [k, classColor(k)])) as Record<
  SubstanceClass,
  string
>;
