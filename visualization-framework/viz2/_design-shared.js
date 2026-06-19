/* viz2 Design Lab — theme engine, toolbar, label density, critique panel.
   Loaded after viz/_shared.js (window.DCF). Patches DCF.scaffold when present. */

const SUBSTANCE_KEYS = ['fent', 'opioid', 'xyl', 'stim', 'coke', 'benzo', 'cut', 'other'];
const SIGNAL_KEYS = ['alert', 'watch', 'ok', 'info'];
const CHROME_KEYS = ['bg', 'panel', 'panel2', 'line', 'ink', 'muted', 'faint'];

const DEFAULT_CHROME_DARK = {
  bg: '#0b0e14', panel: '#121826', panel2: '#1a2234', line: '#26304a',
  ink: '#e8ecf4', muted: '#8b94a8', faint: '#5b6478'
};
const DEFAULT_CHROME_LIGHT = {
  bg: '#f4f6fa', panel: '#ffffff', panel2: '#eef1f7', line: '#d4dae8',
  ink: '#121826', muted: '#5b6478', faint: '#8b94a8'
};
const DEFAULT_SUBSTANCES = {
  fent: '#ff5c7a', opioid: '#ff8a5c', xyl: '#b388ff', stim: '#ffd166',
  coke: '#4cc9f0', benzo: '#7aa2ff', cut: '#6ee7a8', other: '#94a3b8'
};
const DEFAULT_SIGNAL = {
  alert: '#ff5c7a', watch: '#ffd166', ok: '#6ee7a8', info: '#4cc9f0'
};

function cs(stops) {
  return stops.map((c, i) => [i / (stops.length - 1), c]);
}

