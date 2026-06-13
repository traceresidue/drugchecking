/* Nº 17 · Adulterant Force Network — substances as nodes, co-occurrence as springs.
   The force layout self-organizes into the supply's natural communities: the
   fentanyl synthesis cluster, the stimulant cluster, the cut cluster. */
const {scaffold,classify,tooltip,fmt,TOKENS}=DCF;
const CO=DATA.cooccurrence, SUB=DATA.top_substances, ROLES=DATA.roles;

const stage=scaffold({
  tag:'Nº 17 · SUPPLY',
  title:'Adulterant Force Network',
  dek:'Let the data arrange itself. Substances pull together when they appear in the same samples — and the supply\'s hidden neighborhoods emerge: a fentanyl cluster, a stimulant cluster, a cutting-agent cluster.',
  how:`Each <b>node</b> is a substance (size = how common, color = class). Each <b>link</b> is co-occurrence; stronger links act like tighter springs, so a physics simulation pulls frequently-combined substances close. The result is <b>community detection by eye</b>: the dense fentanyl/4-ANPP knot (co-manufacture), the methamphetamine neighborhood, the inert-cuts periphery. <b>Drag</b> a node to probe the structure; hover to see its role. <b>Reading tip:</b> proximity = "found together," which encodes the supply's actual recipes.`,
  provenance:'Real co-occurrence among the 25 most common substances, 6,580-sample dataset.',
  harm:'Substances cluster because they are combined. If one member of a cluster is in your sample, its neighbors may be too.'
});
stage.innerHTML=`<div class="panel"><svg id="svg" width="100%" height="600" role="img" aria-label="Force-directed substance network"></svg></div><div class="legend" id="leg"></div>`;
const tt=tooltip();

const counts=Object.fromEntries(SUB.map(d=>[d.substance,d.samples]));
const nodeNames=[...new Set(CO.flatMap(d=>[d.a,d.b]))].filter(n=>counts[n]).sort((a,b)=>counts[b]-counts[a]).slice(0,22);
const nset=new Set(nodeNames);
const nodes=nodeNames.map(n=>({id:n,v:counts[n],...classify(n)}));
const links=CO.filter(d=>nset.has(d.a)&&nset.has(d.b)).map(d=>({source:d.a,target:d.b,v:d.n}));

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=600;
  const r=d3.scaleSqrt(d3.extent(nodes,d=>d.v),[5,30]);
  const lw=d3.scaleLinear(d3.extent(links,d=>d.v),[.5,7]);
  const sim=d3.forceSimulation(nodes)
    .force('link',d3.forceLink(links).id(d=>d.id).distance(d=>120-lw(d.v)*8).strength(d=>Math.min(1,d.v/800)))
    .force('charge',d3.forceManyBody().strength(-220))
    .force('center',d3.forceCenter(W/2,H/2))
    .force('collide',d3.forceCollide(d=>r(d.v)+3));
  const link=svg.append('g').selectAll('line').data(links).join('line')
    .attr('stroke',TOKENS.line).attr('stroke-width',d=>lw(d.v)).attr('opacity',.4);
  const node=svg.append('g').selectAll('g').data(nodes).join('g').style('cursor','grab')
    .call(d3.drag().on('start',(e,d)=>{if(!e.active)sim.alphaTarget(.3).restart();d.fx=d.x;d.fy=d.y;})
      .on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y;})
      .on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null;}));
  node.append('circle').attr('r',d=>r(d.v)).attr('fill',d=>d.color).attr('opacity',.88).attr('stroke',TOKENS.bg).attr('stroke-width',1.5)
    .on('mouseover',(e,d)=>{link.attr('opacity',l=>l.source===d||l.target===d?.8:.06);})
    .on('mousemove',(e,d)=>tt.show(`<b style="text-transform:capitalize">${d.id}</b><br><span class="muted">${d.label} · ${ROLES[d.id]||''}</span><br><span class="muted">${fmt.int(d.v)} samples</span>`,e.clientX,e.clientY))
    .on('mouseleave',()=>{link.attr('opacity',.4);tt.hide();});
  node.append('text').attr('text-anchor','middle').attr('dy',d=>r(d.v)+11).attr('fill',TOKENS.muted).attr('font-size',9.5).text(d=>d.id.length>14?d.id.slice(0,13)+'…':d.id);
  sim.on('tick',()=>{
    link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    node.attr('transform',d=>`translate(${d.x=Math.max(r(d.v),Math.min(W-r(d.v),d.x))},${d.y=Math.max(r(d.v),Math.min(H-r(d.v),d.y))})`);
  });
  const cls=[...new Set(nodes.map(n=>n.cls))];
  document.getElementById('leg').innerHTML=cls.map(c=>{const o=nodes.find(n=>n.cls===c);return `<span><i style="background:${o.color}"></i>${o.label}</span>`;}).join('');
}
draw();
addEventListener('resize',draw);
