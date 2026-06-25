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
AGG = json.load(open(ROOT/'data'/'aggregates.json'))
SPEC = json.load(open(ROOT/'data'/'spectra.json'))
TOPO_US = json.load(open(ROOT/'viz'/'lib'/'us-states.json'))  # TopoJSON for US states
SHARED = (ROOT/'viz'/'_shared.js').read_text()

# Turn the ES module into a global-exposing IIFE: strip `export ` and the loadData fetch helper.
def globalize(js):
    js = re.sub(r'^export\s+(async\s+)?function', r'\1function', js, flags=re.M)
    js = re.sub(r'^export\s+const', 'const', js, flags=re.M)
    # drop loadData (uses fetch; data is inlined instead)
    js = re.sub(r'/\* fetch the shared datasets.*?\n\}\n', '', js, flags=re.S)
    names = ['TOKENS','classify','fmt','chromatogram','ftirCurve','stickSpectrum',
             'cosine','tooltip','scaffold','injectCSS','drawSmiles']
    js += '\nwindow.DCF={' + ','.join(names) + '};\n'
    # wrap in an IIFE so top-level function/const declarations don't collide
    # with `const {scaffold,...}=DCF` destructuring in the per-viz <script>
    return '(function(){\n' + js + '\n})();'
SHARED_GLOBAL = globalize(SHARED)

# Libraries are vendored locally in viz/lib/ (see lib/README) so every file in
# viz/ works fully offline via file:// with no CDN/network dependency.
LIBS = {
 'd3':'<script src="lib/d3.min.js"></script>',
 'sankey':'<script src="lib/d3-sankey.min.js"></script>',
 'plotly':'<script src="lib/plotly.min.js"></script>',
 'smiles':'<script src="lib/smiles-drawer.min.js"></script>',
 'topojson':'<script src="lib/topojson-client.min.js"></script>',
}

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — Drug Checking Viz</title>
{libtags}
</head>
<body>
{nav}
<script>
window.DATA = {data};
window.SPEC = {spec};
window.TOPO = {topo};
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

NAV_CSS = """<style id="dcf-nav-css">
#dcf-nav{position:fixed;top:0;left:0;right:0;z-index:9999;height:40px;
  background:rgba(11,14,20,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border-bottom:1px solid #26304a;display:flex;align-items:center;
  font-family:ui-monospace,monospace;font-size:12px;padding:0 4px}
#dcf-nav a,#dcf-nav span.nav-btn{display:flex;align-items:center;height:40px;padding:0 12px;
  text-decoration:none;white-space:nowrap;color:#8b94a8;transition:color .1s,background .1s;border-radius:4px}
#dcf-nav a:hover{color:#e8ecf4;background:rgba(255,255,255,.05)}
#dcf-nav .nav-home{color:#6ee7a8;border-right:1px solid #26304a;margin-right:4px;border-radius:0}
#dcf-nav .nav-home:hover{color:#e8ecf4;background:rgba(110,231,168,.08)}
#dcf-nav .nav-title{flex:1;text-align:center;color:#5b6478;font-size:11px;
  overflow:hidden;text-overflow:ellipsis;padding:0 8px}
#dcf-nav .nav-dim{color:#2d3648;cursor:default;pointer-events:none}
body{padding-top:40px}
</style>"""

def make_nav(spec, reg):
    by_n = sorted(reg, key=lambda s: s['n'])
    idx = next((i for i, s in enumerate(by_n) if s['id'] == spec['id']), -1)
    if idx > 0:
        p = by_n[idx - 1]
        prev_el = f'<a href="{p["id"]}.html" class="nav-arrow" title="#{p["n"]:02d} {p["title"]}">&#8592; {p["n"]:02d}</a>'
    else:
        prev_el = '<span class="nav-btn nav-dim">&#8592; &#8212;</span>'
    if idx >= 0 and idx < len(by_n) - 1:
        n = by_n[idx + 1]
        next_el = f'<a href="{n["id"]}.html" class="nav-arrow" title="#{n["n"]:02d} {n["title"]}">{n["n"]:02d} &#8594;</a>'
    else:
        next_el = '<span class="nav-btn nav-dim">&#8212; &#8594;</span>'
    title_txt = f'Nº {spec["n"]:02d} · {spec["title"]}'
    return (NAV_CSS +
            f'<nav id="dcf-nav">'
            f'<a href="../../index.html" class="nav-home">&#8962;&nbsp;All</a>'
            f'{prev_el}'
            f'<span class="nav-title">{title_txt}</span>'
            f'{next_el}'
            f'</nav>')

def build(spec, reg):
    body = (ROOT/'src'/(spec['id']+'.js')).read_text()
    libtags = '\n'.join(LIBS[l] for l in spec.get('libs',[]))
    data = json.dumps({k:AGG[k] for k in spec.get('data',[])}, separators=(',',':'))
    specdata = json.dumps({k:SPEC[k] for k in spec.get('spec',[])}, separators=(',',':')) if spec.get('spec') else '{}'
    topo_keys = spec.get('topo', [])
    topo = json.dumps({'us_states': TOPO_US} if 'us_states' in topo_keys else {}, separators=(',',':'))
    nav = make_nav(spec, reg)
    html = TEMPLATE.format(title=spec['title'], libtags=libtags, data=data,
                           spec=specdata, topo=topo, shared=SHARED_GLOBAL, body=body, nav=nav)
    out = ROOT/'viz'/(spec['id']+'.html')
    out.write_text(html)
    return out, len(html)

if __name__=='__main__':
    reg = json.load(open(ROOT/'src'/'registry.json'))
    os.makedirs(ROOT/'viz',exist_ok=True)
    total=0
    for s in reg:
        try:
            out,sz=build(s, reg); total+=1
            print(f"  {s['id']:34s} {sz//1024:4d} KB")
        except FileNotFoundError:
            print(f"  {s['id']:34s} (src pending)")
    print(f"built {total} files")
