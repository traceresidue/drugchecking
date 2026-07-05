/* Nº 34 · Sample TIC Time Stack — real cohort TICs stacked back in time with
   overlap coloration where similar samples align. */
const {scaffold,chromatogram,classify,TOKENS,isRealChromatogram}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}

const CH=SPEC.chromatograms||{};
const RT=Object.fromEntries((DATA.retention_times||[]).map(d=>[d.substance,d.rt]));
const TIC_X0=2.5;
const TIC_X1=13.0;

const stage=scaffold({
  tag:'Nº 34 · GC–MS',
  title:'Sample TIC Time Stack',
  dek:'Real lab TICs layered back in time — warm overlap bands show where similar samples share peaks. Scrub sample index and depth to walk the cohort.',
  how:`Each curve is a <b>real sample TIC</b> from the lab cohort. The <b>time slider</b> picks the foreground sample; older similar samples stack behind with decreasing opacity and a slight vertical offset (pseudo-depth). The <b>overlap wash</b> warms where multiple traces align — shared peaks across time. <b>Depth</b> controls how many prior samples appear; <b>similarity</b> filters to chemically alike histories. <b>Limits:</b> sample order is cohort ID, not collection date; peak height ≠ potency.`,
  provenance:'40 real sample chromatograms exported from drugchecking.sqlite (UNC viz cohort).',
  harm:'Overlap does not mean identical dose — always test the sample in hand.'
});

stage.innerHTML=`
<style>
  #stack-wrap{position:relative}
  #overlap{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen}
  #stack-svg{position:relative;z-index:1;display:block}
  .ctl-row{display:flex;flex-wrap:wrap;gap:14px 22px;align-items:center;margin-bottom:8px}
  .ctl-row label{font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:4px;min-width:160px}
  .ctl-row input[type=range]{width:100%;accent-color:var(--info)}
  .ctl-row output{font-family:ui-monospace,monospace;font-size:11px;color:var(--ink)}
  #sample-meta{font-size:12px;color:var(--muted);margin:6px 0 10px;line-height:1.45}
  #sample-meta b{color:var(--ink);font-family:ui-monospace,monospace}
</style>
<div class="controls ctl-row">
  <label>Sample (time)
    <input type="range" id="time" min="0" max="0" value="0" step="1">
    <output id="time-out">—</output>
  </label>
  <label>Stack depth
    <input type="range" id="depth" min="3" max="18" value="10" step="1">
    <output id="depth-out">10</output>
  </label>
  <label>Similarity filter
    <input type="range" id="sim" min="0" max="100" value="35" step="5">
    <output id="sim-out">0.35</output>
  </label>
</div>
<div id="sample-meta" aria-live="polite"></div>
<div class="panel" id="stack-wrap">
  <canvas id="overlap" aria-hidden="true"></canvas>
  <svg id="stack-svg" width="100%" height="520" role="img" aria-label="Stacked sample chromatograms with overlap coloration"></svg>
</div>`;

function loadSamples(){
  return Object.entries(CH)
    .filter(([k,v])=>isRealChromatogram(k,v))
    .map(([k,v])=>({
      key:k,
      id:String(v.sample_id||k.replace('sample_','')),
      label:v.label||k,
      peaks:(v.peaks||[]).map(([s,rt,amp])=>({
        s, rt:RT[s]||+rt, amp:+amp, sigma:0.05
      })).filter(p=>p.rt>0&&p.amp>0)
    }))
    .filter(s=>s.peaks.length)
    .sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
}

const SAMPLES=loadSamples();
let timeIdx=Math.max(0,SAMPLES.length-1);
let depth=10;
let simMin=0.35;

const timeEl=document.getElementById('time');
const depthEl=document.getElementById('depth');
const simEl=document.getElementById('sim');

function substanceSet(peaks){
  return new Set(peaks.map(p=>String(p.s).toLowerCase()));
}

function similarity(a,b){
  const setA=substanceSet(a.peaks);
  const setB=substanceSet(b.peaks);
  const inter=[...setA].filter(s=>setB.has(s));
  const union=new Set([...setA,...setB]);
  const jaccard=union.size?inter.length/union.size:0;
  let rtSim=0;
  if(inter.length){
    let err=0;
    inter.forEach(sub=>{
      const pa=a.peaks.find(p=>String(p.s).toLowerCase()===sub);
      const pb=b.peaks.find(p=>String(p.s).toLowerCase()===sub);
      if(pa&&pb) err+=Math.abs(pa.rt-pb.rt);
    });
    rtSim=Math.max(0,1-err/(inter.length*1.2));
  }
  return jaccard*0.62+rtSim*0.38;
}

function stackLayers(idx,depthN,simThreshold){
  const current=SAMPLES[idx];
  const prior=SAMPLES.slice(0,idx).map((s,i)=>({s,i,sim:similarity(s,current)}))
    .filter(x=>x.sim>=simThreshold)
    .sort((a,b)=>b.sim-a.sim)
    .slice(0,depthN);
  const chronological=prior.sort((a,b)=>a.i-b.i).map(x=>x.s);
  return [...chronological,current];
}

