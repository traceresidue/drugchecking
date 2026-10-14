/* Nº 08 · Mass-Defect Constellation — every detected substance plotted by its
   exact mass vs. its mass defect (the fractional part of the mass). Chemically
   related families fall along diagonal "constellations," so a novel analogue
   announces itself by landing next to its relatives. */
const {scaffold,classify,tooltip,fmt,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
const SUB=DATA.top_substances, ROLES=DATA.roles, MS=SPEC.ms;
// approximate monoisotopic-ish masses for the catalog (illustrative)
const MASS={fentanyl:336.21,'4-anpp':280.19,'phenethyl 4-anpp':308.19,'ethyl-4-anpp':308.22,
 'p-fluorofentanyl':354.20,'despropionyl p-fluorofentanyl':298.16,'n-phenylpropanamide':149.08,
 heroin:369.16,'6-monoacetylmorphine (6-mam)':327.15,acetylcodeine:341.16,methamphetamine:149.12,
 cocaine:303.15,xylazine:220.10,caffeine:194.08,acetaminophen:151.06,lidocaine:234.17,
 'bis(2,2,6,6-tetramethyl-4-piperidyl) sebacate':480.43,'dimethyl sulfone (methylsulfonylmethane msm)':94.01,
 ketamine:237.09,bromazolam:353.02,quinine:324.18,diphenhydramine:255.16,levamisole:204.07,
 tramadol:263.19,gabapentin:171.13,mdma:193.11,fluorofentanyl:354.20};

const stage=scaffold({
  tag:'Nº 08 · MS',
  title:'Mass-Defect Constellation',
  dek:'Plot each substance by its exact mass and its "mass defect," and chemical families snap into diagonal constellations. A brand-new analogue lands right beside its cousins.',
  how:`High-resolution mass spectrometry measures mass to several decimals. The <b>mass defect</b> is that fractional part (e.g. 336.21 → 0.21). Because adding a <span class="mono">CH₂</span> group shifts mass in a regular way, members of a chemical family — all the fentanyl analogues, all the nitazenes — line up along predictable tracks. Forensic chemists use this (the <b>Kendrick mass defect</b> idea) to spot a <b>novel psychoactive substance</b> the instant it appears: it sits next to known relatives even before anyone has named it. Color = drug class; size = how often it was detected here.`,
  provenance:'Masses illustrative (approximate monoisotopic). Detection counts are real aggregates from this dataset.',
  harm:'New analogues often arrive more potent than what they replace. An unfamiliar name near "fentanyl" on this map deserves extra caution.'
});

stage.innerHTML=`
<div class="controls">
  <button class="tgl" id="kmd" aria-pressed="false">switch to Kendrick (CH₂) defect</button>
</div>
<div class="panel"><svg id="svg" width="100%" height="520" role="img" aria-label="Mass defect scatter of substances"></svg></div>
<div class="legend" id="leg"></div>`;
const tt=tooltip();
let kmd=false;
document.getElementById('kmd').onclick=e=>{kmd=!kmd;e.target.setAttribute('aria-pressed',kmd);draw();};

function pts(){
  return SUB.filter(d=>MASS[d.substance]).map(d=>{
    const m=MASS[d.substance];
    const km=m*(14/14.01565); // Kendrick mass on CH2 base
    const defect=kmd?(Math.round(km)-km):(m-Math.floor(m));
    return {s:d.substance,m,defect,n:d.samples,...classify(d.substance)};
  });
}
function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=520,mg={t:18,r:18,b:42,l:54};
  const P=pts();
  const x=d3.scaleLinear(d3.extent(P,d=>d.m)).range([mg.l,W-mg.r]).nice();
  const y=d3.scaleLinear(kmd?[-0.5,0.5]:d3.extent(P,d=>d.defect)).range([H-mg.b,mg.t]).nice();
  const r=d3.scaleSqrt(d3.extent(P,d=>d.n),[4,26]);
  // axes
  x.ticks(7).forEach(t=>{svg.append('line').attr('x1',x(t)).attr('x2',x(t)).attr('y1',mg.t).attr('y2',H-mg.b).attr('stroke',TOKENS.line).attr('opacity',.3);svg.append('text').attr('x',x(t)).attr('y',H-16).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',11).attr('font-family','ui-monospace').text(t);});
  y.ticks(6).forEach(t=>{svg.append('line').attr('x1',mg.l).attr('x2',W-mg.r).attr('y1',y(t)).attr('y2',y(t)).attr('stroke',TOKENS.line).attr('opacity',.3);svg.append('text').attr('x',mg.l-8).attr('y',y(t)+3).attr('text-anchor','end').attr('fill',TOKENS.faint).attr('font-size',10).attr('font-family','ui-monospace').text(t.toFixed(2));});
  svg.append('text').attr('x',W/2).attr('y',H-2).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',11).text(kmd?'Kendrick nominal mass':'exact mass (Da)');
  svg.append('text').attr('transform',`translate(14,${H/2})rotate(-90)`).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',11).text(kmd?'Kendrick mass defect':'mass defect (fractional)');
  // points
  svg.selectAll('circle').data(P).join('circle')
    .attr('cx',d=>x(d.m)).attr('cy',d=>y(d.defect)).attr('r',d=>r(d.n))
    .attr('fill',d=>d.color).attr('opacity',.78).attr('stroke',TOKENS.bg).attr('stroke-width',1)
    .style('cursor','pointer')
    .on('mousemove',(e,d)=>tt.show(`<b style="text-transform:capitalize">${d.s}</b><br><span class="muted">${d.label} · ${ROLES[d.s]||''}</span><br><span class="mono muted">mass ${d.m.toFixed(2)} · n=${fmt.int(d.n)}</span>`,e.clientX,e.clientY))
    .on('mouseleave',tt.hide);
  // label the fentanyl family
  P.filter(d=>d.cls==='fent'&&d.n>200).forEach(d=>svg.append('text').attr('x',x(d.m)).attr('y',y(d.defect)-r(d.n)-4).attr('text-anchor','middle').attr('font-size',9).attr('fill',TOKENS.muted).text(d.s.length>14?d.s.slice(0,13)+'…':d.s));
  const classes=[...new Set(P.map(d=>d.cls))];
  document.getElementById('leg').innerHTML=classes.map(c=>{const o=P.find(d=>d.cls===c);return `<span><i style="background:${o.color}"></i>${o.label}</span>`;}).join('');
}
window.__vizRedraw=draw;
draw();
addEventListener('resize',draw);
