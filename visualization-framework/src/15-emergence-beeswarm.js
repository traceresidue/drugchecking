/* Nº 15 · Novel-Substance Emergence Swarm — every substance plotted at the date it
   was first detected, as a beeswarm. Each dot is a debut; size = how common it
   later became. The clustering shows the relentless churn of novel substances. */
const {scaffold,classify,tooltip,fmt,TOKENS}=DCF;
const EM=DATA.emergence;

const stage=scaffold({
  tag:'Nº 15 · SUPPLY',
  title:'Novel-Substance Emergence Swarm',
  dek:'Every dot is a substance the first day it showed up in testing. Big dots became common; the dense clusters are bursts of new chemistry entering the supply at once.',
  how:`Each dot is one substance positioned at its <b>first detection date</b> (a beeswarm nudges overlapping dots apart so none hide). <b>Size</b> = how many samples eventually contained it; <b>color</b> = drug class. A few debuts balloon into market staples (the big fentanyl-family dots); most stay rare. The clusters reveal the early-warning reality: the supply is a <b>constant stream of novel substances</b>, only some of which matter. Hover for the debut date. <b>Limits:</b> "first detected here" reflects when a program looked, not a substance's true first appearance anywhere.`,
  provenance:'Real first-detection dates and cumulative counts, 6,580-sample dataset (2022 onward).',
  harm:'Novel arrivals are the least understood and often the most potent. A new name beside fentanyl deserves the most caution, not the least.'
});

stage.innerHTML=`
<div class="controls">
  <span class="muted" style="font-size:13px">filter class:</span>
  <button class="tgl flt" data-c="all" aria-pressed="true">all</button>
  <button class="tgl flt" data-c="fent" aria-pressed="false">fentanyl</button>
  <button class="tgl flt" data-c="benzo" aria-pressed="false">benzo</button>
  <button class="tgl flt" data-c="xyl" aria-pressed="false">sedative</button>
  <button class="tgl flt" data-c="opioid" aria-pressed="false">opioid</button>
</div>
<div class="panel"><svg id="svg" width="100%" height="520" role="img" aria-label="Beeswarm of substance first-detection dates"></svg></div>`;
const tt=tooltip();
let filt='all';
document.querySelectorAll('.flt').forEach(b=>b.onclick=()=>{filt=b.dataset.c;document.querySelectorAll('.flt').forEach(x=>x.setAttribute('aria-pressed',x===b));draw();});

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=520,m={t:24,r:20,b:40,l:20};
  let data=EM.map(d=>({...d,date:new Date(d.first),...classify(d.substance)}));
  if(filt!=='all') data=data.filter(d=>d.cls===filt);
  const x=d3.scaleTime(d3.extent(data,d=>d.date),[m.l+10,W-m.r]);
  const r=d3.scaleSqrt(d3.extent(data,d=>d.total),[2.5,30]);
  // axis ticks (quarters)
  x.ticks(d3.timeMonth.every(3)).forEach(t=>{svg.append('line').attr('x1',x(t)).attr('x2',x(t)).attr('y1',m.t).attr('y2',H-m.b).attr('stroke',TOKENS.line).attr('opacity',.3);svg.append('text').attr('x',x(t)).attr('y',H-16).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',10).attr('font-family','ui-monospace').text(d3.timeFormat("%b '%y")(t));});
  const sim=d3.forceSimulation(data)
    .force('x',d3.forceX(d=>x(d.date)).strength(1))
    .force('y',d3.forceY(H/2).strength(.05))
    .force('collide',d3.forceCollide(d=>r(d.total)+1.2))
    .stop();
  for(let i=0;i<160;i++) sim.tick();
  data.forEach(d=>{d.y=Math.max(m.t+r(d.total),Math.min(H-m.b-r(d.total),d.y));});
  svg.selectAll('circle').data(data).join('circle')
    .attr('cx',d=>d.x).attr('cy',d=>d.y).attr('r',d=>r(d.total))
    .attr('fill',d=>d.color).attr('opacity',.8).attr('stroke',TOKENS.bg).attr('stroke-width',.8)
    .style('cursor','pointer')
    .on('mousemove',(e,d)=>tt.show(`<b style="text-transform:capitalize">${d.substance}</b><br><span class="muted">${d.label}</span><br><span class="mono muted">first seen ${d.first} · ${fmt.int(d.total)} samples total</span>`,e.clientX,e.clientY)).on('mouseleave',tt.hide);
  // label big ones
  data.filter(d=>d.total>250).forEach(d=>svg.append('text').attr('x',d.x).attr('y',d.y+3).attr('text-anchor','middle').attr('font-size',9).attr('fill',TOKENS.bg).attr('font-weight',700).text(d.substance.length>9?d.substance.slice(0,8):d.substance));
}
draw();
addEventListener('resize',draw);
