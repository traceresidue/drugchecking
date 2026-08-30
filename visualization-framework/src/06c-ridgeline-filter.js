/* Nº 06c · Batch Ridgeline — Class Focus — key substance filter, 50 thin sample
   lines, per-drug column with hue-spread variability. */
const {scaffold,chromatogram,classify,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
// @include 06-ridgeline-shared.js

const stage=scaffold({
  tag:'Nº 06c · GC–MS',
  title:'Batch Ridgeline — Key Substance Focus',
  dek:'Pick fentanyl, heroin, meth, or cocaine — fifty sample traces zoom to that substance so batch drift reads without unrelated peak clutter.',
  how:`Select a <b>key substance</b> to filter and zoom. The view shows <b>50 newest samples</b> as thin traces in that substance's retention window, plus a single <b>variability column</b> for the chosen drug. The <b>snaking line</b> passes through that substance's peak apex on every sample row. Dots on the mean-RT vertical mark the ideal landing point. Below the stack, the <b>ideal reference</b> shows the mean curve for that substance. <b>Limits:</b> other substances in the same sample may be hidden outside the zoom window.`,
  provenance:'Each row synthesized from a plausible component mix over real retention times; illustrative of batch-consistency analysis.',
  harm:'Even a "consistent" supply shifts without warning. Test every time; potency can change while the fingerprint looks the same.'
});

stage.innerHTML=`
<style>
  #stats{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-bottom:10px}
  #stats b{color:var(--ink);font-family:ui-monospace,monospace;font-weight:600}
  #stats .tag{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;vertical-align:-1px}
</style>
<div class="controls">
  ${keySubstanceControlsMarkup('fentanyl')}
  <span style="width:1px;height:24px;background:var(--line);margin:0 4px"></span>
  <button class="tgl" id="m1" aria-pressed="true">Stable market</button>
  <button class="tgl" id="m2" aria-pressed="false">Volatile period</button>
</div>
<div id="stats" aria-live="polite"></div>
<div class="panel"><svg id="svg" width="100%" height="760" role="img" aria-label="Key-substance fifty-sample ridgelines with variability column"></svg></div>`;

let mode='stable';
document.getElementById('m1').onclick=()=>setMode('stable');
document.getElementById('m2').onclick=()=>setMode('volatile');
const getKeySub=initKeySubstanceControls('fentanyl',()=>draw(false));

function setMode(m){
  mode=m;
  document.getElementById('m1').setAttribute('aria-pressed',m==='stable');
  document.getElementById('m2').setAttribute('aria-pressed',m==='volatile');
  draw(false);
}

function filterPeaks(peaks,substance){
  return peaks.filter(p=>p.s===substance);
}

function updateStats(rows,keyMeta,domain){
  const sub=keyMeta.substance;
  const present=rows.filter(peaks=>peaks.some(p=>p.s===sub)).length;
  const st=computeDrugStats(rows,sub);
  document.getElementById('stats').innerHTML=`
    <span><i class="tag" style="background:${drugHue(sub)}"></i><b>${keyMeta.label}</b> · key substance</span>
    <span>Present in <b>${present}</b> / ${rows.length} samples</span>
    <span>Mean RT <b>${st.meanRt.toFixed(2)}</b> <span class="muted">min</span></span>
    <span>RT spread <b>${(st.stdRt*2).toFixed(2)}</b> <span class="muted">min</span></span>
    <span>Window <b>${domain[0].toFixed(1)}–${domain[1].toFixed(1)}</b> <span class="muted">min</span></span>`;
}

function draw(animate){
  const svg=d3.select('#svg');
  const W=svg.node().clientWidth,H=760;
  const m=layout(H);
  const keyMeta=getKeySub();
  const sub=keyMeta.substance;
  const rows=sampleRows(mode,{classFilter:keyMeta.classFilter});
  const drugs=[sub];
  const domain=domainForSubstance(rows,sub);
  const band=sampleBand(H,m);

  svg.selectAll('*').remove();

  const x=d3.scaleLinear(domain,[m.l,W-m.r]);
  const overlap=2.1;
  const peakFilter=peaks=>filterPeaks(peaks,sub);

  svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',W-m.l-m.r).attr('height',band)
    .attr('fill','none').attr('stroke',drugHue(sub)).attr('stroke-width',1).attr('opacity',0.25);

  const plot=svg.append('g').attr('class','plot');
  rows.forEach((peaks,i)=>{
    const fPeaks=filterPeaks(peaks,sub);
    const y=rowYScale(i,m,H,rows,overlap);
    const trace=fPeaks.length?chromatogram(fPeaks,{x0:domain[0],x1:domain[1],sigma:0.05,n:140}):{x:[],y:[]};
    if(trace.y.length){
      plot.append('path').datum(trace.y)
        .attr('d',d3.line().x((d,k)=>x(trace.x[k])).y(d=>y(d)).curve(d3.curveBasis))
        .attr('fill','none').attr('stroke',drugHue(sub)).attr('stroke-width',0.65).attr('opacity',0.42);
    }else{
      plot.append('line').attr('x1',x(domain[0])).attr('x2',x(domain[1]))
        .attr('y1',ySample(i,m,H,rows)).attr('y2',ySample(i,m,H,rows))
        .attr('stroke',TOKENS.faint).attr('stroke-width',0.4).attr('opacity',0.35);
    }
  });

  drawVariabilityColumns(svg,{rows,drugs,x,m,H,domain,overlap,peakFilter});
  drawReferenceRow(svg,x,drugs,rows,domain[0],domain[1],m);

  drawDrugLabels(svg,drugs,rows,x,H,m);
  drawSampleIndex(svg,m,H,rows);
  updateStats(rows,keyMeta,domain);
}

draw(false);
window.__vizRedraw=()=>draw(false);
addEventListener('resize',()=>draw(false));
