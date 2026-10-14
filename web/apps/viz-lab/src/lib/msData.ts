import type { ReferenceSpectrum, SpectraData } from '../db/queries';

export interface MsEntry {
  peaks: Array<[number, number]>;
  mw?: number;
  smiles?: string;
}

export function buildMsLibrary(
  referenceMs: ReferenceSpectrum[],
  spectra: SpectraData | null,
): Map<string, MsEntry> {
  const map = new Map<string, MsEntry>();

  for (const [name, entry] of Object.entries(spectra?.ms ?? {})) {
    map.set(name.toLowerCase(), {
      peaks: entry.peaks,
      mw: entry.mw,
      smiles: entry.smiles,
    });
  }

  for (const ref of referenceMs) {
    const key = ref.substanceName.toLowerCase();
    const mw = typeof ref.meta.mw === 'number' ? ref.meta.mw : undefined;
    map.set(key, {
      peaks: ref.peaks,
      mw,
      smiles: typeof ref.meta.smiles === 'string' ? ref.meta.smiles : map.get(key)?.smiles,
    });
  }

  return map;
}

export function msSubstanceNames(msLib: Map<string, MsEntry>, spectra: SpectraData | null): string[] {
  const fromSpectra = Object.keys(spectra?.ms ?? {});
  const fromDb = [...msLib.keys()];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of [...fromSpectra, ...fromDb]) {
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out.sort((a, b) => a.localeCompare(b));
}
