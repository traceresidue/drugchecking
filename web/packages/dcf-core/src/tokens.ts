/* Drug Checking Visualization Framework — design tokens.
   Source of truth ported from viz/_shared.js (see DESIGN_SYSTEM.md). */

export const TOKENS = {
  bg:'#0b0e14', panel:'#121826', panel2:'#1a2234', line:'#26304a',
  ink:'#e8ecf4', muted:'#8b94a8', faint:'#5b6478',
  opioid:'#ff8a5c', fent:'#ff5c7a', xyl:'#b388ff', stim:'#ffd166',
  coke:'#4cc9f0', benzo:'#7aa2ff', cut:'#6ee7a8', other:'#94a3b8',
  alert:'#ff5c7a', watch:'#ffd166', ok:'#6ee7a8', info:'#4cc9f0'
} as const;

/* Sans-only UI prose + mono instrument readouts — always terminate with generic family. */
export const FONTS = {
  sans:'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono:'"Cascadia Mono", ui-monospace, "SF Mono", "Roboto Mono", Consolas, monospace',
} as const;
