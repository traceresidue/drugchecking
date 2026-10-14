/* Nº 12b · Chord → Sankey Co-occurrence — overview chord, drill to partner flows.
   Click an arc in the chord ring to transform into a Sankey: focal substance on the
   left, co-occurring partners on the right, band width = shared-sample count, labels
   embedded in each flow. */
const {scaffold,classify,fmt,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
const CO=DATA.cooccurrence, SUB=DATA.top_substances;
const TOTAL_SAMPLES=6580;

const counts=Object.fromEntries(SUB.map(d=>[d.substance,d.samples]));
const allNames=[...new Set(CO.flatMap(d=>[d.a,d.b]))].filter(n=>counts[n]);
const maxSamples=Math.max(...Object.values(counts),1);

const CLASS_FILTERS=[
  ['all','All'],
  ['fent','Fentanyl & analogs'],
  ['opioid','Opioid'],
  ['xyl','Sedative / xylazine'],
  ['stim','Stimulant'],
  ['coke','Cocaine'],
  ['benzo','Benzo'],
  ['cut','Cuts'],
];

const state={topN:16,clsFilt:'all',focal:null};

const stage=scaffold({
  tag:'Nº 12b · SUPPLY',
  title:'Chord → Sankey Co-occurrence',
  dek:'Start with the full co-occurrence chord — then click any substance to drill into a Sankey where your selection anchors the left and partner flows stream right, labeled inside each band.',
  how:`The <b>outer ring</b> is the standard co-occurrence chord (filter by class or top-N count). <b>Click an arc</b> to drill in: the view becomes a <b>Sankey diagram</b> with your selected substance on the <b>left</b>, co-occurring partners on the <b>right</b>, and flowing bands whose width = <b>shared-sample count</b>. Each band carries an inline label (e.g. <b>fentanyl → 4-ANPP · 2,789 shared samples</b>). The title shows the focal substance and its total sample count. Press <b>Esc</b>, <b>back</b>, or <b>clear</b> to return to the chord overview.`,
  provenance:'Real co-occurrence counts from 6,580 tested samples; outer ring defaults to top 16 substances.',
  harm:'Thick flows to xylazine or 4-ANPP on a fentanyl focal node map real-world "recipes." Each adulterant needs a different clinical response.'
});

stage.innerHTML=`
<style>
  .co-wrap{position:relative}
  .co-lbl{font-size:11px;color:${TOKENS.muted}}
  #topn-val{min-width:24px;text-align:center;font-family:ui-monospace,monospace;color:${TOKENS.ink}}
  #crumb{font-size:12px;color:${TOKENS.muted};margin-bottom:10px}
  #crumb b{color:${TOKENS.ink}}
  #crumb button{background:none;border:none;color:${TOKENS.info};cursor:pointer;font-size:12px;padding:0;margin-right:6px}
  #crumb button:hover{text-decoration:underline}
  .co-pie{position:absolute;top:14px;right:14px;z-index:2;pointer-events:none}
  .co-pie text{fill:${TOKENS.muted};font-size:9px;font-family:ui-monospace,monospace}
  .co-pie .pie-lbl{fill:${TOKENS.faint};font-size:8px;text-transform:uppercase;letter-spacing:.08em}
  .sk-title{pointer-events:none}
  .sk-title h2{margin:0;font-size:20px;font-weight:700;line-height:1.2}
  .sk-title .tot{font-size:12px;color:${TOKENS.muted};margin-top:4px;font-family:ui-monospace,monospace}
  .flow-lbl{font-size:10px;font-weight:600;pointer-events:none}
  .flow-lbl .cnt{font-family:ui-monospace,monospace;font-weight:700}
</style>
<div id="crumb"></div>
<div class="controls">
  <span class="co-lbl">Show top</span>
  <input type="range" id="topn" min="8" max="20" value="16" style="width:100px">
  <span id="topn-val">16</span>
  <span class="co-lbl">substances</span>
  <button class="tgl" id="back" disabled>← back</button>
  <button class="tgl" id="clear" disabled>clear</button>
</div>
<div class="controls" id="cls-filt"></div>
<div class="panel co-wrap">
  <svg id="pie" class="co-pie" width="72" height="72" aria-hidden="true"></svg>
  <svg id="svg" width="100%" height="680" role="img" aria-label="Co-occurrence chord and Sankey drill-down"></svg>
</div>`;

const clsHost=document.getElementById('cls-filt');
CLASS_FILTERS.forEach(([c,l])=>{
  const b=document.createElement('button');
  b.className='tgl'; b.textContent=l;
  b.setAttribute('aria-pressed',c==='all');
  b.onclick=()=>{
    state.clsFilt=c;
    state.focal=null;
    clsHost.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));
    draw();
  };
  clsHost.appendChild(b);
});

