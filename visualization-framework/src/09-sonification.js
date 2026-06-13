/* Nº 09 · Hear the Spectrum (Sonification) — a mass or infrared spectrum mapped to
   sound: each peak becomes a tone, m/z (or wavenumber) → pitch, abundance → volume.
   An accessibility layer, and a visceral way to "hear" contamination. */
const {scaffold,stickSpectrum,ftirCurve,classify,fmt,TOKENS}=DCF;
const MS=SPEC.ms, F=SPEC.ftir;

const stage=scaffold({
  tag:'Nº 09 · EXPERIMENTAL',
  title:'Hear the Spectrum',
  dek:'Spectra are just patterns of peaks — and patterns can be heard. Each peak becomes a note: position sets the pitch, abundance sets the loudness. Press play and listen to a molecule.',
  how:`<b>Sonification</b> maps data to sound. Here each spectral peak is a tone: <span class="mono">m/z</span> (or wavenumber) sets <b>pitch</b> — low mass → low note — and abundance sets <b>volume</b>. The sweep plays left to right like reading the chart. This is a genuine <b>accessibility layer</b> (blind and low-vision users can perceive overlapping peaks that are hard to see) and a public-engagement tool: a clean drug and an adulterated one <i>sound</i> different. Toggle two substances to hear a "chord" of a mixture. <b>Audio requires a tap to start</b> (browser autoplay policy).`,
  provenance:'Illustrative spectra. Sonification is a perceptual aid, not an analytical measurement.',
  harm:'Hearing the difference is powerful, but ears aren\'t a test. Use strips and lab checking; carry naloxone.'
});

stage.innerHTML=`
<div class="controls">
  <label class="muted" style="font-size:13px">Substance</label><select id="sel"></select>
  <button class="tgl" id="play">▶ Play sweep</button>
  <label class="muted" style="font-size:13px">mode</label>
  <button class="tgl" id="modeMS" aria-pressed="true">mass spectrum</button>
  <button class="tgl" id="modeIR" aria-pressed="false">FTIR</button>
</div>
<div class="panel"><svg id="svg" width="100%" height="300" role="img" aria-label="Spectrum with sonification playhead"></svg></div>
<p class="muted" style="font-size:13px;margin-top:12px" id="status">Tap “Play sweep” to hear the spectrum left-to-right.</p>`;

const sel=document.getElementById('sel');
let mode='MS';
function fillSel(){ sel.innerHTML=''; const keys=mode==='MS'?Object.keys(MS):Object.keys(F).filter(k=>Array.isArray(F[k])); for(const k of keys) sel.add(new Option(k,k)); }
fillSel();
sel.style.cssText='background:#1a2234;color:#e8ecf4;border:1px solid #26304a;border-radius:8px;padding:7px 10px;font:500 13px Inter';
document.getElementById('modeMS').onclick=()=>setMode('MS');
document.getElementById('modeIR').onclick=()=>setMode('IR');
function setMode(m){mode=m;document.getElementById('modeMS').setAttribute('aria-pressed',m==='MS');document.getElementById('modeIR').setAttribute('aria-pressed',m==='IR');fillSel();draw();}
sel.onchange=draw;

let actx;
function peaksData(){
  if(mode==='MS'){ const pk=stickSpectrum(MS[sel.value].peaks); return {pts:pk.map(p=>({pos:p.mz,amp:p.i})),lo:40,hi:360,unit:'m/z'}; }
  const c=ftirCurve(F[sel.value],{x0:4000,x1:400,n:200});
  // find local maxima as "peaks"
  const pts=[];
  for(let i=2;i<c.y.length-2;i++){ if(c.y[i]>0.15&&c.y[i]>=c.y[i-1]&&c.y[i]>c.y[i+1]) pts.push({pos:c.x[i],amp:c.y[i]*100}); }
  return {pts,lo:400,hi:4000,unit:'cm⁻¹'};
}
function pitch(pos,lo,hi){ const t=(pos-lo)/(hi-lo); return 130*Math.pow(2, t*2.6); } // ~2.6 octaves

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=300,m={t:18,r:16,b:34,l:30};
  const {pts,lo,hi,unit}=peaksData();
  const x=mode==='IR'?d3.scaleLinear([hi,lo],[m.l,W-m.r]):d3.scaleLinear([lo,hi],[m.l,W-m.r]);
  const y=d3.scaleLinear([0,100],[H-m.b,m.t]);
  const col=classify(sel.value).color;
  x.ticks(7).forEach(t=>svg.append('text').attr('x',x(t)).attr('y',H-14).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',11).attr('font-family','ui-monospace').text(t));
  svg.append('text').attr('x',W-m.r).attr('y',H-14).attr('text-anchor','end').attr('fill',TOKENS.muted).attr('font-size',11).text(unit);
  svg.selectAll('line.pk').data(pts).join('line').attr('class','pk').attr('x1',d=>x(d.pos)).attr('x2',d=>x(d.pos)).attr('y1',y(0)).attr('y2',d=>y(d.amp)).attr('stroke',col).attr('stroke-width',2);
  svg.append('line').attr('id','ph').attr('x1',m.l).attr('x2',m.l).attr('y1',m.t).attr('y2',H-m.b).attr('stroke',TOKENS.ink).attr('opacity',0);
  window._S={x,pts,lo,hi,col,W,m};
}
draw();
addEventListener('resize',draw);

document.getElementById('play').onclick=async()=>{
  if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)();
  await actx.resume();
  const {x,pts,lo,hi}=window._S;
  const dur=3.2, t0=actx.currentTime;
  const sorted=[...pts].sort((a,b)=> mode==='IR'? b.pos-a.pos : a.pos-b.pos);
  const span=mode==='IR'?(hi-lo):(hi-lo);
  sorted.forEach(p=>{
    const frac=mode==='IR'?(hi-p.pos)/span:(p.pos-lo)/span;
    const when=t0+frac*dur;
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='sine'; o.frequency.value=pitch(p.pos,lo,hi);
    const vol=Math.min(.28,p.amp/100*.3);
    g.gain.setValueAtTime(0,when); g.gain.linearRampToValueAtTime(vol,when+0.012); g.gain.exponentialRampToValueAtTime(0.0008,when+0.32);
    o.connect(g).connect(actx.destination); o.start(when); o.stop(when+0.34);
  });
  // animate playhead
  const ph=document.getElementById('ph'); const t1=performance.now();
  document.getElementById('status').textContent=`Playing ${sel.value} — ${pts.length} peaks as tones (low note = ${mode==='IR'?'high wavenumber':'low mass'}).`;
  (function anim(){const e=(performance.now()-t1)/(dur*1000);if(e>1){ph.setAttribute('opacity',0);return;}ph.setAttribute('opacity',.7);const xv=window._S.m.l+e*(window._S.W-window._S.m.l-window._S.m.r);ph.setAttribute('x1',xv);ph.setAttribute('x2',xv);requestAnimationFrame(anim);})();
};
