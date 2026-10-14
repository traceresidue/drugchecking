import type { AggregatesData } from '../db/queries';

export function buildRtLookup(aggregates: AggregatesData | null): Record<string, number> {
  if (!aggregates?.retention_times) return {};
  const rt = aggregates.retention_times as
    | Record<string, number>
    | Array<{ substance: string; rt: number }>;
  if (Array.isArray(rt)) {
    return Object.fromEntries(rt.map((d) => [d.substance, d.rt]));
  }
  return rt;
}
