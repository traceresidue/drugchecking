/* Nº 12a · Nested Co-occurrence Chord — hub focus + partner drill-down.
   Select an arc → focal moves to center hub; outer ring = partners only with chord ribbons.
   Click hub → drill chord sized by shared-sample counts with focal. */
const {scaffold,classify,fmt,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
const CO=DATA.cooccurrence, SUB=DATA.top_substances;

const counts=Object.fromEntries(SUB.map(d=>[d.substance,d.samples]));
const allNames=[...new Set(CO.flatMap(d=>[d.a,d.b]))].filter(n=>counts[n]);
const maxSamples=Math.max(...Object.values(counts),1);
const TOTAL_SAMPLES=6580;

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

const state={topN:16,clsFilt:'all',focal:null,drilled:false};

const stage=scaffold({
  tag:'Nº 12a · SUPPLY',
  title:'Nested Co-occurrence Chord',
  dek:'Click an outer arc to focus a substance in the center — the ring rebuilds to its partners only, with chord ribbons sized by shared samples. Click the hub to drill deeper.',
  how:`The <b>outer ring</b> is the full co-occurrence chord. <b>Click an arc</b> to focus: that substance moves to a <b>center hub</b> and disappears from the ring. The ring <b>rebuilds to partners only</b>; arc width and chord ribbon area reflect <b>shared-sample counts within the focal subset</b> (samples containing the focus). Curved <b>chord ribbons</b> run from the hub to each partner; partner–partner chords stay on the ring. The top-right <b>sample pie</b> shows what fraction of all tested samples contain the focus. <b>Click the hub</b> to drill into a partner-only chord. Press <b>Esc</b> to step back.`,
  provenance:'Real co-occurrence counts from 6,580 tested samples; outer ring defaults to top 16 substances.',
  harm:'Thick ribbons to xylazine or 4-ANPP on a fentanyl hub map real-world "recipes." Each adulterant needs a different clinical response.'
});

stage.innerHTML=`
<style>
  .co-wrap{position:relative}
  .co-sel{position:absolute;top:14px;left:14px;z-index:2;width:min(300px,calc(100% - 28px));background:${TOKENS.panel2};border:1px solid ${TOKENS.line};border-radius:10px;padding:12px 14px;font-size:12px;line-height:1.45;pointer-events:auto;max-height:calc(100% - 28px);overflow:auto}
  .co-sel h3{margin:0 0 8px;font-size:14px;font-weight:700;line-height:1.25}
  .co-sel .hint{color:${TOKENS.faint};font-size:11px;margin:0}
  .co-sel ol{margin:8px 0 0;padding:0;list-style:none}
  .co-sel li{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-top:1px solid ${TOKENS.line};font-size:11.5px}
  .co-sel li:first-child{border-top:none;padding-top:0}
  .co-sel .pair{color:${TOKENS.muted};flex:1;min-width:0;line-height:1.35}
  .co-sel .cnt{color:${TOKENS.ink};font-family:ui-monospace,monospace;font-weight:600;white-space:nowrap}
  .co-sel button{margin-top:10px;background:transparent;border:1px solid ${TOKENS.line};color:${TOKENS.muted};border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer}
  .co-sel button:hover{color:${TOKENS.ink};border-color:${TOKENS.muted}}
  .co-scale{position:absolute;top:14px;right:14px;z-index:2;background:${TOKENS.panel2};border:1px solid ${TOKENS.line};border-radius:10px;padding:10px 12px;font-size:11px;line-height:1.4;min-width:148px;display:none}
  .co-scale.on{display:block}
  .co-scale .pct{font:700 18px/1 ui-monospace,monospace;color:${TOKENS.ink};margin:4px 0 2px}
  .co-scale .nums{color:${TOKENS.muted};font-size:10px;font-family:ui-monospace,monospace}
  .co-lbl{font-size:11px;color:${TOKENS.muted}}
  #topn-val{min-width:24px;text-align:center;font-family:ui-monospace,monospace;color:${TOKENS.ink}}
  #crumb{font-size:12px;color:${TOKENS.muted};margin-bottom:10px}
  #crumb b{color:${TOKENS.ink}}
  #crumb button{background:none;border:none;color:${TOKENS.info};cursor:pointer;font-size:12px;padding:0;margin-right:6px}
  #crumb button:hover{text-decoration:underline}
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
  <div class="co-sel" id="sel-panel">
    <p class="hint">Click a chord arc to focus it in the center hub.</p>
  </div>
  <div class="co-scale" id="sample-scale" aria-live="polite"></div>
  <svg id="svg" width="100%" height="680" role="img" aria-label="Nested chord diagram of substance co-occurrence"></svg>
</div>`;

const clsHost=document.getElementById('cls-filt');
CLASS_FILTERS.forEach(([c,l])=>{
  const b=document.createElement('button');
  b.className='tgl'; b.textContent=l;
  b.setAttribute('aria-pressed',c==='all');
  b.onclick=()=>{
    state.clsFilt=c;
    state.focal=null;
    state.drilled=false;
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
  state.drilled=false;
  draw();
};

function resetAll(){state.focal=null;state.drilled=false;draw();}
function stepBack(){
  if(state.drilled){state.drilled=false;}
  else if(state.focal){state.focal=null;}
  draw();
}

document.getElementById('clear').onclick=resetAll;
document.getElementById('back').onclick=stepBack;
addEventListener('keydown',e=>{if(e.key==='Escape')stepBack();});

function coCount(a,b){
  const row=CO.find(d=>(d.a===a&&d.b===b)||(d.a===b&&d.b===a));
  return row?row.n:0;
}

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

function buildDrillMatrix(focal,partners){
  const names=[focal,...partners.map(p=>p.name)];
  const N=names.length;
  const M=Array.from({length:N},()=>Array(N).fill(0));
  partners.forEach((p,j)=>{
    const k=j+1;
    M[0][k]=p.n;
    M[k][0]=p.n;
  });
  return {names,M};
}

function shortLabel(s,max=15){
  return s.length>max?s.slice(0,max-1)+'…':s;
}

function arcAngle(group){
  return (group.startAngle+group.endAngle)/2;
}

function layoutPartnerRing(partners,padAngle=0.035){
  const total=d3.sum(partners,p=>p.n);
  let angle=0;
  return partners.map((p,i)=>{
    const span=(p.n/total)*(2*Math.PI-padAngle*partners.length);
    const g={name:p.name,n:p.n,index:i,value:p.n,startAngle:angle,endAngle:angle+span};
    angle+=span+padAngle;
    return g;
  });
}

function ribbonEnds(group,r,pad=0.04){
  const span=group.endAngle-group.startAngle;
  const inset=span*pad;
  return {startAngle:group.startAngle+inset,endAngle:group.endAngle-inset,radius:r};
}

const varRibbon=d3.ribbon()
  .radius(d=>d.radius)
  .startAngle(d=>d.startAngle)
  .endAngle(d=>d.endAngle);

function hubRibbonLink(hubR,ir,group,coCount,maxCo){
  const mid=arcAngle(group);
  const hubSpread=0.012+(coCount/maxCo)*0.1;
  const arc=ribbonEnds(group,ir-2,0.06);
  return {
    source:{startAngle:mid-hubSpread/2,endAngle:mid+hubSpread/2,radius:hubR},
    target:{startAngle:arc.startAngle,endAngle:arc.endAngle,radius:arc.radius},
    value:coCount
  };
}

function updateCrumb(){
  const el=document.getElementById('crumb');
  if(!state.focal){el.innerHTML='';return;}
  if(state.drilled){
    el.innerHTML=`<button type="button" id="crumb-back">← hub</button><button type="button" id="crumb-all">all</button> · <b>${state.focal}</b> partners (arc size = shared samples)`;
  }else{
    el.innerHTML=`<button type="button" id="crumb-all">← all</button> · <b>${state.focal}</b> hub — click center to drill in`;
  }
  document.getElementById('crumb-all')?.addEventListener('click',resetAll);
  document.getElementById('crumb-back')?.addEventListener('click',()=>{state.drilled=false;draw();});
}

function updateSampleScale(focal){
  const el=document.getElementById('sample-scale');
  if(!focal){
    el.classList.remove('on');
    el.innerHTML='';
    return;
  }
  const n=counts[focal]||0;
  const pct=Math.min(100,n/TOTAL_SAMPLES*100);
  const r=18,cx=22,cy=22;
  const rad=pct/100*2*Math.PI;
  const x1=cx+r*Math.sin(rad), y1=cy-r*Math.cos(rad);
  const large=pct>50?1:0;
  const col=buildColorMap([focal])[focal]||subColor(focal);
  el.classList.add('on');
  el.innerHTML=`
    <div class="muted" style="font-size:10px">sample subset</div>
    <svg width="44" height="44" style="display:block;margin:4px auto 6px" aria-hidden="true">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${TOKENS.line}"/>
      ${pct>0?`<path d="M ${cx} ${cy-r} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${cx} ${cy} Z" fill="${col}"/>`:''}
    </svg>
    <div class="pct" style="text-align:center">${pct.toFixed(1)}%</div>
    <div class="nums" style="text-align:center">${fmt.int(n)} / ${fmt.int(TOTAL_SAMPLES)} samples</div>
    <div class="faint" style="font-size:9px;text-align:center;margin-top:4px">contain ${shortLabel(focal,14)}</div>`;
}

function updateSelPanel(focal,partners){
  const panel=document.getElementById('sel-panel');
  const clearBtn=document.getElementById('clear');
  const backBtn=document.getElementById('back');
  backBtn.disabled=!state.focal;
  clearBtn.disabled=!state.focal;

  if(!focal){
    panel.innerHTML='<p class="hint">Click a chord arc to focus it in the center hub.</p>';
    return;
  }
  const names=[focal,...partners.map(p=>p.name)];
  const col=buildColorMap(names)[focal]||subColor(focal);
  const modeNote=state.drilled
    ? 'Drill view — arc sizes = shared samples with focus'
    : 'Partner ring sized by shared samples · click hub to drill';
  panel.innerHTML=`
    <h3 style="color:${col}">${focal}</h3>
    <div class="muted" style="font-size:11px">${fmt.int(counts[focal])} total samples · ${partners.length} partner${partners.length===1?'':''}s</div>
    <div class="faint" style="font-size:10px;margin-top:4px">${modeNote}</div>
    <ol>${partners.map(p=>`
      <li>
        <span class="pair">${p.name} + ${focal}</span>
        <span class="cnt">${fmt.int(p.n)} shared samples</span>
      </li>`).join('')}</ol>
    <button type="button" id="panel-clear">clear</button>`;
  document.getElementById('panel-clear').onclick=resetAll;
}

function drawHubView(g,focal,R,ir){
  const partners=allPartners(focal);
  if(!partners.length){
    g.append('text').attr('text-anchor','middle').attr('fill',TOKENS.muted)
      .text('No partners match the current filter.');
    updateSelPanel(focal,[]);
    updateSampleScale(focal);
    return;
  }

  const partnerNames=partners.map(p=>p.name);
  const colors=buildColorMap([focal,...partnerNames]);
  const groups=layoutPartnerRing(partners,0.035);
  const maxCo=Math.max(...partners.map(p=>p.n),1);
  const hubR=22+Math.sqrt(counts[focal]/maxSamples)*38;
  const arc=d3.arc().innerRadius(ir).outerRadius(R);

  updateSelPanel(focal,partners);
  updateSampleScale(focal);

  const hubLinks=groups.map(grp=>hubRibbonLink(hubR,ir,grp,grp.n,maxCo));
  g.append('g').attr('class','hub-ribbons')
    .selectAll('path').data(hubLinks).join('path')
    .attr('d',d=>varRibbon(d))
    .attr('fill',(_,i)=>colors[groups[i].name])
    .attr('stroke',TOKENS.bg).attr('stroke-width',0.35)
    .attr('opacity',0.78);

  g.append('g').attr('class','partner-arcs')
    .selectAll('path').data(groups).join('path')
    .attr('d',d=>arc.cornerRadius(2)({startAngle:d.startAngle,endAngle:d.endAngle,innerRadius:ir,outerRadius:R}))
    .attr('fill',d=>colors[d.name])
    .attr('opacity',0.92)
    .attr('stroke',TOKENS.bg).attr('stroke-width',1)
    .style('cursor','pointer')
    .on('click',(e,d)=>{
      e.stopPropagation();
      state.focal=state.focal===d.name?null:d.name;
      state.drilled=false;
      draw();
    });

  g.append('g').attr('class','partner-labels')
    .selectAll('text').data(groups).join('text')
    .each(d=>{d.ang=arcAngle(d);})
    .attr('transform',d=>`rotate(${d.ang*180/Math.PI-90}) translate(${R+8}) ${d.ang>Math.PI?'rotate(180)':''}`)
    .attr('text-anchor',d=>d.ang>Math.PI?'end':'start')
    .attr('dy','.35em')
    .attr('fill',d=>colors[d.name])
    .attr('font-size',11).attr('font-weight',500)
    .style('pointer-events','none')
    .text(d=>shortLabel(d.name,16));

  const hubG=g.append('g').attr('class','hub');
  hubG.append('circle')
    .attr('r',hubR)
    .attr('fill',colors[focal])
    .attr('stroke',TOKENS.ink)
    .attr('stroke-width',2.5)
    .style('cursor','pointer')
    .on('click',e=>{e.stopPropagation();state.drilled=true;draw();});
  hubG.append('text')
    .attr('text-anchor','middle').attr('dy','-.35em')
    .attr('fill',TOKENS.bg).attr('font-size',Math.min(12,hubR/2.8))
    .attr('font-weight',700).style('pointer-events','none')
    .text(shortLabel(focal,hubR>40?18:12));
  hubG.append('text')
    .attr('text-anchor','middle').attr('dy','1em')
    .attr('fill',TOKENS.bg).attr('font-size',9).attr('opacity',0.9)
    .style('pointer-events','none')
    .text(`${fmt.int(counts[focal])} samples`);
  hubG.append('text')
    .attr('text-anchor','middle').attr('y',hubR+14)
    .attr('fill',TOKENS.faint).attr('font-size',9)
    .style('pointer-events','none')
    .text('click to drill in');
}

function drawChord(g,{M,names,colors,R,ir,padAngle,focalIdx,mode}){
  const chord=d3.chordDirected().padAngle(padAngle).sortSubgroups(d3.descending)(M);
  const arc=d3.arc().innerRadius(ir).outerRadius(R);
  const ribbon=d3.ribbonArrow().radius(ir-2);
  const drillMode=mode==='drill';

  g.append('g').attr('class','ribbons')
    .selectAll('path').data(chord).join('path')
    .attr('d',ribbon)
    .attr('fill',d=>colors[names[d.source.index]])
    .attr('stroke',TOKENS.bg).attr('stroke-width',0.35)
    .attr('opacity',drillMode?0.62:0.52)
    .style('cursor','pointer')
    .on('click',(e,d)=>{
      e.stopPropagation();
      if(drillMode){
        state.focal=names[d.source.index];
        draw();
        return;
      }
      const n=names[d.source.index];
      state.focal=state.focal===n?null:n;
      state.drilled=false;
      draw();
    });

  g.append('g').attr('class','arcs')
    .selectAll('path').data(chord.groups).join('path')
    .attr('d',d=>arc.cornerRadius(2)({
      startAngle:d.startAngle,endAngle:d.endAngle,innerRadius:ir,outerRadius:R+(d.index===focalIdx?6:0)
    }))
    .attr('fill',d=>colors[names[d.index]])
    .attr('opacity',d=>d.index===focalIdx?1:0.88)
    .attr('stroke',d=>d.index===focalIdx?TOKENS.ink:TOKENS.bg)
    .attr('stroke-width',d=>d.index===focalIdx?2:1)
    .style('cursor','pointer')
    .on('click',(e,d)=>{
      e.stopPropagation();
      const n=names[d.index];
      if(drillMode&&n===state.focal){
        state.drilled=false;
        draw();
        return;
      }
      state.focal=state.focal===n?null:n;
      state.drilled=false;
      draw();
    });

  g.append('g').attr('class','labels')
    .selectAll('text').data(chord.groups).join('text')
    .each(d=>{d.ang=arcAngle(d);})
    .attr('transform',d=>{
      const rOff=d.index===focalIdx?12:8;
      return `rotate(${d.ang*180/Math.PI-90}) translate(${R+rOff}) ${d.ang>Math.PI?'rotate(180)':''}`;
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

function draw(){
  const svg=d3.select('#svg');
  svg.selectAll('*').remove();
  updateCrumb();

  const W=svg.node().clientWidth,H=680;
  const cx=W/2,cy=H/2+10;
  const g=svg.append('g').attr('transform',`translate(${cx},${cy})`);
  const R=Math.min(W,H)/2-100;
  const ir=R-18;

  if(state.drilled&&state.focal){
    const partners=allPartners(state.focal);
    if(!partners.length){
      g.append('text').attr('text-anchor','middle').attr('fill',TOKENS.muted)
        .text('No partners match the current filter.');
      updateSelPanel(state.focal,[]);
      updateSampleScale(state.focal);
      return;
    }
    const {names,M}=buildDrillMatrix(state.focal,partners);
    const colors=buildColorMap(names);
    updateSelPanel(state.focal,partners);
    updateSampleScale(state.focal);
    drawChord(g,{M,names,colors,R,ir,padAngle:0.04,focalIdx:0,mode:'drill'});
    g.append('text').attr('text-anchor','middle').attr('y',-R-24)
      .attr('fill',TOKENS.faint).attr('font-size',10).attr('font-family','ui-monospace')
      .text('arc width = shared samples with '+shortLabel(state.focal,20));
    svg.on('click',null);
    return;
  }

  if(state.focal){
    drawHubView(g,state.focal,R,ir);
    svg.on('click',()=>{state.focal=null;draw();});
    return;
  }

  updateSampleScale(null);
  const names=filteredSubs();
  if(!names.length){
    g.append('text').attr('text-anchor','middle').attr('fill',TOKENS.muted)
      .text('No substances match the current filter.');
    updateSelPanel(null,[]);
    return;
  }

  const M=buildMatrix(names);
  const colors=buildColorMap(names);
  updateSelPanel(null,[]);
  drawChord(g,{M,names,colors,R,ir,padAngle:0.035,focalIdx:null,mode:'overview'});
  svg.on('click',null);
}

window.__vizRedraw=draw;
draw();
addEventListener('resize',draw);
