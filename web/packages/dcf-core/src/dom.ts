import { TOKENS, FONTS } from './tokens.js';

/* ---- tooltip ---- */
export interface Tooltip {
  show(html: string, x: number, y: number): void;
  hide(): void;
}
let _tt: HTMLDivElement | undefined;
export function tooltip(): Tooltip {
  if(_tt) return _api!;
  _tt=document.createElement('div');
  _tt.style.cssText=`position:fixed;pointer-events:none;z-index:99;background:${TOKENS.panel2};border:1px solid ${TOKENS.line};border-radius:8px;padding:8px 10px;font:12px/1.4 ${FONTS.sans};color:${TOKENS.ink};box-shadow:0 6px 24px rgba(0,0,0,.5);opacity:0;transition:opacity .12s;max-width:260px`;
  document.body.appendChild(_tt);
  _api={
    show(html,x,y){_tt!.innerHTML=html;_tt!.style.opacity='1';const r=_tt!.getBoundingClientRect();let nx=x+14,ny=y+14;if(nx+r.width>innerWidth)nx=x-r.width-14;if(ny+r.height>innerHeight)ny=y-r.height-14;_tt!.style.left=nx+'px';_tt!.style.top=ny+'px';},
    hide(){_tt!.style.opacity='0';}
  };
  return _api;
}
let _api: Tooltip | undefined;

/* ---- page scaffold + global CSS ---- */
export interface ScaffoldOpts {
  tag?: string; title?: string; dek?: string; how?: string;
  provenance?: string; harm?: string; pageId?: string;
}
export function scaffold({tag,title,dek,how,provenance,harm,pageId}: ScaffoldOpts={}): HTMLElement {
  injectCSS();
  document.body.innerHTML=`
    <header class="dcf-h">
      <div class="dcf-tag">${tag||''}</div>
      <h1>${title||''}</h1>
      <p class="dek">${dek||''}</p>
    </header>
    <main id="stage"></main>
    <details class="dcf-how"><summary>How to read this</summary><div>${how||''}</div></details>
    <footer class="dcf-f">
      <p class="prov">${provenance||''}</p>
      ${harm?`<p class="harm">${harm}</p>`:''}
    </footer>`;
  const pid = pageId || (typeof NAV_PAGE_ID !== 'undefined' ? NAV_PAGE_ID : '');
  const mode = typeof NAV_MODE !== 'undefined' ? NAV_MODE : 'viz';
  if (pid && window.DCF_NAV) window.DCF_NAV.injectNav({ pageId: pid, mode });
  return document.getElementById('stage')!;
}

function injectFontLink(){
  if(document.getElementById('dcf-fonts')) return;
  const link=document.createElement('link');
  link.id='dcf-fonts';
  link.rel='stylesheet';
  link.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}

