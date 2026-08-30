/* Nº 12 · Adulterant Co-occurrence Chord — which substances travel together.
   A chord diagram where ribbon thickness = how often two substances were found in
   the same sample. The fentanyl/4-ANPP/xylazine cluster dominates the ring. */
const {scaffold,classify,tooltip,fmt,TOKENS}=DCF;
const CO=DATA.cooccurrence, SUB=DATA.top_substances;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}

const stage=scaffold({
  tag:'Nº 12 · SUPPLY',
  title:'Adulterant Co-occurrence Chord',
  dek:'Drugs in the unregulated supply rarely travel alone. Each ribbon links two substances found in the same samples — the thicker the ribbon, the more often they appear together.',
  how:`Each arc on the ring is a <b>substance</b>, sized by how many samples contained it. A <b>ribbon</b> between two arcs means they were detected <b>in the same sample</b>; thickness = how often. The tight knot of <span class="mono">fentanyl–4-ANPP–p-fluorofentanyl</span> reflects co-manufacture (4-ANPP is a fentanyl precursor); the <span class="mono">fentanyl–xylazine</span> ribbon is the "tranq-dope" combination. Hover an arc to isolate its partners. <b>Reading tip:</b> co-occurrence is association, not causation — but it maps the <i>recipes</i> of the supply.`,
  provenance:'Real co-occurrence counts among the 25 most common substances in 6,580 tested samples.',
  harm:'Fentanyl + xylazine + a street benzo is now a common trio. Each needs a different response — naloxone, wound care, and rescue breathing.'
});

stage.innerHTML=`<div class="panel" style="display:flex;justify-content:center"><svg id="svg" width="100%" height="640" role="img" aria-label="Chord diagram of substance co-occurrence"></svg></div>`;
const tt=tooltip();

// build matrix from top-N substances present in CO
const names=[...new Set(CO.flatMap(d=>[d.a,d.b]))];
const counts=Object.fromEntries(SUB.map(d=>[d.substance,d.samples]));
const topSubs=names.filter(n=>counts[n]).sort((a,b)=>counts[b]-counts[a]).slice(0,16);
const idx=Object.fromEntries(topSubs.map((n,i)=>[n,i]));
const N=topSubs.length;
const M=Array.from({length:N},()=>Array(N).fill(0));
CO.forEach(d=>{ if(idx[d.a]!=null&&idx[d.b]!=null){M[idx[d.a]][idx[d.b]]+=d.n;M[idx[d.b]][idx[d.a]]+=d.n;} });

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=640, R=Math.min(W,H)/2-110, ir=R-16;
  const g=svg.append('g').attr('transform',`translate(${W/2},${H/2})`);
  const chord=d3.chordDirected().padAngle(0.035).sortSubgroups(d3.descending)(M);
  const arc=d3.arc().innerRadius(ir).outerRadius(R);
  const ribbon=d3.ribbonArrow().radius(ir-2);
  const color=i=>subColor(topSubs[i]);
  let ringG;
  const ribbons=g.append('g').attr('fill-opacity',.55).selectAll('path').data(chord).join('path')
    .attr('d',ribbon).attr('fill',d=>color(d.source.index)).attr('opacity',.55).attr('stroke',TOKENS.bg).attr('stroke-width',.3)
    .on('mousemove',(e,d)=>tt.show(`<b>${topSubs[d.source.index]}</b> + <b>${topSubs[d.target.index]}</b><br><span class="muted">${fmt.int(d.source.value)} shared samples</span>`,e.clientX,e.clientY))
    .on('mouseleave',tt.hide);
  // arcs
  g.append('g').selectAll('path').data(chord.groups).join('path')
    .attr('d',arc).attr('fill',d=>color(d.index)).attr('opacity',.9).attr('stroke',TOKENS.bg)
    .style('cursor','pointer')
    .on('mouseover',(e,d)=>{
      ribbons.attr('opacity',r=>r.source.index===d.index||r.target.index===d.index?.85:.06);
      if(ringG) ringG.selectAll('.dcf-arc-ring').attr('class','dcf-arc-ring');
      ringG=g.append('g').attr('class','dcf-arc-rings');
      const a=d3.arc().innerRadius(R+2).outerRadius(R+10);
      ringG.append('path').attr('class','dcf-arc-ring active').attr('d',a(d)).attr('transform','rotate(-90)');
    })
    .on('mousemove',(e,d)=>tt.show(`<b style="text-transform:capitalize">${topSubs[d.index]}</b><br><span class="muted">${fmt.int(counts[topSubs[d.index]])} samples</span>`,e.clientX,e.clientY))
    .on('mouseleave',()=>{ribbons.attr('opacity',.55);if(ringG)ringG.remove();ringG=null;tt.hide();});
  // labels
  if(!window.DCFDesign||DCFDesign.showTier('inline'))
    g.append('g').selectAll('text').data(chord.groups).join('text')
      .each(d=>d.ang=(d.startAngle+d.endAngle)/2)
      .attr('class','dcf-lbl').attr('data-tier','inline')
      .attr('transform',d=>`rotate(${d.ang*180/Math.PI-90}) translate(${R+8}) ${d.ang>Math.PI?'rotate(180)':''}`)
      .attr('text-anchor',d=>d.ang>Math.PI?'end':'start').attr('dy','.35em')
      .attr('fill',d=>color(d.index)).attr('font-size',11)
      .text(d=>{const s=topSubs[d.index];return s.length>16?s.slice(0,15)+'…':s;});
}
draw();
addEventListener('resize',draw);
window.__vizRedraw=draw;