const topnEl=document.getElementById('topn');
const topnVal=document.getElementById('topn-val');
topnEl.oninput=()=>{
  state.topN=+topnEl.value;
  topnVal.textContent=topnEl.value;
  state.focal=null;
  draw();
};

function resetAll(){state.focal=null;draw();}
function stepBack(){state.focal=null;draw();}

document.getElementById('clear').onclick=resetAll;
document.getElementById('back').onclick=stepBack;
addEventListener('keydown',e=>{if(e.key==='Escape')stepBack();});

function buildColorMap(names){
  const map={};
  const byCls={};
  names.forEach(n=>{const c=classify(n).cls;(byCls[c]??=[]).push(n);});
  Object.entries(byCls).forEach(([,list])=>{
    list.sort((a,b)=>counts[b]-counts[a]);
    const base=d3.hsl(subColor(list[0]));
    list.forEach((name,i)=>{
      const t=list.length>1?i/(list.length-1):0.5;
      const h=(base.h+(t-0.5)*42+360)%360;
      const s=Math.min(0.95,base.s+(t-0.5)*0.18);
      const l=Math.min(0.78,Math.max(0.42,base.l+(t-0.5)*0.14));
      map[name]=d3.hsl(h,s,l).formatHex();
    });
  });
  return map;
}

function filteredSubs(){
  let subs=allNames.slice().sort((a,b)=>counts[b]-counts[a]);
  if(state.clsFilt!=='all') subs=subs.filter(n=>classify(n).cls===state.clsFilt);
  return subs.slice(0,state.topN);
}

function buildMatrix(names){
  const idx=Object.fromEntries(names.map((n,i)=>[n,i]));
  const N=names.length;
  const M=Array.from({length:N},()=>Array(N).fill(0));
  CO.forEach(d=>{
    if(idx[d.a]!=null&&idx[d.b]!=null){
      M[idx[d.a]][idx[d.b]]+=d.n;
      M[idx[d.b]][idx[d.a]]+=d.n;
    }
  });
  return M;
}

function allPartners(focal){
  let pairs=CO.filter(d=>d.a===focal||d.b===focal)
    .map(d=>({name:d.a===focal?d.b:d.a,n:d.n}))
    .filter(p=>counts[p.name]);
  if(state.clsFilt!=='all') pairs=pairs.filter(p=>classify(p.name).cls===state.clsFilt);
  const seen=new Map();
  pairs.forEach(p=>{if(!seen.has(p.name)||seen.get(p.name)<p.n)seen.set(p.name,p.n);});
  return [...seen.entries()].map(([name,n])=>({name,n}))
    .sort((a,b)=>b.n-a.n)
    .slice(0,state.topN);
}

function shortLabel(s,max=15){
  return s.length>max?s.slice(0,max-1)+'…':s;
}

function arcAngle(group){
  return (group.startAngle+group.endAngle)/2;
}

function updateCrumb(){
  const el=document.getElementById('crumb');
  const backBtn=document.getElementById('back');
  const clearBtn=document.getElementById('clear');
  backBtn.disabled=!state.focal;
  clearBtn.disabled=!state.focal;
  if(!state.focal){el.innerHTML='';return;}
  el.innerHTML=`<button type="button" id="crumb-all">← chord</button> · <b>${state.focal}</b> Sankey — band width = shared samples`;
  document.getElementById('crumb-all')?.addEventListener('click',resetAll);
}