export const PALETTES = {
  default: {
    id: 'default', name: 'DCF Default', group: 'recommended',
    stops: ['#0b0e14', '#ff5c7a', '#ffd166', '#4cc9f0', '#6ee7a8', '#e8ecf4'],
    chrome: { dark: { ...DEFAULT_CHROME_DARK }, light: { ...DEFAULT_CHROME_LIGHT } },
    substances: { ...DEFAULT_SUBSTANCES },
    signal: { ...DEFAULT_SIGNAL },
    colorscale: cs(['#0b0e14', '#26304a', '#ff5c7a', '#ffd166', '#4cc9f0', '#6ee7a8'])
  },
  clinical: {
    id: 'clinical', name: 'Clinical', group: 'recommended',
    stops: ['#0d1117', '#5b8def', '#7eb8da', '#a8c4e0', '#c5d4e8', '#e8eef5'],
    chrome: {
      dark: { bg: '#0d1117', panel: '#141b26', panel2: '#1c2638', line: '#2a3850', ink: '#e4eaf2', muted: '#8a9bb5', faint: '#5c6d85' },
      light: { bg: '#eef2f7', panel: '#ffffff', panel2: '#e4ebf4', line: '#c8d4e4', ink: '#141b26', muted: '#5c6d85', faint: '#8a9bb5' }
    },
    substances: { fent: '#e85d7a', opioid: '#d4896a', xyl: '#8b9fd4', stim: '#c4b86a', coke: '#5ba8c9', benzo: '#6b8fd4', cut: '#7eb89a', other: '#94a3b8' },
    signal: { alert: '#e85d7a', watch: '#c4b86a', ok: '#7eb89a', info: '#5ba8c9' },
    colorscale: cs(['#0d1117', '#2a3850', '#5b8def', '#7eb8da', '#a8c4e0', '#e8eef5'])
  },
  paper: {
    id: 'paper', name: 'Paper', group: 'recommended',
    stops: ['#faf7f2', '#c97b84', '#d4a574', '#8b9fd4', '#a8c4a0', '#4a4540'],
    chrome: {
      dark: { bg: '#1a1814', panel: '#242018', panel2: '#2e2820', line: '#3d362c', ink: '#f5f0e8', muted: '#a89a88', faint: '#7a6e60' },
      light: { bg: '#faf7f2', panel: '#ffffff', panel2: '#f3ede4', line: '#e0d8cc', ink: '#2a2520', muted: '#6b6258', faint: '#9a9088' }
    },
    substances: { fent: '#c45c6a', opioid: '#d4896a', xyl: '#9a7ab8', stim: '#c9a04a', coke: '#6a9ab8', benzo: '#7a8fc8', cut: '#8ab898', other: '#8a8580' },
    signal: { alert: '#c45c6a', watch: '#c9a04a', ok: '#8ab898', info: '#6a9ab8' },
    colorscale: cs(['#faf7f2', '#e8ddd0', '#d4a574', '#c97b84', '#8b9fd4', '#4a4540'])
  },
  contrast: {
    id: 'contrast', name: 'High Contrast', group: 'recommended',
    stops: ['#000000', '#ff3366', '#ffcc00', '#00ccff', '#00ff88', '#ffffff'],
    chrome: {
      dark: { bg: '#000000', panel: '#0a0a0a', panel2: '#141414', line: '#404040', ink: '#ffffff', muted: '#b0b0b0', faint: '#707070' },
      light: { bg: '#ffffff', panel: '#f5f5f5', panel2: '#ebebeb', line: '#404040', ink: '#000000', muted: '#404040', faint: '#707070' }
    },
    substances: { fent: '#ff3366', opioid: '#ff6633', xyl: '#cc66ff', stim: '#ffcc00', coke: '#00ccff', benzo: '#6699ff', cut: '#00ff88', other: '#aaaaaa' },
    signal: { alert: '#ff3366', watch: '#ffcc00', ok: '#00ff88', info: '#00ccff' },
    colorscale: cs(['#000000', '#404040', '#ff3366', '#ffcc00', '#00ccff', '#ffffff'])
  },
  colorblind: {
    id: 'colorblind', name: 'Colorblind Safe', group: 'recommended',
    stops: ['#0b0e14', '#e69f00', '#56b4e9', '#009e73', '#f0e442', '#e8ecf4'],
    chrome: { dark: { ...DEFAULT_CHROME_DARK }, light: { ...DEFAULT_CHROME_LIGHT } },
    substances: { fent: '#d55e00', opioid: '#e69f00', xyl: '#cc79a7', stim: '#f0e442', coke: '#56b4e9', benzo: '#0072b2', cut: '#009e73', other: '#999999' },
    signal: { alert: '#d55e00', watch: '#f0e442', ok: '#009e73', info: '#56b4e9' },
    colorscale: cs(['#0b0e14', '#0072b2', '#56b4e9', '#009e73', '#e69f00', '#d55e00'])
  },
  amethyst: {
    id: 'amethyst', name: 'Amethyst', group: 'custom',
    stops: ['#23251E', '#81008F', '#9C51CE', '#E1B1EB', '#B7C1F1', '#D7FFF1'],
    chrome: {
      dark: { bg: '#23251E', panel: '#2a2c24', panel2: '#32342c', line: '#454840', ink: '#E1B1EB', muted: '#9C51CE', faint: '#6a5a7a' },
      light: { bg: '#f5f0f8', panel: '#ffffff', panel2: '#ebe4f0', line: '#d4c8e0', ink: '#23251E', muted: '#6a5a7a', faint: '#9C51CE' }
    },
    substances: { fent: '#81008F', opioid: '#9C51CE', xyl: '#B7C1F1', stim: '#E1B1EB', coke: '#9C51CE', benzo: '#B7C1F1', cut: '#D7FFF1', other: '#6a5a7a' },
    signal: { alert: '#81008F', watch: '#E1B1EB', ok: '#D7FFF1', info: '#B7C1F1' },
    colorscale: cs(['#23251E', '#81008F', '#9C51CE', '#E1B1EB', '#B7C1F1', '#D7FFF1'])
  },
  lagoon: {
    id: 'lagoon', name: 'Lagoon', group: 'custom',
    stops: ['#0081a7', '#00afb9', '#fdfcdc', '#fed9b7', '#f07167', '#0081a7'],
    chrome: {
      dark: { bg: '#0a1a20', panel: '#0f242c', panel2: '#142e38', line: '#1e4550', ink: '#fdfcdc', muted: '#00afb9', faint: '#0081a7' },
      light: { bg: '#fdfcdc', panel: '#ffffff', panel2: '#f5f5e8', line: '#d4d4c0', ink: '#0081a7', muted: '#00afb9', faint: '#f07167' }
    },
    substances: { fent: '#f07167', opioid: '#f07167', xyl: '#fed9b7', stim: '#f07167', coke: '#0081a7', benzo: '#00afb9', cut: '#fdfcdc', other: '#0081a7' },
    signal: { alert: '#f07167', watch: '#fed9b7', ok: '#00afb9', info: '#0081a7' },
    colorscale: cs(['#0081a7', '#00afb9', '#fdfcdc', '#fed9b7', '#f07167'])
  },
  spectral: {
    id: 'spectral', name: 'Spectral', group: 'custom',
    stops: ['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c', '#2b83ba'],
    chrome: {
      dark: { bg: '#0f1418', panel: '#151c22', panel2: '#1c262e', line: '#2a3844', ink: '#ffffbf', muted: '#abdda4', faint: '#5a7a8a' },
      light: { bg: '#fffff5', panel: '#ffffff', panel2: '#f5f5e8', line: '#d8d8c8', ink: '#1a2830', muted: '#5a7a8a', faint: '#8a9a8a' }
    },
    substances: { fent: '#d7191c', opioid: '#fdae61', xyl: '#f46d43', stim: '#fdae61', coke: '#2b83ba', benzo: '#4575b4', cut: '#abdda4', other: '#5a7a8a' },
    signal: { alert: '#d7191c', watch: '#fdae61', ok: '#abdda4', info: '#2b83ba' },
    colorscale: cs(['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c'])
  },
  inferno: {
    id: 'inferno', name: 'Inferno', group: 'custom',
    stops: ['#000004', '#420a68', '#932667', '#dd513a', '#fca50a', '#fcffa4'],
    chrome: {
      dark: { bg: '#000004', panel: '#0a0610', panel2: '#140c18', line: '#2a1830', ink: '#fcffa4', muted: '#fca50a', faint: '#932667' },
      light: { bg: '#fcffa4', panel: '#ffffff', panel2: '#fff8d0', line: '#e8d880', ink: '#000004', muted: '#932667', faint: '#420a68' }
    },
    substances: { fent: '#dd513a', opioid: '#fca50a', xyl: '#932667', stim: '#fca50a', coke: '#420a68', benzo: '#5c1a78', cut: '#fcffa4', other: '#932667' },
    signal: { alert: '#dd513a', watch: '#fca50a', ok: '#fcffa4', info: '#420a68' },
    colorscale: cs(['#000004', '#420a68', '#932667', '#dd513a', '#fca50a', '#fcffa4'])
  },
  sage: {
    id: 'sage', name: 'Sage', group: 'custom',
    stops: ['#EBB6BD', '#F9E5D9', '#E2E1D9', '#B8C6B7', '#4B5858', '#4B5858'],
    chrome: {
      dark: { bg: '#1a2020', panel: '#222828', panel2: '#2a3232', line: '#3a4444', ink: '#F9E5D9', muted: '#B8C6B7', faint: '#4B5858' },
      light: { bg: '#F9E5D9', panel: '#ffffff', panel2: '#E2E1D9', line: '#B8C6B7', ink: '#4B5858', muted: '#6a7878', faint: '#8a9898' }
    },
    substances: { fent: '#EBB6BD', opioid: '#d4a0a8', xyl: '#c8b8c0', stim: '#d4c0a0', coke: '#B8C6B7', benzo: '#a0b8b0', cut: '#E2E1D9', other: '#4B5858' },
    signal: { alert: '#EBB6BD', watch: '#d4c0a0', ok: '#B8C6B7', info: '#4B5858' },
    colorscale: cs(['#EBB6BD', '#F9E5D9', '#E2E1D9', '#B8C6B7', '#4B5858'])
  }
};

