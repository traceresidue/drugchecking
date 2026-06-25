/* Nº 32 · Monthly Point Cloud — select a month and see the top detected substances
   rendered as side-by-side point clouds. One dot per sample (capped per substance).
   This is the temporal slice of the Point Cloud concept: compare substance volumes
   across a single month at a glance, without axes or bar-chart abstraction. */
const {scaffold,classify,fmt,TOKENS}=DCF;
const MN=DATA.monthly, MC=DATA.monthly_class;
const DISPLAY_MAX=120; // per substance, to keep columns readable

const months=[...new Set(MN.map(d=>d.month))].sort();

const stage=scaffold({
  tag:'Nº 32 · SUPPLY · POINT CLOUD',
  title:'Monthly Substance Point Clouds',
  dek:'Select a month and see every substance as its own cloud of dots — one dot per detected sample (up to 120). Width = nothing. Density = everything.',
  how:`Each <b>column</b> is one of the top substances detected in the chosen month. Each <b>dot</b> represents one sample containing that substance. Dots are the same size and color — the data is in the <b>count</b>, made tangible as mass rather than bar length. Capped at <b>${DISPLAY_MAX} dots</b> per substance; the true count is shown beneath each cloud. Navigate months with the <b>slider</b>. This format reveals relative prevalence without the visual compression of bar charts — a large fentanyl cloud next to a small xylazine cloud feels different than two adjacent bars.`,
  provenance:'Monthly substance detection counts from 6,580-sample dataset, 2022–2024.',
  harm:'A small cloud doesn\'t mean a substance is absent — it may reflect low testing volume rather than low prevalence in the supply.'
});

stage.innerHTML=`
<div class="controls" style="align-items:center;gap:14px">
  <span class="muted" style="font-size:12px;white-space:nowrap">Month:</span>
  <input type="range" id="mslider" min="0" max="${months.length-1}" value="${months.length-1}" style="flex:1;accent-color:${TOKENS.fent}">
  <span class="mono" id="mLabel" style="font-size:15px;font-weight:700;min-width:7ch;text-align:right"></span>
</div>
<div id="cloudGrid" style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start"></div>`;

let animReq=null;
function rng(seed){let s=(seed%2147483647+2147483647)%2147483647||1;return()=>{s=s*16807%2147483647;return(s-1)/2147483646;};}

function buildCloud(entry,containerW){
  const c=classify(entry.substance);
  const total=entry.n;
  const displayed=Math.min(total,DISPLAY_MAX);

  const wrap=document.createElement('div');
  wrap.style.cssText=`display:flex;flex-direction:column;align-items:center;min-width:100px;flex:0 0 auto`;

  const canvas=document.createElement('canvas');
  const R=4, pad=10;
  const cols=Math.floor((containerW-pad*2)/(R*2+3));
  const rows=Math.ceil(displayed/cols);
  const W=containerW;
  const H=rows*(R*2+3)+pad*2;
  canvas.width=W*(window.devicePixelRatio||1);
  canvas.height=H*(window.devicePixelRatio||1);
  canvas.style.cssText=`width:${W}px;height:${H}px;display:block;border-radius:8px`;

  const ctx=canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio||1,window.devicePixelRatio||1);
  ctx.fillStyle='#121826';
  ctx.fillRect(0,0,W,H);

  const rand=rng(total+entry.substance.charCodeAt(0));
  const startX=pad+R;
  const startY=pad+R;

  for(let i=0;i<displayed;i++){
    const col=i%cols;
    const row=Math.floor(i/cols);
    const bx=startX+col*(R*2+3)+(rand()-.5)*1.8;
    const by=startY+row*(R*2+3)+(rand()-.5)*1.8;
    ctx.beginPath();
    ctx.arc(bx,by,R,0,Math.PI*2);
    ctx.fillStyle=c.color;
    ctx.globalAlpha=0.65+rand()*0.3;
    ctx.fill();
    ctx.globalAlpha=1;
  }

  const label=document.createElement('div');
  label.style.cssText=`font-size:11px;font-weight:700;color:${c.color};text-align:center;margin-top:6px;text-transform:capitalize;max-width:${W}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`;
  label.textContent=entry.substance;

  const count=document.createElement('div');
  count.style.cssText=`font-size:10px;font-family:ui-monospace;color:${TOKENS.muted};text-align:center;margin-top:2px`;
  count.innerHTML=`<span style="color:${c.color}">${fmt.int(displayed)}</span>` + (total>DISPLAY_MAX?` / ${fmt.int(total)}`:'');

  wrap.appendChild(canvas);
  wrap.appendChild(label);
  wrap.appendChild(count);
  return wrap;
}

function update(){
  const idx=+document.getElementById('mslider').value;
  const month=months[idx];
  document.getElementById('mLabel').textContent=fmt.month(month);

  const grid=document.getElementById('cloudGrid');
  grid.innerHTML='';

  const subs=MN.filter(d=>d.month===month).sort((a,b)=>b.n-a.n).slice(0,8);
  if(!subs.length){grid.innerHTML=`<span class="muted">No data for this month.</span>`;return;}

  // Dynamic column width based on grid width and number of substances
  const gridW=grid.offsetWidth||800;
  const nCols=Math.min(subs.length,4);
  const colW=Math.floor((gridW-(nCols-1)*12)/nCols)-4;
  const subColW=Math.max(80,Math.min(colW,140));

  subs.forEach(entry=>{
    grid.appendChild(buildCloud(entry,subColW));
  });

  // Month summary banner
  const total=MC.filter(d=>d.month===month).reduce((a,b)=>a+b.n,0);
  const topSub=subs[0]?.substance||'';
  const topC=classify(topSub);
  const banner=document.createElement('div');
  banner.style.cssText=`width:100%;font-size:11px;color:${TOKENS.muted};margin-top:12px;line-height:1.6`;
  banner.innerHTML=`<b style="color:${TOKENS.ink}">${fmt.month(month)}</b> · ${fmt.int(total)} total detections · most common: <b style="color:${topC.color};text-transform:capitalize">${topSub}</b>`;
  grid.appendChild(banner);
}

document.getElementById('mslider').oninput=update;
update();
addEventListener('resize',()=>{clearTimeout(window._mcloud);window._mcloud=setTimeout(update,80);});
