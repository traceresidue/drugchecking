/* Nº 10 · Chemical-Space Drift — every sample embedded into a 2D "chemical space"
   (a classical-MDS layout learned from which substances co-occur). Scrub through
   time and watch the whole supply migrate as its composition shifts. */
const {scaffold,classify,tooltip,fmt,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
const EMB=DATA.embedding, PTS=DATA.space_points;
const months=[...new Set(PTS.map(p=>p.m))].sort();

const stage=scaffold({
  tag:'Nº 10 · EXPERIMENTAL',
  title:'Chemical-Space Drift',
  dek:'Each dot is one tested sample, placed so chemically similar samples sit near each other. Scrub the timeline and watch the supply itself drift across the map.',
  how:`Samples are embedded into a 2D <b>chemical space</b> using a layout (classical multidimensional scaling) learned from <b>which substances tend to co-occur</b>. Samples with similar makeup land near each other; the labelled anchors are common substances. As you move the <b>time slider</b>, the cloud's center of mass shifts — that motion <i>is</i> the supply changing (e.g. opioids drifting toward the sedative corner as xylazine spreads). This mirrors how modern labs use learned spectral embeddings (UMAP / MS2DeepScore) to watch a drug market evolve. <b>Limits:</b> position is relative, not a physical quantity; layout is illustrative.`,
  provenance:'Real co-occurrence structure from 6,580 samples; 2D layout via classical MDS on Jaccard distances. ~1,600 sampled points.',
  harm:'When the cloud drifts toward sedatives, naloxone alone may not be enough — sedation from xylazine/benzos needs rescue breathing and positioning too.'
});

stage.innerHTML=`
<div class="controls">
  <button class="tgl" id="play">▶ animate</button>
  <input type="range" id="t" min="0" max="${months.length-1}" value="${months.length-1}" style="flex:1;min-width:180px">
  <span class="mono" id="mlabel" style="min-width:70px;color:${TOKENS.ink}"></span>
  <button class="tgl" id="trail" aria-pressed="true">show drift trail</button>
</div>
<div class="panel"><svg id="svg" width="100%" height="540" role="img" aria-label="Chemical space scatter over time"></svg></div>
<div class="legend" id="leg"></div>`;

const tt=tooltip();
const W=()=>document.getElementById('svg').clientWidth;
const svg=d3.select('#svg');
let x,y;
function setup(){
  const w=W(),H=540,m=40;
  x=d3.scaleLinear([-1.15,1.15],[m,w-m]); y=d3.scaleLinear([-1.15,1.15],[H-m,m]);
}
setup();

let win=3; // months window
function render(idx){
  const w=W(),H=540; svg.selectAll('*').remove();
  const mo=months[idx];
  document.getElementById('mlabel').textContent=fmt.month(mo);
  // grid
  svg.append('rect').attr('x',0).attr('y',0).attr('width',w).attr('height',H).attr('fill','none');
  // anchors
  svg.selectAll('text.anc').data(EMB.filter(d=>d.n>120)).join('text').attr('class','anc')
    .attr('x',d=>x(d.x)).attr('y',d=>y(d.y)).attr('fill',d=>subColor(d.substance)).attr('opacity',.5)
    .attr('font-size',10).attr('text-anchor','middle').text(d=>d.substance.length>12?d.substance.slice(0,11)+'…':d.substance);
  // drift trail: centroids of each month up to idx
  if(document.getElementById('trail').getAttribute('aria-pressed')==='true'){
    const cents=months.slice(0,idx+1).map(mm=>{const ps=PTS.filter(p=>p.m===mm);if(!ps.length)return null;return{m:mm,cx:d3.mean(ps,p=>p.x),cy:d3.mean(ps,p=>p.y)};}).filter(Boolean);
    svg.append('path').datum(cents).attr('d',d3.line().x(d=>x(d.cx)).y(d=>y(d.cy)).curve(d3.curveCatmullRom)).attr('fill','none').attr('stroke',TOKENS.ink).attr('stroke-width',1.4).attr('opacity',.5).attr('stroke-dasharray','4,3');
    cents.forEach((c,i)=>svg.append('circle').attr('cx',x(c.cx)).attr('cy',y(c.cy)).attr('r',i===cents.length-1?5:2).attr('fill',TOKENS.ink).attr('opacity',i===cents.length-1?1:.35));
  }
  // current window points
  const widx=months.slice(Math.max(0,idx-win+1),idx+1);
  const cur=PTS.filter(p=>widx.includes(p.m));
  svg.selectAll('circle.pt').data(cur,(d,i)=>i).join('circle').attr('class','pt')
    .attr('cx',d=>x(d.x)).attr('cy',d=>y(d.y)).attr('r',3.4)
    .attr('fill',d=>subColor(d.c==='fent'?'fentanyl':d.c==='xyl'?'xylazine':d.c==='stim'?'methamphetamine':d.c==='coke'?'cocaine':d.c==='opioid'?'heroin':d.c==='benzo'?'bromazolam':'other'))
    .attr('opacity',d=>d.m===mo?.9:.3)
    .on('mousemove',(e,d)=>tt.show(`<span class="muted">${fmt.month(d.m)}</span> · ${classify(d.c==='fent'?'fentanyl':d.c).label}`,e.clientX,e.clientY)).on('mouseleave',tt.hide);
  document.getElementById('leg').innerHTML=['fent','opioid','xyl','stim','coke','benzo'].map(c=>{const cl=classify(c==='fent'?'fentanyl':c==='xyl'?'xylazine':c==='stim'?'methamphetamine':c==='coke'?'cocaine':c==='opioid'?'heroin':'bromazolam');return `<span><i style="background:${cl.color}"></i>${cl.label}</span>`;}).join('')+`<span class="faint">showing ${win}-month window around ${fmt.month(mo)}</span>`;
}
const slider=document.getElementById('t');
slider.oninput=()=>render(+slider.value);
document.getElementById('trail').onclick=e=>{const v=e.target.getAttribute('aria-pressed')!=='true';e.target.setAttribute('aria-pressed',v);render(+slider.value);};
let timer;
document.getElementById('play').onclick=e=>{
  if(timer){clearInterval(timer);timer=null;e.target.setAttribute('aria-pressed',false);e.target.textContent='▶ animate';return;}
  e.target.setAttribute('aria-pressed',true);e.target.textContent='❚❚ pause';
  let i=0;slider.value=0;render(0);
  timer=setInterval(()=>{i++;if(i>=months.length){clearInterval(timer);timer=null;e.target.textContent='▶ animate';e.target.setAttribute('aria-pressed',false);return;}slider.value=i;render(i);},520);
};
render(months.length-1);
window.__vizRedraw=()=>{setup();render(+slider.value);};
addEventListener('resize',()=>{setup();render(+slider.value);});
