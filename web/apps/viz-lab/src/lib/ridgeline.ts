import * as d3 from 'd3';
import { chromatogram, classify, type ChromatogramPeak } from '@dcf/core';
import type { SpectraData } from '../db/queries';
import { substanceColor } from './colors';
import { resolveCssColor } from './themeVars';
import { themeColors } from './themeVars';

export interface RidgelinePeak {
  s: string;
  rt: number;
  amp: number;
  sigma: number;
}

export const SAMPLE_COUNT = 50;
export const TIC_X0 = 2.5;
export const TIC_X1 = 13.0;
export const RIDGE_HEIGHT = 920;
export const RIDGE_OVERLAP = 4.2;

export const KEY_SUBSTANCES = [
  { id: 'fentanyl', substance: 'fentanyl', label: 'Fentanyl', classFilter: 'opioid' as const },
  { id: 'heroin', substance: 'heroin', label: 'Heroin', classFilter: 'opioid' as const },
  { id: 'meth', substance: 'methamphetamine', label: 'Meth', classFilter: 'stimulant' as const },
  { id: 'cocaine', substance: 'cocaine', label: 'Cocaine', classFilter: 'stimulant' as const },
];

export const CLASS_ORDER = ['cut', 'stim', 'coke', 'opioid', 'fent', 'xyl', 'benzo', 'other'] as const;
const CLASS_SAMPLE: Record<string, string> = {
  fent: 'fentanyl',
  opioid: 'heroin',
  xyl: 'xylazine',
  stim: 'methamphetamine',
  coke: 'cocaine',
  benzo: 'bromazolam',
  cut: 'acetaminophen',
  other: 'ketamine',
};

const DRUGS_BY_CLASS: Record<string, string[]> = {
  opioid: ['fentanyl', '4-anpp', 'heroin', 'p-fluorofentanyl'],
  stimulant: ['methamphetamine', 'cocaine', 'caffeine'],
  cut: ['acetaminophen', 'caffeine', 'lidocaine', 'diphenhydramine'],
};

const SHORT: Record<string, string> = {
  fentanyl: 'fentanyl',
  '4-anpp': '4-ANPP',
  heroin: 'heroin',
  'p-fluorofentanyl': 'p-FF',
  methamphetamine: 'meth',
  cocaine: 'cocaine',
  caffeine: 'caffeine',
  acetaminophen: 'APAP',
  lidocaine: 'lidocaine',
  diphenhydramine: 'DPH',
  xylazine: 'xylazine',
  bromazolam: 'bromazolam',
};

const EXTRA_RT: Record<string, number> = {
  bromazolam: 11.4,
  lidocaine: 7.26,
  xylazine: 7.67,
  'p-fluorofentanyl': 10.84,
  heroin: 10.12,
  methamphetamine: 4.11,
  cocaine: 8.39,
  diphenhydramine: 7.1,
};

const PALETTE = {
  stable: {
    core: ['fentanyl', '4-anpp', 'xylazine'],
    variable: ['acetaminophen', 'caffeine', 'lidocaine'],
    rtSigma: 0.045,
    ampSigma: 0.14,
    drop: 0.07,
    emerge: null as string | null,
  },
  volatile: {
    core: ['fentanyl', '4-anpp'],
    variable: ['acetaminophen', 'caffeine', 'lidocaine', 'diphenhydramine'],
    rtSigma: 0.2,
    ampSigma: 0.48,
    drop: 0.24,
    emerge: 'bromazolam',
  },
};

export function shortName(s: string): string {
  return SHORT[s] ?? s.replace(/ .*/, '').slice(0, 12);
}

export function drugHue(s: string): string {
  return substanceColor(s);
}

export function classFillColor(cls: string): string {
  return substanceColor(CLASS_SAMPLE[cls] ?? 'ketamine');
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function baseRt(s: string, rtLookup: Record<string, number>): number {
  return rtLookup[s] ?? EXTRA_RT[s] ?? 8;
}

function peaksFromChromEntry(
  entry: { peaks?: Array<[string, number, number]> },
  rtLookup: Record<string, number>,
): RidgelinePeak[] {
  return (entry.peaks ?? [])
    .map(([s, rt, amp]) => ({
      s,
      rt: rtLookup[s] ?? (+rt || baseRt(s, rtLookup)),
      amp: +amp,
      sigma: 0.05,
    }))
    .filter((p) => p.rt > 0 && p.amp > 0);
}

function sampleRowsFromReal(
  chromatograms: SpectraData['chromatograms'],
  rtLookup: Record<string, number>,
): RidgelinePeak[][] | null {
  const rows = Object.entries(chromatograms ?? {})
    .filter(([k, v]) => v?.real || String(k).startsWith('sample_'))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, v]) => peaksFromChromEntry(v!, rtLookup))
    .filter((peaks) => peaks.length);
  return rows.length >= 12 ? rows : null;
}