function drawSamplePie(focal){
  const pieSvg=d3.select('#pie');
  pieSvg.selectAll('*').remove();
  if(!focal){
    pieSvg.style('display','none');
    return;
  }
  pieSvg.style('display',null);
  const r=28, cx=36, cy=36;
  const focalN=counts[focal]||0;
  const data=[
    {label:'focal',value:focalN,color:buildColorMap([focal])[focal]||subColor(focal)},
    {label:'other',value:Math.max(0,TOTAL_SAMPLES-focalN),color:TOKENS.line},
  ];
  const pie=d3.pie().value(d=>d.value).sort(null);
  const arc=d3.arc().innerRadius(14).outerRadius(r);
  const g=pieSvg.append('g').attr('transform',`translate(${cx},${cy})`);
  g.selectAll('path').data(pie(data)).join('path')
    .attr('d',arc)
    .attr('fill',d=>d.data.color)
    .attr('stroke',TOKENS.bg)
    .attr('stroke-width',1);
  g.append('text').attr('text-anchor','middle').attr('dy','.35em')
    .attr('fill',TOKENS.ink).attr('font-size',10).attr('font-weight',700)
    .text(`${Math.round(focalN/TOTAL_SAMPLES*100)}%`);
  pieSvg.append('text').attr('x',cx).attr('y',68).attr('text-anchor','middle').attr('class','pie-lbl')
    .text('of samples');
  pieSvg.append('text').attr('x',cx).attr('y',10).attr('text-anchor','middle').attr('class','pie-lbl')
    .text(`${fmt.int(focalN)}/${fmt.int(TOTAL_SAMPLES)}`);
}

function selectFocal(name){
  state.focal=state.focal===name?null:name;
  draw();
}

function drawChord(g,{M,names,colors,R,ir,padAngle,focalIdx}){
  const chord=d3.chordDirected().padAngle(padAngle).sortSubgroups(d3.descending)(M);
  const arc=d3.arc().innerRadius(ir).outerRadius(R);
  const ribbon=d3.ribbonArrow().radius(ir-2);

  g.append('g').attr('class','ribbons')
    .selectAll('path').data(chord).join('path')
    .attr('d',ribbon)
    .attr('fill',d=>colors[names[d.source.index]])
    .attr('stroke',TOKENS.bg).attr('stroke-width',0.35)
    .attr('opacity',d=>{
      if(focalIdx!=null){
        const hit=d.source.index===focalIdx||d.target.index===focalIdx;
        return hit?0.88:0.05;
      }
      return 0.52;
    })
    .style('cursor','pointer')
    .on('click',(e,d)=>{
      e.stopPropagation();
      selectFocal(names[d.source.index]);
    });

  g.append('g').attr('class','arcs')
    .selectAll('path').data(chord.groups).join('path')
    .attr('d',d=>{
      const sel=d.index===focalIdx;
      return arc.cornerRadius(2)({
        startAngle:d.startAngle,endAngle:d.endAngle,
        innerRadius:ir,outerRadius:R+(sel?7:0)
      });
    })
    .attr('fill',d=>colors[names[d.index]])
    .attr('opacity',d=>d.index===focalIdx?1:0.88)
    .attr('stroke',d=>d.index===focalIdx?TOKENS.ink:TOKENS.bg)
    .attr('stroke-width',d=>d.index===focalIdx?2:1)
    .style('cursor','pointer')
    .on('click',(e,d)=>{
      e.stopPropagation();
      selectFocal(names[d.index]);
    });

  g.append('g').attr('class','labels')
    .selectAll('text').data(chord.groups).join('text')
    .each(d=>{d.ang=arcAngle(d);})
    .attr('transform',d=>{
      const sel=d.index===focalIdx;
      return `rotate(${d.ang*180/Math.PI-90}) translate(${R+(sel?12:8)}) ${d.ang>Math.PI?'rotate(180)':''}`;
    })
    .attr('text-anchor',d=>d.ang>Math.PI?'end':'start')
    .attr('dy','.35em')
    .attr('fill',d=>colors[names[d.index]])
    .attr('font-size',d=>d.index===focalIdx?13:11)
    .attr('font-weight',d=>d.index===focalIdx?700:500)
    .style('pointer-events','none')
    .text(d=>shortLabel(names[d.index],16));

  return chord;
}