function overlapColor(t){
  const clamp=Math.max(0,Math.min(1,t));
  const r=Math.round(40+clamp*200);
  const g=Math.round(60+clamp*90);
  const b=Math.round(120-clamp*80);
  const a=0.08+clamp*0.42;
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

function draw(){
  if(!SAMPLES.length){
    document.getElementById('sample-meta').textContent='No real sample chromatograms in SPEC.chromatograms — run pipeline export_viz_data.py.';
    return;
  }

  timeEl.max=String(SAMPLES.length-1);
  timeEl.value=String(timeIdx);
  depthEl.value=String(depth);
  simEl.value=String(Math.round(simMin*100));

  const layers=stackLayers(timeIdx,depth,simMin);
  const current=SAMPLES[timeIdx];
  document.getElementById('time-out').textContent=`#${current.id} (${timeIdx+1}/${SAMPLES.length})`;
  document.getElementById('depth-out').textContent=String(depth);
  document.getElementById('sim-out').textContent=simMin.toFixed(2);
  document.getElementById('sample-meta').innerHTML=
    `<b>${current.label}</b> · ${current.peaks.length} peaks · stack shows <b>${layers.length}</b> similar prior sample${layers.length===1?'':'s'} + current`;

  const svg=d3.select('#stack-svg');
  svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=520;
  const m={t:28,r:20,b:42,l:58};
  const domain=[TIC_X0,TIC_X1];
  const x=d3.scaleLinear(domain,[m.l,W-m.r]);
  const y=d3.scaleLinear([0,100],[H-m.b,m.t]);
  const nBins=Math.max(180,Math.floor(W-m.l-m.r));

  const traces=layers.map((sample,li)=>{
    const trace=chromatogram(sample.peaks,{x0:domain[0],x1:domain[1],sigma:0.05,n:nBins});
    const depthOffset=(layers.length-1-li)*14;
    const isFront=li===layers.length-1;
    return {sample,trace,depthOffset,isFront,layerIdx:li};
  });

  const overlap=new Float32Array(nBins);
  traces.forEach(({trace})=>{
    trace.y.forEach((v,k)=>{overlap[k]+=v/100;});
  });
  const maxOv=Math.max(...overlap,0.001);

  const canvas=document.getElementById('overlap');
  const dpr=window.devicePixelRatio||1;
  canvas.width=Math.floor(W*dpr);
  canvas.height=Math.floor(H*dpr);
  canvas.style.width=W+'px';
  canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,H);
  for(let k=0;k<nBins;k++){
    const t=overlap[k]/maxOv;
    if(t<0.06) continue;
    const x0=x(domain[0]+(domain[1]-domain[0])*k/(nBins-1));
    const x1=x(domain[0]+(domain[1]-domain[0])*(k+1)/(nBins-1));
    ctx.fillStyle=overlapColor(t);
    ctx.fillRect(x0,m.t,Math.max(1,x1-x0),H-m.t-m.b);
  }

  const plot=svg.append('g');
  x.ticks(10).forEach(t=>{
    plot.append('line').attr('x1',x(t)).attr('x2',x(t)).attr('y1',m.t).attr('y2',H-m.b)
      .attr('stroke',TOKENS.line).attr('opacity',0.25);
    plot.append('text').attr('x',x(t)).attr('y',H-8).attr('text-anchor','middle')
      .attr('fill',TOKENS.faint).attr('font-size',10).attr('font-family','ui-monospace').text(t);
  });

  traces.forEach(layer=>{
    const domPeak=layer.sample.peaks.reduce((a,p)=>p.amp>a.amp?p:layer.sample.peaks[0],layer.sample.peaks[0]);
    const hue=subColor(domPeak?.s||'fentanyl');
    const op=layer.isFront?1:0.14+0.55*(layer.layerIdx/(layers.length-1||1));
    const sw=layer.isFront?2.2:0.85;
    plot.append('path')
      .datum(layer.trace.y)
      .attr('d',d3.line().x((d,k)=>x(layer.trace.x[k])).y(d=>y(d)+layer.depthOffset).curve(d3.curveBasis))
      .attr('fill','none')
      .attr('stroke',layer.isFront?TOKENS.ink:hue)
      .attr('stroke-width',sw)
      .attr('opacity',op);
    if(!layer.isFront){
      plot.append('text')
        .attr('x',m.l+4)
        .attr('y',y(0)+layer.depthOffset-4)
        .attr('fill',TOKENS.faint)
        .attr('font-size',8)
        .attr('font-family','ui-monospace')
        .text('#'+layer.sample.id);
    }
  });

  plot.append('text').attr('x',W/2).attr('y',H-22).attr('text-anchor','middle')
    .attr('fill',TOKENS.muted).attr('font-size',11).text('retention time (min) · warm wash = overlapping signal');
  plot.append('text').attr('x',m.l-6).attr('y',m.t-8).attr('text-anchor','end')
    .attr('fill',TOKENS.muted).attr('font-size',9).text('back → front');
}

timeEl.oninput=()=>{timeIdx=+timeEl.value;draw();};
depthEl.oninput=()=>{depth=+depthEl.value;draw();};
simEl.oninput=()=>{simMin=+simEl.value/100;draw();};

window.__vizRedraw=draw;
draw();
addEventListener('resize',draw);
