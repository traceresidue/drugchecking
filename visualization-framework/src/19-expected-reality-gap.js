/* Nº 19 · Expected-Reality Gap — a single-sample confrontation. Left: the mental
   model (what you think you bought). Right: the chemical reality. Animated
   morph between the two makes the substitution and contamination visceral. */
const {scaffold,chromatogram,classify,fmt,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
const CH=SPEC.chromatograms, RT=Object.fromEntries(DATA.retention_times.map(d=>[d.substance,d.rt]));

const SCEN={
 heroin:{label:'Bought as heroin',expected:[{s:'heroin',rt:10.12,amp:100,sigma:.05}],actual:'fentanyl_street'},
 oxy:{label:'Bought as oxycodone (M30)',expected:[{s:'oxycodone',rt:9.7,amp:100,sigma:.05}],actual:'pressed_pill'},
 coke:{label:'Bought as cocaine',expected:[{s:'cocaine',rt:8.39,amp:100,sigma:.05}],actual:'cocaine'}
};

const stage=scaffold({
  tag:'Nº 19 · RESULT',
  title:'Expected-Reality Gap',
  dek:'You think you bought one thing. Press the switch and watch the single clean peak you expected morph into what the lab actually found. The gap is the whole point of drug checking.',
  how:`The left state is the <b>mental model</b> — one substance, one clean peak. The right state is the <b>measured reality</b> — the real chromatogram, often a thicket of adulterants and substitutions. The <b>morph animation</b> makes the substitution physical: heroin becomes a fentanyl-and-xylazine mixture; an "oxycodone" pill becomes a pressed fentanyl counterfeit. This directly addresses the documented gap (e.g. Maryland: 35% intended heroin, 1.9% actually contained it). <b>Limit:</b> peak heights are relative signal, not dose.`,
  provenance:'Illustrative scenarios over real retention times, reflecting documented expected-vs-detected gaps.',
  harm:'Assume substitution. An opioid you expect may be fentanyl plus a sedative; a stimulant may carry fentanyl traces. Test, carry naloxone, go slow.'
});

stage.innerHTML=`
<div class="controls">
  <label class="muted" style="font-size:13px">Scenario</label><select id="sel"></select>
  <button class="tgl" id="flip" aria-pressed="false">reveal reality →</button>
</div>
<div class="panel"><svg id="svg" width="100%" height="380" role="img" aria-label="Morph between expected and detected chromatogram"></svg></div>
<div id="caption" style="margin-top:12px;font-size:14px"></div>`;
const sel=document.getElementById('sel');
for(const k of Object.keys(SCEN)) sel.add(new Option(SCEN[k].label,k));
sel.className='dcf-ctl-select';
let showReal=false;
sel.onchange=()=>{showReal=false;document.getElementById('flip').setAttribute('aria-pressed',false);document.getElementById('flip').textContent='reveal reality →';render(0);};
document.getElementById('flip').onclick=e=>{showReal=!showReal;e.target.setAttribute('aria-pressed',showReal);e.target.textContent=showReal?'← back to expectation':'reveal reality →';animate();};

function traces(){
  const sc=SCEN[sel.value];
  const exp=chromatogram(sc.expected,{x0:3,x1:13,sigma:.05});
  const realPeaks=CH[sc.actual].peaks.map(([n,rt,amp])=>({s:n,rt:RT[n]||rt,amp,sigma:.05}));
  const real=chromatogram(realPeaks,{x0:3,x1:13,sigma:.05});
  return {exp,real,realPeaks,sc};
}
function render(t){ // t 0=expected 1=real
  const {exp,real,realPeaks,sc}=traces();
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=380,m={t:18,r:16,b:34,l:40};
  const x=d3.scaleLinear([3,13],[m.l,W-m.r]),y=d3.scaleLinear([0,108],[H-m.b,m.t]);
  x.ticks(10).forEach(tk=>svg.append('text').attr('x',x(tk)).attr('y',H-14).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',11).attr('font-family','ui-monospace').text(tk));
  svg.append('text').attr('x',W/2).attr('y',H-2).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',11).text('retention time (min)');
  const y0=exp.y, y1=real.y;
  const yv=y0.map((v,i)=>v*(1-t)+y1[i]*t);
  const col=d3.interpolateRgb(subColor(sc.expected[0].s), classify(realPeaks.sort((a,b)=>b.amp-a.amp)[0].s).color)(t);
  const area=d3.area().x((d,i)=>x(exp.x[i])).y0(y(0)).y1(d=>y(d)).curve(d3.curveBasis);
  svg.append('path').datum(yv).attr('d',area).attr('fill',col).attr('opacity',.2);
  svg.append('path').datum(yv).attr('d',d3.line().x((d,i)=>x(exp.x[i])).y(d=>y(d)).curve(d3.curveBasis)).attr('fill','none').attr('stroke',col).attr('stroke-width',1.8);
  // peak labels fade in with reality
  if(t>.5) realPeaks.forEach(p=>{if(p.amp>12)svg.append('text').attr('x',x(p.rt)).attr('y',y(p.amp)-5).attr('text-anchor','middle').attr('font-size',9).attr('opacity',(t-.5)*2).attr('fill',TOKENS.muted).text(p.s.length>11?p.s.slice(0,10)+'…':p.s);});
  // state badge
  svg.append('text').attr('x',m.l).attr('y',m.t+2).attr('font-size',13).attr('font-weight',600).attr('fill',col).text(t<.5?'EXPECTED':'DETECTED');
  // caption
  const cap=document.getElementById('caption');
  if(t>=1){
    const names=realPeaks.map(p=>p.s);
    cap.innerHTML=`<span class="muted">You expected <b style="color:${TOKENS.ink};text-transform:capitalize">${sc.expected[0].s}</b>. The lab found <b style="color:${TOKENS.ink}">${realPeaks.length} substances</b>: ${names.join(', ')}.</span>`;
  } else if(t<=0){ cap.innerHTML=`<span class="muted">A clean single peak — the comforting story. Press “reveal reality”.</span>`; }
}
function animate(){
  const t0=performance.now(),dur=900,from=showReal?0:1,to=showReal?1:0;
  (function step(){const e=Math.min(1,(performance.now()-t0)/dur);const ease=e<.5?2*e*e:1-Math.pow(-2*e+2,2)/2;render(from+(to-from)*ease);if(e<1)requestAnimationFrame(step);})();
}
render(0);
window.__vizRedraw=()=>render(showReal?1:0);
addEventListener('resize',()=>render(showReal?1:0));
