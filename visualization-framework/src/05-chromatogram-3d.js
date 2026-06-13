/* Nº 05 · GC–MS Data Cube (3D) — the full GC–MS measurement is three-dimensional:
   retention time × m/z × intensity. Here it's a navigable 3D surface, with each
   chromatographic peak rising into its own mass-spectral ridge. */
const {scaffold,stickSpectrum,classify,TOKENS}=DCF;
const CH=SPEC.chromatograms, MS=SPEC.ms, RT=Object.fromEntries(DATA.retention_times.map(d=>[d.substance,d.rt]));

const stage=scaffold({
  tag:'Nº 05 · GC–MS',
  title:'GC–MS Data Cube (3D)',
  dek:'A 2D chromatogram hides a dimension. The real measurement is a landscape: time on one axis, mass on another, signal as height. Drag to orbit the data.',
  how:`<b>GC–MS records two things at once.</b> The gas chromatograph separates compounds in <b>time</b> (front axis); at every instant the mass spectrometer records a full <b>mass spectrum</b> (side axis). Plotting signal as height gives this terrain: each tall ridge is one compound, eluting at its retention time and fingerprinted by its fragment masses. A traditional chromatogram is just this surface viewed from above and summed. <b>Drag</b> to rotate, scroll to zoom. <b>Limits:</b> height is signal intensity, not concentration — different molecules ionise very differently.`,
  provenance:'Surface synthesized from real median retention times and illustrative fragment spectra in this dataset.',
  harm:'Reading this landscape tells you what is present. It cannot tell you the dose — never gauge strength by eye.'
});

stage.innerHTML=`
<div class="controls"><label class="muted" style="font-size:13px">Sample</label><select id="sel"></select></div>
<div class="panel"><div id="plot" style="height:560px"></div></div>`;
const sel=document.getElementById('sel');
for(const k of Object.keys(CH)) sel.add(new Option(CH[k].label,k));
sel.style.cssText='background:#1a2234;color:#e8ecf4;border:1px solid #26304a;border-radius:8px;padding:7px 10px;font:500 13px Inter';
sel.onchange=draw;

function gauss(x,mu,s){return Math.exp(-0.5*((x-mu)/s)**2);}
function draw(){
  const peaks=CH[sel.value].peaks.map(([s,rt,amp])=>({s,rt:RT[s]||rt,amp}));
  const rt=[]; for(let t=3;t<=13;t+=0.08) rt.push(+t.toFixed(2));
  const mz=[]; for(let m=40;m<=360;m+=4) mz.push(m);
  const Z=mz.map(mm=>rt.map(tt=>{
    let v=0;
    for(const p of peaks){
      const ms=MS[p.s]; if(!ms)continue;
      const pk=stickSpectrum(ms.peaks);
      let spec=0; for(const q of pk) spec+=q.i/100*gauss(mm,q.mz,2.5);
      v+=p.amp/100*gauss(tt,p.rt,0.06)*spec;
    }
    return v;
  }));
  Plotly.newPlot('plot',[{
    type:'surface',x:rt,y:mz,z:Z,
    colorscale:[[0,'#0b0e14'],[0.15,'#1a2a4a'],[0.4,'#2a6f97'],[0.7,'#4cc9f0'],[1,'#ffd166']],
    showscale:false,contours:{z:{show:true,usecolormap:true,project:{z:true}}}
  }],{
    paper_bgcolor:'rgba(0,0,0,0)',
    scene:{
      xaxis:{title:'retention time (min)',color:'#8b94a8',gridcolor:'#26304a',backgroundcolor:'#0b0e14',showbackground:true},
      yaxis:{title:'m/z',color:'#8b94a8',gridcolor:'#26304a',backgroundcolor:'#0b0e14',showbackground:true},
      zaxis:{title:'signal',color:'#8b94a8',gridcolor:'#26304a',backgroundcolor:'#0b0e14',showbackground:true},
      camera:{eye:{x:1.6,y:-1.5,z:0.9}}
    },
    margin:{l:0,r:0,t:0,b:0}
  },{responsive:true,displayModeBar:false});
}
draw();