const LABEL_RULES = {
  low: { peakMax: 2, mzPct: 0, hiddenTiers: ['peak', 'inline', 'annotation'] },
  default: { peakMax: null, mzPct: 0, hiddenTiers: [] },
  high: { peakMax: null, mzPct: 5, hiddenTiers: [] }
};

let _pageId = '';
let _critique = null;
let _labelTiers = {};
let _state = { theme: 'dark', palette: 'default', labels: 'default' };

function storageKey() { return `dcf-design:${_pageId}`; }

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (raw) Object.assign(_state, JSON.parse(raw));
  } catch (e) { /* ignore */ }
}

function saveState() {
  try { localStorage.setItem(storageKey(), JSON.stringify(_state)); } catch (e) { /* ignore */ }
}

export function applyPalette(paletteId) {
  const pal = PALETTES[paletteId] || PALETTES.default;
  const chrome = pal.chrome[_state.theme] || pal.chrome.dark;
  const root = document.documentElement;
  CHROME_KEYS.forEach(k => {
    const cssKey = k === 'panel2' ? '--panel-2' : `--${k}`;
    root.style.setProperty(cssKey, chrome[k]);
  });
  SUBSTANCE_KEYS.forEach(k => root.style.setProperty(`--c-${k}`, pal.substances[k]));
  SIGNAL_KEYS.forEach(k => root.style.setProperty(`--${k}`, pal.signal[k]));
  root.setAttribute('data-palette', paletteId);
  return pal;
}

