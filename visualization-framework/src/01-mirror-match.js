/* Nº 01 · Spectral Mirror Match — head-to-tail comparison of a seized sample's
   mass spectrum against a library reference, with matched fragments highlighted
   and a cosine similarity score. The classic spectrum_utils pattern, made interactive. */
const {scaffold,stickSpectrum,cosine,tooltip,fmt,TOKENS,classify}=DCF;
const MS=SPEC.ms;
const names=Object.keys(MS);

const stage=scaffold({
  tag:'Nº 01 · MS',
  title:'Spectral Mirror Match',
  dek:'Is this really what the library says it is? The seized sample (top) is mirrored against a reference spectrum (bottom). Matched fragment ions light up; the cosine score rates the fit.',
  how:`<b>Mass spectrum.</b> Electron-impact fragmentation breaks a molecule into charged pieces; each vertical stick is a fragment at a mass-to-charge ratio (<span class="mono">m/z</span>), scaled so the tallest = 100%. The molecular ion <span class="mono">M⁺•</span> (whole molecule) is marked. <b>Matching:</b> sticks that line up within ±0.5 <span class="mono">m/z</span> turn solid and connect; the <b>cosine score</b> (0–1) summarises overall agreement — a real confirmation lab also checks retention time and uses high-resolution mass. <b>Limits:</b> a high score is strong evidence of identity but isotomers and mixtures can fool any single method.`,
  provenance:'Spectra are illustrative: fragment positions reflect characteristic ions; intensities approximate. Not for analytical identification.',
  harm:'A library match confirms <i>what</i> is present, never <i>how much</i>. Peak height is not potency.'
});

stage.innerHTML=`
<div class="controls">
  <label class="muted" style="font-size:13px">Seized sample reads as</label>
  <select id="samp"></select>
  <label class="muted" style="font-size:13px">compare against library</label>
  <select id="ref"></select>
  <button class="tgl" id="noise" aria-pressed="false">add realistic noise</button>
</div>
<div class="panel"><svg id="svg" width="100%" height="460" role="img" aria-label="Mirror plot comparing two mass spectra"></svg></div>
<div id="score" style="margin-top:14px;display:flex;gap:18px;align-items:center;flex-wrap:wrap"></div>`;

const sampSel=document.getElementById('samp'), refSel=document.getElementById('ref');
for(const n of names){
  sampSel.add(new Option(n,n)); refSel.add(new Option(n,n));
}
sampSel.value='fentanyl'; refSel.value='fentanyl';
[sampSel,refSel].forEach(s=>{s.style.cssText='background:#1a2234;color:#e8ecf4;border:1px solid #26304a;border-radius:8px;padding:7px 10px;font:500 13px Inter';});

const tt=tooltip();
let noise=false;
document.getElementById('noise').onclick=e=>{noise=!noise;e.target.setAttribute('aria-pressed',noise);draw();};
sampSel.onchange=refSel.onchange=draw;

function jitter(peaks){
  if(!noise) return peaks;
  const out=peaks.map(p=>({mz:p.mz,i:Math.max(0,p.i+(Math.random()-.5)*6)}));
  for(let k=0;k<14;k++) out.push({mz:40+Math.random()*300,i:Math.random()*9});
  return out;
}

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=460,m={t:24,r:16,b:34,l:46};
  const top=jitter(stickSpectrum(MS[sampSel.value].peaks));
  const bot=stickSpectrum(MS[refSel.value].peaks);
  const allmz=[...top,...bot].map(d=>d.mz);
  const x=d3.scaleLinear([Math.min(...allmz)-12,Math.max(...allmz)+12],[m.l,W-m.r]);
  const midY=H/2;
  const yUp=d3.scaleLinear([0,100],[midY-10,m.t]);
  const yDn=d3.scaleLinear([0,100],[midY+10,H-m.b]);

  // matched set
  const matched=new Set();
  for(const a of top){for(const b of bot){if(Math.abs(a.mz-b.mz)<=0.5){matched.add(Math.round(a.mz));}}}

  // zero axis
  svg.append('line').attr('x1',m.l).attr('x2',W-m.r).attr('y1',midY).attr('y2',midY).attr('stroke',TOKENS.line);
  // x ticks
  x.ticks(8).forEach(t=>{
    svg.append('text').attr('x',x(t)).attr('y',H-12).attr('fill',TOKENS.faint).attr('font-size',11).attr('text-anchor','middle').attr('font-family','ui-monospace').text(t);
  });
  svg.append('text').attr('x',W-m.r).attr('y',midY-6).attr('text-anchor','end').attr('fill',TOKENS.muted).attr('font-size',11).text('m/z →');
  // labels
  svg.append('text').attr('x',m.l).attr('y',m.t-8).attr('fill',TOKENS.ink).attr('font-size',12).attr('font-weight',600).text('▲ Seized sample');
  svg.append('text').attr('x',m.l).attr('y',H-m.b+22).attr('fill',TOKENS.muted).attr('font-size',12).attr('font-weight',600).text('▼ Library reference');

  const colS=classify(sampSel.value).color, colR=classify(refSel.value).color;
  function sticks(data,y,col,up){
    const g=svg.append('g');
    g.selectAll('line').data(data).join('line')
      .attr('x1',d=>x(d.mz)).attr('x2',d=>x(d.mz))
      .attr('y1',y(0)).attr('y2',d=>y(d.i))
      .attr('stroke',d=>matched.has(Math.round(d.mz))?col:TOKENS.faint)
      .attr('stroke-width',d=>matched.has(Math.round(d.mz))?2.4:1.3)
      .attr('opacity',d=>matched.has(Math.round(d.mz))?1:.55)
      .style('cursor','pointer')
      .on('mousemove',(e,d)=>tt.show(`<b>m/z ${fmt.mz(d.mz)}</b><br><span class="muted">${fmt.pct(d.i)} rel.</span>${matched.has(Math.round(d.mz))?'<br>✓ matched':''}`,e.clientX,e.clientY))
      .on('mouseleave',tt.hide);
    // label top peaks
    const labels=[...data].sort((a,b)=>b.i-a.i).slice(0,5);
    g.selectAll('text').data(labels).join('text')
      .attr('x',d=>x(d.mz)).attr('y',d=>y(d.i)+(up?-6:12))
      .attr('text-anchor','middle').attr('font-size',10).attr('font-family','ui-monospace')
      .attr('fill',d=>matched.has(Math.round(d.mz))?col:TOKENS.muted).text(d=>fmt.mz(d.mz));
  }
  sticks(top,yUp,colS,true); sticks(bot,yDn,colR,false);
  // molecular ions
  [[MS[sampSel.value].mw,yUp,colS,true],[MS[refSel.value].mw,yDn,colR,false]].forEach(([mw,y,c,up])=>{
    svg.append('text').attr('x',x(mw)).attr('y',up?m.t+12:H-m.b-2).attr('text-anchor','middle').attr('font-size',10).attr('fill',c).text('M⁺• '+mw);
  });

  const score=cosine(top,bot);
  const verdict=score>0.9?['Strong match',TOKENS.ok]:score>0.6?['Partial match — check further',TOKENS.watch]:['Poor match',TOKENS.alert];
  document.getElementById('score').innerHTML=
    `<div style="font:700 34px ui-monospace;color:${verdict[1]}">${score.toFixed(3)}</div>
     <div><div style="font-size:13px;color:${verdict[1]};font-weight:600">${verdict[0]}</div>
     <div class="muted" style="font-size:12px">cosine similarity · ${matched.size} fragments matched</div></div>`;
}
draw();
addEventListener('resize',draw);