function flowLabelText(focal,partner,n){
  return `${shortLabel(focal,18)} → ${shortLabel(partner,18)}  ${fmt.int(n)} shared samples`;
}

function drawSankey(svg,focal,partners,colors,H){
  svg.selectAll('*').remove();
  const W=svg.node().clientWidth;
  const titleH=52;
  const margin={top:titleH+44,right:160,bottom:28,left:160};
  const innerW=W-margin.left-margin.right;
  const innerH=H-margin.top-margin.bottom;
  const minPad=Math.max(14,Math.min(22,innerH/Math.max(partners.length,1)*0.38));

  const nodes=[
    {name:focal,side:'L'},
    ...partners.map(p=>({name:p.name,side:'R'})),
  ];
  const nidx=new Map(nodes.map((n,i)=>[n.side+':'+n.name,i]));
  const links=partners.map(p=>({
    source:nidx.get('L:'+focal),
    target:nidx.get('R:'+p.name),
    value:p.n,
    partner:p.name,
  }));

  const sankey=d3.sankey()
    .nodeWidth(20)
    .nodePadding(minPad)
    .nodeAlign(d3.sankeyLeft)
    .extent([[margin.left,margin.top],[margin.left+innerW,margin.top+innerH]]);

  const graph=sankey({
    nodes:nodes.map(d=>({...d})),
    links:links.map(d=>({...d})),
  });

  const g=svg.append('g');
  const focalCol=colors[focal]||subColor(focal);

  const titleG=g.append('g').attr('class','sk-title');
  titleG.append('text').attr('class','sk-title').attr('x',margin.left).attr('y',28)
    .attr('fill',focalCol).attr('font-size',20).attr('font-weight',700)
    .text(focal);
  titleG.append('text').attr('class','tot').attr('x',margin.left).attr('y',48)
    .attr('fill',TOKENS.muted).attr('font-size',12).attr('font-family','ui-monospace,monospace')
    .text(`${fmt.int(counts[focal]||0)} total samples · ${partners.length} co-occurring partner${partners.length===1?'':'s'}`);

  g.append('text').attr('x',margin.left).attr('y',margin.top-10)
    .attr('fill',TOKENS.muted).attr('font-size',10).attr('font-weight',600).attr('letter-spacing','.06em')
    .text('FOCAL SUBSTANCE');
  g.append('text').attr('x',margin.left+innerW).attr('y',margin.top-10)
    .attr('text-anchor','end').attr('fill',TOKENS.muted).attr('font-size',10).attr('font-weight',600).attr('letter-spacing','.06em')
    .text('CO-OCCURRING PARTNERS');

  const linkG=g.append('g').attr('fill','none').attr('stroke-opacity',0.55);
  linkG.selectAll('path').data(graph.links).join('path')
    .attr('d',d3.sankeyLinkHorizontal())
    .attr('stroke',d=>colors[d.target.name]||subColor(d.target.name))
    .attr('stroke-width',d=>Math.max(2,d.width))
    .attr('class','sk-link')
    .style('cursor','pointer')
    .on('mouseover',function(){d3.select(this).attr('stroke-opacity',0.82);})
    .on('mouseout',function(){d3.select(this).attr('stroke-opacity',0.55);});

  const gn=g.append('g').selectAll('g').data(graph.nodes).join('g');
  gn.append('rect')
    .attr('x',d=>d.x0).attr('y',d=>d.y0)
    .attr('width',d=>Math.max(1,d.x1-d.x0))
    .attr('height',d=>Math.max(1,d.y1-d.y0))
    .attr('fill',d=>colors[d.name]||subColor(d.name))
    .attr('opacity',0.92)
    .attr('rx',2)
    .style('cursor',d=>d.side==='R'?'pointer':'default')
    .on('click',(e,d)=>{
      e.stopPropagation();
      if(d.side==='R') selectFocal(d.name);
    });

  gn.append('text')
    .attr('x',d=>d.side==='L'?d.x0-10:d.x1+10)
    .attr('y',d=>(d.y0+d.y1)/2)
    .attr('dy','.35em')
    .attr('text-anchor',d=>d.side==='L'?'end':'start')
    .attr('fill',d=>colors[d.name]||subColor(d.name))
    .attr('font-size',d=>d.side==='L'?13:11)
    .attr('font-weight',d=>d.side==='L'?700:500)
    .text(d=>shortLabel(d.name,d.side==='L'?24:20))
    .clone(true).lower()
    .attr('stroke',TOKENS.bg).attr('stroke-width',3).attr('fill','none');

  const lblG=g.append('g').attr('class','flow-labels');
  graph.links.forEach(link=>{
    const mx=(link.source.x1+link.target.x0)/2;
    const my=(link.y0+link.y1)/2;
    const text=flowLabelText(focal,link.target.name,link.value);
    const fs=link.width>=28?11:link.width>=18?10:9;
    if(link.width<10) return;

    const tg=lblG.append('g').attr('class','flow-lbl').attr('transform',`translate(${mx},${my})`);
    const t=tg.append('text').attr('text-anchor','middle').attr('dy','.35em')
      .attr('fill',TOKENS.ink).attr('font-size',fs).attr('font-weight',600);
    t.append('tspan').text(`${shortLabel(focal,16)} → ${shortLabel(link.target.name,16)}  `);
    t.append('tspan').attr('class','cnt').attr('fill',colors[link.target.name]||subColor(link.target.name))
      .text(`${fmt.int(link.value)} shared samples`);
    const bb=t.node().getBBox();
    tg.insert('rect','text')
      .attr('x',bb.x-6).attr('y',bb.y-3)
      .attr('width',bb.width+12).attr('height',bb.height+6)
      .attr('rx',4)
      .attr('fill',TOKENS.bg).attr('opacity',0.88)
      .attr('stroke',TOKENS.line).attr('stroke-width',0.5);
  });

  svg.on('click',null);
}

