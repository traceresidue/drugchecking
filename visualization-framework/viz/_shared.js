/* Drug Checking Visualization Framework — shared helpers
   Loaded by every standalone visualization. Pure ES module, no dependencies.
   Provides: design tokens (CSS injection), substance classification + palette,
   spectral synthesis (Gaussian chromatograms, stick spectra, FTIR curves),
   formatting, tooltip, and a small DOM scaffold builder. */

export const TOKENS = {
  bg:'#0b0e14', panel:'#121826', panel2:'#1a2234', line:'#26304a',
  ink:'#e8ecf4', muted:'#8b94a8', faint:'#5b6478',
  opioid:'#ff8a5c', fent:'#ff5c7a', xyl:'#b388ff', stim:'#ffd166',
  coke:'#4cc9f0', benzo:'#7aa2ff', cut:'#6ee7a8', other:'#94a3b8',
  alert:'#ff5c7a', watch:'#ffd166', ok:'#6ee7a8', info:'#4cc9f0'
};

/* Map a substance name -> {class, color, label, action} */
const CLASS = {
  fent:{color:TOKENS.fent,label:'Fentanyl & analogs'},
  opioid:{color:TOKENS.opioid,label:'Opioid'},
  xyl:{color:TOKENS.xyl,label:'Sedative / xylazine'},
  stim:{color:TOKENS.stim,label:'Stimulant'},
  coke:{color:TOKENS.coke,label:'Cocaine'},
  benzo:{color:TOKENS.benzo,label:'Benzodiazepine'},
  cut:{color:TOKENS.cut,label:'Cut / diluent'},
  other:{color:TOKENS.other,label:'Other'}
};
const RULES = [
  [/fentanyl|anpp|despropionyl|norfentanyl|acetylfentanyl|n-phenylpropanamide|phenethyl/i,'fent'],
  [/nitazene|etonitazene|metonitazene|protonitazene|isotonitazene/i,'fent'],
  [/heroin|morphine|codeine|6-mam|monoacetylmorphine|oxycodone|hydromorphone|tramadol|mitragynine|opioid/i,'opioid'],
  [/xylazine|medetomidine|detomidine|clonidine/i,'xyl'],
  [/bromazolam|flualprazolam|alprazolam|etizolam|diazepam|clonazolam|benzodiazep|flubromazolam|diclazepam/i,'benzo'],
  [/methamphetamine|amphetamine|mdma|cathinone|methylenedioxy|n,n-dimethylamphetamine/i,'stim'],
  [/cocaine|benzoylecgonine|ecgonine/i,'coke'],
  [/caffeine|acetaminophen|paracetamol|lidocaine|levamisole|quinine|mannitol|lactose|sucrose|cellulose|diphenhydramine|sulfone|msm|sugar|inositol|procaine|benzocaine|phenacetin|gabapentin|dimethyl|sebacate|btmps|piperidyl|boric|sorbitol|maltose|glucose|creatine|diacetin|tetramethyl/i,'cut'],
];
export function classify(name=''){
  const n = String(name).toLowerCase();
  for(const [re,c] of RULES) if(re.test(n)) return {cls:c,...CLASS[c]};
  return {cls:'other',...CLASS.other};
}

/* ---- formatting ---- */
export const fmt = {
  mz:v=>`${(+v).toFixed(0)}`,
  rt:v=>`${(+v).toFixed(2)}`,
  pct:v=>`${(+v).toFixed(0)}%`,
  int:v=>(+v).toLocaleString('en-US'),
  month:m=>{const [y,mo]=m.split('-');return new Date(y,mo-1).toLocaleDateString('en-US',{month:'short',year:'2-digit'});}
};