export function applyTheme(theme) {
  _state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  applyPalette(_state.palette);
}

export function applyLabels(mode) {
  _state.labels = mode;
  document.documentElement.setAttribute('data-labels', mode);
}

export function getClassColor(cls) {
  const key = cls === 'panel2' ? 'panel2' : cls;
  if (SUBSTANCE_KEYS.includes(key)) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(`--c-${key}`).trim();
    if (v) return v;
  }
  if (SIGNAL_KEYS.includes(key)) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(`--${key}`).trim();
    if (v) return v;
  }
  const pal = PALETTES[_state.palette] || PALETTES.default;
  if (pal.substances[key]) return pal.substances[key];
  if (pal.signal[key]) return pal.signal[key];
  if (pal.chrome[_state.theme]?.[key]) return pal.chrome[_state.theme][key];
  return DCF?.TOKENS?.[key] || '#94a3b8';
}

export function peakLabelCount(defaultCount) {
  if (_state.labels === 'low') return Math.min(2, defaultCount);
  if (_state.labels === 'high') return 999;
  const rules = LABEL_RULES[_state.labels] || LABEL_RULES.default;
  if (rules.peakMax != null) return Math.min(rules.peakMax, defaultCount);
  return defaultCount;
}

export function mzLabelThreshold() {
  return (LABEL_RULES[_state.labels] || LABEL_RULES.default).mzPct;
}

export function showTier(tier) {
  const rules = LABEL_RULES[_state.labels] || LABEL_RULES.default;
  if (rules.hiddenTiers.includes(tier)) return false;
  const tierDef = _labelTiers[tier];
  if (tierDef && tierDef.minLabels === 'low') return _state.labels !== 'low';
  return true;
}

export function getPlotlyLayout(base = {}) {
  const chrome = (PALETTES[_state.palette] || PALETTES.default).chrome[_state.theme];
  const showAxis = showTier('axis');
  const showLegend = showTier('legend');
  const layout = {
    paper_bgcolor: chrome.bg,
    plot_bgcolor: chrome.panel,
    font: { color: chrome.ink, family: (typeof DCF !== 'undefined' && DCF.FONTS?.sans) || 'Inter, ui-sans-serif, system-ui, sans-serif' },
    colorway: SUBSTANCE_KEYS.map(k => getClassColor(k)),
    ...base
  };
  if (layout.xaxis) layout.xaxis = { ...layout.xaxis, showticklabels: showAxis, color: chrome.muted };
  else layout.xaxis = { showticklabels: showAxis, color: chrome.muted };
  if (layout.yaxis) layout.yaxis = { ...layout.yaxis, showticklabels: showAxis, color: chrome.muted };
  else layout.yaxis = { showticklabels: showAxis, color: chrome.muted };
  if (layout.scene) {
    layout.scene = {
      ...layout.scene,
      bgcolor: chrome.bg,
      xaxis: { ...(layout.scene.xaxis || {}), color: chrome.muted, showticklabels: showAxis },
      yaxis: { ...(layout.scene.yaxis || {}), color: chrome.muted, showticklabels: showAxis },
      zaxis: { ...(layout.scene.zaxis || {}), color: chrome.muted, showticklabels: showAxis }
    };
  }
  if (layout.legend) layout.legend = { ...layout.legend, visible: showLegend };
  return layout;
}

