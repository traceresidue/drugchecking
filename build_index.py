#!/usr/bin/env python3
"""Generate index.html with password gate from MAIN_PASSWORD environment variable.

Run locally:
  MAIN_PASSWORD=yourpassword python3 build_index.py
  # or with .env:
  set -a && source .env && set +a && python3 build_index.py

On Vercel this runs automatically with the MAIN_PASSWORD env var set in the dashboard.
The generated index.html is gitignored and never committed.
"""
import os, pathlib

ROOT = pathlib.Path(__file__).parent
pwd = os.environ.get('MAIN_PASSWORD', '')

if not pwd:
    print("WARNING: MAIN_PASSWORD not set — login will reject all passwords")

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

out = ROOT / 'index.html'
out.write_text(html)
print(f"Generated {out} ({'with password' if pwd else 'WARNING: no password set'})")