function sampleRows(
  mode: 'stable' | 'volatile',
  rtLookup: Record<string, number>,
  opts: { classFilter?: string } = {},
): RidgelinePeak[][] {
  const cfg = PALETTE[mode];
  const r = rng(mode === 'stable' ? 7 : 42);
  const rows: RidgelinePeak[][] = [];

  if (opts.classFilter) {
    const drugs = DRUGS_BY_CLASS[opts.classFilter] ?? [];
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const age = i / SAMPLE_COUNT;
      const peaks: RidgelinePeak[] = [];
      drugs.forEach((s, di) => {
        const isCore = di < 2;
        const drop = isCore ? cfg.drop * 0.35 : cfg.drop * 1.1;
        if (r() > drop) {
          const rtW = isCore ? cfg.rtSigma * 0.75 : cfg.rtSigma * (mode === 'volatile' ? 1.4 : 1);
          peaks.push({
            s,
            rt: baseRt(s, rtLookup) + (r() - 0.5) * rtW,
            amp: (30 + r() * 60) * (1 + (r() - 0.5) * cfg.ampSigma) * (isCore ? 1.1 : 0.85),
            sigma: 0.05,
          });
        }
      });
      if (mode === 'volatile' && opts.classFilter === 'opioid' && age > 0.4 && r() < 0.35) {
        const s = 'p-fluorofentanyl';
        if (!peaks.some((p) => p.s === s)) {
          peaks.push({
            s,
            rt: baseRt(s, rtLookup) + (r() - 0.5) * cfg.rtSigma * 1.6,
            amp: 18 + r() * 40,
            sigma: 0.05,
          });
        }
      }
      rows.push(peaks);
    }
    return rows;
  }

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const age = i / SAMPLE_COUNT;
    const peaks: RidgelinePeak[] = [];
    const add = (s: string, opts2: { rtWide?: boolean; amp?: number } = {}) => {
      const isCore = cfg.core.includes(s);
      const drop = isCore ? cfg.drop * 0.4 : cfg.drop;
      if (r() > drop) {
        const rtW = opts2.rtWide ? cfg.rtSigma * 1.8 : cfg.rtSigma;
        peaks.push({
          s,
          rt: baseRt(s, rtLookup) + (r() - 0.5) * rtW * (isCore ? 0.7 : 1),
          amp:
            (opts2.amp ?? 35 + r() * 55) *
            (s === 'fentanyl' ? 1.15 : 0.85) *
            (1 + (r() - 0.5) * cfg.ampSigma),
          sigma: 0.05,
        });
      }
    };
    cfg.core.forEach((s) => add(s));
    cfg.variable.forEach((s) => {
      if (r() > 0.18) add(s);
    });
    if (cfg.emerge && age > 0.32 && r() < (age - 0.25) * 1.1) add(cfg.emerge, { rtWide: true, amp: 22 });
    if (r() < 0.28) add('heroin');
    if (r() < 0.22) add('p-fluorofentanyl');
    if (r() < 0.18) add('methamphetamine', { rtWide: true });
    if (r() < 0.14) add('cocaine');
    rows.push(peaks);
  }
  return rows;
}

export function batchRows(
  mode: 'stable' | 'volatile',
  rtLookup: Record<string, number>,
  chromatograms: SpectraData['chromatograms'],
  opts: { classFilter?: string; syntheticOnly?: boolean } = {},
): RidgelinePeak[][] {
  if (!opts.syntheticOnly) {
    const real = sampleRowsFromReal(chromatograms, rtLookup);
    if (real) return real;
  }
  return sampleRows(mode, rtLookup, opts);
}

export function fullTicDomain(rows: RidgelinePeak[][]): [number, number] {
  let lo = TIC_X0;
  let hi = TIC_X1;
  rows.forEach((peaks) => {
    peaks.forEach((p) => {
      if (p.rt > 0) {
        lo = Math.min(lo, p.rt - 0.45);
        hi = Math.max(hi, p.rt + 0.45);
      }
    });
  });
  return [Math.max(2, Math.floor(lo * 2) / 2 - 0.25), Math.min(14, Math.ceil(hi * 2) / 2 + 0.25)];
}

export interface DrugStats {
  substance: string;
  meanRt: number;
  meanAmp: number;
  stdRt: number;
  stdAmp: number;
  presence: number;
}