export function getColorscale() {
  return (PALETTES[_state.palette] || PALETTES.default).colorscale;
}

function updateLiveNote() {
  const el = document.querySelector('.critique-live');
  if (!el || !_critique?.liveNoteTemplates) return;
  const tpl = _critique.liveNoteTemplates[_state.labels] ||
    _critique.liveNoteTemplates[`${_state.theme}_${_state.palette}`] ||
    _critique.liveNoteTemplates.default || '';
  const pal = PALETTES[_state.palette]?.name || _state.palette;
  const theme = _state.theme === 'light' ? 'Light' : 'Dark';
  el.textContent = tpl.replace(/\{theme\}/g, theme).replace(/\{palette\}/g, pal).replace(/\{labels\}/g, _state.labels);
}

function onSettingChange() {
  applyTheme(_state.theme);
  applyLabels(_state.labels);
  saveState();
  updateLiveNote();
  window.__vizRedraw?.();
}

function renderSwatches(paletteId) {
  const pal = PALETTES[paletteId] || PALETTES.default;
  const strip = document.getElementById('dcf-palette-swatches');
  if (!strip) return;
  strip.innerHTML = pal.stops.map(c => `<span style="background:${c}" title="${c}"></span>`).join('');
}

function buildToolbar() {
  const bar = document.createElement('div');
  bar.className = 'dcf-design-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Design Lab controls');

  const themeGroup = document.createElement('div');
  themeGroup.className = 'dcf-design-group';
  themeGroup.innerHTML = '<span class="dcf-design-label">Theme</span>';
  ['dark', 'light'].forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dcf-design-btn';
    btn.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    btn.setAttribute('aria-pressed', String(_state.theme === t));
    btn.dataset.theme = t;
    btn.onclick = () => {
      _state.theme = t;
      themeGroup.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === t)));
      onSettingChange();
    };
    themeGroup.appendChild(btn);
  });

  const palGroup = document.createElement('div');
  palGroup.className = 'dcf-design-group dcf-design-palette';
  palGroup.innerHTML = '<span class="dcf-design-label">Palette</span>';
  const sel = document.createElement('select');
  sel.id = 'dcf-palette-select';
  sel.className = 'dcf-design-select';
  sel.setAttribute('aria-label', 'Color palette');
  ['recommended', 'custom'].forEach(grp => {
    const og = document.createElement('optgroup');
    og.label = grp === 'recommended' ? 'Recommended' : 'Custom';
    Object.values(PALETTES).filter(p => p.group === grp).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === _state.palette) opt.selected = true;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });
  sel.onchange = () => {
    _state.palette = sel.value;
    renderSwatches(sel.value);
    onSettingChange();
  };
  const swatchStrip = document.createElement('div');
  swatchStrip.id = 'dcf-palette-swatches';
  swatchStrip.className = 'dcf-palette-swatches';
  swatchStrip.setAttribute('aria-hidden', 'true');
  palGroup.append(sel, swatchStrip);

  const lblGroup = document.createElement('div');
  lblGroup.className = 'dcf-design-group';
  lblGroup.innerHTML = '<span class="dcf-design-label">Labels</span>';
  ['low', 'default', 'high'].forEach(l => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dcf-design-btn';
    btn.textContent = l.charAt(0).toUpperCase() + l.slice(1);
    btn.setAttribute('aria-pressed', String(_state.labels === l));
    btn.dataset.labels = l;
    btn.onclick = () => {
      _state.labels = l;
      lblGroup.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.labels === l)));
      onSettingChange();
    };
    lblGroup.appendChild(btn);
  });

  bar.append(themeGroup, palGroup, lblGroup);
  renderSwatches(_state.palette);
  return bar;
}

function buildCritiquePanel(critique) {
  const aside = document.createElement('aside');
  aside.className = 'dcf-critique';
  aside.setAttribute('aria-labelledby', 'critique-heading');
  const strengths = (critique.strengths || []).map(s => `<li>${s}</li>`).join('');
  const weaknesses = (critique.weaknesses || []).map(s => `<li>${s}</li>`).join('');
  aside.innerHTML = `
    <h2 id="critique-heading">Design assessment</h2>
    <p class="critique-thesis">${critique.thesis || ''}</p>
    <div class="critique-grid">
      <section><h3>Strengths</h3><ul>${strengths}</ul></section>
      <section><h3>Weaknesses</h3><ul>${weaknesses}</ul></section>
      <section><h3>Visualization</h3><p>${critique.visualization || ''}</p></section>
    </div>
    <p class="critique-live muted" aria-live="polite"></p>`;
  return aside;
}

