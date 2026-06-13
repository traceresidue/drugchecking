/* Nº 07 · FTIR Waterfall (3D) — a series of FTIR spectra stacked in depth, one
   per time slice, so the supply's shifting infrared signature becomes a flowing
   3D ribbon. New bands rising at the front = a new component entering the market. */
const {scaffold,ftirCurve,TOKENS}=DCF;
const F=SPEC.ftir;

const stage=scaffold({
  tag:'Nº 07 · FTIR',
  title:'FTIR Waterfall (3D)',
  dek:'Twelve months of a region\'s infrared fingerprint, stacked into depth. A band that grows toward the front is a component taking over the supply.',
  how:`Each ribbon slice is an <b>FTIR spectrum</b> for one month (depth axis = time, front axis = wavenumber, height = absorbance). Stacking them as a <b>waterfall</b> turns trend-spotting into terrain-reading: a band that swells from back to front is a substance whose share is rising; one that recedes is leaving. This is how spectroscopists watch a reaction or a market evolve. <b>Drag</b> to orbit. <b>Limits:</b> FTIR is blind to components below ~5% — potent drugs like fentanyl can rise invisibly between these ribbons.`,
  provenance:'Monthly spectra synthesized from a shifting component mix (acetaminophen/caffeine → +xylazine) over illustrative FTIR bands.',
  harm:'A waterfall can show a sedative like xylazine entering the supply — but never the fentanyl beneath the detection floor. Pair with strips.'
});
stage.innerHTML=`<div class="panel"><div id="plot" style="height:580px"></div></div>`;

const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function mix(t){ // t in 0..1 across the year: xylazine grows, lactose shrinks
  const bands=[];
  F.fentanyl.forEach(b=>bands.push([b[0],b[1]*1.0,b[2]]));
  F.caffeine.forEach(b=>bands.push([b[0],b[1]*0.5,b[2]]));
  F.lactose.forEach(b=>bands.push([b[0],b[1]*(0.8-0.6*t),b[2]]));
  F.xylazine.forEach(b=>bands.push([b[0],b[1]*(0.05+0.9*t),b[2]]));
  return bands;
}
const sample=ftirCurve(mix(0),{x0:4000,x1:400,n:280});
const wn=sample.x;
const Z=months.map((mo,i)=>ftirCurve(mix(i/11),{x0:4000,x1:400,n:280}).y);

Plotly.newPlot('plot',[{
  type:'surface',x:wn,y:months,z:Z,
  colorscale:[[0,'#0b0e14'],[0.2,'#3a2a5a'],[0.5,'#7a5cff'],[0.8,'#b388ff'],[1,'#ffd166']],
  showscale:false,
  contours:{x:{show:true,color:'#26304a',width:1}}
}],{
  paper_bgcolor:'rgba(0,0,0,0)',
  scene:{
    xaxis:{title:'wavenumber (cm⁻¹)',color:'#8b94a8',gridcolor:'#26304a',autorange:'reversed',backgroundcolor:'#0b0e14',showbackground:true},
    yaxis:{title:'month',color:'#8b94a8',gridcolor:'#26304a',backgroundcolor:'#0b0e14',showbackground:true},
    zaxis:{title:'absorbance',color:'#8b94a8',gridcolor:'#26304a',backgroundcolor:'#0b0e14',showbackground:true},
    camera:{eye:{x:-1.7,y:-1.3,z:0.8}}
  },
  margin:{l:0,r:0,t:0,b:0}
},{responsive:true,displayModeBar:false});
