/** Read design tokens from CSS variables (never hardcode hex in viz pages). */
export function cssVar(name: string, fallback = ''): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function themeColors() {
  return {
    bg: cssVar('--bg'),
    panel: cssVar('--panel'),
    panel2: cssVar('--panel-2'),
    line: cssVar('--line'),
    ink: cssVar('--ink'),
    muted: cssVar('--muted'),
    faint: cssVar('--faint'),
    info: cssVar('--info'),
    alert: cssVar('--alert'),
    watch: cssVar('--watch'),
    ok: cssVar('--ok'),
  };
}

/** Resolve var(--c-fent) etc. to computed rgb() for D3 color math. */
export function resolveCssColor(value: string): string {
  if (typeof document === 'undefined') return value;
  const probe = document.createElement('span');
  probe.style.color = value;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  return rgb;
}

export function plotlyColorscale(): [number, string][] {
  const t = themeColors();
  return [
    [0, t.bg],
    [0.15, cssVar('--panel-2')],
    [0.4, cssVar('--c-coke')],
    [0.7, cssVar('--info')],
    [1, cssVar('--c-stim')],
  ];
}

export function ftirWaterfallColorscale(): [number, string][] {
  const t = themeColors();
  return [
    [0, t.bg],
    [0.2, cssVar('--panel-2')],
    [0.5, cssVar('--c-xyl')],
    [0.8, cssVar('--c-benzo')],
    [1, cssVar('--c-stim')],
  ];
}
