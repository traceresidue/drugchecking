import * as d3 from 'd3';
import { classify, fmt, type SubstanceClass } from '@dcf/core';
import type { AggregatesData } from '../db/queries';
import { substanceColor } from './colors';

export const TOTAL_SAMPLES = 6580;

export const CLASS_FILTERS: Array<[SubstanceClass | 'all', string]> = [
  ['all', 'All'],
  ['fent', 'Fentanyl & analogs'],
  ['opioid', 'Opioid'],
  ['xyl', 'Sedative / xylazine'],
  ['stim', 'Stimulant'],
  ['coke', 'Cocaine'],
  ['benzo', 'Benzo'],
  ['cut', 'Cuts'],
];

export function shortLabel(s: string, max = 15): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function buildCounts(aggregates: AggregatesData): Record<string, number> {
  return Object.fromEntries(aggregates.top_substances.map((d) => [d.substance, d.samples]));
}

export function buildColorMap(names: string[], counts: Record<string, number>): Record<string, string> {
  const map: Record<string, string> = {};
  const byCls: Record<string, string[]> = {};
  names.forEach((n) => {
    const c = classify(n).cls;
    (byCls[c] ??= []).push(n);
  });
  Object.values(byCls).forEach((list) => {
    list.sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
    const base = d3.hsl(substanceColor(list[0]!));
    list.forEach((name, i) => {
      const t = list.length > 1 ? i / (list.length - 1) : 0.5;
      const h = (base.h + (t - 0.5) * 42 + 360) % 360;
      const s = Math.min(0.95, base.s + (t - 0.5) * 0.18);
      const l = Math.min(0.78, Math.max(0.42, base.l + (t - 0.5) * 0.14));
      map[name] = d3.hsl(h, s, l).formatHex();
    });
  });
  return map;
}

export function filteredSubs(
  aggregates: AggregatesData,
  counts: Record<string, number>,
  clsFilt: SubstanceClass | 'all',
  topN: number,
): string[] {
  const co = aggregates.cooccurrence;
  const allNames = [...new Set(co.flatMap((d) => [d.a, d.b]))].filter((n) => counts[n]);
  let subs = allNames.slice().sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
  if (clsFilt !== 'all') subs = subs.filter((n) => classify(n).cls === clsFilt);
  return subs.slice(0, topN);
}

export function buildMatrix(names: string[], co: AggregatesData['cooccurrence']): number[][] {
  const idx = Object.fromEntries(names.map((n, i) => [n, i]));
  const N = names.length;
  const M = Array.from({ length: N }, () => Array(N).fill(0));
  co.forEach((d) => {
    if (idx[d.a] != null && idx[d.b] != null) {
      M[idx[d.a]!]![idx[d.b]!]! += d.n;
      M[idx[d.b]!]![idx[d.a]!]! += d.n;
    }
  });
  return M;
}

export function allPartners(
  focal: string,
  aggregates: AggregatesData,
  counts: Record<string, number>,
  clsFilt: SubstanceClass | 'all',
  topN: number,
): Array<{ name: string; n: number }> {
  const pairs = aggregates.cooccurrence
    .filter((d) => d.a === focal || d.b === focal)
    .map((d) => ({ name: d.a === focal ? d.b : d.a, n: d.n }))
    .filter((p) => counts[p.name]);
  const filtered =
    clsFilt !== 'all' ? pairs.filter((p) => classify(p.name).cls === clsFilt) : pairs;
  const seen = new Map<string, number>();
  filtered.forEach((p) => {
    if (!seen.has(p.name) || (seen.get(p.name) ?? 0) < p.n) seen.set(p.name, p.n);
  });
  return [...seen.entries()]
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, topN);
}

export function buildDrillMatrix(focal: string, partners: Array<{ name: string; n: number }>) {
  const names = [focal, ...partners.map((p) => p.name)];
  const N = names.length;
  const M = Array.from({ length: N }, () => Array(N).fill(0));
  partners.forEach((p, j) => {
    const k = j + 1;
    M[0]![k] = p.n;
    M[k]![0] = p.n;
  });
  return { names, M };
}

export function arcAngle(group: { startAngle: number; endAngle: number }): number {
  return (group.startAngle + group.endAngle) / 2;
}

export function layoutPartnerRing(
  partners: Array<{ name: string; n: number }>,
  padAngle = 0.035,
): Array<{ name: string; n: number; index: number; value: number; startAngle: number; endAngle: number }> {
  const total = d3.sum(partners, (p) => p.n);
  let angle = 0;
  return partners.map((p, i) => {
    const span = (p.n / total) * (2 * Math.PI - padAngle * partners.length);
    const g = { name: p.name, n: p.n, index: i, value: p.n, startAngle: angle, endAngle: angle + span };
    angle += span + padAngle;
    return g;
  });
}

export function ribbonEnds(
  group: { startAngle: number; endAngle: number },
  r: number,
  pad = 0.04,
): { startAngle: number; endAngle: number; radius: number } {
  const span = group.endAngle - group.startAngle;
  const inset = span * pad;
  return { startAngle: group.startAngle + inset, endAngle: group.endAngle - inset, radius: r };
}

export function hubRibbonLink(
  hubR: number,
  ir: number,
  group: { startAngle: number; endAngle: number },
  coCount: number,
  maxCo: number,
) {
  const mid = arcAngle(group);
  const hubSpread = 0.012 + (coCount / maxCo) * 0.1;
  const arc = ribbonEnds(group, ir - 2, 0.06);
  return {
    source: { startAngle: mid - hubSpread / 2, endAngle: mid + hubSpread / 2, radius: hubR },
    target: { startAngle: arc.startAngle, endAngle: arc.endAngle, radius: arc.radius },
    value: coCount,
  };
}

export function flowLabelText(focal: string, partner: string, n: number): string {
  return `${shortLabel(focal, 18)} → ${shortLabel(partner, 18)}  ${fmt.int(n)} shared samples`;
}
