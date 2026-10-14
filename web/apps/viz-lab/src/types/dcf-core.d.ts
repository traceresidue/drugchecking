declare module '@dcf/core' {
  export const TOKENS: {
    readonly bg: string;
    readonly panel: string;
    readonly panel2: string;
    readonly line: string;
    readonly ink: string;
    readonly muted: string;
    readonly faint: string;
    readonly opioid: string;
    readonly fent: string;
    readonly xyl: string;
    readonly stim: string;
    readonly coke: string;
    readonly benzo: string;
    readonly cut: string;
    readonly other: string;
    readonly alert: string;
    readonly watch: string;
    readonly ok: string;
    readonly info: string;
  };

  export const FONTS: { readonly sans: string; readonly mono: string };

  export type SubstanceClass = 'fent' | 'opioid' | 'xyl' | 'stim' | 'coke' | 'benzo' | 'cut' | 'other';
  export type SubstanceFamily = 'opioid' | 'stim' | 'xyl' | 'benzo' | 'cut' | 'other';

  export interface Classification {
    cls: SubstanceClass;
    color: string;
    label: string;
    family: SubstanceFamily;
    familyLabel: string;
  }

  export function classify(name?: string): Classification;

  export const fmt: {
    mz: (v: number | string) => string;
    rt: (v: number | string) => string;
    pct: (v: number | string) => string;
    int: (v: number | string) => string;
    month: (m: string) => string;
  };

  export interface ChromatogramPeak {
    rt: number;
    amp: number;
    sigma?: number;
  }

  export interface Trace {
    x: number[];
    y: number[];
  }

  export interface StickPeak {
    mz: number;
    i: number;
  }

  export function chromatogram(peaks: ChromatogramPeak[], opts?: Record<string, number>): Trace;
  export function ftirCurve(bands: Array<[number, number, number?]>, opts?: Record<string, number>): Trace;
  export function stickSpectrum(peaks: Array<[number, number]>): StickPeak[];
  export function cosine(a: StickPeak[], b: StickPeak[], tol?: number): number;
  export function normalizePeaks(peaks?: Array<[number, number]>): Array<[number, number]>;
  export function chromatogramFromSample(sampleSpec: { peaks?: Array<[string, number, number]> }, opts?: Record<string, unknown>): Trace;
  export function getReferenceSpec(specLib: Record<string, unknown>, substance: string, technique?: string): unknown;
  export function stickSpectrumFromReference(ref: { peaks?: Array<[number, number]> }): StickPeak[];
  export function isRealChromatogram(key?: string, entry?: { real?: boolean }): boolean;
  export function fillChromatogramSelect(selectEl: HTMLSelectElement, chromatograms?: Record<string, { label: string }>, opts?: Record<string, string>): void;
  export function drawSmiles(smiles: string, canvasId: string, w?: number, h?: number): void;

  export type FtirBand = [number, number, number?];

  export interface ChromatogramEntry {
    label: string;
    peaks: Array<[string, number, number]>;
    real?: boolean;
    sample_id?: string;
  }

  export interface Tooltip {
    show(html: string, x: number, y: number): void;
    hide(): void;
  }

  export function tooltip(): Tooltip;

  export function loadData(): Promise<{ agg: Record<string, unknown>; spec: Record<string, unknown> }>;
}
