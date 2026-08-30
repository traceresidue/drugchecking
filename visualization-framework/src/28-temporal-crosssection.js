/* Nº 28 · Temporal Cross-Section — what did the supply look like at one point in time?
   A month slider reveals the exact composition that month: a donut chart of substance
   classes, a bar chart of top substances, and a month-over-month delta indicator.
   The goal: make any past month's snapshot instantly readable. */
const {scaffold,classify,fmt,tooltip,TOKENS}=DCF;
const MC=DATA.monthly_class, MN=DATA.monthly;

const CLS=[['fent','Fentanyl & analogs'],['opioid','Opioid'],['xyl','Sedative / xylazine'],
  ['stim','Stimulant'],['coke','Cocaine'],['benzo','Benzodiazepine'],['cut','Cut / diluent'],['other','Other']];
const COL={fent:TOKENS.fent,opioid:TOKENS.opioid,xyl:TOKENS.xyl,stim:TOKENS.stim,coke:TOKENS.coke,benzo:TOKENS.benzo,cut:TOKENS.cut,other:TOKENS.other};

const stage=scaffold({
  tag:'Nº 28 · EXPERIMENTAL',
  title:'Temporal Cross-Section',
  dek:'Drag the slider to any month and see exactly what the supply looked like that week. A donut of class composition, a bar chart of top substances, and what changed from the month before.',
  how:`Use the <b>slider</b> to navigate to any month in the dataset. The <b>donut chart</b> shows the share of each substance class among tested samples that month. The <b>bar chart</b> shows the most detected individual substances. The <b>delta indicators</b> show which classes grew or shrank most compared to the previous month. <b>Design goal:</b> make any historical month instantly legible — useful for outbreak retrospectives, conference talks, or teaching supply dynamics.`,
  provenance:'Real monthly substance counts by class and by individual substance (6,580-sample dataset, 2022–2024).',
  harm:'Past months inform current risk — when a substance appears in historic data it often persists. Never assume a substance has left the supply until months of testing confirm absence.'
});

const months=[...new Set(MC.map(d=>d.month))].sort();
let selIdx=months.length-1;

stage.innerHTML=`
<div class="controls" style="align-items:center;gap:14px">
  <span class="muted" style="font-size:12px;white-space:nowrap">Select month:</span>
  <input type="range" id="mslider" min="0" max="${months.length-1}" value="${selIdx}" style="flex:1;accent-color:${TOKENS.fent}">
  <span class="mono" id="mLabel" style="font-size:15px;font-weight:700;color:${TOKENS.ink};min-width:7ch;text-align:right"></span>
</div>
<div style="display:grid;grid-template-columns:1fr 1.6fr;gap:16px;margin-top:14px">
  <div class="panel" style="display:flex;flex-direction:column;align-items:center">
    <div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:6px;align-self:flex-start">CLASS COMPOSITION</div>
    <svg id="donut" width="100%" height="280" role="img" aria-label="Donut chart of substance class composition"></svg>
    <div id="donutLeg" class="legend" style="margin-top:6px;justify-content:center"></div>
  </div>
  <div class="panel">
    <div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:6px">TOP SUBSTANCES THIS MONTH</div>
    <svg id="bars" width="100%" height="280"></svg>
  </div>
</div>
<div class="panel" id="deltaPanel" style="margin-top:14px">
  <div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:10px">CHANGE FROM PREVIOUS MONTH</div>
  <div id="deltas" style="display:flex;gap:10px;flex-wrap:wrap"></div>
</div>`;

const tt=tooltip();

function classShareForMonth(m){
  const rows=MC.filter(d=>d.month===m);
  const total=rows.reduce((a,b)=>a+b.n,0)||1;
  const o={};
  CLS.forEach(([k])=>o[k]=(rows.find(d=>d.cls===k)||{n:0}).n/total);
  return o;
}

