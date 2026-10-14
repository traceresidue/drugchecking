/* Nº 22 · Xylazine Spread — two views of one adulterant's rise:
   a geographic US state map (left) colored by xylazine positivity,
   and a stacked area chart (right) showing primary vs. secondary detections
   over 36 months. Playback animates the map fill in sync with the timeline. */
const {scaffold,classify,fmt,tooltip,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
const XS=DATA.xylazine_status, GEO=DATA.geo;
const TOPO_US=TOPO.us_states;

const FIPS={1:'AL',2:'AK',4:'AZ',5:'AR',6:'CA',8:'CO',9:'CT',10:'DE',12:'FL',13:'GA',
15:'HI',16:'ID',17:'IL',18:'IN',19:'IA',20:'KS',21:'KY',22:'LA',23:'ME',24:'MD',
25:'MA',26:'MI',27:'MN',28:'MS',29:'MO',30:'MT',31:'NE',32:'NV',33:'NH',34:'NJ',
35:'NM',36:'NY',37:'NC',38:'ND',39:'OH',40:'OK',41:'OR',42:'PA',44:'RI',45:'SC',
46:'SD',47:'TN',48:'TX',49:'UT',50:'VT',51:'VA',53:'WA',54:'WV',55:'WI',56:'WY',72:'PR'};

const stage=scaffold({
  tag:'Nº 22 · GEO',
  title:'Xylazine Spread',
  dek:'Xylazine — an animal sedative now in the opioid supply — arrived state by state. The map fills as prevalence rises; the chart shows it shifting from a trace cut to the primary substance.',
  how:`<b>Left map</b>: each US state colored by cumulative xylazine positivity in this dataset (lighter = more detections). <b>Right area chart</b>: monthly xylazine detections split by whether it was the <b>primary</b> substance (deeply penetrated market) or a <b>secondary cut</b> (still arriving). Press <b>▶ play</b> to animate month-by-month. The county bar chart shows geographic hot spots. <b>Caveat</b>: reflects tested samples only — gray states have no program data, not a clean supply.`,
  provenance:'Real xylazine detection records by month, state, and county (6,580-sample dataset). Map uses US Census TIGER state boundaries.',
  harm:'Xylazine is not an opioid — naloxone will not reverse its sedation. Give naloxone for the opioid, then focus on rescue breathing, positioning, and wound care.'
});

stage.innerHTML=`
<div class="controls"><button class="tgl" id="play">▶ play timeline</button><span class="mono" id="ml" style="color:${TOKENS.xyl};margin-left:12px"></span></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
  <div class="panel">
    <div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:6px">XYLAZINE POSITIVITY BY STATE</div>
    <svg id="map" width="100%" height="300" role="img" aria-label="US map showing xylazine prevalence by state"></svg>
  </div>
  <div class="panel">
    <div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:6px">DETECTIONS PER MONTH</div>
    <svg id="area" width="100%" height="300"></svg>
  </div>
</div>
<div class="panel" style="margin-top:14px">
  <div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:6px">TOP COUNTIES BY XYLAZINE DETECTION</div>
  <svg id="cty" width="100%" height="200"></svg>
</div>`;

const tt=tooltip();

// Process monthly data
const months=[...new Set(XS.map(d=>d.month))].sort();
const rows=months.map(m=>{
  const p=XS.filter(d=>d.month===m);
  const prim=p.filter(d=>d.primary==='1'||d.primary===1||d.primary===true).reduce((a,b)=>a+b.n,0);
  const sec=p.filter(d=>d.primary!=='1'&&d.primary!==1&&d.primary!==true).reduce((a,b)=>a+b.n,0);
  return{m,prim,sec,tot:prim+sec};
});

// County data
const counties=GEO.filter(g=>g.xyl>0).sort((a,b)=>b.xyl-a.xyl).slice(0,10);

// State xyl aggregates
const stateXyl={};
GEO.forEach(g=>{
  if(!stateXyl[g.state])stateXyl[g.state]={n:0,xyl:0};
  stateXyl[g.state].n+=g.n; stateXyl[g.state].xyl+=g.xyl;
});

let upto=months.length-1;

function drawMap(){
  const svg=d3.select('#map'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth||480, H=300;
  const states=topojson.feature(TOPO_US,TOPO_US.objects.states);
  const mesh=topojson.mesh(TOPO_US,TOPO_US.objects.states,(a,b)=>a!==b);
  const projection=d3.geoIdentity().reflectY(false).fitSize([W,H],states);
  const path=d3.geoPath(projection);

  const maxRate=d3.max(Object.values(stateXyl),s=>s.n>0?s.xyl/s.n:0)||0.5;
  const colorXyl=d3.scaleSequential(t=>d3.interpolateRgb('#1c2030',TOKENS.xyl)(t)).domain([0,Math.min(maxRate,0.8)]);

  svg.selectAll('path.state')
    .data(states.features)
    .join('path')
    .attr('class','state')
    .attr('d',path)
    .attr('fill',d=>{
      const st=FIPS[+d.id];
      const s=stateXyl[st];
      return s&&s.n>0?colorXyl(s.xyl/s.n):'#1c2030';
    })
    .attr('stroke',TOKENS.line)
    .attr('stroke-width',0.7)
    .on('mousemove',(e,d)=>{
      const st=FIPS[+d.id]||'?';
      const s=stateXyl[st];
      tt.show(`<b>${st}</b><br><span class="muted">${s&&s.n>0?`${fmt.int(s.xyl)} xylazine / ${fmt.int(s.n)} samples (${fmt.pct(s.xyl/s.n*100)})`:' no program data'}</span>`,e.clientX,e.clientY);
    })
    .on('mouseleave',tt.hide);

  // State borders
  svg.append('path').datum(mesh).attr('d',path).attr('fill','none').attr('stroke',TOKENS.line).attr('stroke-width',0.8);

  // Labels for states with data
  svg.selectAll('text.stl')
    .data(states.features.filter(d=>{const s=stateXyl[FIPS[+d.id]]; return s&&s.xyl>0;}))
    .join('text').attr('class','stl')
    .attr('transform',d=>{const c=path.centroid(d);return `translate(${c[0]},${c[1]})`;})
    .attr('text-anchor','middle').attr('dy','.35em')
    .attr('font-size',8).attr('font-weight',700)
    .attr('fill','#fff').attr('pointer-events','none')
    .text(d=>FIPS[+d.id]||'');
}

function drawArea(){
  const svg=d3.select('#area'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth||480,H=300,m={t:14,r:12,b:34,l:36};
  const x=d3.scalePoint(months,[m.l,W-m.r]);
  const ymax=d3.max(rows,d=>d.tot)*1.15||1;
  const y=d3.scaleLinear([0,ymax],[H-m.b,m.t]);
  const vis=rows.slice(0,upto+1);
  const stack=d3.stack().keys(['sec','prim'])(vis);
  const colors={sec:d3.interpolateRgb(TOKENS.xyl,TOKENS.bg)(0.5),prim:TOKENS.xyl};
  const area=d3.area().x((d,i)=>x(vis[i].m)).y0(d=>y(d[0])).y1(d=>y(d[1])).curve(d3.curveMonotoneX);

  svg.selectAll('path.band').data(stack).join('path').attr('class','band')
    .attr('d',area).attr('fill',s=>colors[s.key]).attr('opacity',.88);

  // grid lines
  y.ticks(4).forEach(t=>{
    svg.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',y(t)).attr('y2',y(t)).attr('stroke',TOKENS.line).attr('opacity',.4);
    svg.append('text').attr('x',m.l-5).attr('y',y(t)+3).attr('text-anchor','end').attr('fill',TOKENS.faint).attr('font-size',9).text(t);
  });
  months.forEach((mo,i)=>{
    if(i%6===0||i===upto)svg.append('text').attr('x',x(mo)).attr('y',H-14).attr('text-anchor','middle').attr('fill',i===upto?TOKENS.ink:TOKENS.faint).attr('font-size',10).attr('font-family','ui-monospace').text(fmt.month(mo));
  });
  // cursor line at current month
  if(upto<months.length){
    const cx=x(months[upto]);
    svg.append('line').attr('x1',cx).attr('x2',cx).attr('y1',m.t).attr('y2',H-m.b).attr('stroke',TOKENS.ink).attr('stroke-width',1.5).attr('opacity',.4).attr('stroke-dasharray','4,3');
  }
  svg.append('text').attr('x',W-m.r).attr('y',m.t+6).attr('text-anchor','end').attr('fill',colors.prim).attr('font-size',10).text('■ primary component');
  svg.append('text').attr('x',W-m.r).attr('y',m.t+20).attr('text-anchor','end').attr('fill',colors.sec).attr('font-size',10).text('■ secondary cut');
  document.getElementById('ml').textContent=fmt.month(months[upto]);
}

function drawCty(){
  const svg=d3.select('#cty'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth||600, H=200, m={t:6,r:60,b:6,l:140};
  const y=d3.scaleBand(counties.map(c=>c.county+', '+c.state),[m.t,H-m.b]).padding(.25);
  const x=d3.scaleLinear([0,d3.max(counties,c=>c.xyl)],[m.l,W-m.r]);
  svg.selectAll('rect').data(counties).join('rect')
    .attr('x',m.l).attr('y',c=>y(c.county+', '+c.state))
    .attr('width',c=>x(c.xyl)-m.l).attr('height',y.bandwidth())
    .attr('fill',TOKENS.xyl).attr('opacity',.82).attr('rx',3)
    .on('mousemove',(e,c)=>tt.show(`<b>${c.county}, ${c.state}</b><br><span class="muted">${fmt.int(c.xyl)} xylazine / ${fmt.int(c.n)} samples</span>`,e.clientX,e.clientY))
    .on('mouseleave',tt.hide);
  svg.selectAll('text.l').data(counties).join('text').attr('class','l')
    .attr('x',m.l-6).attr('y',c=>y(c.county+', '+c.state)+y.bandwidth()/2+3)
    .attr('text-anchor','end').attr('fill',TOKENS.muted).attr('font-size',10)
    .text(c=>c.county.replace(' County','')+', '+c.state);
  svg.selectAll('text.v').data(counties).join('text').attr('class','v')
    .attr('x',c=>x(c.xyl)+5).attr('y',c=>y(c.county+', '+c.state)+y.bandwidth()/2+3)
    .attr('fill',TOKENS.faint).attr('font-size',9).attr('font-family','ui-monospace').text(c=>c.xyl);
}
function drawAll(){drawMap();drawArea();drawCty();}
drawAll();
window.__vizRedraw=drawAll;

let timer;
document.getElementById('play').onclick=e=>{
  if(timer){clearInterval(timer);timer=null;e.target.textContent='▶ play timeline';return;}
  e.target.textContent='❚❚ pause'; upto=0; drawAll();
  timer=setInterval(()=>{
    upto++;
    if(upto>=months.length){upto=months.length-1;clearInterval(timer);timer=null;e.target.textContent='▶ play timeline';}
    drawArea();
  },340);
};
addEventListener('resize',drawAll);