export function computeDrugStats(rows: RidgelinePeak[][], substance: string, rtLookup: Record<string, number>): DrugStats {
  const hits = rows.map((peaks) => peaks.find((p) => p.s === substance)).filter(Boolean) as RidgelinePeak[];
  const rts = hits.map((p) => p.rt);
  const amps = hits.map((p) => p.amp);
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : baseRt(substance, rtLookup));
  const std = (a: number[], mu: number) =>
    a.length ? Math.sqrt(a.reduce((s, v) => s + (v - mu) ** 2, 0) / a.length) : 0;
  const meanRt = mean(rts);
  const meanAmp = mean(amps) || 50;
  return {
    substance,
    meanRt,
    meanAmp,
    stdRt: Math.max(std(rts, meanRt), 0.025),
    stdAmp: Math.max(std(amps, meanAmp), 4),
    presence: hits.length / rows.length,
  };
}

function parseRgb(rgb: string): [number, number, number] {
  const m = rgb.match(/[\d.]+/g);
  if (!m || m.length < 3) return [148, 163, 184];
  return [+m[0]!, +m[1]!, +m[2]!];
}

function rgbHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  let s = 0;
  const l = (mx + mn) / 2;
  if (d) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (mx === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

function hslCss(h: number, s: number, l: number): string {
  return `hsl(${((h % 360) + 360) % 360},${(s * 100).toFixed(0)}%,${(l * 100).toFixed(0)}%)`;
}

export function devColor(baseColor: string, t: number): string {
  const [r, g, b] = parseRgb(resolveCssColor(baseColor));
  let [h, s, l] = rgbHsl(r, g, b);
  const spread = Math.min(1, Math.max(0, t));
  h += spread * 52 * (spread > 0.5 ? 1 : -1);
  s = Math.min(0.95, s + spread * 0.28);
  l = Math.max(0.22, Math.min(0.78, l + (spread - 0.45) * 0.18));
  return hslCss(h, s, l);
}

export function normDev(peak: RidgelinePeak | undefined, stats: DrugStats): number {
  if (!peak) return 1;
  const rtD = Math.abs(peak.rt - stats.meanRt) / Math.max(stats.stdRt * 2.2, 0.04);
  const ampD = Math.abs(peak.amp - stats.meanAmp) / Math.max(stats.stdAmp * 2.2, 8);
  return Math.min(1, (rtD * 0.55 + ampD * 0.45) / 2.2);
}

export function layoutMargins(H: number, refH = 38) {
  const labelH = 72;
  const refGap = 10;
  return {
    t: 16,
    r: 18,
    b: labelH,
    l: 52,
    refH,
    refGap,
    refTop: H - labelH - refGap - refH,
    refBottom: H - labelH - refGap,
  };
}

export function sampleBand(H: number, m: ReturnType<typeof layoutMargins>): number {
  return H - m.t - m.b - m.refH - m.refGap;
}

export function ySample(i: number, m: ReturnType<typeof layoutMargins>, H: number, rows: RidgelinePeak[][]): number {
  return m.t + (i + 1) * (sampleBand(H, m) / rows.length);
}

export function rowPitch(H: number, m: ReturnType<typeof layoutMargins>, rows: RidgelinePeak[][]): number {
  return sampleBand(H, m) / rows.length;
}

export function rowYScale(
  i: number,
  m: ReturnType<typeof layoutMargins>,
  H: number,
  rows: RidgelinePeak[][],
  overlap: number,
): d3.ScaleLinear<number, number> {
  const baseY = ySample(i, m, H, rows);
  return d3.scaleLinear([0, 100], [baseY, baseY - overlap * rowPitch(H, m, rows)]);
}

export function drawFullTicRow(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  peaks: RidgelinePeak[],
  opts: {
    x: d3.ScaleLinear<number, number>;
    yScale: d3.ScaleLinear<number, number>;
    domain: [number, number];
    stroke: string;
    fill?: string;
    fillOpacity?: number;
    strokeWidth?: number;
    strokeOpacity?: number;
    baseY?: number;
  },
) {
  const t = themeColors();
  const { x, yScale, domain, stroke, fill, fillOpacity = 0.2, strokeWidth = 1.15, strokeOpacity = 0.92, baseY } =
    opts;
  if (!peaks.length) {
    if (baseY != null) {
      svg
        .append('line')
        .attr('x1', x(domain[0]))
        .attr('x2', x(domain[1]))
        .attr('y1', baseY)
        .attr('y2', baseY)
        .attr('stroke', t.faint)
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.35);
    }
    return;
  }
  const chromPeaks: ChromatogramPeak[] = peaks.map((p) => ({ rt: p.rt, amp: p.amp, sigma: p.sigma }));
  const trace = chromatogram(chromPeaks, { x0: domain[0], x1: domain[1], sigma: 0.05, n: 180 });
  const area = d3
    .area<number>()
    .x((_, k) => x(trace.x[k]!))
    .y0(() => (baseY != null ? baseY : yScale(0)))
    .y1((d) => yScale(d))
    .curve(d3.curveBasis);
  const line = d3
    .line<number>()
    .x((_, k) => x(trace.x[k]!))
    .y((d) => yScale(d))
    .curve(d3.curveBasis);
  if (fill) {
    svg.append('path').datum(trace.y).attr('d', area).attr('fill', fill).attr('opacity', fillOpacity);
  }
  svg
    .append('path')
    .datum(trace.y)
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', stroke)
    .attr('stroke-width', strokeWidth)
    .attr('opacity', strokeOpacity);
}

