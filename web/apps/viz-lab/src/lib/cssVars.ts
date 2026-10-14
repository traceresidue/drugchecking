/** Read a CSS custom property from :root (for D3 fills that need computed values). */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Token shortcuts matching theme.css — use var() strings in SVG attributes where supported. */
export const V = {
  bg: 'var(--bg)',
  panel: 'var(--panel)',
  panel2: 'var(--panel-2)',
  line: 'var(--line)',
  ink: 'var(--ink)',
  muted: 'var(--muted)',
  faint: 'var(--faint)',
  alert: 'var(--alert)',
  watch: 'var(--watch)',
  ok: 'var(--ok)',
  info: 'var(--info)',
} as const;
