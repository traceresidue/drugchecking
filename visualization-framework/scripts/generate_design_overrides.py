#!/usr/bin/env python3
"""Generate minimal src/design/*.design.js signature tweaks for Phase 2 pages."""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
REG = json.load(open(ROOT / 'src' / 'registry.json', encoding='utf-8'))
CRIT = json.load(open(ROOT / 'src' / 'design' / 'critiques.json', encoding='utf-8'))
EXISTING = {p.stem.replace('.design', '') for p in (ROOT / 'src' / 'design').glob('*.design.js')}

SIGNATURES = {
    '03-ftir-overlay': '.dcf-design-ftir .panel{border-left:4px solid var(--c-fent)}',
    '04-fragment-tree': '.dcf-design-radial .panel{border-radius:50%;max-width:560px;margin:0 auto}',
    '05-chromatogram-3d': '.dcf-design-cube #plot{border-radius:12px;overflow:hidden}',
    '06-spectral-ridgeline': '.dcf-design-ridge .panel{padding-top:8px}',
    '06a-ridgeline-filled': '.dcf-design-ridge-filled .controls{margin-bottom:6px}',
    '06b-ridgeline-3d': '.dcf-design-ridge-3d #plot{border-radius:12px}',
    '06c-ridgeline-filter': '.dcf-design-ridge-filter .dcf-design-bar{margin-bottom:12px}',
    '07-ftir-waterfall': '.dcf-design-waterfall #plot{border-radius:12px}',
    '08-mass-defect-map': '.dcf-design-massdef .panel{min-height:480px}',
    '09-sonification': '.dcf-design-sonify .controls{justify-content:flex-start;gap:12px}',
    '10-chemical-space': '.dcf-design-chemspace #month-readout{font:700 28px ui-monospace;color:var(--ink)}',
    '12a-co-nested': '.dcf-design-nested-chord .panel{padding:12px}',
    '12b-chord-sankey': '.dcf-design-chord-sankey .panel{display:grid;gap:12px}',
    '12c-co-undirected': '.dcf-design-undirected .panel{padding:8px}',
    '13-expected-detected-sankey': '.dcf-design-sankey .panel{border-top:3px solid var(--c-fent)}',
    '14-horizon-wall': '.dcf-design-horizon .panel{overflow-x:auto}',
    '15-emergence-beeswarm': '.dcf-design-beeswarm .panel{position:relative}',
    '16-supply-terrain-3d': '.dcf-design-terrain #plot{border-radius:12px}',
    '17-adulterant-network': '.dcf-design-network .panel{min-height:520px}',
    '19-expected-reality-gap': '.dcf-design-gap #caption{font-size:15px;line-height:1.55;padding:10px 0}',
    '20-potency-uncertainty': '.dcf-design-gauge #claim{font:700 32px ui-monospace;color:var(--ink)}',
    '21-geo-tilegrid': '.dcf-design-geo .panel svg{max-width:720px}',
    '22-xylazine-spread': '.dcf-design-xyl #month-label{font:600 14px ui-monospace;color:var(--c-xyl)}',
    '23-structure-flipbook': '.dcf-design-flipbook #grid .panel:first-child{grid-column:span 2}',
    '24-anatomy-scrolly': '.dcf-design-scrolly .sticky{box-shadow:inset 3px 0 0 var(--ok)}',
    '25-glyph-garden': '.dcf-design-garden .panel svg{border-radius:50%}',
}

TEMPLATE = """/* Design Lab layout signature — {title} */
(function(){{
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('{cls}');
  if(!document.getElementById('dcf-design-sig-{vid}')){{
    const s=document.createElement('style');
    s.id='dcf-design-sig-{vid}';
    s.textContent=`{css}`;
    document.head.appendChild(s);
  }}
}})();
"""

for spec in REG:
    vid = spec['id']
    if vid in EXISTING:
        continue
    cls = 'dcf-design-' + vid.split('-')[0]
    css = SIGNATURES.get(vid, f'.{cls} .panel{{border-radius:16px}}')
    path = ROOT / 'src' / 'design' / f'{vid}.design.js'
    path.write_text(TEMPLATE.format(
        title=spec['title'], cls=cls, vid=vid.replace('-', '_'), css=css
    ), encoding='utf-8')
    print(f'created {path.name}')

print('done')
