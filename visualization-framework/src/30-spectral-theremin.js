/* Nº 30 · Spectral Theremin — hover or drag across a GC–MS chromatogram to hear
   it. Each peak becomes a note: pitch = retention time mapped to a musical scale,
   volume envelope = peak intensity. Moving the mouse across the trace "plays"
   the spectrum like a Theremin. Two modes: hover-scan (continuous drone) and
   step (peaks as discrete notes). An experimental multisensory approach. */
const {scaffold,classify,fmt,tooltip,TOKENS,chromatogram}=DCF;
const RT=DATA.retention_times;
const PROFILES={
  'fentanyl street':['fentanyl','4-anpp','xylazine','acetaminophen','caffeine','p-fluorofentanyl'],
  'meth':['methamphetamine','caffeine','dimethyl sulfone (methylsulfonylmethane msm)'],
  'cocaine':['cocaine','levamisole','caffeine','lidocaine'],
};
const rtMap=Object.fromEntries(RT.map(d=>[d.substance,d.rt]));
const extraRT={caffeine:8.12,'4-anpp':9.6,xylazine:7.9,acetaminophen:5.44,'p-fluorofentanyl':10.84,lidocaine:7.26,levamisole:7.8,'dimethyl sulfone (methylsulfonylmethane msm)':3.2};

const stage=scaffold({
  tag:'Nº 30 · SONIC',
  title:'Spectral Theremin',
  dek:'Hover across the chromatogram to hear each peak as a note. Retention time → pitch, peak height → volume. A multisensory way to "feel" a spectrum — and notice which peaks dominate.',
  how:`Move your cursor slowly across the <b>chromatogram panel</b> to hear the spectrum. Your horizontal position controls which retention time you are "at" (mapped to a musical scale: low RT = low pitch, high RT = high pitch). The current signal amplitude at that RT controls the volume. <b>Peaks play louder</b>, valleys are nearly silent. Switch between <b>drone mode</b> (continuous tone following your mouse) and <b>step mode</b> (peaks trigger discrete notes). Select a different supply profile to hear how the melody changes. This is an <b>accessibility concept</b>: spectra as a tactile/auditory experience, not just visual.`,
  provenance:'Chromatogram synthesized from real retention times; composition based on common supply profiles.',
  harm:'Each peak is a substance — even the quiet ones matter. The tallest peak is not necessarily the most dangerous one by dose.'
});

stage.innerHTML=`
<div class="controls">
  <label class="muted" style="font-size:13px">Profile:</label>
  <select id="profile" style="background:#1a2234;color:#e8ecf4;border:1px solid #26304a;border-radius:8px;padding:7px 10px;font-size:13px"></select>
  <button class="tgl" id="modeBtn" aria-pressed="false">drone mode</button>
  <button class="tgl" id="playPeaks">▶ play peaks</button>
  <span id="note" class="mono" style="font-size:13px;min-width:8ch"></span>
</div>
<div class="panel" id="svgWrap" style="cursor:crosshair">
  <svg id="svg" width="100%" height="340" role="img" aria-label="Interactive chromatogram theremin"></svg>
</div>
<div id="cursor-line" style="display:none"></div>`;

const profileSel=document.getElementById('profile');
Object.keys(PROFILES).forEach(k=>{profileSel.add(new Option(k,k));});
profileSel.value='fentanyl street';

const tt=tooltip();
let ctx=null, osc=null, gainNode=null, droneActive=false, droneMode=false;

function getCtx(){if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();}return ctx;}

function buildPeaks(profileKey){
  const subs=PROFILES[profileKey];
  const amps={
    fentanyl:1,xylazine:.75,'4-anpp':.85,'p-fluorofentanyl':.45,acetaminophen:.6,caffeine:.55,
    methamphetamine:.9,'dimethyl sulfone (methylsulfonylmethane msm)':.35,
    cocaine:.88,levamisole:.4,lidocaine:.3,heroin:.7
  };
  return subs.map(s=>({s,rt:rtMap[s]||extraRT[s]||8,amp:(amps[s]||.5)*100,sigma:.055})).filter(p=>p.rt);
}

// Map RT (3–13 min) to musical note frequencies (C3–C6)
const C3=130.81, SEMITONE=Math.pow(2,1/12);
function rtToFreq(rt){
  const norm=(rt-3)/(13-3); // 0–1
  const semitones=Math.round(norm*36); // 3 octaves
  return C3*Math.pow(SEMITONE,semitones);
}

let currentPeaks=[], currentTrace=null;
const m={t:20,r:16,b:36,l:48};
let W=800,H=340;