export function tracesByClass(peaks: RidgelinePeak[], domain: [number, number]) {
  const groups: Record<string, RidgelinePeak[]> = {};
  peaks.forEach((p) => {
    const cls = classify(p.s).cls;
    if (!groups[cls]) groups[cls] = [];
    groups[cls]!.push(p);
  });
  return CLASS_ORDER.filter((c) => groups[c]).map((c) => ({
    cls: c,
    trace: chromatogram(
      groups[c]!.map((p) => ({ rt: p.rt, amp: p.amp, sigma: p.sigma })),
      { x0: domain[0], x1: domain[1], sigma: 0.05, n: 180 },
    ),
  }));
}

function substancePeakOnRow(
  peaks: RidgelinePeak[],
  sub: string,
  x: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  domain: [number, number],
) {
  const p = peaks.find((pk) => pk.s === sub);
  if (!p) return null;
  const trace = chromatogram(
    peaks.map((pk) => ({ rt: pk.rt, amp: pk.amp, sigma: pk.sigma })),
    { x0: domain[0], x1: domain[1], sigma: 0.05, n: 140 },
  );
  const halfWin = Math.max(0.08, (domain[1] - domain[0]) * 0.04);
  let maxV = -1;
  let maxI = 0;
  trace.x.forEach((tVal: number, k: number) => {
    if (Math.abs(tVal - p.rt) <= halfWin && trace.y[k]! > maxV) {
      maxV = trace.y[k]!;
      maxI = k;
    }
  });
  if (maxV < 0) {
    maxI = trace.x.reduce((best: number, tVal: number, k: number) => (Math.abs(tVal - p.rt) < Math.abs(trace.x[best]! - p.rt) ? k : best), 0);
  }
  return { x: x(trace.x[maxI]!), y: yScale(trace.y[maxI]!) };
}

export function drawVariabilityColumns(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  opts: {
    rows: RidgelinePeak[][];
    drugs: string[];
    x: d3.ScaleLinear<number, number>;
    m: ReturnType<typeof layoutMargins>;
    H: number;
    domain: [number, number];
    overlap: number;
    rtLookup: Record<string, number>;
  },
) {
  const t = themeColors();
  const { rows, drugs, x, m, H, domain, overlap, rtLookup } = opts;
  const pitch = rowPitch(H, m, rows);
  const topY = ySample(0, m, H, rows) - pitch * 0.15;
  const bottomY = ySample(rows.length - 1, m, H, rows) + pitch * 0.15;
  const pathLine = d3
    .line<{ x: number; y: number }>()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(d3.curveCatmullRom.alpha(0.62));

  drugs.forEach((sub) => {
    const stats = computeDrugStats(rows, sub, rtLookup);
    const hue = drugHue(sub);
    const cx = x(stats.meanRt);
    const g = svg.append('g').attr('class', 'var-col');

    const pts = rows.map((peaks, i) => {
      const yScale = rowYScale(i, m, H, rows, overlap);
      return substancePeakOnRow(peaks, sub, x, yScale, domain) ?? { x: cx, y: ySample(i, m, H, rows) };
    });

    g.append('line')
      .attr('x1', cx)
      .attr('x2', cx)
      .attr('y1', topY)
      .attr('y2', bottomY)
      .attr('stroke', hue)
      .attr('stroke-width', 1)
      .attr('opacity', 0.32);

    g.append('path')
      .attr('d', pathLine(pts))
      .attr('fill', 'none')
      .attr('stroke', hue)
      .attr('stroke-width', 2.4)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('opacity', 0.82);

    rows.forEach((peaks, i) => {
      const p = peaks.find((pk) => pk.s === sub);
      const y = ySample(i, m, H, rows);
      const dev = p ? normDev(p, stats) : 1;
      const col = devColor(hue, dev);
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', y)
        .attr('r', p ? 2.4 : 1.8)
        .attr('fill', p ? col : t.faint)
        .attr('stroke', t.bg)
        .attr('stroke-width', 0.6)
        .attr('opacity', p ? 0.92 : 0.38);
    });
  });
}