export function injectCSS(){
  if(document.getElementById('dcf-css')) return;
  injectFontLink();
  const s=document.createElement('style'); s.id='dcf-css';
  s.textContent=`
  :root{
    --bg:${TOKENS.bg};--panel:${TOKENS.panel};--panel2:${TOKENS.panel2};--line:${TOKENS.line};
    --ink:${TOKENS.ink};--muted:${TOKENS.muted};--faint:${TOKENS.faint};
    --font-sans:${FONTS.sans};--font-mono:${FONTS.mono}
  }
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-sans);-webkit-font-smoothing:antialiased;font-feature-settings:"kern","liga","calt"}
  body{max-width:1180px;margin:0 auto;padding:28px 22px 64px}
  .mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
  .muted{color:var(--muted)} .faint{color:var(--faint)}
  .dcf-h{margin-bottom:18px;border-bottom:1px solid var(--line);padding-bottom:16px}
  .dcf-tag{font:600 11px/1 var(--font-mono);letter-spacing:.14em;color:var(--muted);text-transform:uppercase;margin-bottom:10px}
  .dcf-h h1{font-size:27px;line-height:1.15;margin:0 0 8px;font-weight:700;letter-spacing:-.01em}
  .dek{font-size:15px;line-height:1.5;color:var(--muted);margin:0;max-width:74ch}
  #stage{margin:18px 0}
  .panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px}
  .dcf-how{margin:22px 0 8px;border:1px solid var(--line);border-radius:10px;background:var(--panel);overflow:hidden}
  .dcf-how summary{cursor:pointer;padding:12px 16px;font-weight:600;font-size:13px;color:var(--ink);list-style:none}
  .dcf-how summary::before{content:"ⓘ ";color:var(--muted)}
  .dcf-how[open] summary{border-bottom:1px solid var(--line)}
  .dcf-how>div{padding:14px 16px;font-size:13.5px;line-height:1.6;color:var(--muted)}
  .dcf-how b{color:var(--ink)}
  .dcf-f{margin-top:26px;padding-top:14px;border-top:1px solid var(--line);font-size:12px;line-height:1.5}
  .dcf-f .prov{color:var(--faint);margin:0 0 6px}
  .dcf-f .harm{color:var(--muted);margin:0;padding-left:11px;border-left:3px solid ${TOKENS.ok}}
  button.tgl{background:var(--panel);color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:7px 13px;font:500 13px var(--font-sans);cursor:pointer;transition:.15s}
  .dcf-ctl-select{background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:7px 10px;font:500 13px var(--font-sans);min-height:40px}
  svg text{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
  button.tgl:hover{background:var(--panel2);color:var(--ink)}
  button.tgl[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
  .controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
  input[type=range]{accent-color:${TOKENS.info}}
  .legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:10px}
  .legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}
  @media (prefers-reduced-motion:reduce){*{animation-duration:.001ms!important;transition-duration:.001ms!important}}
  `;
  document.head.appendChild(s);
}

/* draw a 2D structure from SMILES into a <canvas id=...>; needs SmilesDrawer loaded.
   Uses the canvas DrawerBase path (SmilesDrawer.Drawer SVG→canvas is broken in the vendored build). */
let _smilesCanvasDrawer: any=null;
function smilesCanvasDrawer(w: number,h: number){
  if(_smilesCanvasDrawer) return _smilesCanvasDrawer;
  _smilesCanvasDrawer=new SmilesDrawer.SvgDrawer({
    width:w,height:h,padding:14,bondThickness:1.1,
    themes:{
      dcf:{
        C:'#cfd6e4',N:'#7aa2ff',O:'#ff8a5c',F:'#6ee7a8',S:'#ffd166',
        CL:'#6ee7a8',BR:'#ff8a5c',I:'#b388ff',P:'#d35400',B:'#e67e22',SI:'#e67e22',
        H:'#8b94a8',BACKGROUND:'#0e1320',
      },
    },
  }).preprocessor;
  return _smilesCanvasDrawer;
}
function smilesStructureNA(el: HTMLCanvasElement,h: number){
  const c=el.getContext&&el.getContext('2d');
  if(c){c.fillStyle='#5b6478';c.font='11px '+FONTS.sans;c.fillText('structure n/a',8,h/2);}
}
export function drawSmiles(smiles: string,canvasId: string,w=160,h=120){
  const el=document.getElementById(canvasId) as HTMLCanvasElement | null;
  if(!el||typeof SmilesDrawer==='undefined'||!smiles){ if(el) smilesStructureNA(el,h); return; }
  try{
    const drawer=smilesCanvasDrawer(w,h);
    SmilesDrawer.parse(smiles,(t: unknown)=>{
      try{ drawer.draw(t,el,'dcf',false); }
      catch(_){ try{ drawer.draw(t,el,'dark',false); } catch(__){ smilesStructureNA(el,h); } }
    },()=>{ smilesStructureNA(el,h); });
  }catch(e){ smilesStructureNA(el,h); }
}