function drawDonut(month){
  const svg=d3.select('#donut'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth||240, H=280, R=Math.min(W,H)/2-14, ir=R*0.52;
  const g=svg.append('g').attr('transform',`translate(${W/2},${H/2})`);
  const rows=MC.filter(d=>d.month===month);
  const total=rows.reduce((a,b)=>a+b.n,0)||1;
  const slices=CLS.map(([k,l])=>({k,l,n:(rows.find(d=>d.cls===k)||{n:0}).n})).filter(d=>d.n>0);
  const pie=d3.pie().value(d=>d.n).sort(null)(slices);
  const arc=d3.arc().innerRadius(ir).outerRadius(R);
  const arcHov=d3.arc().innerRadius(ir).outerRadius(R+6);
  g.selectAll('path').data(pie).join('path')
    .attr('d',arc).attr('fill',d=>COL[d.data.k]).attr('stroke',TOKENS.bg).attr('stroke-width',2)
    .style('cursor','pointer')
    .on('mouseover',function(e,d){d3.select(this).attr('d',arcHov);})
    .on('mouseout',function(e,d){d3.select(this).attr('d',arc);tt.hide();})
    .on('mousemove',(e,d)=>tt.show(`<b style="color:${COL[d.data.k]}">${d.data.l}</b><br>${fmt.int(d.data.n)} samples · ${fmt.pct(d.data.n/total*100)}`,e.clientX,e.clientY));
  // center total
  g.append('text').attr('text-anchor','middle').attr('dy','-.2em').attr('font-size',24).attr('font-weight',700).attr('fill',TOKENS.ink).text(fmt.int(total));
  g.append('text').attr('text-anchor','middle').attr('dy','1.4em').attr('font-size',11).attr('fill',TOKENS.muted).text('samples');
  document.getElementById('donutLeg').innerHTML=CLS.filter(([k])=>slices.find(s=>s.k===k)).map(([k,l])=>`<span><i style="background:${COL[k]}"></i>${l}</span>`).join('');
}

function drawBars(month){
  const svg=d3.select('#bars'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth||300, H=280, m={t:6,r:48,b:6,l:140};
  const subs=MN.filter(d=>d.month===month).sort((a,b)=>b.n-a.n).slice(0,10);
  const y=d3.scaleBand(subs.map(d=>d.substance),[m.t,H-m.b]).padding(.22);
  const x=d3.scaleLinear([0,d3.max(subs,d=>d.n)||1],[m.l,W-m.r]);
  subs.forEach(d=>{
    const c=classify(d.substance);
    svg.append('rect').attr('x',m.l).attr('y',y(d.substance)).attr('width',x(d.n)-m.l).attr('height',y.bandwidth()).attr('rx',3).attr('fill',c.color).attr('opacity',.8)
      .on('mousemove',e=>tt.show(`<b style="text-transform:capitalize">${d.substance}</b><br>${fmt.int(d.n)} samples`,e.clientX,e.clientY))
      .on('mouseleave',tt.hide);
    svg.append('text').attr('x',m.l-6).attr('y',y(d.substance)+y.bandwidth()/2).attr('text-anchor','end').attr('fill',c.color).attr('font-size',11).attr('dy','.35em').attr('text-transform','capitalize').text(d.substance.length>16?d.substance.slice(0,15)+'…':d.substance);
    svg.append('text').attr('x',x(d.n)+5).attr('y',y(d.substance)+y.bandwidth()/2).attr('fill',TOKENS.faint).attr('font-size',9).attr('font-family','ui-monospace').attr('dy','.35em').text(d.n);
  });
}

function drawDeltas(month){
  const idx=months.indexOf(month);
  const deltasEl=document.getElementById('deltas');
  deltasEl.innerHTML='';
  if(idx<1){deltasEl.innerHTML=`<span class="muted">No previous month for comparison.</span>`;return;}
  const prev=months[idx-1];
  const cur=classShareForMonth(month), pre=classShareForMonth(prev);
  CLS.forEach(([k,l])=>{
    const delta=cur[k]-pre[k];
    if(Math.abs(delta)<0.005) return;
    const chip=document.createElement('div');
    const sign=delta>0?'+':'';
    const col=delta>0?TOKENS.alert:TOKENS.ok;
    chip.style.cssText=`display:inline-flex;align-items:center;gap:6px;background:${TOKENS.panel2};border:1px solid ${col}44;border-radius:8px;padding:8px 12px;font-size:12px`;
    chip.innerHTML=`<span style="width:8px;height:8px;background:${COL[k]};border-radius:50%;display:inline-block"></span><span style="color:${COL[k]};font-weight:600">${l}</span><span style="font-family:ui-monospace;color:${col};font-weight:700">${sign}${fmt.pct(delta*100)}</span>`;
    deltasEl.appendChild(chip);
  });
  if(!deltasEl.children.length) deltasEl.innerHTML=`<span class="muted">No significant changes from ${fmt.month(prev)} to ${fmt.month(month)}.</span>`;
}

function update(){
  const month=months[selIdx];
  document.getElementById('mLabel').textContent=fmt.month(month);
  drawDonut(month); drawBars(month); drawDeltas(month);
}

document.getElementById('mslider').oninput=function(){selIdx=+this.value;update();};
update();
addEventListener('resize',update);
