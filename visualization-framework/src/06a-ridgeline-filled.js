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
  dek:'Fifty samples split into class-colored fills — pick a key substance to track its column and ideal reference without cross-talk from unrelated peaks.',
  how:`Each row is one of <b>50 newest samples</b>, decomposed into <b>class-filled bands</b> under a thin total outline. Choose a <b>key substance</b> (fentanyl, heroin, meth, cocaine) to zoom the view and trace only that drug's variability column. Below the stack, the <b>ideal reference</b> shows the mean curve for that substance. <b>Limits:</b> band height is within-sample relative signal.`,
  provenance:'Each row synthesized from a plausible component mix over real retention times; illustrative of batch-consistency analysis.',
  harm:'Even a "consistent" supply shifts without warning. Test every time; potency can change while the fingerprint looks the same.'
});

stage.innerHTML=`
<div class="controls">
  <button class="tgl" id="m1" aria-pressed="true">Stable fentanyl market</button>
  <button class="tgl" id="m2" aria-pressed="false">Volatile transition period</button>
  ${keySubstanceControlsMarkup('fentanyl')}
</div>
<div class="panel">
  <svg id="svg" width="100%" height="760" role="img" aria-label="Fifty-sample ridgelines with class fills and key-substance variability column"></svg>
  <div class="legend" id="leg"></div>
</div>`;

let mode='stable';
document.getElementById('m1').onclick=()=>set('stable');
document.getElementById('m2').onclick=()=>set('volatile');
function set(m){mode=m;document.getElementById('m1').setAttribute('aria-pressed',m==='stable');document.getElementById('m2').setAttribute('aria-pressed',m==='volatile');draw();}
const getKeySub=initKeySubstanceControls('fentanyl',draw);

function tracesByClass(peaks){
  const groups={};
  peaks.forEach(p=>{const cls=classify(p.s).cls;if(!groups[cls])groups[cls]=[];groups[cls].push(p);});
  return CLASS_ORDER.filter(c=>groups[c]).map(c=>({cls:c,trace:chromatogram(groups[c],{x0:3,x1:13,sigma:0.05,n:140})}));
}

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=760;
  const m=layout(H);
  const keyMeta=getKeySub();
  const rows=sampleRows(mode,{classFilter:keyMeta.classFilter});
  const drugs=[keyMeta.substance];
  const domain=domainForSubstance(rows,keyMeta.substance);
  const x=d3.scaleLinear(domain,[m.l,W-m.r]);
  const overlap=1.55;
  const band=sampleBand(H,m);

  x.ticks(8).forEach(t=>{
    svg.append('line').attr('x1',x(t)).attr('x2',x(t)).attr('y1',m.t).attr('y2',m.t+band).attr('stroke',TOKENS.line).attr('opacity',.22);
  });

  rows.forEach((peaks,i)=>{
    const baseY=ySample(i,m,H,rows);
    const y=rowYScale(i,m,H,rows,overlap);
    const layers=tracesByClass(peaks);
    const total=chromatogram(peaks,{x0:domain[0],x1:domain[1],sigma:0.05,n:140});
    layers.forEach(({cls,trace})=>{
      const area=d3.area().x((d,k)=>x(trace.x[k])).y0(baseY).y1(d=>y(d)).curve(d3.curveBasis);
      svg.append('path').datum(trace.y).attr('d',area).attr('fill',classColor(cls)).attr('opacity',.38);
    });
    svg.append('path').datum(total.y)
      .attr('d',d3.line().x((d,k)=>x(total.x[k])).y(d=>y(d)).curve(d3.curveBasis))
      .attr('fill','none').attr('stroke',TOKENS.ink).attr('stroke-width',0.65).attr('opacity',.45);
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