function drawChart(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  W=svg.node().clientWidth||800; H=340;
  currentPeaks=buildPeaks(profileSel.value);
  currentTrace=chromatogram(currentPeaks,{x0:3,x1:13,n:200,sigma:.055});
  const x=d3.scaleLinear([3,13],[m.l,W-m.r]);
  const y=d3.scaleLinear([0,100],[H-m.b,m.t]);
  // grid
  [0,25,50,75,100].forEach(v=>{
    svg.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',y(v)).attr('y2',y(v)).attr('stroke',TOKENS.line).attr('opacity',.25);
  });
  x.ticks(10).forEach(t=>{
    svg.append('text').attr('x',x(t)).attr('y',H-14).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',10).attr('font-family','ui-monospace').text(t);
  });
  svg.append('text').attr('x',W/2).attr('y',H-2).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',10).text('retention time (min) — hover to play');
  // area
  const dom=classify(currentPeaks.sort((a,b)=>b.amp-a.amp)[0].s).color;
  const area=d3.area().x((d,i)=>x(currentTrace.x[i])).y0(y(0)).y1(d=>y(d)).curve(d3.curveBasis);
  svg.append('path').datum(currentTrace.y).attr('d',area).attr('fill',dom).attr('opacity',.12);
  svg.append('path').datum(currentTrace.y).attr('d',d3.line().x((d,i)=>x(currentTrace.x[i])).y(d=>y(d)).curve(d3.curveBasis)).attr('fill','none').attr('stroke',dom).attr('stroke-width',2);
  // peak labels
  currentPeaks.sort((a,b)=>b.amp-a.amp).forEach(p=>{
    const c=classify(p.s);
    svg.append('circle').attr('cx',x(p.rt)).attr('cy',y(p.amp)-2).attr('r',5).attr('fill',c.color).attr('stroke',TOKENS.bg).attr('stroke-width',1.5);
    svg.append('text').attr('x',x(p.rt)).attr('y',y(p.amp)-12).attr('text-anchor','middle').attr('font-size',10).attr('font-family','ui-monospace').attr('fill',c.color).text(p.s.length>12?p.s.slice(0,11)+'…':p.s);
  });
  // Cursor highlight (vertical line overlay, drawn on hover)
  svg.append('line').attr('id','cline').attr('x1',0).attr('x2',0).attr('y1',m.t).attr('y2',H-m.b).attr('stroke',TOKENS.ok).attr('stroke-width',1.5).attr('opacity',0);
}

// Hover handler
const svgWrap=document.getElementById('svgWrap');
let lastRt=null;
svgWrap.addEventListener('mousemove',e=>{
  if(!currentTrace) return;
  const rect=svgWrap.getBoundingClientRect();
  const px=(e.clientX-rect.left);
  const rt=3+(px-m.l)/(W-m.l-m.r)*10;
  if(rt<3||rt>13) return;
  lastRt=rt;
  // interpolate amplitude at this RT
  const idx=Math.round((rt-3)/(13-3)*(currentTrace.x.length-1));
  const amp=currentTrace.y[Math.max(0,Math.min(idx,currentTrace.y.length-1))]||0;
  // cursor line
  d3.select('#cline').attr('x1',m.l+(rt-3)/(13-3)*(W-m.l-m.r)).attr('x2',m.l+(rt-3)/(13-3)*(W-m.l-m.r)).attr('opacity',.7);
  // audio: drone mode
  if(droneMode){
    const ac=getCtx(); if(ac.state==='suspended') ac.resume();
    const freq=rtToFreq(rt);
    const vol=(amp/100)*0.35;
    if(!osc){
      gainNode=ac.createGain(); gainNode.gain.value=0; gainNode.connect(ac.destination);
      osc=ac.createOscillator(); osc.type='sine'; osc.connect(gainNode); osc.start();
    }
    osc.frequency.exponentialRampToValueAtTime(Math.max(freq,20),ac.currentTime+0.03);
    gainNode.gain.linearRampToValueAtTime(vol,ac.currentTime+0.03);
    droneActive=true;
  }
  // closest peak label
  const closest=currentPeaks.reduce((best,p)=>(Math.abs(p.rt-rt)<Math.abs(best.rt-rt)?p:best),currentPeaks[0]);
  if(Math.abs(closest.rt-rt)<0.4){
    const c=classify(closest.s);
    document.getElementById('note').textContent=`♪ ${closest.s.split(' ')[0]}`;
    document.getElementById('note').style.color=c.color;
  } else {
    document.getElementById('note').textContent=`${rt.toFixed(1)} min`;
    document.getElementById('note').style.color=TOKENS.muted;
  }
});
svgWrap.addEventListener('mouseleave',()=>{
  if(gainNode&&droneActive){gainNode.gain.linearRampToValueAtTime(0,getCtx().currentTime+0.1);droneActive=false;}
  d3.select('#cline').attr('opacity',0);
});

document.getElementById('modeBtn').onclick=function(){
  droneMode=!droneMode;this.textContent=droneMode?'step mode':'drone mode';this.setAttribute('aria-pressed',droneMode);
  if(!droneMode&&osc){gainNode.gain.linearRampToValueAtTime(0,getCtx().currentTime+0.1);setTimeout(()=>{if(osc){osc.stop();osc=null;gainNode=null;}},200);}
};

document.getElementById('playPeaks').onclick=function(){
  const ac=getCtx(); if(ac.state==='suspended') ac.resume();
  const sorted=[...currentPeaks].sort((a,b)=>a.rt-b.rt);
  sorted.forEach((p,i)=>{
    const t=ac.currentTime+i*0.55;
    const freq=rtToFreq(p.rt);
    const vol=p.amp/100*0.4;
    const o=ac.createOscillator(); const g=ac.createGain();
    o.type=classify(p.s).cls==='stim'?'triangle':'sine';
    o.frequency.value=freq;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.05);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.45);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+0.5);
  });
};

profileSel.onchange=drawChart;
drawChart();
addEventListener('resize',drawChart);
