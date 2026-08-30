/* Nº 16 · Supply Terrain (3D) — substance × month × detections rendered as a 3D
   landscape. Mountains are dominant drugs; a rising foothill at the front edge is
   an emerging substance climbing the supply. */
const {scaffold,classify,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
const MONTHLY=DATA.monthly;

const stage=scaffold({
  tag:'Nº 16 · SUPPLY',
  title:'Supply Terrain (3D)',
  dek:'The drug supply as a mountain range. Each ridge is a substance; height is how many samples contained it each month. Watch new peaks rise as the market shifts.',
  how:`This is a 3D surface: one axis is <b>time</b>, another is <b>substance</b>, and height is <b>monthly detection count</b>. Persistent drugs form long mountain ridges; a substance that surges appears as a <b>rising peak</b>, and one that fades sinks back to the plain. Terrain makes the relative scale of the fentanyl massif against everything else immediately physical. <b>Drag</b> to orbit, scroll to zoom. <b>Denominator caution:</b> height is counts among tested samples — a measure of what programs caught, not total use.`,
  provenance:'Real monthly detection counts per substance, 2022–2024, 6,580-sample dataset.',
  harm:'The tallest ridge is fentanyl, and it dwarfs the rest. Treat any opioid-supply sample as fentanyl until tested otherwise.'
});
stage.innerHTML=`<div class="panel"><div id="plot" style="height:580px"></div></div>`;

const months=[...new Set(MONTHLY.map(d=>d.month))].sort();
const subTotals={}; MONTHLY.forEach(d=>subTotals[d.substance]=(subTotals[d.substance]||0)+d.n);
const subs=Object.keys(subTotals).sort((a,b)=>subTotals[b]-subTotals[a]).slice(0,14).reverse();
const Z=subs.map(s=>{const m=Object.fromEntries(MONTHLY.filter(d=>d.substance===s).map(d=>[d.month,d.n]));return months.map(mo=>m[mo]||0);});
const tickvals=months.map((m,i)=>i).filter((_,i)=>i%4===0);
const ticktext=months.filter((_,i)=>i%4===0).map(m=>{const[y,mo]=m.split('-');return `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mo]} '${y.slice(2)}`;});

function draw(){
  const colorscale=window.DCFDesign?DCFDesign.getColorscale():[[0,'#0b0e14'],[0.1,'#2a1a3a'],[0.3,'#7a3a5a'],[0.6,'#ff5c7a'],[0.85,'#ff8a5c'],[1,'#ffd166']];
  const bg=window.DCFDesign?getComputedStyle(document.documentElement).getPropertyValue('--bg').trim():'#0b0e14';
  const line=window.DCFDesign?getComputedStyle(document.documentElement).getPropertyValue('--line').trim():'#26304a';
  const muted=window.DCFDesign?getComputedStyle(document.documentElement).getPropertyValue('--muted').trim():'#8b94a8';
  const showAxis=!window.DCFDesign||DCFDesign.showTier('axis');
  const showY=!window.DCFDesign||DCFDesign.showTier('inline');
  const layout=window.DCFDesign?DCFDesign.getPlotlyLayout({
    paper_bgcolor:'rgba(0,0,0,0)',
    scene:{
      xaxis:{title:showAxis?'month →':'',color:muted,gridcolor:line,backgroundcolor:bg,showbackground:true,
        tickvals:showAxis?tickvals:[],ticktext:showAxis?ticktext:[]},
      yaxis:{title:'',color:muted,gridcolor:line,backgroundcolor:bg,showbackground:true,tickfont:{size:9},showticklabels:showY},
      zaxis:{title:showAxis?'samples / month':'',color:muted,gridcolor:line,backgroundcolor:bg,showbackground:true},
      camera:{eye:{x:1.9,y:-1.4,z:0.8}},aspectratio:{x:1.6,y:1.1,z:0.6}
    },
    margin:{l:0,r:0,t:0,b:0}
  }):{
    paper_bgcolor:'rgba(0,0,0,0)',
    scene:{
      xaxis:{title:'month →',color:'#8b94a8',gridcolor:'#26304a',backgroundcolor:'#0b0e14',showbackground:true,tickvals,ticktext},
      yaxis:{title:'',color:'#8b94a8',gridcolor:'#26304a',backgroundcolor:'#0b0e14',showbackground:true,tickfont:{size:9}},
      zaxis:{title:'samples / month',color:'#8b94a8',gridcolor:'#26304a',backgroundcolor:'#0b0e14',showbackground:true},
      camera:{eye:{x:1.9,y:-1.4,z:0.8}},aspectratio:{x:1.6,y:1.1,z:0.6}
    },
    margin:{l:0,r:0,t:0,b:0}
  };
  Plotly.newPlot('plot',[{
    type:'surface',x:months.map((m,i)=>i),y:subs,z:Z,
    colorscale,showscale:false,contours:{z:{show:true,usecolormap:true,width:1,project:{z:false}}}
  }],layout,{responsive:true,displayModeBar:false});
}
window.__vizRedraw=draw;
draw();
