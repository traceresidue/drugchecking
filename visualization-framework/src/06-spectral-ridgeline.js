/* Nº 06 · Batch Ridgeline Fingerprints — many samples' chromatograms stacked as
   overlapping ridgelines reveal how consistent (or chaotic) a local supply is. */
const {scaffold,chromatogram,classify,tooltip,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
// @include 06-ridgeline-shared.js

const stage=scaffold({
  tag:'Nº 06 · GC–MS',
  title:'Batch Ridgeline Fingerprints',
  dek:'Stack fifty samples and pick a key substance — fentanyl, heroin, meth, or cocaine — to read batch consistency without unrelated peak noise.',
  how:`Each <b>row is one submitted sample's</b> GC–MS fingerprint, stacked newest-on-top. Select a <b>key substance</b> to zoom its retention window and color rows by whether that drug is present. A vertical guide marks the substance's mean RT — aligned ridges = stable supply; scatter = drift. <b>Limits:</b> ridge height is within-sample relative signal, not comparable potency between samples.`,
  provenance:'Each row synthesized from a plausible component mix over real retention times; illustrative of batch-consistency analysis.',
  harm:'Even a "consistent" supply shifts without warning. Test every time; potency can change while the fingerprint looks the same.'
});

stage.innerHTML=`
<div class="controls">
  <button class="tgl" id="m1" aria-pressed="true">Stable fentanyl market</button>
  <button class="tgl" id="m2" aria-pressed="false">Volatile transition period</button>
  ${keySubstanceControlsMarkup('fentanyl')}
</div>
<div class="panel"><svg id="svg" width="100%" height="640" role="img" aria-label="Stacked ridgeline chromatograms for a key substance"></svg></div>`;

const tt=tooltip();
let mode='stable';
document.getElementById('m1').onclick=()=>set('stable');
document.getElementById('m2').onclick=()=>set('volatile');
function set(m){mode=m;document.getElementById('m1').setAttribute('aria-pressed',m==='stable');document.getElementById('m2').setAttribute('aria-pressed',m==='volatile');draw();}
const getKeySub=initKeySubstanceControls('fentanyl',draw);

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=640,m={t:16,r:16,b:34,l:54};
  const keyMeta=getKeySub();
  const sub=keyMeta.substance;
  const rows=sampleRows(mode,{classFilter:keyMeta.classFilter});
  const domain=domainForSubstance(rows,sub);
  const st=computeDrugStats(rows,sub);
  const x=d3.scaleLinear(domain,[m.l,W-m.r]);
  const rowH=(H-m.t-m.b)/rows.length, overlap=2.4;
  const hue=drugHue(sub);

  x.ticks(8).forEach(t=>{
    svg.append('line').attr('x1',x(t)).attr('x2',x(t)).attr('y1',m.t).attr('y2',H-m.b).attr('stroke',TOKENS.line).attr('opacity',.3);
    svg.append('text').attr('x',x(t)).attr('y',H-14).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',11).attr('font-family','ui-monospace').text(t);
  });
  svg.append('line').attr('x1',x(st.meanRt)).attr('x2',x(st.meanRt)).attr('y1',m.t).attr('y2',H-m.b)
    .attr('stroke',hue).attr('stroke-width',1.5).attr('opacity',0.45).attr('stroke-dasharray','5,4');
  svg.append('text').attr('x',W/2).attr('y',H-2).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',11)
    .text(`${keyMeta.label} · retention time (min) — read down the column for batch drift`);

  rows.forEach((peaks,i)=>{
    const kp=peaks.find(p=>p.s===sub);
    const rowPeaks=kp?[kp]:[];
    const trace=rowPeaks.length?chromatogram(rowPeaks,{x0:domain[0],x1:domain[1],sigma:0.05,n:160}):{x:[],y:[]};
    const baseY=m.t+(i+1)*rowH;
    const y=d3.scaleLinear([0,100],[baseY,baseY-rowH*overlap]);
    if(trace.y.length){
      const area=d3.area().x((d,k)=>x(trace.x[k])).y0(baseY).y1(d=>y(d)).curve(d3.curveBasis);
      svg.append('path').datum(trace.y).attr('d',area).attr('fill',TOKENS.bg).attr('stroke','none');
      svg.append('path').datum(trace.y).attr('d',area).attr('fill',hue).attr('opacity',.22);
      svg.append('path').datum(trace.y)
        .attr('d',d3.line().x((d,k)=>x(trace.x[k])).y(d=>y(d)).curve(d3.curveBasis))
        .attr('fill','none').attr('stroke',hue).attr('stroke-width',1.15).attr('opacity',.92);
    }else{
      svg.append('line').attr('x1',x(domain[0])).attr('x2',x(domain[1])).attr('y1',baseY).attr('y2',baseY)
        .attr('stroke',TOKENS.faint).attr('stroke-width',0.5).attr('opacity',0.35);
    }
    svg.append('text').attr('x',m.l-8).attr('y',baseY-2).attr('text-anchor','end').attr('fill',TOKENS.faint).attr('font-size',9).attr('font-family','ui-monospace').text('#'+(rows.length-i));
  });
  svg.append('text').attr('x',m.l-8).attr('y',m.t+10).attr('text-anchor','end').attr('fill',TOKENS.muted).attr('font-size',10).text('newest');
}
window.__vizRedraw=draw;
draw();
addEventListener('resize',draw);
