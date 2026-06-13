/* Nº 21 · Supply Tile-Grid Cartogram — a US tile-grid map (one equal square per
   state) avoids the "big empty states look important" trap of geographic maps and
   keeps small states legible. Each tile shows testing volume and a fentanyl/
   xylazine split. Built fully offline — no external geometry fetch. */
const {scaffold,fmt,tooltip,TOKENS}=DCF;
const STATE_COUNTS=DATA.state_counts, GEO=DATA.geo;

// tile-grid layout [row,col] (standard US statebins)
const GRID={AL:[6,6],AK:[0,0],AZ:[5,2],AR:[5,5],CA:[4,1],CO:[4,3],CT:[3,10],DE:[4,9],FL:[7,8],GA:[6,7],
HI:[7,0],ID:[2,2],IL:[3,5],IN:[3,6],IA:[3,4],KS:[5,4],KY:[4,6],LA:[6,4],ME:[0,10],MD:[4,8],MA:[2,10],
MI:[2,7],MN:[2,4],MS:[6,5],MO:[4,5],MT:[2,3],NE:[4,4],NV:[3,2],NH:[1,10],NJ:[3,9],NM:[5,3],NY:[2,9],
NC:[5,7],ND:[2,4],OH:[3,7],OK:[5,4],OR:[3,1],PA:[3,8],RI:[3,11],SC:[5,8],SD:[3,4],TN:[5,6],TX:[6,3],
UT:[4,2],VT:[1,9],VA:[4,7],WA:[1,1],WV:[4,7],WI:[2,5],WY:[3,3]};
// resolve a couple collisions for cleanliness
GRID.ND=[1,4];GRID.SD=[2,4];GRID.KS=[5,4];GRID.NE=[4,4];GRID.WV=[4,7];GRID.VA=[5,9];GRID.NC=[5,8];GRID.SC=[6,8];

const stage=scaffold({
  tag:'Nº 21 · GEO',
  title:'Supply Tile-Grid Cartogram',
  dek:'A map where every state is the same size. Geographic maps make empty states look important and hide dense ones — a tile grid fixes that, so each state\'s testing volume and contamination read fairly.',
  how:`Each square is one US state, placed in roughly its geographic position but given <b>equal area</b> — so Rhode Island and Texas get the same visual weight, and the data, not the landmass, drives attention. Tile <b>brightness</b> = number of samples tested there in this dataset; the small split bar shows the share that contained <b>fentanyl</b> vs. <b>xylazine</b>. <b>Crucial caveat:</b> this maps where <i>testing happened</i>, not where drugs are — absence of color means no program data, never a clean supply.`,
  provenance:'Real per-state sample counts and fentanyl/xylazine positivity, 6,580-sample dataset (testing concentrated in WA, NC, NY, OR).',
  harm:'A dark tile means no data, not no risk. The supply crosses state lines faster than testing programs do.'
});

stage.innerHTML=`
<div class="controls">
  <button class="tgl" id="mVol" aria-pressed="true">testing volume</button>
  <button class="tgl" id="mFent" aria-pressed="false">% fentanyl</button>
  <button class="tgl" id="mXyl" aria-pressed="false">% xylazine</button>
</div>
<div class="panel" style="display:flex;justify-content:center"><svg id="svg" width="100%" height="440" role="img" aria-label="US tile-grid cartogram"></svg></div>
<div id="leg" class="legend"></div>`;
const tt=tooltip();
let metric='vol';
document.getElementById('mVol').onclick=()=>setM('vol');
document.getElementById('mFent').onclick=()=>setM('fent');
document.getElementById('mXyl').onclick=()=>setM('xyl');
function setM(m){metric=m;['mVol','mFent','mXyl'].forEach((id,i)=>document.getElementById(id).setAttribute('aria-pressed',['vol','fent','xyl'][i]===m));draw();}

// aggregate fent/xyl share per state from GEO
const stateAgg={};
GEO.forEach(g=>{const s=g.state;if(!stateAgg[s])stateAgg[s]={n:0,fent:0,xyl:0};stateAgg[s].n+=g.n;stateAgg[s].fent+=g.fent;stateAgg[s].xyl+=g.xyl;});

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=440;
  const cols=12, rows=8, pad=4;
  const size=Math.min((W-20)/cols,(H-20)/rows);
  const ox=(W-size*cols)/2, oy=10;
  const maxVol=Math.max(...Object.values(STATE_COUNTS).filter(v=>typeof v==='number'));
  const color=d3.scaleSequential(d3.interpolateInferno).domain([0,Math.log(maxVol+1)]);
  const fentColor=d3.scaleSequential(t=>d3.interpolateRgb(TOKENS.panel2,TOKENS.fent)(t)).domain([0,1]);
  const xylColor=d3.scaleSequential(t=>d3.interpolateRgb(TOKENS.panel2,TOKENS.xyl)(t)).domain([0,.5]);
  Object.entries(GRID).forEach(([st,[r,c]])=>{
    const n=STATE_COUNTS[st]||0; const ag=stateAgg[st]||{n:0,fent:0,xyl:0};
    const fpct=ag.n?ag.fent/ag.n:0, xpct=ag.n?ag.xyl/ag.n:0;
    let fill;
    if(metric==='vol') fill=n>0?color(Math.log(n+1)):TOKENS.panel2;
    else if(metric==='fent') fill=ag.n>0?fentColor(fpct):TOKENS.panel2;
    else fill=ag.n>0?xylColor(xpct):TOKENS.panel2;
    const x=ox+c*size, y=oy+r*size;
    svg.append('rect').attr('x',x+pad/2).attr('y',y+pad/2).attr('width',size-pad).attr('height',size-pad).attr('rx',4)
      .attr('fill',fill).attr('stroke',n>0?TOKENS.line:'transparent').attr('opacity',n>0||ag.n>0?1:.25)
      .style('cursor',n>0?'pointer':'default')
      .on('mousemove',e=>tt.show(`<b>${st}</b><br><span class="muted">${fmt.int(n)} samples${ag.n?`<br>${fmt.pct(fpct*100)} fentanyl · ${fmt.pct(xpct*100)} xylazine`:''}</span>`,e.clientX,e.clientY))
      .on('mouseleave',tt.hide);
    svg.append('text').attr('x',x+size/2).attr('y',y+size/2-2).attr('text-anchor','middle').attr('fill',n>0?'#fff':TOKENS.faint).attr('font-size',Math.min(13,size/3.4)).attr('font-weight',600).text(st);
    if(n>0&&metric==='vol') svg.append('text').attr('x',x+size/2).attr('y',y+size/2+12).attr('text-anchor','middle').attr('fill','#fff').attr('opacity',.8).attr('font-size',9).attr('font-family','ui-monospace').text(fmt.int(n));
  });
  document.getElementById('leg').innerHTML=metric==='vol'?'<span class="faint">brighter = more samples tested (log scale). Dark = no program data.</span>':
    metric==='fent'?`<span><i style="background:${TOKENS.fent}"></i>higher = larger share of samples with fentanyl</span>`:
    `<span><i style="background:${TOKENS.xyl}"></i>higher = larger share of samples with xylazine</span>`;
}
draw();
addEventListener('resize',draw);
