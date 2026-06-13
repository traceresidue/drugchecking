/* Nº 14 · Substance Horizon Wall — dozens of substance trends compressed into a
   compact wall of horizon charts. Each thin band layers magnitude through color,
   so an emerging threat is visible the moment its band darkens. */
const {scaffold,classify,fmt,tooltip,TOKENS}=DCF;
const MONTHLY=DATA.monthly, TOTAL=DATA.monthly_total;

const stage=scaffold({
  tag:'Nº 14 · SUPPLY',
  title:'Substance Horizon Wall',
  dek:'Forty trend lines would be a tangle. Horizon charts fold each one into a thin colored band — darker means higher — so you can scan many substances at once and catch the next threat early.',
  how:`A <b>horizon chart</b> compresses a time series: the line is sliced into height bands and the upper bands are folded down and <b>layered by color intensity</b>, so a tall peak reads as a <i>darker</i> stripe in the same thin row. This lets dozens of substances share one screen. Read it like a heat-strip: <b>each row is one substance over time</b>; a row that suddenly darkens on the right is a substance <b>surging now</b>. Rows are sorted by recent momentum, so emerging adulterants rise to the top. <b>Limits:</b> counts among tested samples, not population prevalence.`,
  provenance:'Real monthly detection counts per substance, 2022–2024, 6,580-sample dataset.',
  harm:'A newly darkening row is an early warning. If it is a sedative or novel opioid, expect the overdose response to be harder.'
});

stage.innerHTML=`
<div class="controls"><span class="muted" style="font-size:13px">bands sorted by recent momentum →</span></div>
<div class="panel"><svg id="svg" width="100%" role="img" aria-label="Wall of horizon charts"></svg></div>`;
const tt=tooltip();

const months=[...new Set(MONTHLY.map(d=>d.month))].sort();
const subs=[...new Set(MONTHLY.map(d=>d.substance))];
const totByMonth=Object.fromEntries(TOTAL.map(d=>[d.month,d.n]));
const series=subs.map(s=>{
  const m=Object.fromEntries(MONTHLY.filter(d=>d.substance===s).map(d=>[d.month,d.n]));
  const vals=months.map(mo=>m[mo]||0);
  const recent=vals.slice(-4).reduce((a,b)=>a+b,0), early=vals.slice(0,4).reduce((a,b)=>a+b,0)+1;
  return {s,vals,max:Math.max(...vals,1),momentum:recent/early*Math.max(...vals.slice(-6),0)};
}).filter(d=>d.max>=8).sort((a,b)=>b.momentum-a.momentum).slice(0,22);

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth, rowH=26, gap=3, labelW=150, top=8;
  const H=top+series.length*(rowH+gap)+24; svg.attr('height',H);
  const x=d3.scaleLinear([0,months.length-1],[labelW,W-12]);
  const bands=3;
  series.forEach((row,ri)=>{
    const yTop=top+ri*(rowH+gap);
    const base=classify(row.s);
    const y=d3.scaleLinear([0,row.max/bands],[yTop+rowH,yTop]);
    // background
    svg.append('rect').attr('x',labelW).attr('y',yTop).attr('width',W-12-labelW).attr('height',rowH).attr('fill',TOKENS.panel2).attr('opacity',.4).attr('rx',3);
    for(let b=0;b<bands;b++){
      const area=d3.area().x((d,i)=>x(i)).y0(yTop+rowH).y1((d,i)=>{const v=Math.max(0,Math.min(row.max/bands,row.vals[i]-b*row.max/bands));return y(v);}).curve(d3.curveBasis);
      svg.append('path').datum(row.vals).attr('d',area).attr('fill',base.color).attr('opacity',0.25+b*0.3).attr('clip-path',`inset(0)`);
    }
    svg.append('rect').attr('x',labelW).attr('y',yTop).attr('width',W-12-labelW).attr('height',rowH).attr('fill','transparent')
      .on('mousemove',(e)=>{const i=Math.round(x.invert(e.offsetX));const mo=months[i];if(mo)tt.show(`<b style="text-transform:capitalize">${row.s}</b><br><span class="muted">${fmt.month(mo)} · ${row.vals[i]||0} samples</span>`,e.clientX,e.clientY);}).on('mouseleave',tt.hide);
    svg.append('text').attr('x',labelW-8).attr('y',yTop+rowH/2+4).attr('text-anchor','end').attr('fill',TOKENS.ink).attr('font-size',11).text(row.s.length>20?row.s.slice(0,19)+'…':row.s);
    if(ri===series.length-1){
      months.forEach((mo,i)=>{if(i%4===0)svg.append('text').attr('x',x(i)).attr('y',H-8).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',10).attr('font-family','ui-monospace').text(fmt.month(mo));});
    }
  });
}
draw();
addEventListener('resize',draw);
