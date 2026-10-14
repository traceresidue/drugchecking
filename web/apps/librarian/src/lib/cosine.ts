/**
 * Cosine similarity between two peak lists on possibly-different x-axes.
 * Bins both onto a shared axis (nearest-bin, sum of y within each bin) then
 * computes standard cosine similarity on the resulting vectors. Good enough
 * for a "how similar do these look" readout in the compare tray -- not a
 * substitute for a real library-search scoring algorithm.
 */
export function cosineSimilarity(
  a: ReadonlyArray<readonly [number, number]>,
  b: ReadonlyArray<readonly [number, number]>,
  bins = 200,
): number {
  if (a.length === 0 || b.length === 0) return 0;

  const xs: number[] = [];
  for (const [x] of a) xs.push(x);
  for (const [x] of b) xs.push(x);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return 0;

  const va = new Float64Array(bins);
  const vb = new Float64Array(bins);
  const toBin = (x: number) => Math.min(bins - 1, Math.max(0, Math.floor(((x - min) / (max - min)) * bins)));
  for (const [x, y] of a) va[toBin(x)]! += y;
  for (const [x, y] of b) vb[toBin(x)]! += y;

  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < bins; i++) {
    dot += va[i]! * vb[i]!;
    na += va[i]! * va[i]!;
    nb += vb[i]! * vb[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
