/* Nº 31 · Substance Point Cloud — select a substance from a dropdown and see
   a jittered cloud of points, one per sample (capped at 300). Every point is the
   same size and color (the substance's class color). The scale of the cloud
   communicates testing volume without becoming unreadable. */
const {scaffold,classify,fmt,tooltip,TOKENS}=DCF;
const SUB=DATA.top_substances;
const DISPLAY_MAX=300; // never render more than this many points

const stage=scaffold({
  tag:'Nº 31 · SUPPLY · POINT CLOUD',
  title:'Substance Point Cloud',
  dek:'Select a substance and see one dot for every sample it was found in — up to 300. All points are equal: no size hierarchy, no axes. Just the count, made physical.',
  how:`A <b>Point Cloud</b> renders each sample as a small circle, jittered slightly so the cloud looks organic rather than gridded. <b>Size</b> and <b>spacing</b> are uniform — the data is in the <i>count</i> and <i>color</i>, not in position. The cap at <b>${DISPLAY_MAX} displayed points</b> is intentional: above that, individual points merge into texture. A counter shows the true sample total so you never mistake the cloud for the full count. Hover for totals. This format is most powerful for <b>filtered subsets</b> — selecting a substance filters the full 6,580-sample dataset to those containing that substance.`,
  provenance:'Total sample counts from 6,580-sample drug checking dataset. Displayed points are a random sample (max 300); true totals shown in counter.',
  harm:'A sparse cloud doesn\'t mean a substance is harmless — sample counts reflect where testing happened, not true prevalence.'
});

stage.innerHTML=`
<div class="controls" style="align-items:center;gap:12px">
  <label class="muted" style="font-size:13px">Substance:</label>
  <select id="subSel" style="background:#1a2234;color:#e8ecf4;border:1px solid #26304a;border-radius:8px;padding:7px 10px;font-size:13px;flex:1;max-width:320px"></select>
  <div id="countBadge" style="font-size:13px;font-family:ui-monospace;color:${TOKENS.muted}"></div>
</div>
<div class="panel" style="margin-top:14px">
  <canvas id="cloud" style="width:100%;display:block;border-radius:8px"></canvas>
</div>
<div id="cloudInfo" style="margin-top:10px;font-size:12px;color:${TOKENS.muted};line-height:1.6"></div>`;

const subSel=document.getElementById('subSel');
// Sort substances by count, add all to selector
[...SUB].sort((a,b)=>b.samples-a.samples).forEach(d=>{
  subSel.add(new Option(`${d.substance} (${fmt.int(d.samples)} samples)`,d.substance));
});
subSel.value='fentanyl';

let animReq=null;
function rng(seed){let s=seed%2147483647;return()=>{s=s*16807%2147483647;return(s-1)/2147483646;};}

function drawCloud(){
  if(animReq){cancelAnimationFrame(animReq);animReq=null;}
  const sub=subSel.value;
  const entry=SUB.find(d=>d.substance===sub);
  if(!entry) return;
  const c=classify(sub);
  const total=entry.samples;
  const displayed=Math.min(total,DISPLAY_MAX);

  const canvas=document.getElementById('cloud');
  const W=canvas.offsetWidth||800;
  const H=Math.max(300,Math.min(520,Math.ceil(displayed/3.2)));
  canvas.width=W*window.devicePixelRatio||W;
  canvas.height=H*window.devicePixelRatio||H;
  canvas.style.height=H+'px';
  const ctx2=canvas.getContext('2d');
  ctx2.scale(window.devicePixelRatio||1,window.devicePixelRatio||1);

  // Update counter
  document.getElementById('countBadge').innerHTML=`<span style="color:${c.color};font-weight:700">${fmt.int(displayed)}</span> <span class="muted">/ ${fmt.int(total)} samples displayed</span>`;
  document.getElementById('cloudInfo').innerHTML=`<b style="text-transform:capitalize;color:${c.color}">${sub}</b> · ${c.label} · detected in ${fmt.pct(total/6580*100)} of all tested samples · ${total>DISPLAY_MAX?`showing ${DISPLAY_MAX} of ${fmt.int(total)}`:`all ${fmt.int(total)}`} · <span class="mono" style="color:${TOKENS.faint}">${entry.primary} primary, ${entry.trace} trace</span>`;

  // Generate point positions with natural jitter using seeded random
  const rand=rng(total);
  const R=4.5, pad=18;
  const cols=Math.floor((W-pad*2)/(R*2+3));
  const rows2=Math.ceil(displayed/cols);
  const usedH=rows2*(R*2+3)+pad*2;
  const startX=pad+R;
  const startY=(H-usedH)/2+pad+R;

  // Draw background
  ctx2.fillStyle='#121826';
  ctx2.fillRect(0,0,W,H);

  // Draw points with slight jitter
  for(let i=0;i<displayed;i++){
    const col=Math.floor(i%cols);
    const row=Math.floor(i/cols);
    const bx=startX+col*(R*2+3)+(rand()-.5)*2.2;
    const by=startY+row*(R*2+3)+(rand()-.5)*2.2;
    const alpha=0.7+rand()*0.3;
    // Primary vs trace
    const isPrimary=i<entry.primary;
    ctx2.beginPath();
    ctx2.arc(bx,by,isPrimary?R:R*0.7,0,Math.PI*2);
    ctx2.fillStyle=c.color;
    ctx2.globalAlpha=alpha*(isPrimary?0.85:0.5);
    ctx2.fill();
    if(isPrimary){ctx2.strokeStyle='rgba(255,255,255,0.25)';ctx2.lineWidth=0.8;ctx2.stroke();}
    ctx2.globalAlpha=1;
  }

  // Label at top
  ctx2.fillStyle=c.color;
  ctx2.font=`700 14px ui-monospace`;
  ctx2.globalAlpha=0.55;
  ctx2.fillText(sub.toUpperCase(),pad,20);
  ctx2.globalAlpha=1;
}

subSel.onchange=drawCloud;
drawCloud();
addEventListener('resize',()=>{clearTimeout(window._rcl);window._rcl=setTimeout(drawCloud,80);});
