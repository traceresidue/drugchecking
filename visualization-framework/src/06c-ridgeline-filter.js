/* Nº 06c · Batch Ridgeline — Class Focus — key substance filter, 50 thin sample
   lines, per-drug column with hue-spread variability. */
const {scaffold,chromatogram,classify,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
// @include 06-ridgeline-shared.js

const stage=scaffold({
  tag:'Nº 06c · GC–MS',
  title:'Batch Ridgeline — Key Substance Focus',
  dek:'Full TIC per row with the key substance highlighted — read batch drift on fentanyl, heroin, meth, or cocaine without losing run context.',
  how:`Select a <b>key substance</b> to highlight. Each row shows the <b>full TIC</b> (2.5–13 min) with that drug's peak emphasized; co-eluting peaks stay visible but muted. A <b>variability column</b> tracks the key substance apex across samples. Below, the <b>ideal reference</b> shows the mean curve. <b>Limits:</b> peak height is relative signal within each sample.`,
  provenance:'Rows use real lab cohort chromatograms when exported; otherwise synthesized mixes over real retention times.',
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
<div class="panel"><svg id="svg" width="100%" height="${RIDGE_HEIGHT}" role="img" aria-label="Key-substance ridgelines with full TIC and variability column"></svg></div>`;

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
  const W=svg.node().clientWidth,H=RIDGE_HEIGHT;
  const m=layout(H);
  const keyMeta=getKeySub();
  const sub=keyMeta.substance;
  const rows=batchRows(mode,{classFilter:keyMeta.classFilter});
  const drugs=[sub];
  const domain=fullTicDomain(rows);
  const band=sampleBand(H,m);

  svg.selectAll('*').remove();

  const x=d3.scaleLinear(domain,[m.l,W-m.r]);
  const overlap=RIDGE_OVERLAP;
  const peakFilter=peaks=>filterPeaks(peaks,sub);
  const hue=drugHue(sub);

  svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',W-m.l-m.r).attr('height',band)
    .attr('fill','none').attr('stroke',hue).attr('stroke-width',1).attr('opacity',0.2);

  const plot=svg.append('g').attr('class','plot');
  rows.forEach((peaks,i)=>{
    const fPeaks=filterPeaks(peaks,sub);
    const others=peaks.filter(p=>p.s!==sub);
    const y=rowYScale(i,m,H,rows,overlap);
    const baseY=ySample(i,m,H,rows);
    if(others.length){
      const oTrace=chromatogram(others,{x0:domain[0],x1:domain[1],sigma:0.05,n:180});
      plot.append('path').datum(oTrace.y)
        .attr('d',d3.line().x((d,k)=>x(oTrace.x[k])).y(d=>y(d)).curve(d3.curveBasis))
        .attr('fill','none').attr('stroke',TOKENS.muted).attr('stroke-width',0.55).attr('opacity',0.28);
    }
    if(fPeaks.length){
      const trace=chromatogram(fPeaks,{x0:domain[0],x1:domain[1],sigma:0.05,n:180});
      plot.append('path').datum(trace.y)
        .attr('d',d3.line().x((d,k)=>x(trace.x[k])).y(d=>y(d)).curve(d3.curveBasis))
        .attr('fill','none').attr('stroke',hue).attr('stroke-width',1.05).attr('opacity',0.88);
    }else{
      plot.append('line').attr('x1',x(domain[0])).attr('x2',x(domain[1]))
        .attr('y1',baseY).attr('y2',baseY)
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
