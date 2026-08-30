/* Nº 27 · Supply Weather Report — the most recent month's supply composition
   expressed as a weather metaphor: a risk index, "conditions" (fentanyl %, xylazine %,
   novel substance alerts), and a 3-month outlook sparkline. A public-facing
   one-glance risk communication format. */
const {scaffold,classify,fmt,tooltip,TOKENS}=DCF;
const MC=DATA.monthly_class, MN=DATA.monthly;

const stage=scaffold({
  tag:'Nº 27 · EXPERIMENTAL',
  title:'Supply Weather Report',
  dek:'What\'s the current "weather" in the local drug supply? A risk index, current conditions, and a 3-month outlook — styled for the person who checks the forecast before they use.',
  how:`This adapts the <b>weather forecast</b> metaphor for drug supply risk communication. The <b>risk index</b> (0–10) is a composite of fentanyl positivity, xylazine prevalence, and mixture complexity in the most recent tested month. <b>Conditions</b> show the key current hazards. The <b>outlook sparkline</b> shows how the index trended over the past 6 months. This is <i>not</i> a real-time system — it reflects testing data from the most recent month in the dataset. <b>Concept:</b> the format is deliberately legible for people with limited health literacy; a weather app is universally understood.`,
  provenance:'Risk index calculated from real monthly supply composition data (6,580-sample dataset). Most recent month shown.',
  harm:'Like real weather, risk varies day-to-day and batch-to-batch. Always test, always carry naloxone, never use alone — even on a "low risk" day.'
});

// Get latest month
const months=[...new Set(MC.map(d=>d.month))].sort();
const latestMonth=months[months.length-1];

// Calculate a risk index for each month (0–10 scale)
function calcRisk(month){
  const rows=MC.filter(d=>d.month===month);
  const total=rows.reduce((a,b)=>a+b.n,0)||1;
  const fentN=(rows.find(d=>d.cls==='fent')||{n:0}).n;
  const xylN=(rows.find(d=>d.cls==='xyl')||{n:0}).n;
  const otherN=(rows.find(d=>d.cls==='other')||{n:0}).n;
  const benzoN=(rows.find(d=>d.cls==='benzo')||{n:0}).n;
  const fentPct=fentN/total, xylPct=xylN/total, novelPct=(otherN+benzoN)/total;
  // weighted risk
  return Math.min(10,(fentPct*5 + xylPct*3.5 + novelPct*1.5)*10);
}

const riskHistory=months.slice(-7).map(m=>({m,r:calcRisk(m)}));
const currentRisk=riskHistory[riskHistory.length-1]?.r||5;

// Current conditions
const latestRows=MC.filter(d=>d.month===latestMonth);
const totalLast=latestRows.reduce((a,b)=>a+b.n,0)||1;
function classShare(cls){return (latestRows.find(d=>d.cls===cls)||{n:0}).n/totalLast;}
const fentPct=classShare('fent'), xylPct=classShare('xyl'), benzoPct=classShare('benzo'), otherPct=classShare('other');

// Top new substances this month
const topMonthSubs=MN.filter(d=>d.month===latestMonth).sort((a,b)=>b.n-a.n).slice(0,5);

function riskLabel(r){
  if(r<3)return{icon:'🌤',label:'Low',color:TOKENS.ok,advice:'Lower volatility, but the supply still contains fentanyl. Test every time.'};
  if(r<5.5)return{icon:'⛅',label:'Moderate',color:TOKENS.watch,advice:'Significant fentanyl present. Never use alone. Have naloxone.'};
  if(r<7.5)return{icon:'🌩',label:'High',color:TOKENS.alert,advice:'High fentanyl + xylazine. Multiple doses of naloxone needed. 911 on standby.'};
  return{icon:'🌪',label:'Extreme',color:TOKENS.alert,advice:'Severe mixture complexity. Naloxone may not be enough alone — call 911 immediately if overdose.'};
}
const {icon,label,color,advice}=riskLabel(currentRisk);

