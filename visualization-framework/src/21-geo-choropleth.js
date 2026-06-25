/* Nº 21 · Supply Choropleth Map — a proper US state map (D3 + TopoJSON,
   Albers USA projection, state outlines rendered) colored by testing volume,
   fentanyl positivity, or xylazine positivity. Click a state to see county
   breakdown. No data ≠ clean supply. */
const {scaffold,fmt,tooltip,TOKENS,classify}=DCF;
const STATE_COUNTS=DATA.state_counts, GEO=DATA.geo;
const TOPO_US=TOPO.us_states;

// FIPS → state abbreviation mapping
const FIPS={1:'AL',2:'AK',4:'AZ',5:'AR',6:'CA',8:'CO',9:'CT',10:'DE',12:'FL',13:'GA',
15:'HI',16:'ID',17:'IL',18:'IN',19:'IA',20:'KS',21:'KY',22:'LA',23:'ME',24:'MD',
25:'MA',26:'MI',27:'MN',28:'MS',29:'MO',30:'MT',31:'NE',32:'NV',33:'NH',34:'NJ',
35:'NM',36:'NY',37:'NC',38:'ND',39:'OH',40:'OK',41:'OR',42:'PA',44:'RI',45:'SC',
46:'SD',47:'TN',48:'TX',49:'UT',50:'VT',51:'VA',53:'WA',54:'WV',55:'WI',56:'WY',72:'PR'};

const stage=scaffold({
  tag:'Nº 21 · GEO',
  title:'Supply Choropleth Map',
  dek:'Where does drug-checking data come from — and what does the supply look like there? Each state is shaded by testing volume, fentanyl positivity, or xylazine positivity. Gray means no data, never a clean supply.',
  how:`This is a standard <b>choropleth map</b> — each US state colored by a data value, using D3 geo + TopoJSON for accurate outlines. <b>Testing volume</b> = how many samples came from that state (log scale, since WA and NC dominate). <b>Fentanyl %</b> = share of that state's samples containing fentanyl. <b>Xylazine %</b> = share with xylazine. <b>Click any colored state</b> to see a county breakdown below the map. <b>Crucial caveat:</b> this maps where <i>testing happened</i>, not where drugs are — gray = no program data, not a clean supply.`,
  provenance:'Real per-state and per-county sample counts and fentanyl/xylazine positivity, 6,580-sample dataset (testing concentrated in WA, NC, NY, OR).',
  harm:'A gray state means no data, not no risk. The supply crosses state lines faster than testing programs do.'
});

stage.innerHTML=`
<div class="controls">
  <button class="tgl" id="mVol" aria-pressed="true">testing volume</button>
  <button class="tgl" id="mFent" aria-pressed="false">% fentanyl</button>
  <button class="tgl" id="mXyl" aria-pressed="false">% xylazine</button>
</div>
<div class="panel" id="mapPanel">
  <svg id="svg" width="100%" height="500" role="img" aria-label="US choropleth map showing drug checking data by state"></svg>
  <div id="mapLegend" style="margin-top:8px;font-size:12px;color:${TOKENS.muted}"></div>
</div>
<div id="countyPanel" style="display:none;margin-top:14px" class="panel">
  <div id="stateTitle" style="font-size:13px;font-weight:600;margin-bottom:10px"></div>
  <svg id="countyChart" width="100%" height="220"></svg>
</div>
<div id="leg" class="legend" style="margin-top:10px"></div>`;

const tt=tooltip();
let metric='vol', selectedState=null;

document.getElementById('mVol').onclick=()=>setM('vol');
document.getElementById('mFent').onclick=()=>setM('fent');
document.getElementById('mXyl').onclick=()=>setM('xyl');
function setM(m){metric=m;['mVol','mFent','mXyl'].forEach((id,i)=>document.getElementById(id).setAttribute('aria-pressed',['vol','fent','xyl'][i]===m));draw();}

// aggregate by state
const stateAgg={};
GEO.forEach(g=>{
  const s=g.state;
  if(!stateAgg[s])stateAgg[s]={n:0,fent:0,xyl:0,counties:[]};
  stateAgg[s].n+=g.n; stateAgg[s].fent+=g.fent; stateAgg[s].xyl+=g.xyl;
  stateAgg[s].counties.push(g);
});

