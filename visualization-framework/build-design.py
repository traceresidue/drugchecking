#!/usr/bin/env python3
"""Build Design Lab standalone HTML pages in viz2/d-*.html.

Mirrors build.py but adds DCFDesign layer, critique panel, and optional
layout overrides from src/design/*.design.js. Defaults to 5 pilot pages in Phase 1.
"""
import argparse
import json
import os
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
AGG = json.load(open(ROOT / 'data' / 'aggregates.json', encoding='utf-8'))
SPEC = json.load(open(ROOT / 'data' / 'spectra.json', encoding='utf-8'))
SHARED = (ROOT / 'viz' / '_shared.js').read_text(encoding='utf-8')
NAV = (ROOT / 'viz' / '_nav.js').read_text(encoding='utf-8')
DESIGN_SHARED = (ROOT / 'viz2' / '_design-shared.js').read_text(encoding='utf-8')
CRITIQUES = json.load(open(ROOT / 'src' / 'design' / 'critiques.json', encoding='utf-8'))
LABEL_TIERS = json.load(open(ROOT / 'src' / 'design' / 'label-tiers.json', encoding='utf-8'))

PILOT_IDS = [
    '01-mirror-match',
    '02-chromatogram-explorer',
    '11-supply-streamgraph',
    '12-cooccurrence-chord',
    '18-result-card',
]


def globalize(js, window_name, export_names):
    js = re.sub(r'^export\s+(async\s+)?function', r'\1function', js, flags=re.M)
    js = re.sub(r'^export\s+const', 'const', js, flags=re.M)
    js = re.sub(r'^export\s*\{[^}]+\};?\s*', '', js, flags=re.M)
    if window_name == 'DCF':
        js = re.sub(r'/\* fetch the shared datasets.*?\n\}\n', '', js, flags=re.S)
    js += '\nwindow.' + window_name + '={' + ','.join(export_names) + '};\n'
    return '(function(){\n' + js + '\n})();'


SHARED_GLOBAL = globalize(SHARED, 'DCF', [
    'TOKENS', 'FONTS', 'classify', 'fmt', 'chromatogram', 'ftirCurve', 'stickSpectrum',
    'cosine', 'tooltip', 'scaffold', 'injectCSS', 'drawSmiles',
])

NAV_GLOBAL = globalize(NAV, 'DCF_NAV', ['injectNav', 'buildIndexPage', 'pageFile', 'previewSrc'])

DESIGN_GLOBAL = globalize(DESIGN_SHARED, 'DCFDesign', [
    'PALETTES', 'init', 'designScaffold', 'applyPalette', 'applyTheme', 'applyLabels',
    'getClassColor', 'peakLabelCount', 'showTier', 'mzLabelThreshold',
    'getPlotlyLayout', 'getColorscale', 'injectDesignCSS',
])

LIBS = {
    'd3': '<script src="../viz/lib/d3.min.js"></script>',
    'sankey': '<script src="../viz/lib/d3-sankey.min.js"></script>',
    'plotly': '<script src="../viz/lib/plotly.min.js"></script>',
    'smiles': '<script src="../viz/lib/smiles-drawer.min.js"></script>',
    'topojson': '<script src="../viz/lib/topojson-client.min.js"></script>',
}

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — Design Lab</title>
{libtags}
</head>
<body>
<script>
window.DATA = {data};
window.SPEC = {spec};
</script>
<script>
const NAV_REGISTRY = {nav_registry};
const NAV_PAGE_ID = {nav_page_id};
const NAV_MODE = "lab";
{nav}
</script>
<script>
{shared}
</script>
<script>
{design_shared}
</script>
<script>
window.DCF_DESIGN_META = {meta};
DCFDesign.init(window.DCF_DESIGN_META);
</script>
{design_override}
<script>
{body}
</script>
</body>
</html>
"""

INDEX_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Design Lab — Drug Checking Viz</title>
</head>
<body>
<script>
const NAV_REGISTRY = {nav_registry};
const NAV_MODE = "lab";
{nav}
</script>
<script>
{shared}
</script>
<script>
DCF.injectCSS();
DCF_NAV.buildIndexPage({{
  mode: "lab",
  title: "Design Lab",
  dek: "Experiment with palettes, label density, and critique panels across {count} visualization pages. Same chart logic as production viz with live theme controls.",
  switchHref: "../viz/index.html"
}});
</script>
</body>
</html>
"""