stage.innerHTML=`
<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:18px">
  <div class="panel" style="text-align:center;padding:28px 18px">
    <div style="font-size:72px;line-height:1;margin-bottom:12px" role="img" aria-label="risk weather icon">${icon}</div>
    <div style="font:700 48px ui-monospace;color:${color}">${currentRisk.toFixed(1)}<span style="font-size:22px;color:${TOKENS.muted}">/10</span></div>
    <div style="font-size:22px;font-weight:700;color:${color};margin:6px 0">${label} Risk</div>
    <div class="muted" style="font-size:12px;margin-top:4px">${fmt.month(latestMonth)} · most recent data</div>
    <div style="margin-top:16px;padding:12px;background:#0b0e14;border-radius:10px;font-size:13px;line-height:1.5;color:${TOKENS.ink};text-align:left">${advice}</div>
  </div>
  <div style="display:flex;flex-direction:column;gap:14px">
    <div class="panel">
      <div class="muted" style="font-size:11px;letter-spacing:.12em;margin-bottom:12px">CURRENT CONDITIONS · ${fmt.month(latestMonth)}</div>
      <div id="conditions"></div>
    </div>
    <div class="panel">
      <div class="muted" style="font-size:11px;letter-spacing:.12em;margin-bottom:6px">6-MONTH RISK TREND</div>
      <svg id="spark" width="100%" height="90"></svg>
    </div>
  </div>
</div>
<div class="panel" style="margin-top:14px">
  <div class="muted" style="font-size:11px;letter-spacing:.12em;margin-bottom:10px">MOST DETECTED THIS MONTH</div>
  <div id="topSubs" style="display:flex;gap:10px;flex-wrap:wrap"></div>
</div>`;

// Conditions panel
const conditions=[
  {label:'Fentanyl',pct:fentPct,color:TOKENS.fent,icon:'⚠️',note:fentPct>0.5?'Very high prevalence':'Present in supply'},
  {label:'Xylazine',pct:xylPct,color:TOKENS.xyl,icon:'🩹',note:xylPct>0.3?'High — wounds + deep sedation risk':'Detected; rescue breathing needed'},
  {label:'Benzodiazepines',pct:benzoPct,color:TOKENS.benzo,icon:'💊',note:'Prolongs sedation; naloxone doesn\'t reverse'},
  {label:'Unclassified / Novel',pct:otherPct,color:TOKENS.other,icon:'🔬',note:'Unknown potency — maximum caution'},
];
const condEl=document.getElementById('conditions');
conditions.forEach(c=>{
  const div=document.createElement('div');
  div.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:10px';
  const pctBar=Math.round(c.pct*100);
  div.innerHTML=`<div style="font-size:20px">${c.icon}</div>
    <div style="flex:1">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-weight:600;font-size:13px;color:${c.color}">${c.label}</span>
        <span style="font-family:ui-monospace;font-size:12px;color:${c.color}">${pctBar}%</span>
      </div>
      <div style="background:#1a2234;border-radius:4px;height:6px">
        <div style="background:${c.color};height:6px;border-radius:4px;width:${pctBar}%;transition:.4s ease"></div>
      </div>
      <div style="font-size:11px;color:${TOKENS.muted};margin-top:3px">${c.note}</div>
    </div>`;
  condEl.appendChild(div);
});

// Sparkline
function drawSpark(){
  const svg=d3.select('#spark'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth||300,H=90,m={t:10,r:8,b:24,l:8};
  const x=d3.scalePoint(riskHistory.map(d=>d.m),[m.l,W-m.r]);
  const y=d3.scaleLinear([0,10],[H-m.b,m.t]);
  const area=d3.area().x(d=>x(d.m)).y0(H-m.b).y1(d=>y(d.r)).curve(d3.curveCatmullRom);
  const line=d3.line().x(d=>x(d.m)).y(d=>y(d.r)).curve(d3.curveCatmullRom);
  svg.append('path').datum(riskHistory).attr('d',area).attr('fill',color).attr('opacity',.18);
  svg.append('path').datum(riskHistory).attr('d',line).attr('fill','none').attr('stroke',color).attr('stroke-width',2);
  riskHistory.forEach(d=>{
    svg.append('circle').attr('cx',x(d.m)).attr('cy',y(d.r)).attr('r',3).attr('fill',d.m===latestMonth?color:TOKENS.muted);
    svg.append('text').attr('x',x(d.m)).attr('y',H-8).attr('text-anchor','middle').attr('font-size',9).attr('font-family','ui-monospace').attr('fill',TOKENS.faint).text(fmt.month(d.m));
  });
}
drawSpark();

// Top substances
const topSubsEl=document.getElementById('topSubs');
topMonthSubs.forEach(d=>{
  const c=classify(d.substance);
  const chip=document.createElement('div');
  chip.style.cssText=`display:inline-flex;align-items:center;gap:6px;background:${TOKENS.panel2};border:1px solid ${c.color}44;border-radius:99px;padding:6px 12px;font-size:12px`;
  chip.innerHTML=`<span style="width:8px;height:8px;background:${c.color};border-radius:50%;display:inline-block"></span><span style="color:${c.color};font-weight:600;text-transform:capitalize">${d.substance}</span><span style="color:${TOKENS.faint};font-family:ui-monospace">${d.n}</span>`;
  topSubsEl.appendChild(chip);
});
addEventListener('resize',drawSpark);
