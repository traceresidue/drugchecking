#!/usr/bin/env python3
"""Generate the root index.html.

The password gate is OFF by default: index.html is then a plain redirect to the
gallery (visualization-framework/viz/index.html) and no password is involved.

To turn the gate ON, set DCF_GATE=1 together with MAIN_PASSWORD at build time:
  DCF_GATE=1 MAIN_PASSWORD=yourpassword python3 build_index.py
and build the visualizations with the same DCF_GATE=1 so each page carries the guard.

WARNING: the gate is client-side only. The password is written into the page source
and each page only checks that localStorage.dcf_auth exists. It is friction, not
security; see DECISIONS.md for the plan for real, server-side access control.

The generated index.html is gitignored and never committed.
"""
import os, pathlib

ROOT = pathlib.Path(__file__).parent
pwd = os.environ.get('MAIN_PASSWORD', '')
gate_on = os.environ.get('DCF_GATE', '').strip().lower() in ('1', 'true', 'on', 'yes')
out = ROOT / 'index.html'

if not gate_on:
    out.write_text("""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Drug Checking Visualizations</title>
<meta http-equiv="refresh" content="0; url=visualization-framework/viz/index.html">
</head>
<body>
<p><a href="visualization-framework/viz/index.html">Open the visualization gallery</a></p>
<script>location.replace('visualization-framework/viz/index.html');</script>
</body>
</html>
""", encoding='utf-8')
    print(f"Generated {out} (gate off: redirect to gallery)")
    raise SystemExit(0)

if not pwd:
    print("WARNING: DCF_GATE is set but MAIN_PASSWORD is not — login will reject all passwords")

html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Drug Checking Visualizations</title>
<style>
  :root {{
    --bg:#0b0e14;--panel:#121826;--line:#26304a;--ink:#e8ecf4;
    --muted:#8b94a8;--faint:#5b6478;--fent:#ff5c7a;--ok:#6ee7a8;
  }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:var(--bg);color:var(--ink);
    font-family:system-ui,-apple-system,'Segoe UI',sans-serif;
    display:flex;align-items:center;justify-content:center;
    min-height:100vh;padding:20px}}
  .box{{background:var(--panel);border-radius:14px;padding:44px 40px;
    max-width:340px;width:100%;text-align:center;
    box-shadow:0 24px 80px rgba(0,0,0,.5)}}
  h1{{font-size:18px;font-weight:800;letter-spacing:-.01em;margin-bottom:6px}}
  p{{color:var(--muted);font-size:13px;margin-bottom:26px;line-height:1.6}}
  input{{width:100%;padding:10px 13px;border:1px solid var(--line);
    border-radius:8px;background:#0b0e14;color:var(--ink);font-size:14px;
    font-family:ui-monospace,monospace;margin-bottom:14px;outline:none;
    transition:border-color .12s}}
  input:focus{{border-color:var(--fent)}}
  button{{width:100%;padding:11px;border:none;border-radius:8px;
    background:var(--fent);color:#fff;font-size:14px;font-weight:600;
    cursor:pointer;transition:opacity .12s}}
  button:hover{{opacity:.88}}
  .err{{color:var(--fent);font-size:12px;margin-top:11px;min-height:18px}}
  footer{{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);
    font-size:11px;color:var(--faint);white-space:nowrap}}
</style>
</head>
<body>
<div class="box">
  <h1>Drug Checking Visualizations</h1>
  <p>Enter the password to access the visualization framework.</p>
  <input type="password" id="pwd" placeholder="Password" autofocus autocomplete="current-password">
  <button onclick="login()">Access</button>
  <div class="err" id="err"></div>
</div>
<footer>33 visualizations &nbsp;·&nbsp; 6,580 samples &nbsp;·&nbsp; 2022–2024</footer>
<script>
function login(){{
  const v=document.getElementById('pwd').value;
  if(v==='{pwd}'){{
    localStorage.setItem('dcf_auth',Date.now());
    const r=new URLSearchParams(location.search).get('r');
    location.href=r||'visualization-framework/viz/01-mirror-match.html';
  }}else{{
    document.getElementById('err').textContent='Incorrect password';
    document.getElementById('pwd').value='';
    document.getElementById('pwd').focus();
  }}
}}
document.getElementById('pwd').addEventListener('keydown',e=>{{if(e.key==='Enter')login();}});
</script>
</body>
</html>"""

out.write_text(html, encoding='utf-8')
print(f"Generated {out} ({'with password' if pwd else 'WARNING: no password set'})")
