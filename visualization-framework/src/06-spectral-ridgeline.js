/* Nº 06 · Batch Ridgeline Fingerprints — many samples' chromatograms stacked as
   overlapping ridgelines reveal how consistent (or chaotic) a local supply is. */
const {scaffold,chromatogram,classify,tooltip,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
// @include 06-ridgeline-shared.js

const stage=scaffold({
  tag:'Nº 06 · GC–MS',
  title:'Batch Ridgeline Fingerprints',
  dek:'Stack samples across the full GC run — pick a key substance to read batch consistency from its retention-time column over real TIC shapes.',
  how:`Each <b>row is one submitted sample's full TIC</b>, stacked newest-on-top across the standard <b>2.5–13 min</b> window. Select a <b>key substance</b> to tint rows and mark its mean RT — aligned ridges = stable supply; scatter = drift. <b>Limits:</b> ridge height is within-sample relative signal, not comparable potency between samples.`,
  provenance:'Rows use real lab cohort chromatograms when exported; otherwise synthesized mixes over real retention times.',
  harm:'Even a "consistent" supply shifts without warning. Test every time; potency can change while the fingerprint looks the same.'
});

stage.innerHTML=`
<div class="controls">
  <button class="tgl" id="m1" aria-pressed="true">Stable fentanyl market</button>
  <button class="tgl" id="m2" aria-pressed="false">Volatile transition period</button>
  ${keySubstanceControlsMarkup('fentanyl')}
</div>
<div class="panel"><svg id="svg" width="100%" height="${RIDGE_HEIGHT}" role="img" aria-label="Stacked ridgeline chromatograms for a key substance"></svg></div>`;

const tt=tooltip();
let mode='stable';
document.getElementById('m1').onclick=()=>set('stable');
document.getElementById('m2').onclick=()=>set('volatile');
function set(m){mode=m;document.getElementById('m1').setAttribute('aria-pressed',m==='stable');document.getElementById('m2').setAttribute('aria-pressed',m==='volatile');draw();}
const getKeySub=initKeySubstanceControls('fentanyl',draw);

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=RIDGE_HEIGHT,m={t:16,r:16,b:34,l:54};
  const keyMeta=getKeySub();
  const sub=keyMeta.substance;
  const rows=batchRows(mode,{classFilter:keyMeta.classFilter});
  const domain=fullTicDomain(rows);
  const st=computeDrugStats(rows,sub);
  const x=d3.scaleLinear(domain,[m.l,W-m.r]);
  const rowH=(H-m.t-m.b)/rows.length, overlap=RIDGE_OVERLAP;
  const hue=drugHue(sub);

  x.ticks(10).forEach(t=>{
    svg.append('line').attr('x1',x(t)).attr('x2',x(t)).attr('y1',m.t).attr('y2',H-m.b).attr('stroke',TOKENS.line).attr('opacity',.3);
    svg.append('text').attr('x',x(t)).attr('y',H-14).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',11).attr('font-family','ui-monospace').text(t);
  });
  svg.append('line').attr('x1',x(st.meanRt)).attr('x2',x(st.meanRt)).attr('y1',m.t).attr('y2',H-m.b)
    .attr('stroke',hue).attr('stroke-width',1.5).attr('opacity',0.45).attr('stroke-dasharray','5,4');
  svg.append('text').attr('x',W/2).attr('y',H-2).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',11)
    .text(`${keyMeta.label} · retention time (min) — full TIC per row`);

  rows.forEach((peaks,i)=>{
    const kp=peaks.find(p=>p.s===sub);
    const baseY=m.t+(i+1)*rowH;
    const y=d3.scaleLinear([0,100],[baseY,baseY-rowH*overlap]);
    const rowHue=kp?devColor(hue,normDev(kp,st)):TOKENS.muted;
    drawFullTicRow(svg,peaks,{x,yScale:y,domain,stroke:rowHue,fill:rowHue,fillOpacity:kp?0.18:0.06,strokeWidth:1.2,strokeOpacity:kp?0.9:0.45,baseY});
    svg.append('text').attr('x',m.l-8).attr('y',baseY-2).attr('text-anchor','end').attr('fill',TOKENS.faint).attr('font-size',9).attr('font-family','ui-monospace').text('#'+(rows.length-i));
  });
  svg.append('text').attr('x',m.l-8).attr('y',m.t+10).attr('text-anchor','end').attr('fill',TOKENS.muted).attr('font-size',10).text('newest');
}
window.__vizRedraw=draw;
draw();
addEventListener('resize',draw);
