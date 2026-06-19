/* Nº 22 · Xylazine Spread Timeline — the arrival of xylazine ("tranq") told two
   ways at once: a small-multiples sparkline grid of counties, and an animated
   cumulative curve. A case study in tracking one adulterant's geographic march. */
const {scaffold,classify,fmt,tooltip,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
const XS=DATA.xylazine_status, GEO=DATA.geo;

const stage=scaffold({
  tag:'Nº 22 · GEO',
  title:'Xylazine Spread Timeline',
  dek:'Xylazine — an animal sedative now widespread in the opioid supply — didn\'t arrive everywhere at once. Watch it climb month by month, and see which counties carry the most.',
  how:`Two linked views of one adulterant. The <b>area chart</b> shows xylazine detections per month, split by whether it was the <b>primary</b> component or a <b>secondary cut</b> — the shift toward "primary" marks deepening penetration. The <b>county bars</b> rank where xylazine turns up most in this dataset. Press <b>play</b> to watch the cumulative total build. Xylazine is the template for tracking the <i>next</i> adulterant (medetomidine, BTMPS) the same way. <b>Caveat:</b> reflects tested samples by county, not true population spread.`,
  provenance:'Real xylazine detection records (primary vs. secondary) and county counts, 6,580-sample dataset.',
  harm:'Xylazine is not an opioid — naloxone won\'t reverse its sedation. Give naloxone for the opioid, then focus on rescue breathing, positioning, and wound care.'
});

stage.innerHTML=`
<div class="controls"><button class="tgl" id="play">▶ play timeline</button><span class="mono" id="ml" style="color:${TOKENS.ink}"></span></div>
<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:14px">
  <div class="panel"><div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:6px">XYLAZINE DETECTIONS PER MONTH</div><svg id="area" width="100%" height="300"></svg></div>
  <div class="panel"><div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:6px">TOP COUNTIES</div><svg id="cty" width="100%" height="300"></svg></div>
</div>`;
const tt=tooltip();

const months=[...new Set(XS.map(d=>d.month))].sort();
const rows=months.map(m=>{const p=XS.filter(d=>d.month===m);const prim=p.filter(d=>d.primary==='1').reduce((a,b)=>a+b.n,0);const sec=p.filter(d=>d.primary!=='1').reduce((a,b)=>a+b.n,0);return{m,prim,sec,tot:prim+sec};});
const counties=GEO.filter(g=>g.xyl>0).sort((a,b)=>b.xyl-a.xyl).slice(0,12);

let upto=months.length-1;
function drawArea(){
  const svg=d3.select('#area'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=300,m={t:14,r:12,b:34,l:36};
  const x=d3.scalePoint(months,[m.l,W-m.r]);
  const ymax=d3.max(rows,d=>d.tot)*1.1;
  const y=d3.scaleLinear([0,ymax],[H-m.b,m.t]);
  const vis=rows.slice(0,upto+1);
  const stack=d3.stack().keys(['sec','prim'])(vis);
  const colors={sec:d3.interpolateRgb(TOKENS.xyl,TOKENS.bg)(0.45),prim:TOKENS.xyl};
  const area=d3.area().x((d,i)=>x(vis[i].m)).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveMonotoneX);
  svg.selectAll('path').data(stack).join('path').attr('d',area).attr('fill',s=>colors[s.key]).attr('opacity',.85);
  months.forEach((mo,i)=>{if(i%3===0)svg.append('text').attr('x',x(mo)).attr('y',H-14).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',10).attr('font-family','ui-monospace').text(fmt.month(mo));});
  y.ticks(4).forEach(t=>svg.append('text').attr('x',m.l-6).attr('y',y(t)+3).attr('text-anchor','end').attr('fill',TOKENS.faint).attr('font-size',9).text(t));
  svg.append('text').attr('x',W-m.r).attr('y',m.t+6).attr('text-anchor','end').attr('fill',colors.prim).attr('font-size',10).text('■ primary');
  svg.append('text').attr('x',W-m.r).attr('y',m.t+20).attr('text-anchor','end').attr('fill',colors.sec).attr('font-size',10).text('■ secondary cut');
  document.getElementById('ml').textContent=fmt.month(months[upto]);
}
function drawCty(){
  const svg=d3.select('#cty'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=300,m={t:6,r:40,b:6,l:120};
  const y=d3.scaleBand(counties.map(c=>c.county+', '+c.state),[m.t,H-m.b]).padding(.22);
  const x=d3.scaleLinear([0,d3.max(counties,c=>c.xyl)],[m.l,W-m.r]);
  svg.selectAll('rect').data(counties).join('rect').attr('x',m.l).attr('y',c=>y(c.county+', '+c.state)).attr('width',c=>x(c.xyl)-m.l).attr('height',y.bandwidth()).attr('fill',TOKENS.xyl).attr('opacity',.85).attr('rx',3)
    .on('mousemove',(e,c)=>tt.show(`<b>${c.county}, ${c.state}</b><br><span class="muted">${fmt.int(c.xyl)} xylazine / ${fmt.int(c.n)} samples</span>`,e.clientX,e.clientY)).on('mouseleave',tt.hide);
  svg.selectAll('text.l').data(counties).join('text').attr('class','l').attr('x',m.l-6).attr('y',c=>y(c.county+', '+c.state)+y.bandwidth()/2+3).attr('text-anchor','end').attr('fill',TOKENS.muted).attr('font-size',10).text(c=>c.county.replace(' County','')+', '+c.state);
  svg.selectAll('text.v').data(counties).join('text').attr('class','v').attr('x',c=>x(c.xyl)+5).attr('y',c=>y(c.county+', '+c.state)+y.bandwidth()/2+3).attr('fill',TOKENS.faint).attr('font-size',9).attr('font-family','ui-monospace').text(c=>c.xyl);
}
drawArea();drawCty();
window.__vizRedraw=()=>{drawArea();drawCty();};
let timer;
document.getElementById('play').onclick=e=>{
  if(timer){clearInterval(timer);timer=null;e.target.textContent='▶ play timeline';return;}
  e.target.textContent='❚❚ pause';upto=0;drawArea();
  timer=setInterval(()=>{upto++;if(upto>=months.length){upto=months.length-1;clearInterval(timer);timer=null;e.target.textContent='▶ play timeline';}drawArea();},340);
};
addEventListener('resize',()=>{drawArea();drawCty();});
