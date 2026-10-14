export type VizCategory = 'MS' | 'GC–MS' | 'FTIR' | 'SUPPLY' | 'RESULT' | 'GEO' | 'EXPERIMENTAL';

export interface VizEntry {
  id: string;
  n: number;
  cat: VizCategory;
  title: string;
  dek: string;
}

export const VIZ_REGISTRY: VizEntry[] = [
  { id: '01-mirror-match', n: 1, cat: 'MS', title: 'Spectral Mirror Match', dek: 'Sample vs library MS mirror plot with cosine score.' },
  { id: '02-chromatogram-explorer', n: 2, cat: 'GC–MS', title: 'Annotated Chromatogram Explorer', dek: 'Tap peaks for substance detail and structures.' },
  { id: '03-ftir-overlay', n: 3, cat: 'FTIR', title: 'FTIR Overlay & Subtraction Bench', dek: 'Blend or subtract two FTIR traces.' },
  { id: '05-chromatogram-3d', n: 5, cat: 'GC–MS', title: 'GC–MS Data Cube (3D)', dek: 'RT × m/z × intensity in 3D.' },
  { id: '06-spectral-ridgeline', n: 6, cat: 'GC–MS', title: 'Batch Ridgeline Fingerprints', dek: 'Stacked chromatogram cohort fingerprints.' },
  { id: '07-ftir-waterfall', n: 7, cat: 'FTIR', title: 'FTIR Waterfall (3D)', dek: 'Stacked FTIR spectra in depth.' },
  { id: '09-sonification', n: 9, cat: 'EXPERIMENTAL', title: 'Hear the Spectrum', dek: 'Sonify MS/FTIR peaks via Web Audio.' },
  { id: '11-supply-streamgraph', n: 11, cat: 'SUPPLY', title: 'Supply Composition Streamgraph', dek: 'Class composition over 36 months.' },
  { id: '12-cooccurrence-chord', n: 12, cat: 'SUPPLY', title: 'Adulterant Co-occurrence', dek: 'Chord, nested, and sankey co-occurrence views.' },
  { id: '13-expected-detected-sankey', n: 13, cat: 'SUPPLY', title: 'Expected vs. Detected Sankey', dek: 'Labeled substance to detection flow.' },
  { id: '14-horizon-wall', n: 14, cat: 'SUPPLY', title: 'Substance Horizon Wall', dek: 'Monthly prevalence heat wall.' },
  { id: '15-emergence-beeswarm', n: 15, cat: 'SUPPLY', title: 'Novel-Substance Emergence Swarm', dek: 'First-detection timeline beeswarm.' },
  { id: '16-supply-terrain-3d', n: 16, cat: 'SUPPLY', title: 'Supply Terrain (3D)', dek: 'Composition trends as 3D surface.' },
  { id: '17-adulterant-network', n: 17, cat: 'SUPPLY', title: 'Adulterant Force Network', dek: 'Force-directed co-occurrence graph.' },
  { id: '18-result-card', n: 18, cat: 'RESULT', title: 'Sample Result Card', dek: 'Complete sample result communication.' },
  { id: '19-expected-reality-gap', n: 19, cat: 'RESULT', title: 'Expected-Reality Gap', dek: 'Expected vs detected chromatogram overlay.' },
  { id: '21-geo-tilegrid', n: 21, cat: 'GEO', title: 'Supply Tile-Grid Cartogram', dek: 'State-level fentanyl and xylazine prevalence.' },
  { id: '22-xylazine-spread', n: 22, cat: 'GEO', title: 'Xylazine Spread Timeline', dek: 'Regional xylazine emergence over time.' },
  { id: '24-anatomy-scrolly', n: 24, cat: 'RESULT', title: 'Anatomy of a Sample', dek: 'Scroll-driven chromatogram narrative.' },
  { id: 'chromatogram-sample-3d', n: 34, cat: 'GC–MS', title: 'Sample TIC Time Stack', dek: 'Real cohort chromatograms in 3D.' },
];

export const CATEGORY_ORDER: VizCategory[] = ['MS', 'GC–MS', 'FTIR', 'SUPPLY', 'RESULT', 'GEO', 'EXPERIMENTAL'];

export function vizByCategory(): Map<VizCategory, VizEntry[]> {
  const map = new Map<VizCategory, VizEntry[]>();
  for (const cat of CATEGORY_ORDER) map.set(cat, []);
  for (const entry of VIZ_REGISTRY) {
    map.get(entry.cat)?.push(entry);
  }
  return map;
}

export function getVizEntry(id: string): VizEntry | undefined {
  return VIZ_REGISTRY.find((e) => e.id === id);
}
