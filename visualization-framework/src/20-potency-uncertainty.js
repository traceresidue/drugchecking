/* Nº 20 · Potency Uncertainty Gauge — the single most important honesty in drug
   checking: a qualitative result cannot tell you the dose. This visualization
   refuses to show a single number, displaying the full plausible range instead. */
const {scaffold,fmt,TOKENS}=DCF;
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
const SPS=DATA.substances_per_sample;

const stage=scaffold({
  tag:'Nº 20 · RESULT',
  title:'Potency Uncertainty Gauge',
  dek:'Every other tool wants to give you one number. This one won\'t — because GC–MS and FTIR can\'t measure dose. It shows the whole range your sample could plausibly be, and why that range is so wide.',
  how:`Most drug checking is <b>qualitative</b>: it identifies <i>what</i> is present, not <i>how much</i>. A tall chromatogram peak feels like "strong," but peak height depends on how easily a molecule ionises, not its amount — so the honest answer to "how potent is this?" is a <b>wide band, not a dot</b>. The gauge shows that band. The distribution below (real data) shows another source of uncertainty: samples routinely contain <b>many active substances at once</b>, so the felt effect is a combination no single number captures. <b>This is a feature:</b> false precision kills.`,
  provenance:'Distribution is real (substances-per-sample across 6,580 samples). The gauge illustrates qualitative-method uncertainty.',
  harm:'Because strength can\'t be read from these results, treat every sample as potentially stronger than the last. Start low, go slow, never use alone.'
});

stage.innerHTML=`
<div class="controls">
  <label class="muted" style="font-size:13px">If a single-number tool claimed your sample was…</label>
  <input type="range" id="claim" min="5" max="95" value="45" style="flex:1;min-width:160px">
  <span class="mono" id="cl" style="color:${TOKENS.ink}">45%</span>
</div>
<div class="panel">
  <div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:6px">WHAT THE METHOD CAN ACTUALLY SAY ABOUT POTENCY</div>
  <svg id="gauge" width="100%" height="150" role="img" aria-label="Potency uncertainty band"></svg>
</div>
<div class="panel" style="margin-top:14px">
  <div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:6px">AND IT'S RARELY JUST ONE DRUG — ACTIVE SUBSTANCES PER SAMPLE (REAL DATA)</div>
  <svg id="dist" width="100%" height="220" role="img" aria-label="Distribution of substances per sample"></svg>
</div>`;

const claim=document.getElementById('claim');
claim.oninput=()=>{document.getElementById('cl').textContent=claim.value+'%';drawGauge();};

function drawGauge(){
  const svg=d3.select('#gauge'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=150,m=40,cy=92;
  const x=d3.scaleLinear([0,100],[m,W-m]);
  const v=+claim.value;
  // plausible band: qualitative methods give huge uncertainty; band spans roughly v*0.25 .. min(100, v*3)
  const lo=Math.max(1,v*0.3), hi=Math.min(100,v*2.6);
  // scale ticks
  [0,25,50,75,100].forEach(t=>{svg.append('line').attr('x1',x(t)).attr('x2',x(t)).attr('y1',cy-30).attr('y2',cy+30).attr('stroke',TOKENS.line);svg.append('text').attr('x',x(t)).attr('y',cy+48).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',10).text(t+'%');});
  // the band
  const grad=svg.append('defs').append('linearGradient').attr('id','bg').attr('x1',0).attr('x2',1);
  grad.append('stop').attr('offset','0%').attr('stop-color',TOKENS.ok);
  grad.append('stop').attr('offset','55%').attr('stop-color',TOKENS.watch);
  grad.append('stop').attr('offset','100%').attr('stop-color',TOKENS.alert);
  svg.append('rect').attr('x',x(lo)).attr('y',cy-14).attr('width',x(hi)-x(lo)).attr('height',28).attr('rx',14).attr('fill','url(#bg)').attr('opacity',.85);
  svg.append('text').attr('x',x(lo)).attr('y',cy-22).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',10).attr('font-family','ui-monospace').text('~'+lo.toFixed(0)+'%');
  svg.append('text').attr('x',x(hi)).attr('y',cy-22).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',10).attr('font-family','ui-monospace').text('~'+hi.toFixed(0)+'%');
  // the false dot
  svg.append('line').attr('x1',x(v)).attr('x2',x(v)).attr('y1',cy-20).attr('y2',cy+20).attr('stroke',TOKENS.ink).attr('stroke-dasharray','3,2');
  svg.append('circle').attr('cx',x(v)).attr('cy',cy).attr('r',5).attr('fill',TOKENS.ink);
  svg.append('text').attr('x',W/2).attr('y',H-6).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',12).html('');
  svg.append('text').attr('x',W/2).attr('y',24).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',12).text(`A "${v}%" claim really means: anywhere from ~${lo.toFixed(0)}% to ~${hi.toFixed(0)}%`);
}
function drawDist(){
  const svg=d3.select('#dist'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=220,m={t:14,r:14,b:34,l:36};
  const entries=Object.entries(SPS).map(([k,v])=>({n:+k,v})).filter(d=>d.n<=12).sort((a,b)=>a.n-b.n);
  const x=d3.scaleBand(entries.map(d=>d.n),[m.l,W-m.r]).padding(.2);
  const y=d3.scaleLinear([0,d3.max(entries,d=>d.v)],[H-m.b,m.t]);
  svg.selectAll('rect').data(entries).join('rect').attr('x',d=>x(d.n)).attr('y',d=>y(d.v)).attr('width',x.bandwidth()).attr('height',d=>y(0)-y(d.v))
    .attr('fill',d=>d.n<=1?TOKENS.cut:d.n<=3?TOKENS.watch:TOKENS.alert).attr('opacity',.85).attr('rx',3);
  svg.selectAll('text.v').data(entries).join('text').attr('class','v').attr('x',d=>x(d.n)+x.bandwidth()/2).attr('y',d=>y(d.v)-4).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',9).text(d=>fmt.int(d.v));
  entries.forEach(d=>svg.append('text').attr('x',x(d.n)+x.bandwidth()/2).attr('y',H-16).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',10).attr('font-family','ui-monospace').text(d.n));
  svg.append('text').attr('x',W/2).attr('y',H-2).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',11).text('number of distinct substances detected in one sample');
}
drawGauge();drawDist();
window.__vizRedraw=()=>{drawGauge();drawDist();};
addEventListener('resize',()=>{drawGauge();drawDist();});