const stateNames={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',
ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth||960, H=500;
  svg.attr('viewBox',`0 0 ${W} ${H}`);

  // TopoJSON features — us-states.json is pre-projected (Albers USA)
  const states=topojson.feature(TOPO_US,TOPO_US.objects.states);
  const mesh=topojson.mesh(TOPO_US,TOPO_US.objects.states,(a,b)=>a!==b);

  // Scale geography to fit the SVG
  const projection=d3.geoIdentity().reflectY(false).fitSize([W,H],states);
  const path=d3.geoPath(projection);

  const maxVol=Math.max(...Object.values(STATE_COUNTS).filter(v=>typeof v==='number' && v>0),1);
  const colorVol=d3.scaleSequential(t=>d3.interpolatePlasma(t*0.85+0.05)).domain([0,Math.log(maxVol+1)]);
  const colorFent=d3.scaleSequential(t=>d3.interpolateRgb(TOKENS.panel2,TOKENS.fent)(t)).domain([0,1]);
  const colorXyl=d3.scaleSequential(t=>d3.interpolateRgb(TOKENS.panel2,TOKENS.xyl)(t)).domain([0,0.6]);

  function getFill(st){
    const ag=stateAgg[st]||{n:0,fent:0,xyl:0};
    const n=STATE_COUNTS[st]||0;
    if(metric==='vol') return n>0?colorVol(Math.log(n+1)):'#1c2030';
    if(metric==='fent') return ag.n>0?colorFent(ag.fent/ag.n):'#1c2030';
    return ag.n>0?colorXyl(ag.xyl/ag.n):'#1c2030';
  }

  // Draw state fills
  svg.selectAll('path.state')
    .data(states.features)
    .join('path')
    .attr('class','state')
    .attr('d',path)
    .attr('fill',d=>getFill(FIPS[+d.id]||''))
    .attr('stroke',d=>selectedState&&FIPS[+d.id]===selectedState?TOKENS.ok:TOKENS.line)
    .attr('stroke-width',d=>selectedState&&FIPS[+d.id]===selectedState?2.5:0.7)
    .style('cursor',d=>{const st=FIPS[+d.id]; return (STATE_COUNTS[st]||0)>0?'pointer':'default';})
    .on('mousemove',(e,d)=>{
      const st=FIPS[+d.id]||'';
      const n=STATE_COUNTS[st]||0;
      const ag=stateAgg[st]||{n:0,fent:0,xyl:0};
      const name=stateNames[st]||st;
      tt.show(`<b>${name}</b> <span class="mono" style="font-size:10px">${st}</span><br>
        <span class="muted">${n>0?fmt.int(n)+' samples':' no program data'}</span>
        ${ag.n>0?`<br><span style="color:${TOKENS.fent}">●</span> ${fmt.pct(ag.fent/ag.n*100)} fentanyl · <span style="color:${TOKENS.xyl}">●</span> ${fmt.pct(ag.xyl/ag.n*100)} xylazine`:''}`,
        e.clientX,e.clientY);
    })
    .on('mouseleave',tt.hide)
    .on('click',(e,d)=>{
      const st=FIPS[+d.id];
      if(!st||(STATE_COUNTS[st]||0)===0) return;
      selectedState=st===selectedState?null:st;
      draw();
      if(selectedState) showCounties(selectedState);
      else document.getElementById('countyPanel').style.display='none';
    });

  // Draw state borders on top
  svg.append('path')
    .datum(mesh)
    .attr('d',path)
    .attr('fill','none')
    .attr('stroke',TOKENS.line)
    .attr('stroke-width',0.7);

  // Add state abbreviation labels for states with data
  svg.selectAll('text.stlabel')
    .data(states.features.filter(d=>{const st=FIPS[+d.id]; return (STATE_COUNTS[st]||0)>0;}))
    .join('text')
    .attr('class','stlabel')
    .attr('transform',d=>{ const c=path.centroid(d); return `translate(${c[0]},${c[1]})`; })
    .attr('text-anchor','middle').attr('dy','.35em')
    .attr('font-size',10).attr('font-weight',600)
    .attr('fill','#fff').attr('pointer-events','none')
    .text(d=>FIPS[+d.id]||'');

  // Legend
  const legEl=document.getElementById('mapLegend');
  if(metric==='vol'){
    legEl.innerHTML=`<span class="faint">State brightness = samples tested (log scale). Dark gray = no program data in this dataset — not a safe supply.</span>`;
  } else if(metric==='fent'){
    legEl.innerHTML=`<span>Color intensity = % of samples positive for fentanyl. Dark gray = no data.</span>`;
  } else {
    legEl.innerHTML=`<span>Color intensity = % of samples positive for xylazine. Dark gray = no data.</span>`;
  }
}

function showCounties(st){
  const panel=document.getElementById('countyPanel');
  panel.style.display='block';
  const counties=(stateAgg[st]||{counties:[]}).counties.sort((a,b)=>b.n-a.n).slice(0,14);
  document.getElementById('stateTitle').textContent=`${stateNames[st]||st} — county breakdown`;
  const svg=d3.select('#countyChart'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth||600, H=220, m={t:6,r:80,b:6,l:140};
  const y=d3.scaleBand(counties.map(c=>c.county),[m.t,H-m.b]).padding(.2);
  const x=d3.scaleLinear([0,d3.max(counties,c=>c.n)],[m.l,W-m.r]);
  const barH=y.bandwidth();
  counties.forEach(c=>{
    const bx=m.l, bw=x(c.n)-m.l, by=y(c.county);
    // bar
    svg.append('rect').attr('x',bx).attr('y',by).attr('width',bw).attr('height',barH).attr('rx',3).attr('fill',TOKENS.fent).attr('opacity',.7);
    // fent overlay
    svg.append('rect').attr('x',bx).attr('y',by).attr('width',(bw*(c.fent/c.n))||0).attr('height',barH/2).attr('rx',2).attr('fill',TOKENS.fent).attr('opacity',1);
    // xyl overlay
    svg.append('rect').attr('x',bx).attr('y',by+barH/2).attr('width',(bw*(c.xyl/c.n))||0).attr('height',barH/2).attr('rx',2).attr('fill',TOKENS.xyl).attr('opacity',1);
    // labels
    svg.append('text').attr('x',bx-6).attr('y',by+barH/2).attr('text-anchor','end').attr('fill',TOKENS.muted).attr('font-size',10).attr('dy','.35em').text(c.county.replace(' County',''));
    svg.append('text').attr('x',bx+bw+5).attr('y',by+barH/2).attr('fill',TOKENS.faint).attr('font-size',9).attr('font-family','ui-monospace').attr('dy','.35em').text(fmt.int(c.n));
  });
  svg.append('text').attr('x',m.l+4).attr('y',m.t+6).attr('fill',TOKENS.fent).attr('font-size',9).text('▌ fentanyl');
  svg.append('text').attr('x',m.l+70).attr('y',m.t+6).attr('fill',TOKENS.xyl).attr('font-size',9).text('▌ xylazine');
}

draw();
addEventListener('resize',draw);
