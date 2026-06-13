/* Nº 24 · Anatomy of a Sample (Scrollytelling) — a scroll-driven narrative that
   walks a reader from a single seized bag through GC–MS, building the chromatogram
   one substance at a time and ending at the harm-reduction takeaway. Each point is
   a person. Uses IntersectionObserver (no external scrollytelling dependency). */
const {scaffold,chromatogram,classify,fmt,TOKENS,drawSmiles}=DCF;
const MS=SPEC.ms, RT=Object.fromEntries(DATA.retention_times.map(d=>[d.substance,d.rt]));

const STEPS=[
 {add:null,title:'One bag. Sold as "down."',body:'A person hands a few milligrams of powder to a harm-reduction worker. They believe it\'s heroin. To find out what\'s really inside, the lab runs gas chromatography–mass spectrometry — GC–MS. The trace starts flat.'},
 {add:{s:'acetaminophen',amp:38},title:'First peak: a cut.',body:'The instrument separates compounds by how fast they travel. The first peak to rise is acetaminophen — ordinary Tylenol, used as a bulking agent. Inactive here, but a sign the product was pressed and stretched.'},
 {add:{s:'caffeine',amp:22},title:'A stimulant cut joins.',body:'Caffeine appears next. It helps the mixture vaporize for smoking and adds a rush that can mask how sedating the rest of the bag is.'},
 {add:{s:'xylazine',amp:46},title:'Then the sedative.',body:'A tall peak rises: xylazine — "tranq." It\'s a veterinary sedative, not an opioid, so naloxone won\'t reverse the deep sedation it causes. It also drives the severe skin wounds now spreading through the supply.'},
 {add:{s:'4-anpp',amp:27},title:'A chemical fingerprint of synthesis.',body:'4-ANPP appears — a precursor left over from making fentanyl. Its presence is a signature: wherever it is, fentanyl was manufactured.'},
 {add:{s:'fentanyl',amp:100},title:'The tallest peak. The real story.',body:'Fentanyl dominates the trace. There was never any heroin. But remember: this peak is the tallest because fentanyl ionizes strongly — height is signal, not dose. The actual amount in this specific bag is unknown and varies wildly.'},
 {add:{s:'p-fluorofentanyl',amp:12},title:'And a second fentanyl.',body:'A smaller blip: para-fluorofentanyl, a fentanyl analogue riding along. It adds to the total opioid load. Six substances, none of them the heroin this person expected.'},
 {add:null,final:true,title:'What this means for a person.',body:'This is not heroin — it\'s a fentanyl-and-tranq mixture. Carry naloxone and expect to give more than one dose. Because xylazine sedation won\'t lift with naloxone, focus on rescue breathing and positioning too. Never use alone. And test the next bag — the fingerprint can look the same while the strength changes completely.'}
];

const stage=scaffold({
  tag:'Nº 24 · RESULT',
  title:'Anatomy of a Sample',
  dek:'Scroll slowly. A single seized bag becomes a chromatogram, one peak at a time — and what looked like heroin turns into something else entirely. Each peak is a real kind of substance found in the supply.',
  how:`This is <b>scrollytelling</b>: as you scroll, each step adds one component to the GC–MS trace on the left, narrating what it is and why it matters. It dramatizes the core insight of drug checking — a sample sold as one thing is usually a <b>mixture</b> — and ends with advice tied to exactly this composition. The technique (sticky graphic + scroll-triggered steps) is how modern newsrooms explain complex data. <b>Limit:</b> heights are relative signal, not dose, a point the story makes explicitly.`,
  provenance:'Illustrative narrative over real GC–MS retention times; composition reflects a common "tranq-dope" profile.',
  harm:'If you expect an opioid, plan for fentanyl plus a sedative: naloxone, rescue breathing, never alone, and test every time.'
});