function sankeyHeight(partnerCount){
  return Math.max(820,96+partnerCount*42);
}

function draw(){
  const svg=d3.select('#svg');
  updateCrumb();
  drawSamplePie(state.focal);

  if(state.focal){
    const partners=allPartners(state.focal);
    const names=[state.focal,...partners.map(p=>p.name)];
    const colors=buildColorMap(names);
    const H=sankeyHeight(partners.length);
    svg.attr('height',H);
    if(!partners.length){
      svg.selectAll('*').remove();
      svg.append('text')
        .attr('x',svg.node().clientWidth/2).attr('y',H/2)
        .attr('text-anchor','middle').attr('fill',TOKENS.muted)
        .text('No partners match the current filter.');
      return;
    }
    drawSankey(svg,state.focal,partners,colors,H);
    return;
  }

  svg.attr('height',680);
  svg.selectAll('*').remove();
  svg.on('click',null);

  const W=svg.node().clientWidth,H=680;
  const cx=W/2,cy=H/2+10;
  const g=svg.append('g').attr('transform',`translate(${cx},${cy})`);
  const R=Math.min(W,H)/2-100;
  const ir=R-18;

  const names=filteredSubs();
  if(!names.length){
    g.append('text').attr('text-anchor','middle').attr('fill',TOKENS.muted)
      .text('No substances match the current filter.');
    return;
  }

  const M=buildMatrix(names);
  const colors=buildColorMap(names);
  drawChord(g,{M,names,colors,R,ir,padAngle:0.035,focalIdx:null});
}

window.__vizRedraw=draw;
draw();
addEventListener('resize',draw);
