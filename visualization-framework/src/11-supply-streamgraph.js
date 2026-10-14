/* Nº 11 · Supply Composition Streamgraph — the unregulated supply as a flowing
   river. Each colored band is a drug class; the river's changing shape shows how
   the market's composition shifts month to month. */
const {scaffold,classify,tooltip,fmt,TOKENS}=DCF;
const MC=DATA.monthly_class;
const CLS=[['fent','Fentanyl & analogs'],['opioid','Opioid'],['xyl','Sedative / xylazine'],['stim','Stimulant'],['coke','Cocaine'],['benzo','Benzodiazepine'],['cut','Cut / diluent'],['other','Other']];
function clsFill(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k==='fent'?'fent':k==='opioid'?'opioid':k==='xyl'?'xyl':k==='stim'?'stim':k==='coke'?'coke':k==='benzo'?'benzo':k==='cut'?'cut':'other'];}
const COL=Object.fromEntries(CLS.map(([k])=>[k,clsFill(k)]));

const stage=scaffold({
  tag:'Nº 11 · SUPPLY',
  title:'Supply Composition Streamgraph',
  dek:'The unregulated drug supply as a flowing river. Each band is a class of substance; watch the channel widen and narrow as the market re-mixes itself over three years.',
  how:`A <b>streamgraph</b> stacks each month's composition around a flowing center line, so you read <b>change of shape</b> rather than exact values. Band thickness = how many tested samples contained that class that month. The story to look for: the <b>sedative band</b> (xylazine) swelling inside the opioid supply, and stimulants holding their own channel. <b>Toggle to "stacked %"</b> for honest proportions. <b>Denominator note:</b> these are counts among <i>tested</i> samples, which over-represent what programs were watching — not a census of all drugs used.`,
  provenance:'Real monthly class counts from 6,580 tested samples (2022–2024) across 11 US states.',
  harm:'When the sedative band grows, expect deeper, longer overdoses that naloxone only partly reverses. Never use alone.'
});

stage.innerHTML=`
<div class="controls">
  <button class="tgl" id="stream" aria-pressed="true">streamgraph</button>
  <button class="tgl" id="pct" aria-pressed="false">stacked %</button>
</div>
<div class="panel"><svg id="svg" width="100%" height="480" role="img" aria-label="Streamgraph of supply composition"></svg></div>
<div class="legend" id="leg"></div>`;
const tt=tooltip();
let offset='stream';
document.getElementById('stream').onclick=()=>set('stream');
document.getElementById('pct').onclick=()=>set('pct');
function set(m){offset=m;document.getElementById('stream').setAttribute('aria-pressed',m==='stream');document.getElementById('pct').setAttribute('aria-pressed',m==='pct');draw();}

const months=[...new Set(MC.map(d=>d.month))].sort();
const rows=months.map(m=>{const o={month:m};CLS.forEach(([k])=>o[k]=0);MC.filter(d=>d.month===m).forEach(d=>o[d.cls]=d.n);return o;});

function draw(){
  Object.assign(COL,Object.fromEntries(CLS.map(([k])=>[k,clsFill(k)])));
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=480,m={t:18,r:16,b:34,l:40};
  const keys=CLS.map(c=>c[0]);
  const stack=d3.stack().keys(keys).offset(offset==='stream'?d3.stackOffsetWiggle:d3.stackOffsetExpand).order(d3.stackOrderInsideOut);
  const series=stack(rows);
  const x=d3.scalePoint(months,[m.l,W-m.r]);
  const y=d3.scaleLinear([d3.min(series,s=>d3.min(s,d=>d[0])),d3.max(series,s=>d3.max(s,d=>d[1]))],[H-m.b,m.t]);
  const area=d3.area().x((d,i)=>x(months[i])).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveBasis);
  svg.selectAll('path').data(series).join('path').attr('d',area).attr('fill',s=>COL[s.key]).attr('opacity',.85).attr('stroke',TOKENS.bg).attr('stroke-width',.4)
    .on('mousemove',(e,s)=>{const lbl=CLS.find(c=>c[0]===s.key)[1];tt.show(`<b style="color:${COL[s.key]}">${lbl}</b>`,e.clientX,e.clientY);}).on('mouseleave',tt.hide);
  // x labels (quarterly)
  if(!window.DCFDesign||DCFDesign.showTier('axis'))
    months.forEach((mo,i)=>{ if(i%3===0) svg.append('text').attr('class','dcf-lbl').attr('data-tier','axis').attr('x',x(mo)).attr('y',H-14).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',10).attr('font-family','ui-monospace').text(fmt.month(mo)); });
  if(!window.DCFDesign||DCFDesign.showTier('legend'))
    document.getElementById('leg').innerHTML=CLS.map(([k,l])=>`<span><i style="background:${COL[k]}"></i>${l}</span>`).join('');
  else document.getElementById('leg').innerHTML='';
}
draw();
addEventListener('resize',draw);
window.__vizRedraw=draw;