export function drawReferenceRow(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  x: d3.ScaleLinear<number, number>,
  drugs: string[],
  rows: RidgelinePeak[][],
  x0: number,
  x1: number,
  m: ReturnType<typeof layoutMargins>,
  rtLookup: Record<string, number>,
) {
  const t = themeColors();
  const ideal = drugs.map((s) => {
    const st = computeDrugStats(rows, s, rtLookup);
    return { s, rt: st.meanRt, amp: st.meanAmp, sigma: 0.04 };
  });
  const yScale = d3.scaleLinear([0, 100], [m.refBottom, m.refTop]);
  const g = svg.append('g');
  g.append('text')
    .attr('x', x(x0) - 8)
    .attr('y', yScale(52) + 4)
    .attr('text-anchor', 'end')
    .attr('fill', t.muted)
    .attr('font-size', 9)
    .text('ideal');
  ideal.forEach((p) => {
    const trace = chromatogram([{ rt: p.rt, amp: p.amp, sigma: p.sigma }], { x0, x1, sigma: 0.032, n: 160 });
    g.append('path')
      .datum(trace.y)
      .attr('d', d3.line<number>().x((_, k) => x(trace.x[k]!)).y((d) => yScale(d)).curve(d3.curveBasis))
      .attr('fill', 'none')
      .attr('stroke', drugHue(p.s))
      .attr('stroke-width', 1.7)
      .attr('opacity', 0.88);
    g.append('circle')
      .attr('cx', x(p.rt))
      .attr('cy', yScale(100))
      .attr('r', 3)
      .attr('fill', drugHue(p.s))
      .attr('stroke', t.bg)
      .attr('stroke-width', 0.6);
  });
  g.append('line')
    .attr('x1', x(x0))
    .attr('x2', x(x1))
    .attr('y1', yScale(0))
    .attr('y2', yScale(0))
    .attr('stroke', t.line)
    .attr('stroke-dasharray', '3,3')
    .attr('opacity', 0.5);
}

export function drawDrugLabels(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  drugs: string[],
  rows: RidgelinePeak[][],
  x: d3.ScaleLinear<number, number>,
  H: number,
  m: ReturnType<typeof layoutMargins>,
  rtLookup: Record<string, number>,
) {
  const t = themeColors();
  drugs.forEach((sub) => {
    const st = computeDrugStats(rows, sub, rtLookup);
    const cx = x(st.meanRt);
    const hue = drugHue(sub);
    svg
      .append('line')
      .attr('x1', cx)
      .attr('x2', cx)
      .attr('y1', H - m.b)
      .attr('y2', H - m.b + 6)
      .attr('stroke', hue)
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.85);
    svg
      .append('text')
      .attr('x', cx)
      .attr('y', H - m.b + 18)
      .attr('text-anchor', 'middle')
      .attr('fill', hue)
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .text(shortName(sub));
    svg
      .append('text')
      .attr('x', cx)
      .attr('y', H - m.b + 30)
      .attr('text-anchor', 'middle')
      .attr('fill', t.faint)
      .attr('font-size', 9)
      .text(st.meanRt.toFixed(2));
  });
  svg
    .append('text')
    .attr('x', (x.range()[0]! + x.range()[1]!) / 2)
    .attr('y', H - 6)
    .attr('text-anchor', 'middle')
    .attr('fill', t.muted)
    .attr('font-size', 11)
    .text(
      drugs.length === 1
        ? `${shortName(drugs[0]!)} · retention time (min) — read down the column for batch drift`
        : 'retention time (min) — read down each drug column for batch variation',
    );
}

export function drawSampleIndex(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  m: ReturnType<typeof layoutMargins>,
  H: number,
  rows: RidgelinePeak[][],
) {
  const t = themeColors();
  svg.append('text').attr('x', m.l - 8).attr('y', m.t + 8).attr('text-anchor', 'end').attr('fill', t.muted).attr('font-size', 9).text('newest');
  const step = Math.max(1, Math.floor(rows.length / 8));
  for (let i = 0; i < rows.length; i += step) {
    const y = ySample(i, m, H, rows);
    svg
      .append('text')
      .attr('x', m.l - 8)
      .attr('y', y + 3)
      .attr('text-anchor', 'end')
      .attr('fill', t.faint)
      .attr('font-size', 8)
      .text('#' + (rows.length - i));
  }
}