stage.innerHTML=`
<div style="position:relative;display:grid;grid-template-columns:1fr 1fr;gap:24px">
  <div style="position:sticky;top:20px;height:min(70vh,520px)" class="panel">
    <svg id="svg" width="100%" height="100%" role="img" aria-label="Chromatogram building up as you scroll"></svg>
  </div>
  <div id="steps"></div>
</div>`;

const stepsHost=document.getElementById('steps');
STEPS.forEach((s,i)=>{
  const d=document.createElement('div');
  d.className='scrolly-step';
  d.dataset.i=i;
  d.style.cssText='min-height:78vh;display:flex;flex-direction:column;justify-content:center;padding:10px 0';
  d.innerHTML=`<div class="panel" style="${s.final?'border-left:3px solid '+TOKENS.ok:''}">
    <div class="muted mono" style="font-size:11px;margin-bottom:6px">STEP ${i+1} / ${STEPS.length}</div>
    <h3 style="margin:0 0 8px;font-size:19px;line-height:1.2">${s.title}</h3>
    <p class="muted" style="margin:0;font-size:14.5px;line-height:1.6">${s.body}</p>
  </div>`;
  stepsHost.appendChild(d);
});

let cur=0;
const built=[];
function rebuild(toIdx){
  built.length=0;
  for(let k=1;k<=toIdx;k++){ const a=STEPS[k].add; if(a) built.push({s:a.s,rt:RT[a.s]||8,amp:a.amp,sigma:0.05}); }
  draw();
}
function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=svg.node().clientHeight,m={t:20,r:16,b:36,l:42};
  const x=d3.scaleLinear([3,13],[m.l,W-m.r]),y=d3.scaleLinear([0,108],[H-m.b,m.t]);
  x.ticks(8).forEach(t=>svg.append('text').attr('x',x(t)).attr('y',H-16).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',11).attr('font-family','ui-monospace').text(t));
  svg.append('text').attr('x',W/2).attr('y',H-2).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',11).text('retention time (min)');
  if(!built.length){ svg.append('text').attr('x',W/2).attr('y',H/2).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',13).text('a flat baseline — nothing measured yet');
    svg.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',y(0)).attr('y2',y(0)).attr('stroke',TOKENS.line); return; }
  const trace=chromatogram(built,{x0:3,x1:13,sigma:0.05});
  const dom=classify(built.slice().sort((a,b)=>b.amp-a.amp)[0].s).color;
  const area=d3.area().x((d,i)=>x(trace.x[i])).y0(y(0)).y1(d=>y(d)).curve(d3.curveBasis);
  svg.append('path').datum(trace.y).attr('d',area).attr('fill',dom).attr('opacity',.16);
  svg.append('path').datum(trace.y).attr('d',d3.line().x((d,i)=>x(trace.x[i])).y(d=>y(d)).curve(d3.curveBasis)).attr('fill','none').attr('stroke',dom).attr('stroke-width',1.7);
  built.forEach((p,i)=>{
    const col=classify(p.s).color;
    svg.append('circle').attr('cx',x(p.rt)).attr('cy',y(p.amp)-3).attr('r',i===built.length-1?6:4).attr('fill',col).attr('stroke',TOKENS.bg).attr('stroke-width',1.5);
    svg.append('text').attr('x',x(p.rt)).attr('y',y(p.amp)-12).attr('text-anchor','middle').attr('font-size',10).attr('font-family','ui-monospace').attr('fill',i===built.length-1?col:TOKENS.muted).text(p.s.length>13?p.s.slice(0,12)+'…':p.s);
  });
}
const io=new IntersectionObserver(es=>{
  es.forEach(e=>{ if(e.isIntersecting){ const i=+e.target.dataset.i; if(i!==cur){cur=i;rebuild(i);} } });
},{rootMargin:'-45% 0px -45% 0px'});
document.querySelectorAll('.scrolly-step').forEach(s=>io.observe(s));
rebuild(0);
addEventListener('resize',draw);
