/* Nº 12c · Undirected Co-occurrence Chord — one ribbon per substance pair.
   Same top-level chord as Nº 12, but uses symmetric layout so each co-occurrence
   appears once (not as duplicate directed A→B and B→A ribbons). */
const {scaffold,classify,tooltip,fmt,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
const CO=DATA.cooccurrence, SUB=DATA.top_substances;

const counts=Object.fromEntries(SUB.map(d=>[d.substance,d.samples]));
const names=[...new Set(CO.flatMap(d=>[d.a,d.b]))].filter(n=>counts[n]);
const topSubs=names.sort((a,b)=>counts[b]-counts[a]).slice(0,16);
const idx=Object.fromEntries(topSubs.map((n,i)=>[n,i]));
const N=topSubs.length;
const M=Array.from({length:N},()=>Array(N).fill(0));
CO.forEach(d=>{
  if(idx[d.a]!=null&&idx[d.b]!=null){
    M[idx[d.a]][idx[d.b]]+=d.n;
    M[idx[d.b]][idx[d.a]]+=d.n;
  }
});

function buildColorMap(list){
  const map={};
  const byCls={};
  list.forEach(n=>{const c=classify(n).cls;(byCls[c]??=[]).push(n);});
  Object.entries(byCls).forEach(([,group])=>{
    group.sort((a,b)=>counts[b]-counts[a]);
    const base=d3.hsl(subColor(group[0]));
    group.forEach((name,i)=>{
      const t=group.length>1?i/(group.length-1):0.5;
      const h=(base.h+(t-0.5)*42+360)%360;
      const s=Math.min(0.95,base.s+(t-0.5)*0.18);
      const l=Math.min(0.78,Math.max(0.42,base.l+(t-0.5)*0.14));
      map[name]=d3.hsl(h,s,l).formatHex();
    });
  });
  return map;
}

const colors=buildColorMap(topSubs);

const stage=scaffold({
  tag:'Nº 12c · SUPPLY',
  title:'Undirected Co-occurrence Chord',
  dek:'Each ribbon appears once per substance pair — thickness still maps to shared-sample count, without the duplicate directed connectors of the standard chord.',
  how:`This is the same data as the standard co-occurrence chord, drawn with an <b>undirected</b> layout: if caffeine and fentanyl co-occur in 502 samples, you see <b>one</b> ribbon between them, not two identical flows in opposite directions. Arc size still reflects total co-occurrence mass; ribbon width at each end is proportional to the shared count. Hover an arc to isolate its partners; hover a ribbon for the exact pairing count.`,
  provenance:'Real co-occurrence counts among the 16 most common substances in 6,580 tested samples.',
  harm:'Fentanyl + xylazine + a street benzo is now a common trio. Each needs a different response — naloxone, wound care, and rescue breathing.'
});

stage.innerHTML=`<div class="panel" style="display:flex;justify-content:center"><svg id="svg" width="100%" height="640" role="img" aria-label="Undirected chord diagram of substance co-occurrence"></svg></div>`;
const tt=tooltip();

function pairCount(i,j){
  return M[i][j];
}

function draw(){
  const svg=d3.select('#svg');
  svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=640;
  const R=Math.min(W,H)/2-110, ir=R-16;
  const g=svg.append('g').attr('transform',`translate(${W/2},${H/2})`);
  const chord=d3.chord().padAngle(0.035).sortSubgroups(d3.descending)(M);
  const arc=d3.arc().innerRadius(ir).outerRadius(R);
  const ribbon=d3.ribbon().radius(ir-2);

  g.append('g').selectAll('path').data(chord.groups).join('path')
    .attr('d',arc)
    .attr('fill',d=>colors[topSubs[d.index]])
    .attr('opacity',0.9)
    .attr('stroke',TOKENS.bg)
    .style('cursor','pointer')
    .on('mouseover',(e,d)=>{
      ribbons.attr('opacity',r=>r.source.index===d.index||r.target.index===d.index?0.82:0.06);
    })
    .on('mousemove',(e,d)=>tt.show(
      `<b style="text-transform:capitalize">${topSubs[d.index]}</b><br><span class="muted">${fmt.int(counts[topSubs[d.index]])} samples</span>`,
      e.clientX,e.clientY
    ))
    .on('mouseleave',()=>{ribbons.attr('opacity',0.55);tt.hide();});

  g.append('g').selectAll('text').data(chord.groups).join('text')
    .each(d=>{d.ang=(d.startAngle+d.endAngle)/2;})
    .attr('transform',d=>`rotate(${d.ang*180/Math.PI-90}) translate(${R+8}) ${d.ang>Math.PI?'rotate(180)':''}`)
    .attr('text-anchor',d=>d.ang>Math.PI?'end':'start')
    .attr('dy','.35em')
    .attr('fill',d=>colors[topSubs[d.index]])
    .attr('font-size',11)
    .text(d=>{const s=topSubs[d.index];return s.length>16?s.slice(0,15)+'…':s;});

  const ribbons=g.append('g').selectAll('path').data(chord).join('path')
    .attr('d',ribbon)
    .attr('fill',d=>colors[topSubs[d.source.index]])
    .attr('opacity',0.55)
    .attr('stroke',TOKENS.bg)
    .attr('stroke-width',0.3)
    .on('mousemove',(e,d)=>{
      const i=d.source.index, j=d.target.index;
      const n=pairCount(i,j);
      const a=topSubs[i], b=topSubs[j];
      tt.show(`<b>${a}</b> + <b>${b}</b><br><span class="muted">${fmt.int(n)} shared samples</span>`,e.clientX,e.clientY);
    })
    .on('mouseleave',tt.hide);
}

window.__vizRedraw=draw;
draw();
addEventListener('resize',draw);
