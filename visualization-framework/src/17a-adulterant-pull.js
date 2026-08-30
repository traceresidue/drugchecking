/* Nº 17a · Adulterant Pull Network — looser cluster spacing, co-occurrence-weighted
   gravity, and one-click "pull" buttons that drag a substance to the edge to
   reveal its connection fan. */
const {scaffold,classify,tooltip,fmt,TOKENS}=DCF;
// @include 17-adulterant-network-shared.js

const stage=scaffold({
  tag:'Nº 17a · SUPPLY',
  title:'Adulterant Pull Network',
  dek:'Same co-occurrence physics with breathing room — stronger pairs pull tighter, weak ties stay loose. Hit "pull" on any substance to yank it to the edge and watch its neighborhood stretch into view.',
  how:`Each <b>node</b> is a substance (size = prevalence, color = class). <b>Link strength</b> scales with shared-sample count — frequent pairs behave like stronger gravity. Repulsion and spring length are tuned <b>looser</b> than the base network so clusters stay readable. Use the <b>pull</b> buttons to pin a substance to the right edge; its partners stay tethered, exposing the co-occurrence fan. Click <b>release</b> or another pull target to reset. <b>Drag</b> nodes manually anytime.`,
  provenance:'Real co-occurrence among the 22 most connected substances, 6,580-sample dataset.',
  harm:'A pulled fan shows what else tends to ride along. If you see one member of that fan, test for its neighbors.'
});

stage.innerHTML=`
<style>
  .pull-grid{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
  .pull-grid button{font:500 11px/1.2 ui-monospace,monospace;padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:var(--panel);color:var(--muted);cursor:pointer;transition:.15s}
  .pull-grid button:hover{background:var(--panel2);color:var(--ink)}
  .pull-grid button[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
  .pull-grid button.release{font-style:italic}
</style>
<div class="pull-grid" id="pull-btns" role="toolbar" aria-label="Pull substance to edge"></div>
<div class="panel"><svg id="svg" width="100%" height="620" role="img" aria-label="Loose force network with pull controls"></svg></div>
<div class="legend" id="leg"></div>`;

const tt=tooltip();
const nodes=makeNodes();
const links=makeLinks();
let pulled=null;
let sim=null;

const pullHost=document.getElementById('pull-btns');
pullTargets(nodes).forEach(id=>{
  const b=document.createElement('button');
  b.type='button';
  b.textContent=`pull (${shortLabel(id,18).toLowerCase()})`;
  b.setAttribute('aria-pressed','false');
  b.onclick=()=>setPull(id);
  pullHost.appendChild(b);
});
const releaseBtn=document.createElement('button');
releaseBtn.type='button';
releaseBtn.className='release';
releaseBtn.textContent='release';
releaseBtn.setAttribute('aria-pressed','false');
releaseBtn.onclick=()=>setPull(null);
pullHost.appendChild(releaseBtn);

function setPull(id){
  pulled=id;
  [...pullHost.querySelectorAll('button')].forEach(b=>{
    const on=b!==releaseBtn && id && b.textContent.includes(`(${shortLabel(id,18).toLowerCase()})`);
    b.setAttribute('aria-pressed',on?'true':'false');
  });
  releaseBtn.setAttribute('aria-pressed',id?'false':'true');
  if(sim){
    nodes.forEach(n=>{ if(n.id!==id) n.fx=null; n.fy=null; });
    const target=nodes.find(n=>n.id===id);
    if(target && sim){
      const W=sim.width,H=sim.height;
      target.fx=W*0.88;
      target.fy=H*0.5;
      sim.alphaTarget(0.45).restart();
      setTimeout(()=>sim.alphaTarget(0),900);
    }
  }
  draw();
}

function linkStrength(d){ return Math.min(1.2, d.v/450); }
function linkDistance(d){ return 180 - Math.min(90, d.v/35); }

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=620;
  nodes.forEach(n=>{ n.x=undefined; n.y=undefined; if(n.id!==pulled){ n.fx=null; n.fy=null; } });
  const r=d3.scaleSqrt(d3.extent(nodes,d=>d.v),[6,32]);
  const lw=d3.scaleLinear(d3.extent(links,d=>d.v),[.4,6]);
  sim=d3.forceSimulation(nodes)
    .force('link',d3.forceLink(links).id(d=>d.id).distance(linkDistance).strength(linkStrength))
    .force('charge',d3.forceManyBody().strength(-420))
    .force('center',d3.forceCenter(W*0.46,H/2).strength(0.04))
    .force('collide',d3.forceCollide(d=>r(d.v)+8));
  sim.width=W; sim.height=H;
  if(pulled){
    const t=nodes.find(n=>n.id===pulled);
    if(t){ t.fx=W*0.88; t.fy=H/2; }
  }
  const link=svg.append('g').attr('stroke-linecap','round').selectAll('line').data(links).join('line')
    .attr('stroke',TOKENS.line).attr('stroke-width',d=>lw(d.v)).attr('opacity',.38);
  const node=svg.append('g').selectAll('g').data(nodes).join('g').style('cursor','grab')
    .call(d3.drag()
      .on('start',(e,d)=>{ if(!e.active) sim.alphaTarget(0.35).restart(); d.fx=d.x; d.fy=d.y; if(d.id===pulled) pulled=null; })
      .on('drag',(e,d)=>{ d.fx=e.x; d.fy=e.y; })
      .on('end',(e,d)=>{ if(!e.active) sim.alphaTarget(0); if(d.id!==pulled){ d.fx=null; d.fy=null; } }));
  node.append('circle').attr('r',d=>r(d.v)).attr('fill',d=>d.color).attr('opacity',.9)
    .attr('stroke',d=>d.id===pulled?TOKENS.ink:TOKENS.bg).attr('stroke-width',d=>d.id===pulled?2.5:1.5)
    .on('mouseover',(e,d)=>{
      const nb=new Set(neighborsOf(d.id,links).map(x=>x.id));
      link.attr('opacity',l=>{
        const s=l.source.id||l.source,t=l.target.id||l.target;
        return s===d.id||t===d.id||nb.has(s)||nb.has(t)?0.85:0.05;
      });
    })
    .on('mousemove',(e,d)=>tt.show(nodeTooltipHtml(d),e.clientX,e.clientY))
    .on('mouseleave',()=>{ link.attr('opacity',.38); tt.hide(); });
  node.append('text').attr('text-anchor','middle').attr('dy',d=>r(d.v)+12)
    .attr('fill',TOKENS.muted).attr('font-size',9.5).text(d=>shortLabel(d.id));
  sim.on('tick',()=>{
    link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    node.attr('transform',d=>`translate(${d.x=Math.max(r(d.v),Math.min(W-r(d.v),d.x))},${d.y=Math.max(r(d.v),Math.min(H-r(d.v),d.y))})`);
  });
  renderLegend(nodes,'leg');
}
window.__vizRedraw=draw;
draw();
addEventListener('resize',draw);
