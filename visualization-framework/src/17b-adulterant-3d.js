/* Nº 17b · Adulterant Network (3D) — co-occurrence graph in three dimensions.
   Force layout with z-axis repulsion; orbit the scene to read depth-separated clusters. */
const {scaffold,classify,TOKENS}=DCF;
// @include 17-adulterant-network-shared.js

const stage=scaffold({
  tag:'Nº 17b · SUPPLY',
  title:'Adulterant Network (3D)',
  dek:'The same adulterant web lifted into space — co-occurrence springs in x, y, and z so overlapping 2D clusters separate when you orbit.',
  how:`Each <b>sphere</b> is a substance; <b>lines</b> are co-occurrence (thicker = more shared samples). A 3D force simulation spreads hubs into depth as well as width — the fentanyl knot, stimulant band, and cut cloud become <b>separable layers</b>. <b>Drag</b> to orbit, scroll to zoom. Hover a node for class and sample count. <b>Tip:</b> rotate until a tight 2D overlap opens — that depth axis is real co-occurrence structure, not decoration.`,
  provenance:'Real co-occurrence among the 22 most connected substances, 6,580-sample dataset.',
  harm:'Depth can reveal hidden pairings. A substance stacked behind a hub may still co-occur in the same samples.'
});

stage.innerHTML=`<div class="panel"><div id="plot" style="height:640px"></div></div><div class="legend" id="leg"></div>`;

const nodes=makeNodes();
const links=makeLinks();

function force3d(iter=280){
  const n=nodes.length;
  nodes.forEach((d,i)=>{
    d.x=(Math.random()-0.5)*40;
    d.y=(Math.random()-0.5)*40;
    d.z=(Math.random()-0.5)*40;
    d.vx=d.vy=d.vz=0;
    d.m=Math.sqrt(d.v);
  });
  const idMap=Object.fromEntries(nodes.map(d=>[d.id,d]));
  const edges=links.map(l=>({a:idMap[l.source],b:idMap[l.target],w:l.v}));
  const maxW=Math.max(...edges.map(e=>e.w),1);
  for(let t=0;t<iter;t++){
    const alpha=1-t/iter;
    for(let i=0;i<n;i++){
      for(let j=i+1;j<n;j++){
        const a=nodes[i],b=nodes[j];
        let dx=a.x-b.x,dy=a.y-b.y,dz=a.z-b.z;
        let dist=Math.sqrt(dx*dx+dy*dy+dz*dz)||0.01;
        const rep=900*alpha/(dist*dist);
        const f=rep/dist;
        a.vx+=dx*f; a.vy+=dy*f; a.vz+=dz*f;
        b.vx-=dx*f; b.vy-=dy*f; b.vz-=dz*f;
      }
    }
    edges.forEach(e=>{
      const a=e.a,b=e.b;
      let dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
      let dist=Math.sqrt(dx*dx+dy*dy+dz*dz)||0.01;
      const want=22-e.w/maxW*14;
      const str=(e.w/maxW)*0.08*alpha;
      const f=(dist-want)*str/dist;
      a.vx+=dx*f; a.vy+=dy*f; a.vz+=dz*f;
      b.vx-=dx*f; b.vy-=dy*f; b.vz-=dz*f;
    });
    nodes.forEach(d=>{
      d.vx-=d.x*0.002*alpha; d.vy-=d.y*0.002*alpha; d.vz-=d.z*0.002*alpha;
      d.vx*=0.85; d.vy*=0.85; d.vz*=0.85;
      d.x+=d.vx; d.y+=d.vy; d.z+=d.vz;
    });
  }
  return nodes;
}

function draw(){
  force3d();
  const r=d3.scaleSqrt(d3.extent(nodes,d=>d.v),[4,14]);
  const lw=d3.scaleLinear(d3.extent(links,d=>d.v),[1,5]);
  const idMap=Object.fromEntries(nodes.map(d=>[d.id,d]));
  const edgeX=[],edgeY=[],edgeZ=[];
  links.forEach(l=>{
    const a=idMap[l.source],b=idMap[l.target];
    edgeX.push(a.x,b.x,null); edgeY.push(a.y,b.y,null); edgeZ.push(a.z,b.z,null);
  });
  const bg=TOKENS.bg, line=TOKENS.line, muted=TOKENS.muted;
  const traces=[
    {
      type:'scatter3d',mode:'lines',
      x:edgeX,y:edgeY,z:edgeZ,
      line:{color:line,width:2},opacity:0.35,
      hoverinfo:'skip',showlegend:false
    },
    {
      type:'scatter3d',mode:'markers+text',
      x:nodes.map(d=>d.x),y:nodes.map(d=>d.y),z:nodes.map(d=>d.z),
      text:nodes.map(d=>shortLabel(d.id,12)),
      textposition:'top center',
      textfont:{size:9,color:muted},
      marker:{
        size:nodes.map(d=>r(d.v)),
        color:nodes.map(d=>d.color),
        opacity:0.92,
        line:{color:bg,width:1.5}
      },
      customdata:nodes.map(d=>[d.id,d.label,ROLES[d.id]||'',d.v]),
      hovertemplate:'<b>%{customdata[0]}</b><br>%{customdata[1]} · %{customdata[2]}<br>%{customdata[3]:,} samples<extra></extra>'
    }
  ];
  Plotly.newPlot('plot',traces,{
    paper_bgcolor:'rgba(0,0,0,0)',
    margin:{l:0,r:0,t:0,b:0},
    scene:{
      xaxis:{visible:false,showgrid:false,zeroline:false,showbackground:false},
      yaxis:{visible:false,showgrid:false,zeroline:false,showbackground:false},
      zaxis:{visible:false,showgrid:false,zeroline:false,showbackground:false},
      bgcolor:bg,
      camera:{eye:{x:1.6,y:1.4,z:1.1},center:{x:0,y:0,z:0}}
    }
  },{responsive:true,displayModeBar:false});
  renderLegend(nodes,'leg');
}
window.__vizRedraw=draw;
draw();
addEventListener('resize',()=>Plotly.Plots.resize('plot'));