def expand_includes(body):
    while '// @include ' in body:
        m = re.search(r'// @include (\S+)', body)
        if not m:
            break
        inc = (ROOT / 'src' / m.group(1)).read_text(encoding='utf-8')
        body = body.replace(m.group(0), inc, 1)
    return body


def nav_registry_json(reg):
    slim = [{'id': s['id'], 'n': s['n'], 'cat': s['cat'], 'title': s['title']} for s in reg]
    return json.dumps(slim, separators=(',', ':'))


def patch_scaffold_for_design_lab(body):
    """Per-viz files destructure scaffold from DCF before init runs; bind a delegate
    so calls hit DCFDesign's patched DCF.scaffold (toolbar + critique panel)."""

    def repl(m):
        inner = m.group(1)
        parts = [p.strip() for p in inner.split(',') if p.strip() and p.strip() != 'scaffold']
        rest = ','.join(parts)
        if rest:
            return f'const {{{rest}}}=DCF;\nconst scaffold=(o)=>DCF.scaffold(o);'
        return 'const scaffold=(o)=>DCF.scaffold(o);'

    patched, n = re.subn(
        r'const\s*\{([^}]*)\}\s*=\s*DCF\s*;',
        repl,
        body,
        count=1,
    )
    return patched if n else body


def build(spec, reg):
    vid = spec['id']
    body = (ROOT / 'src' / (vid + '.js')).read_text(encoding='utf-8')
    body = expand_includes(body)
    body = patch_scaffold_for_design_lab(body)
    libtags = '\n'.join(LIBS[l] for l in spec.get('libs', []))
    data = json.dumps({k: AGG[k] for k in spec.get('data', [])}, separators=(',', ':'))
    specdata = json.dumps(
        {k: SPEC[k] for k in spec.get('spec', [])}, separators=(',', ':')
    ) if spec.get('spec') else '{}'
    meta = json.dumps({
        'pageId': vid,
        'critique': CRITIQUES.get(vid, {}),
        'labelTiers': LABEL_TIERS.get(vid, {}),
    }, separators=(',', ':'))

    design_path = ROOT / 'src' / 'design' / (vid + '.design.js')
    design_override = ''
    if design_path.exists():
        override_js = design_path.read_text(encoding='utf-8')
        design_override = f'<script>\n{override_js}\n</script>\n'

    html = TEMPLATE.format(
        title=spec['title'],
        libtags=libtags,
        data=data,
        spec=specdata,
        shared=SHARED_GLOBAL,
        design_shared=DESIGN_GLOBAL,
        meta=meta,
        design_override=design_override,
        body=body,
        nav=NAV_GLOBAL,
        nav_registry=nav_registry_json(reg),
        nav_page_id=json.dumps(vid),
    )
    out = ROOT / 'viz2' / ('d-' + vid + '.html')
    out.write_text(html, encoding='utf-8')
    return out, len(html)


def build_index(reg):
    html = INDEX_TEMPLATE.format(
        nav=NAV_GLOBAL,
        shared=SHARED_GLOBAL,
        nav_registry=nav_registry_json(reg),
        count=len(reg),
    )
    out = ROOT / 'viz2' / 'index.html'
    out.write_text(html, encoding='utf-8')
    return out


def main():
    parser = argparse.ArgumentParser(description='Build viz2 Design Lab HTML pages')
    parser.add_argument(
        '--pilot-only',
        action='store_true',
        help='Build only Phase 1 pilot pages',
    )
    parser.add_argument(
        '--all',
        action='store_true',
        default=True,
        help='Build all registry entries that have critiques (default)',
    )
    args = parser.parse_args()
    reg = json.load(open(ROOT / 'src' / 'registry.json', encoding='utf-8'))
    os.makedirs(ROOT / 'viz2', exist_ok=True)

    if args.pilot_only:
        specs = [s for s in reg if s['id'] in PILOT_IDS]
    else:
        ids = set(CRITIQUES.keys())
        specs = [s for s in reg if s['id'] in ids]

    total = 0
    for s in specs:
        try:
            out, sz = build(s, reg)
            total += 1
            print(f"  d-{s['id']:32s} {sz // 1024:4d} KB")
        except FileNotFoundError as e:
            print(f"  d-{s['id']:32s} (missing: {e})")
    build_index(reg)
    print(f"built {total} design lab files + index.html")


if __name__ == '__main__':
    main()
