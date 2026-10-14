/* Nº 17c · Adulterant Orbit Graph — solar-system layout: major substances as
   suns, partners in concentric orbits sized by co-occurrence strength. */
const {scaffold,classify,tooltip,fmt,TOKENS}=DCF;
// @include 17-adulterant-network-shared.js

const stage=scaffold({
  tag:'Nº 17c · SUPPLY',
  title:'Adulterant Orbit Graph',
  dek:'Treat the supply like a solar system — the biggest substances are suns, and everything they co-occur with orbits at distances set by shared-sample gravity.',
  how:`Each <b>sun</b> is one of the five most prevalent substances. <b>Orbit rings</b> hold its co-occurring partners — closer rings mean stronger shared-sample counts. Thin <b>spokes</b> link each moon to its sun. Moons can belong to multiple systems when they bridge clusters (e.g. caffeine). Ring width encodes co-occurrence strength. Hover for counts; the layout is <b>deterministic</b> (not force-simulated) so orbits stay readable. <b>Reading tip:</b> a crowded inner ring is a tight recipe; sparse outer rings are occasional companions.`,
  provenance:'Real co-occurrence among the 22 most connected substances, 6,580-sample dataset.',
  harm:'Inner-orbit partners are the ones most likely to appear alongside a sun. Plan clinical response for the whole ring, not just the hub.'
});

stage.innerHTML=`<div class="panel"><svg id="svg" width="100%" height="680" role="img" aria-label="Solar-system co-occurrence orbit graph"></svg></div><div class="legend" id="leg"></div>`;
const tt=tooltip();

const nodes=makeNodes();
const links=makeLinks();
const HUB_COUNT=5;
const hubs=nodes.slice(0,HUB_COUNT);

function orbitLayout(W,H){
  const systems=hubs.map((hub,hi)=>{
    const cx=W*(0.14+hi*0.18);
    const cy=H*(0.34+(hi%2)*0.28);
    const partners=neighborsOf(hub.id,links).filter(p=>p.id!==hub.id);
    const rings={};
    partners.forEach(p=>{
      const ring=p.v>=400?0:p.v>=150?1:2;
      if(!rings[ring]) rings[ring]=[];
      rings[ring].push(p);
    });
    const placed=[];
    [0,1,2].forEach(ring=>{
      const group=(rings[ring]||[]).sort((a,b)=>b.v-a.v);
      const rad=58+ring*46;
      group.forEach((p,i)=>{
        const ang=(i/group.length)*Math.PI*2 - Math.PI/2 + hi*0.35;
        placed.push({
          id:p.id,
          hub:hub.id,
          co:p.v,
          x:cx+Math.cos(ang)*rad,
          y:cy+Math.sin(ang)*rad,
          ring
        });
      });
    });
    return {hub,cx,cy,placed};
  });
  const pos={};
  systems.forEach(sys=>{
    pos[sys.hub.id]={x:sys.cx,y:sys.cy,isHub:true,hub:sys.hub.id};
    sys.placed.forEach(p=>{
      if(!pos[p.id]) pos[p.id]={x:p.x,y:p.y,isHub:false,hub:p.hub,co:p.co,ring:p.ring};
      else{
        pos[p.id].x=(pos[p.id].x+p.x)/2;
        pos[p.id].y=(pos[p.id].y+p.y)/2;
      }
    });
  });
  nodes.forEach(n=>{
    if(!pos[n.id]){
      pos[n.id]={x:W*0.5+(Math.random()-0.5)*40,y:H*0.92,isHub:false,hub:null,co:0,ring:3};
    }
  });
  return {systems,pos};
}

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=680;
  const {systems,pos}=orbitLayout(W,H);
  const r=d3.scaleSqrt(d3.extent(nodes,d=>d.v),[5,28]);
  const moonR=d3.scaleSqrt([0,d3.max(links,d=>d.v)||1],[4,11]);

  systems.forEach(sys=>{
    [0,1,2].forEach(ring=>{
      const rad=58+ring*46;
      svg.append('circle').attr('cx',sys.cx).attr('cy',sys.cy).attr('r',rad)
        .attr('fill','none').attr('stroke',TOKENS.line).attr('stroke-dasharray',ring?'4 6':'none').attr('opacity',0.22);
    });
  });

  const spokeData=[];
  systems.forEach(sys=>{
    sys.placed.forEach(p=>spokeData.push({hub:sys.hub.id,target:p.id,co:p.v}));
  });
  svg.append('g').selectAll('line').data(spokeData).join('line')
    .attr('x1',d=>pos[d.hub].x).attr('y1',d=>pos[d.hub].y)
    .attr('x2',d=>pos[d.target].x).attr('y2',d=>pos[d.target].y)
    .attr('stroke',TOKENS.line).attr('stroke-width',d=>Math.max(0.6,moonR(d.co)*0.35)).attr('opacity',0.35);

  const node=svg.append('g').selectAll('g').data(nodes).join('g');
  node.append('circle')
    .attr('cx',d=>pos[d.id].x).attr('cy',d=>pos[d.id].y)
    .attr('r',d=>pos[d.id].isHub?r(d.v):moonR(pos[d.id].co||counts[d.id]||1))
    .attr('fill',d=>d.color).attr('opacity',d=>pos[d.id].isHub?0.95:0.82)
    .attr('stroke',d=>pos[d.id].isHub?TOKENS.ink:TOKENS.bg).attr('stroke-width',d=>pos[d.id].isHub?2.2:1.2)
    .on('mousemove',(e,d)=>{
      const extra=pos[d.id].hub?`<br><span class="muted">orbits ${pos[d.id].hub}</span>`:'';
      tt.show(nodeTooltipHtml(d)+extra,e.clientX,e.clientY);
    })
    .on('mouseleave',()=>tt.hide());
  node.append('text')
    .attr('x',d=>pos[d.id].x).attr('y',d=>pos[d.id].y+(pos[d.id].isHub?r(d.v)+13:moonR(pos[d.id].co||1)+11))
    .attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',d=>pos[d.id].isHub?10:8.5)
    .text(d=>shortLabel(d.id,pos[d.id].isHub?16:11));

  systems.forEach(sys=>{
    svg.append('text').attr('x',sys.cx).attr('y',sys.cy-r(sys.hub.v)-16)
      .attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',10)
      .text('sun · '+shortLabel(sys.hub.id,14));
  });

  renderLegend(nodes,'leg');
}
window.__vizRedraw=draw;
draw();
addEventListener('resize',draw);
