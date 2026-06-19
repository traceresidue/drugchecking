#!/usr/bin/env python3
"""Add DCFDesign hooks to src/*.js files missing __vizRedraw."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'src'
HELPERS = """
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
""".strip()

PLOTLY_SNIPPET = """
function plotlyChrome(){
  if(!window.DCFDesign) return {layout:{},colorscale:null};
  const chrome=(DCFDesign.PALETTES&&DCFDesign.applyPalette)?null:null;
  return {layout:DCFDesign.getPlotlyLayout({}),colorscale:DCFDesign.getColorscale()};
}
""".strip()

SKIP = {'06-ridgeline-shared.js'}

for path in sorted(ROOT.glob('*.js')):
    if path.name in SKIP or path.name.startswith('design'):
        continue
    text = path.read_text(encoding='utf-8')
    if '__vizRedraw' in text:
        continue
    changed = False

    # Insert helpers after DCF destructure
    m = re.search(r'(const \{[^}]+\}=DCF;)\n', text)
    if m and 'function subColor' not in text and 'classify' in m.group(1):
        text = text[:m.end()] + HELPERS + '\n' + text[m.end():]
        changed = True
    elif m and 'function sigColor' not in text and 'TOKENS' in m.group(1) and 'classify' not in m.group(1):
        text = text[:m.end()] + "function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}\n" + text[m.end():]
        changed = True

    # Replace classify(name).color with subColor(name) when helpers present
    if 'function subColor' in text:
        text = re.sub(r'classify\(([^)]+)\)\.color', r'subColor(\1)', text)
        changed = True

    # Replace common TOKENS signal colors in chart code
    for key in ['fent', 'opioid', 'xyl', 'stim', 'coke', 'benzo', 'cut', 'other', 'ok', 'watch', 'alert', 'info']:
        if f'sigColor(\'{key}\')' not in text:
            pass  # manual for complex cases

    # Add __vizRedraw before initial draw/resize
    if 'function draw()' in text or 'function draw(' in text:
        if re.search(r'\ndraw\(\);\naddEventListener', text):
            text = re.sub(r'\n(draw\(\);\n)(addEventListener)', r'\nwindow.__vizRedraw=draw;\n\1\2', text, count=1)
            changed = True
        elif text.rstrip().endswith('draw();') and 'window.__vizRedraw' not in text:
            text = text.rstrip()[:-6] + 'window.__vizRedraw=draw;\ndraw();\n'
            changed = True
    elif 'function render()' in text and '03-ftir-overlay' in path.name:
        text = re.sub(r'\nrender\(\);\n(addEventListener)', r'\nwindow.__vizRedraw=draw;\nrender();\n\1', text, count=1)
        changed = True

    if changed or '__vizRedraw' not in text:
        # Fallback: append at end before last line
        if '__vizRedraw' not in text:
            if 'function draw()' in text:
                text = text.rstrip() + '\nif(typeof draw==="function")window.__vizRedraw=draw;\n'
                changed = True

    if changed:
        path.write_text(text, encoding='utf-8')
        print(f'patched {path.name}')
