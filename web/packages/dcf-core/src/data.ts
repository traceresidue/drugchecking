/* fetch the shared datasets (relative to viz/ files).
   Excluded from the legacy shared.js bundle — standalone pages inline their data. */
export async function loadData(): Promise<{ agg: any; spec: any }> {
  const [agg,spec]=await Promise.all([
    fetch('../data/aggregates.json').then(r=>r.json()),
    fetch('../data/spectra.json').then(r=>r.json())
  ]);
  return {agg,spec};
}
