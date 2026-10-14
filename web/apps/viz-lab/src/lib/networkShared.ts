import { classify, fmt } from '@dcf/core';
import type { AggregatesData } from '../db/queries';
import { classColor } from './colors';

export interface NetworkNode {
  id: string;
  v: number;
  cls: ReturnType<typeof classify>['cls'];
  color: string;
  label: string;
}

export interface NetworkLink {
  source: string;
  target: string;
  v: number;
}

export function makeNodes(aggregates: AggregatesData): NetworkNode[] {
  const co = aggregates.cooccurrence;
  const counts = Object.fromEntries(aggregates.top_substances.map((d) => [d.substance, d.samples]));
  const nodeNames = [...new Set(co.flatMap((d) => [d.a, d.b]))]
    .filter((n) => counts[n])
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
    .slice(0, 22);
  return nodeNames.map((n) => {
    const c = classify(n);
    return { id: n, v: counts[n] ?? 0, cls: c.cls, color: classColor(c.cls), label: c.label };
  });
}

export function makeLinks(aggregates: AggregatesData, nodeNames: string[]): NetworkLink[] {
  const nset = new Set(nodeNames);
  return aggregates.cooccurrence
    .filter((d) => nset.has(d.a) && nset.has(d.b))
    .map((d) => ({ source: d.a, target: d.b, v: d.n }));
}

export function nodeTooltipHtml(
  d: NetworkNode,
  roles: Record<string, string> | undefined,
): string {
  const role = roles?.[d.id] ?? '';
  return `<b style="text-transform:capitalize">${d.id}</b><br><span class="muted">${d.label}${role ? ` · ${role}` : ''}</span><br><span class="muted">${fmt.int(d.v)} samples</span>`;
}

export function legendClasses(nodes: NetworkNode[]): Array<{ cls: string; color: string; label: string }> {
  const seen = new Set<string>();
  const out: Array<{ cls: string; color: string; label: string }> = [];
  for (const n of nodes) {
    if (seen.has(n.cls)) continue;
    seen.add(n.cls);
    out.push({ cls: n.cls, color: n.color, label: n.label });
  }
  return out;
}
