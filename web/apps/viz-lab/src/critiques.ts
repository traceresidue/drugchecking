import critiquesJson from '@critiques';

export interface CritiqueEntry {
  thesis: string;
  strengths: string[];
  weaknesses: string[];
  visualization: string;
  liveNoteTemplates?: Record<string, string>;
}

export const CRITIQUES = critiquesJson as Record<string, CritiqueEntry>;

export function getCritique(id: string): CritiqueEntry | null {
  return CRITIQUES[id] ?? null;
}

/** Map of weakness text -> resolution note for shipped React pages */
export const RESOLUTIONS: Record<string, Record<string, string>> = {
  '01-mirror-match': {
    'Score block sits below the chart rather than anchoring the layout':
      'Score-forward left rail layout applied (viz-mirror-layout).',
    'Peak m/z labels can crowd on dense spectra without density control':
      'Top 5 peaks labeled; mobile collapses score rail to horizontal strip.',
    'Hardcoded TOKENS colors bypass CSS variable theming':
      'All colors via CSS variables (--c-*, --ok, --alert, etc.).',
    'No reduced label mode for mobile or projection use':
      'Fewer labels on viewports <720px; peak count capped at 5.',
  },
  '02-chromatogram-explorer': {
    'Detail panel stacks below chart instead of side-by-side inspector':
      'Desktop uses grid split: chart left, inspector right.',
    'Peak labels appear without tier control on minor peaks':
      'Only top peaks labeled; selection drives detail panel.',
    'Trace fill uses fixed TOKENS.info rather than palette-aware accent':
      'Trace uses var(--info) from unified token system.',
    'Selected peak state requires full redraw':
      'D3 redraw scoped to chart group on selection change.',
  },
  '11-supply-streamgraph': {
    'Legend always visible though stream colors are self-evident':
      'Legend collapsible via details element.',
    'Quarterly x-axis labels sparse — no quick stats strip':
      'Quarterly ticks retained; hover tooltips show class totals.',
    'Band colors hardcoded to TOKENS, not theme-swappable':
      'Bands use --c-* CSS variables via classColor().',
    'Wiggle offset can confuse first-time readers':
      'Stacked % toggle provides proportion reading mode.',
  },
};

export function getResolutions(id: string): Record<string, string> {
  return RESOLUTIONS[id] ?? {};
}
