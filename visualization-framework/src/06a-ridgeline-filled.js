/* Nº 06a · Batch Ridgeline — Class Fills — per-class filled bands, 50 samples,
   drug-labeled columns with hue-spread variability cues + ideal reference row. */
const {scaffold,chromatogram,classify,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
// @include 06-ridgeline-shared.js

const CLASS_ORDER=['cut','stim','coke','opioid','fent','xyl','benzo','other'];
const CLASS_SAMPLE={fent:'fentanyl',opioid:'heroin',xyl:'xylazine',stim:'methamphetamine',coke:'cocaine',benzo:'bromazolam',cut:'acetaminophen',other:'ketamine'};
function classColor(cls){return subColor(CLASS_SAMPLE[cls]||'ketamine');}

const stage=scaffold({
  tag:'Nº 06a · GC–MS',
  title:'Batch Ridgeline — Class Fills',
  dek:'Full-run TICs split into class-colored fills — pick a key substance to track its column and ideal reference.',
  how:`Each row is one sample's <b>full GC–MS trace</b> (2.5–13 min), decomposed into <b>class-filled bands</b> under a thin total outline. Choose a <b>key substance</b> to trace its variability column. Below the stack, the <b>ideal reference</b> shows the mean curve for that substance. <b>Limits:</b> band height is within-sample relative signal.`,
  provenance:'Rows use real lab cohort chromatograms when exported; otherwise synthesized mixes over real retention times.',
  harm:'Even a "consistent" supply shifts without warning. Test every time; potency can change while the fingerprint looks the same.'
});

stage.innerHTML=`
<div class="controls">
  <button class="tgl" id="m1" aria-pressed="true">Stable fentanyl market</button>
  <button class="tgl" id="m2" aria-pressed="false">Volatile transition period</button>
  ${keySubstanceControlsMarkup('fentanyl')}
</div>
<div class="panel">
  <svg id="svg" width="100%" height="${RIDGE_HEIGHT}" role="img" aria-label="Fifty-sample ridgelines with class fills and key-substance variability column"></svg>
  <div class="legend" id="leg"></div>
</div>`;

let mode='stable';
document.getElementById('m1').onclick=()=>set('stable');
document.getElementById('m2').onclick=()=>set('volatile');
function set(m){mode=m;document.getElementById('m1').setAttribute('aria-pressed',m==='stable');document.getElementById('m2').setAttribute('aria-pressed',m==='volatile');draw();}
const getKeySub=initKeySubstanceControls('fentanyl',draw);

function tracesByClass(peaks,domain){
  const groups={};
  peaks.forEach(p=>{const cls=classify(p.s).cls;if(!groups[cls])groups[cls]=[];groups[cls].push(p);});
  return CLASS_ORDER.filter(c=>groups[c]).map(c=>({cls:c,trace:chromatogram(groups[c],{x0:domain[0],x1:domain[1],sigma:0.05,n:180})}));
}

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=RIDGE_HEIGHT;
  const m=layout(H);
  const keyMeta=getKeySub();
  const rows=batchRows(mode,{classFilter:keyMeta.classFilter});
  const drugs=[keyMeta.substance];
  const domain=fullTicDomain(rows);
  const x=d3.scaleLinear(domain,[m.l,W-m.r]);
  const overlap=RIDGE_OVERLAP;
  const band=sampleBand(H,m);

  x.ticks(10).forEach(t=>{
    svg.append('line').attr('x1',x(t)).attr('x2',x(t)).attr('y1',m.t).attr('y2',m.t+band).attr('stroke',TOKENS.line).attr('opacity',.22);
  });

  rows.forEach((peaks,i)=>{
    const baseY=ySample(i,m,H,rows);
    const y=rowYScale(i,m,H,rows,overlap);
    const layers=tracesByClass(peaks,domain);
    const total=chromatogram(peaks,{x0:domain[0],x1:domain[1],sigma:0.05,n:180});
    layers.forEach(({cls,trace})=>{
      const area=d3.area().x((d,k)=>x(trace.x[k])).y0(baseY).y1(d=>y(d)).curve(d3.curveBasis);
      svg.append('path').datum(trace.y).attr('d',area).attr('fill',classColor(cls)).attr('opacity',.42);
    });
    svg.append('path').datum(total.y)
      .attr('d',d3.line().x((d,k)=>x(total.x[k])).y(d=>y(d)).curve(d3.curveBasis))
      .attr('fill','none').attr('stroke',TOKENS.ink).attr('stroke-width',0.75).attr('opacity',.55);
  });

  drawVariabilityColumns(svg,{rows,drugs,x,m,H,domain,overlap});
  drawReferenceRow(svg,x,drugs,rows,domain[0],domain[1],m);

  drawDrugLabels(svg,drugs,rows,x,H,m);
  drawSampleIndex(svg,m,H,rows);
  document.getElementById('leg').innerHTML=
    `<span><i style="background:${drugHue(keyMeta.substance)}"></i><b>${keyMeta.label}</b> column active</span>`+
    CLASS_ORDER.map(c=>`<span><i style="background:${classColor(c)}"></i>${classify(CLASS_SAMPLE[c]).label}</span>`).join('');
}
window.__vizRedraw=draw;
draw();
addEventListener('resize',draw);