/* ---- spectral synthesis ---- */
// Sum-of-Gaussians chromatogram trace. peaks:[{rt,amp}], returns {x:[],y:[]}
export function chromatogram(peaks,{x0=2,x1=13,n=900,sigma=0.045}={}){
  const x=[],y=[];
  for(let i=0;i<n;i++){
    const t=x0+(x1-x0)*i/(n-1); x.push(t);
    let v=0; for(const p of peaks){const d=(t-p.rt)/(p.sigma||sigma); v+=p.amp*Math.exp(-0.5*d*d);}
    y.push(v);
  }
  const mx=Math.max(...y,1e-9);
  return {x,y:y.map(v=>v/mx*100)};
}
// FTIR absorbance curve from bands [[center,intensity,width],...]; reversed x handled by caller
export function ftirCurve(bands,{x0=4000,x1=400,n=1100}={}){
  const x=[],y=[];
  for(let i=0;i<n;i++){
    const w=x0+(x1-x0)*i/(n-1); x.push(w);
    let v=0; for(const [c,I,wd] of bands){const d=(w-c)/(wd||20); v+=I*Math.exp(-0.5*d*d);}
    y.push(v);
  }
  return {x,y}; // y in absorbance-ish 0..~1
}
// Mass spectrum sticks: returns sorted peaks with base-peak normalization
export function stickSpectrum(peaks){
  const mx=Math.max(...peaks.map(p=>p[1]),1);
  return peaks.map(([mz,i])=>({mz,i:i/mx*100})).sort((a,b)=>a.mz-b.mz);
}
// cosine similarity between two stick spectra (binned at 1 m/z)
export function cosine(a,b,tol=0.5){
  let dot=0,na=0,nb=0; const used=new Set();
  for(const pa of a){na+=pa.i*pa.i;}
  for(const pb of b){nb+=pb.i*pb.i;}
  for(const pa of a){let best=null,bd=tol; for(let k=0;k<b.length;k++){if(used.has(k))continue;const d=Math.abs(pa.mz-b[k].mz); if(d<=bd){bd=d;best=k;}} if(best!=null){dot+=pa.i*b[best].i;used.add(best);}}
  return dot/(Math.sqrt(na)*Math.sqrt(nb)||1);
}

/* ---- tooltip ---- */
let _tt;
export function tooltip(){
  if(_tt) return _tt;
  _tt=document.createElement('div');
  _tt.style.cssText=`position:fixed;pointer-events:none;z-index:99;background:${TOKENS.panel2};border:1px solid ${TOKENS.line};border-radius:8px;padding:8px 10px;font:12px/1.4 Inter,system-ui;color:${TOKENS.ink};box-shadow:0 6px 24px rgba(0,0,0,.5);opacity:0;transition:opacity .12s;max-width:260px`;
  document.body.appendChild(_tt);
  return {
    show(html,x,y){_tt.innerHTML=html;_tt.style.opacity=1;const r=_tt.getBoundingClientRect();let nx=x+14,ny=y+14;if(nx+r.width>innerWidth)nx=x-r.width-14;if(ny+r.height>innerHeight)ny=y-r.height-14;_tt.style.left=nx+'px';_tt.style.top=ny+'px';},
    hide(){_tt.style.opacity=0;}
  };
}

/* ---- page scaffold + global CSS ---- */
export function scaffold({tag,title,dek,how,provenance,harm}={}){
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
  return document.getElementById('stage');
}
export function injectCSS(){
  if(document.getElementById('dcf-css')) return;
  const s=document.createElement('style'); s.id='dcf-css';
  s.textContent=`
  :root{--bg:${TOKENS.bg};--panel:${TOKENS.panel};--panel2:${TOKENS.panel2};--line:${TOKENS.line};--ink:${TOKENS.ink};--muted:${TOKENS.muted};--faint:${TOKENS.faint}}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
  body{max-width:1180px;margin:0 auto;padding:28px 22px 64px}
  .mono{font-family:ui-monospace,"SF Mono","Cascadia Mono",monospace}
  .muted{color:var(--muted)} .faint{color:var(--faint)}
  .dcf-h{margin-bottom:18px;border-bottom:1px solid var(--line);padding-bottom:16px}
  .dcf-tag{font:600 11px/1 ui-monospace,monospace;letter-spacing:.14em;color:var(--muted);text-transform:uppercase;margin-bottom:10px}
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
  button.tgl{background:var(--panel);color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:7px 13px;font:500 13px Inter;cursor:pointer;transition:.15s}
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
   Uses the dark theme tuned to the framework background. No-ops gracefully if absent. */
export function drawSmiles(smiles,canvasId,w=160,h=120){
  const el=document.getElementById(canvasId);
  if(!el||typeof SmilesDrawer==='undefined'||!smiles){ if(el){const c=el.getContext&&el.getContext('2d');if(c){c.fillStyle='#5b6478';c.font='11px Inter';c.fillText('structure n/a',8,h/2);}} return; }
  try{
    const drawer=new SmilesDrawer.Drawer({width:w,height:h,padding:14,bondThickness:1.1,
      themes:{dcf:{C:'#cfd6e4',N:'#7aa2ff',O:'#ff8a5c',F:'#6ee7a8',S:'#ffd166',Cl:'#6ee7a8',Br:'#ff8a5c',
        BACKGROUND:'#0e1320',bond:'#9aa6bd',default:'#cfd6e4'}}});
    SmilesDrawer.parse(smiles,t=>drawer.draw(t,canvasId,'dcf',false),()=>{});
  }catch(e){}
}

/* fetch the shared datasets (relative to viz/ files) */
export async function loadData(){
  const [agg,spec]=await Promise.all([
    fetch('../data/aggregates.json').then(r=>r.json()),
    fetch('../data/spectra.json').then(r=>r.json())
  ]);
  return {agg,spec};
}
