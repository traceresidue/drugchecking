/* Nº 06 · Batch Ridgeline Fingerprints — many samples' chromatograms stacked as
   overlapping ridgelines reveal how consistent (or chaotic) a local supply is.
   Aligned peaks = a stable recipe; scattered ridges = an unpredictable market. */
const {scaffold,chromatogram,classify,tooltip,fmt,TOKENS}=DCF;
const RT=Object.fromEntries(DATA.retention_times.map(d=>[d.substance,d.rt]));

const stage=scaffold({
  tag:'Nº 06 · GC–MS',
  title:'Batch Ridgeline Fingerprints',
  dek:'Stack twenty samples\' chromatograms and the supply\'s personality appears. Where peaks line up vertically, the recipe is stable. Where they scatter, every bag is a gamble.',
  how:`Each <b>row is one seized sample's</b> GC–MS fingerprint, drawn as a filled ridgeline and stacked newest-on-top. Reading <b>down a vertical line</b> shows whether a substance appears at the same retention time across many samples — a <b>consistent supply</b> — or comes and goes. The eye catches an emerging adulterant the moment a new ridge appears in column after column. This is the "small multiples" idea folded into a single dense, scannable panel. <b>Limits:</b> ridge height is within-sample relative signal, not comparable potency between samples.`,
  provenance:'Each row synthesized from a plausible component mix over real retention times; illustrative of batch-consistency analysis.',
  harm:'Even a "consistent" supply shifts without warning. Test every time; potency can change while the fingerprint looks the same.'
});

stage.innerHTML=`
<div class="controls">
  <button class="tgl" id="m1" aria-pressed="true">Stable fentanyl market</button>
  <button class="tgl" id="m2" aria-pressed="false">Volatile transition period</button>
</div>
<div class="panel"><svg id="svg" width="100%" height="640" role="img" aria-label="Stacked ridgeline chromatograms"></svg></div>`;

const tt=tooltip();
const PALETTE={
  stable:{base:['acetaminophen','caffeine','xylazine','4-anpp','fentanyl'],vary:0.18,emerge:null},
  volatile:{base:['acetaminophen','caffeine','4-anpp','fentanyl'],vary:0.5,emerge:'bromazolam'}
};
let mode='stable';
document.getElementById('m1').onclick=()=>set('stable');
document.getElementById('m2').onclick=()=>set('volatile');
function set(m){mode=m;document.getElementById('m1').setAttribute('aria-pressed',m==='stable');document.getElementById('m2').setAttribute('aria-pressed',m==='volatile');draw();}

function rng(seed){let s=seed;return()=>{s=(s*9301+49297)%233280;return s/233280;};}
function sampleRows(){
  const cfg=PALETTE[mode==='stable'?'stable':'volatile'];
  const r=rng(mode==='stable'?7:42);
  const rows=[];
  const extraRT={bromazolam:11.4,lidocaine:7.26,medetomidine:7.9,'p-fluorofentanyl':10.84,heroin:10.12,methamphetamine:4.11};
  for(let i=0;i<22;i++){
    const peaks=[];
    cfg.base.forEach(s=>{ if(r()>0.12){ peaks.push({s,rt:(RT[s]||extraRT[s]||8)+( r()-0.5)*0.1,amp:20+r()*80*(s==='fentanyl'?1:0.7),sigma:0.05}); } });
    if(r()<cfg.vary) peaks.push({s:'lidocaine',rt:7.26,amp:10+r()*40,sigma:0.05});
    // emergent substance grows in later rows of volatile mode
    if(cfg.emerge && i>10 && r()<((i-10)/12)) peaks.push({s:cfg.emerge,rt:extraRT[cfg.emerge],amp:15+r()*55,sigma:0.05});
    rows.push(peaks);
  }
  return rows;
}

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=640,m={t:16,r:16,b:34,l:54};
  const rows=sampleRows();
  const x=d3.scaleLinear([3,13],[m.l,W-m.r]);
  const rowH=(H-m.t-m.b)/rows.length, overlap=2.4;
  x.ticks(10).forEach(t=>{
    svg.append('line').attr('x1',x(t)).attr('x2',x(t)).attr('y1',m.t).attr('y2',H-m.b).attr('stroke',TOKENS.line).attr('opacity',.3);
    svg.append('text').attr('x',x(t)).attr('y',H-14).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',11).attr('font-family','ui-monospace').text(t);
  });
  svg.append('text').attr('x',W/2).attr('y',H-2).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',11).text('retention time (min) — read down a column to track one substance');
  rows.forEach((peaks,i)=>{
    const trace=chromatogram(peaks,{x0:3,x1:13,sigma:0.05,n:160});
    const baseY=m.t+(i+1)*rowH;
    const y=d3.scaleLinear([0,100],[baseY,baseY-rowH*overlap]);
    // dominant class color
    const domc=peaks.length?classify(peaks.sort((a,b)=>b.amp-a.amp)[0].s).color:TOKENS.muted;
    const area=d3.area().x((d,k)=>x(trace.x[k])).y0(baseY).y1(d=>y(d)).curve(d3.curveBasis);
    svg.append('path').datum(trace.y).attr('d',area).attr('fill',TOKENS.bg).attr('stroke','none');
    svg.append('path').datum(trace.y).attr('d',area).attr('fill',domc).attr('opacity',.16);
    svg.append('path').datum(trace.y).attr('d',d3.line().x((d,k)=>x(trace.x[k])).y(d=>y(d)).curve(d3.curveBasis)).attr('fill','none').attr('stroke',domc).attr('stroke-width',1.1).attr('opacity',.95);
    svg.append('text').attr('x',m.l-8).attr('y',baseY-2).attr('text-anchor','end').attr('fill',TOKENS.faint).attr('font-size',9).attr('font-family','ui-monospace').text('#'+(rows.length-i));
  });
  svg.append('text').attr('x',m.l-8).attr('y',m.t+10).attr('text-anchor','end').attr('fill',TOKENS.muted).attr('font-size',10).text('newest');
}
draw();
addEventListener('resize',draw);
