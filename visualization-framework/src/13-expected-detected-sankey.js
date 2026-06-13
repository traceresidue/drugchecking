/* Nº 13 · Expected vs. Detected Sankey — what people thought they had (left) flows
   to what the lab actually found (right). The width of each stream dramatizes how
   far the unregulated supply has drifted from what's sold. */
const {scaffold,classify,tooltip,fmt,TOKENS}=DCF;
const ED=DATA.expected_detected, EC=DATA.expected_counts;

const stage=scaffold({
  tag:'Nº 13 · SUPPLY',
  title:'Expected vs. Detected',
  dek:'On the left: what people believed they bought. On the right: what the lab actually detected. Every stream that crosses to an unexpected substance is a gap between belief and reality.',
  how:`A <b>Sankey diagram</b> shows flows. Left nodes are the <b>expected substance</b> (what the sample was sold or believed to be); right nodes are <b>what was detected</b>. Stream width = number of samples. Trace a stream from "fentanyl/heroin" and watch how much of it also lands on <b>xylazine</b> or <b>methamphetamine</b> — adulterants the buyer didn't ask for. This is the single most decision-relevant frame in drug checking, and the shape no static table can convey. <b>Note:</b> one sample can flow to several detected substances (mixtures), so right-side totals exceed left-side counts.`,
  provenance:'Real flows from samples with a stated expected substance and confirmed lab detections (6,580-sample dataset).',
  harm:'If you expect an opioid, assume xylazine and a benzo could be present too. If you expect a stimulant, assume possible fentanyl contamination — test it.'
});

stage.innerHTML=`<div class="panel"><svg id="svg" width="100%" height="540" role="img" aria-label="Sankey of expected versus detected substances"></svg></div>`;
const tt=tooltip();

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=540;
  const expNames=[...new Set(ED.map(d=>d.expected))];
  const detNames=[...new Set(ED.map(d=>d.detected))];
  const nodes=[...expNames.map(n=>({name:n,side:'L'})),...detNames.map(n=>({name:n,side:'R'}))];
  const nidx=new Map(); nodes.forEach((n,i)=>nidx.set(n.side+':'+n.name,i));
  const links=ED.map(d=>({source:nidx.get('L:'+d.expected),target:nidx.get('R:'+d.detected),value:d.n}));
  const sankey=d3.sankey().nodeWidth(16).nodePadding(14).extent([[8,12],[W-8,H-12]]).nodeSort(null);
  const graph=sankey({nodes:nodes.map(d=>({...d})),links:links.map(d=>({...d}))});
  function colOf(name){return classify(name).color;}
  // links
  svg.append('g').attr('fill','none').selectAll('path').data(graph.links).join('path')
    .attr('d',d3.sankeyLinkHorizontal())
    .attr('stroke',d=>colOf(d.target.name)).attr('stroke-width',d=>Math.max(1,d.width)).attr('opacity',.4)
    .on('mouseover',function(){d3.select(this).attr('opacity',.75);})
    .on('mousemove',(e,d)=>tt.show(`expected <b>${d.source.name}</b><br>→ detected <b style="color:${colOf(d.target.name)}">${d.target.name}</b><br><span class="muted">${fmt.int(d.value)} samples</span>`,e.clientX,e.clientY))
    .on('mouseleave',function(){d3.select(this).attr('opacity',.4);tt.hide();});
  // nodes
  const gn=svg.append('g').selectAll('g').data(graph.nodes).join('g');
  gn.append('rect').attr('x',d=>d.x0).attr('y',d=>d.y0).attr('width',d=>d.x1-d.x0).attr('height',d=>Math.max(1,d.y1-d.y0))
    .attr('fill',d=>colOf(d.name)).attr('opacity',.92);
  gn.append('text').attr('x',d=>d.side==='L'?d.x0-6:d.x1+6).attr('y',d=>(d.y0+d.y1)/2).attr('dy','.35em')
    .attr('text-anchor',d=>d.side==='L'?'end':'start').attr('fill',TOKENS.ink).attr('font-size',12)
    .text(d=>d.name).clone(true).lower().attr('stroke',TOKENS.bg).attr('stroke-width',3);
  // headers
  svg.append('text').attr('x',8).attr('y',8).attr('fill',TOKENS.muted).attr('font-size',11).attr('font-weight',600).text('EXPECTED');
  svg.append('text').attr('x',W-8).attr('y',8).attr('text-anchor','end').attr('fill',TOKENS.muted).attr('font-size',11).attr('font-weight',600).text('DETECTED');
}
draw();
addEventListener('resize',draw);