export function injectDesignCSS() {
  if (document.getElementById('dcf-design-css')) return;
  const s = document.createElement('style');
  s.id = 'dcf-design-css';
  s.textContent = `
  .dcf-design-bar{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;padding:12px 16px;margin:0 0 16px;background:var(--panel);border:1px solid var(--line);border-radius:12px;position:sticky;top:0;z-index:20}
  .dcf-design-group{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .dcf-design-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-right:4px}
  .dcf-design-btn,.dcf-design-select{min-height:40px;min-width:40px;padding:8px 14px;background:var(--panel-2);color:var(--muted);border:1px solid var(--line);border-radius:999px;font:500 13px var(--font-sans);cursor:pointer;transition:background .15s,color .15s}
  .dcf-design-select{border-radius:10px;padding-right:28px}
  .dcf-design-btn:hover,.dcf-design-select:hover{background:var(--panel);color:var(--ink)}
  .dcf-design-btn[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
  .dcf-design-palette{gap:10px}
  .dcf-palette-swatches{display:flex;gap:3px;border-radius:6px;overflow:hidden;border:1px solid var(--line)}
  .dcf-palette-swatches span{display:block;width:18px;height:24px}
  .dcf-critique{margin:22px 0;padding:18px 20px;background:var(--panel);border:1px solid var(--line);border-radius:14px}
  .dcf-critique h2{font-size:15px;margin:0 0 10px;font-weight:700}
  .critique-thesis{font-size:14px;line-height:1.55;color:var(--ink);margin:0 0 14px;max-width:72ch}
  .critique-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:12px}
  .dcf-critique h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 8px}
  .dcf-critique ul{margin:0;padding-left:18px;font-size:13px;line-height:1.55;color:var(--muted)}
  .dcf-critique section p{font-size:13px;line-height:1.55;color:var(--muted);margin:0}
  .critique-live{font-size:12px;margin:8px 0 0;padding-top:10px;border-top:1px solid var(--line)}
  [data-labels="low"] .dcf-lbl[data-tier="peak"],
  [data-labels="low"] .dcf-lbl[data-tier="inline"],
  [data-labels="low"] .dcf-lbl[data-tier="annotation"]{display:none}
  [data-labels="low"] .dcf-lbl[data-tier="legend"]{opacity:.6}
  @media (prefers-reduced-motion:reduce){.dcf-design-btn,.dcf-design-select{transition:none}}
  `;
  document.head.appendChild(s);
}

export function designScaffold(opts) {
  injectDesignCSS();
  const stage = DCF.scaffold(opts);
  injectDesignChrome();
  document.documentElement.setAttribute('data-theme', _state.theme);
  document.documentElement.setAttribute('data-labels', _state.labels);
  applyPalette(_state.palette);
  updateLiveNote();
  return stage;
}

let _patched = false;

export function init(meta = {}) {
  _pageId = meta.pageId || '';
  _critique = meta.critique || null;
  _labelTiers = meta.labelTiers || {};
  loadState();
  if (!_patched && DCF?.scaffold) {
    _patched = true;
    const orig = DCF.scaffold;
    DCF.scaffold = function patchedScaffold(o) {
      injectDesignCSS();
      const st = orig(o);
      injectDesignChrome();
      document.documentElement.setAttribute('data-theme', _state.theme);
      document.documentElement.setAttribute('data-labels', _state.labels);
      applyPalette(_state.palette);
      updateLiveNote();
      return st;
    };
  }
}

function injectDesignChrome() {
  const hdr = document.querySelector('.dcf-h');
  const howEl = document.querySelector('.dcf-how');
  if (hdr && !document.querySelector('.dcf-design-bar')) hdr.after(buildToolbar());
  if (howEl && _critique && !document.querySelector('.dcf-critique')) {
    howEl.before(buildCritiquePanel(_critique));
    updateLiveNote();
  }
}
