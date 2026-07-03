#!/usr/bin/env python3
"""Build standalone single-file HTML visualizations.

Each output in viz/*.html is fully self-contained: data is inlined and the
only external references are to libraries vendored in viz/lib/ (relative
paths), so every file opens directly from the filesystem with no server and
no network/CDN access. Shared design-system code lives in viz/_shared.js and
is inlined (exports stripped, exposed as window.DCF). Per-viz code lives in
src/<id>.js. Data slices are inlined from data/*.json.
"""
import json, re, os, pathlib
ROOT = pathlib.Path(__file__).parent
AGG = json.load(open(ROOT/'data'/'aggregates.json', encoding='utf-8'))
SPEC = json.load(open(ROOT/'data'/'spectra.json', encoding='utf-8'))
TOPO_US = json.load(open(ROOT/'viz'/'lib'/'us-states.json', encoding='utf-8'))  # TopoJSON for US states

# Prefer the typed dcf-core build (web/packages/dcf-core, ROADMAP Track A1) once
# it's been built; fall back to the hand-rolled ES module so builds still work
# before `npm run build` has been run in web/.
_DCF_CORE_DIST = ROOT.parent/'web'/'packages'/'dcf-core'/'dist'/'shared.js'
SHARED = (_DCF_CORE_DIST if _DCF_CORE_DIST.exists() else ROOT/'viz'/'_shared.js').read_text(encoding='utf-8')
NAV = (ROOT/'viz'/'_nav.js').read_text(encoding='utf-8')

# Turn the ES module into a global-exposing IIFE: strip `export ` and the loadData fetch helper.
def globalize(js, window_name, export_names):
    js = re.sub(r'^export\s+(async\s+)?function', r'\1function', js, flags=re.M)
    js = re.sub(r'^export\s+const', 'const', js, flags=re.M)
    js = re.sub(r'^export\s*\{[^}]+\};?\s*', '', js, flags=re.M)
    if window_name == 'DCF':
        js = re.sub(r'/\* fetch the shared datasets.*?\n\}\n', '', js, flags=re.S)
    js += '\nwindow.' + window_name + '={' + ','.join(export_names) + '};\n'
    return '(function(){\n' + js + '\n})();'

SHARED_GLOBAL = globalize(SHARED, 'DCF', [
    'TOKENS','FONTS','classify','fmt','chromatogram','ftirCurve','stickSpectrum',
    'cosine','tooltip','scaffold','injectCSS','drawSmiles',
])
NAV_GLOBAL = globalize(NAV, 'DCF_NAV', ['injectNav','buildIndexPage','pageFile','previewSrc'])

# Libraries are vendored locally in viz/lib/ (see lib/README) so every file in
# viz/ works fully offline via file:// with no CDN/network dependency.
LIBS = {
 'd3':'<script src="lib/d3.min.js"></script>',
 'sankey':'<script src="lib/d3-sankey.min.js"></script>',
 'plotly':'<script src="lib/plotly.min.js"></script>',
 'smiles':'<script src="lib/smiles-drawer.min.js"></script>',
 'topojson':'<script src="lib/topojson-client.min.js"></script>',
}

# Auth guard: redirect to login if no session. Path is relative to viz/ — 2 levels up to repo root.
AUTH_GUARD = """<script>
(function(){{
  if(!localStorage.getItem('dcf_auth')){{
    var loc=encodeURIComponent(location.href);
    location.replace('../../index.html?r='+encodeURIComponent(location.pathname));
  }}
}})();
</script>"""

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — Drug Checking Viz</title>
{libtags}
</head>
<body>
{auth}
<script>
window.DATA = {data};
window.SPEC = {spec};
window.TOPO = {topo};
</script>
<script>
const NAV_REGISTRY = {nav_registry};
const NAV_PAGE_ID = {nav_page_id};
const NAV_MODE = "viz";
{nav}
</script>
<script>
{shared}
</script>
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
<title>Drug Checking Visualizations</title>
</head>
<body>
{auth}
<script>
const NAV_REGISTRY = {nav_registry};
const NAV_MODE = "viz";
{nav}
</script>
<script>
{shared}
</script>
<script>
DCF.injectCSS();
DCF_NAV.buildIndexPage({{
  mode: "viz",
  title: "Drug Checking Visualizations",
  dek: "Browse {count} standalone views — spectral benches, supply aggregates, and result cards. Aggregate charts use real data from 6,580 samples; spectra are illustrative.",
  switchHref: "../viz2/index.html"
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
        inc = (ROOT/'src'/m.group(1)).read_text(encoding='utf-8')
        body = body.replace(m.group(0), inc, 1)
    return body

def nav_registry_json(reg):
    slim = [{'id': s['id'], 'n': s['n'], 'cat': s['cat'], 'title': s['title']} for s in reg]
    return json.dumps(slim, separators=(',', ':'))

def build(spec, reg):
    body = (ROOT/'src'/(spec['id']+'.js')).read_text(encoding='utf-8')
    body = expand_includes(body)
    libtags = '\n'.join(LIBS[l] for l in spec.get('libs',[]))
    data = json.dumps({k:AGG[k] for k in spec.get('data',[])}, separators=(',',':'))
    specdata = json.dumps({k:SPEC[k] for k in spec.get('spec',[])}, separators=(',',':')) if spec.get('spec') else '{}'
    topo_keys = spec.get('topo', [])
    topo = json.dumps({'us_states': TOPO_US} if 'us_states' in topo_keys else {}, separators=(',',':'))
    html = TEMPLATE.format(
        title=spec['title'], libtags=libtags, data=data, spec=specdata,
        topo=topo, auth=AUTH_GUARD,
        shared=SHARED_GLOBAL, body=body, nav=NAV_GLOBAL,
        nav_registry=nav_registry_json(reg),
        nav_page_id=json.dumps(spec['id']),
    )
    out = ROOT/'viz'/(spec['id']+'.html')
    out.write_text(html, encoding='utf-8')
    return out, len(html)

def build_index(reg):
    html = INDEX_TEMPLATE.format(
        nav=NAV_GLOBAL,
        shared=SHARED_GLOBAL,
        auth=AUTH_GUARD,
        nav_registry=nav_registry_json(reg),
        count=len(reg),
    )
    out = ROOT/'viz'/'index.html'
    out.write_text(html, encoding='utf-8')
    return out

if __name__=='__main__':
    reg = json.load(open(ROOT/'src'/'registry.json', encoding='utf-8'))
    print(f"shared bundle: {'dcf-core (built)' if _DCF_CORE_DIST.exists() else 'viz/_shared.js (legacy)'}")
    os.makedirs(ROOT/'viz',exist_ok=True)
    # Generate root index.html from MAIN_PASSWORD env var (file is gitignored)
    import subprocess, sys
    subprocess.run([sys.executable, str(ROOT.parent/'build_index.py')], check=False)
    total=0
    for s in reg:
        try:
            out,sz=build(s, reg); total+=1
            print(f"  {s['id']:34s} {sz//1024:4d} KB")
        except FileNotFoundError:
            print(f"  {s['id']:34s} (src pending)")
    build_index(reg)
    print(f"built {total} viz files + index.html")
