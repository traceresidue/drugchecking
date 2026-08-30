/* Nº 18 · Sample Result Card — the individual-facing deliverable. A shareable card
   that pairs a plain-language summary, the chromatogram "fingerprint," a component
   breakdown, and tailored harm-reduction messaging. The UNC model, productized. */
const {scaffold,chromatogram,classify,fmt,TOKENS,drawSmiles}=DCF;
const CH=SPEC.chromatograms, MS=SPEC.ms, RT=Object.fromEntries(DATA.retention_times.map(d=>[d.substance,d.rt]));
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}

const SAMPLES={
 's1':{id:'WA-44821',expected:'Heroin / "down"',date:'2024-03-08',loc:'King County, WA',key:'fentanyl_street'},
 's2':{id:'NC-10293',expected:'M30 oxycodone pill',date:'2024-04-19',loc:'Buncombe County, NC',key:'pressed_pill'},
 's3':{id:'OR-55140',expected:'Cocaine',date:'2024-02-27',loc:'Multnomah County, OR',key:'cocaine'},
 's4':{id:'NY-30817',expected:'Methamphetamine',date:'2024-05-02',loc:'Suffolk County, NY',key:'meth'}
};
const HARM={
 fentanyl:['Carry naloxone — multiple doses may be needed.','Never use alone; use with someone who can respond.','Go slow: potency varies bag to bag even when it looks the same.'],
 xylazine:['Xylazine ("tranq") is a sedative — naloxone won\'t reverse it, so focus on rescue breathing and positioning.','Watch for and care for skin wounds early.'],
 bromazolam:['A street benzodiazepine is present — it deepens and prolongs sedation and naloxone won\'t fix that part.','Avoid mixing with alcohol or other depressants.'],
 'p-fluorofentanyl':['A second fentanyl-type drug adds to total opioid load — treat as strong.'],
 cocaine:['Stimulant supply can carry fentanyl traces — fentanyl test strips are worth using.'],
 methamphetamine:['Stay hydrated and watch for overheating; the supply can contain unexpected stimulant analogues.']
};

const stage=scaffold({
  tag:'Nº 18 · RESULT',
  title:'Sample Result Card',
  dek:'What a person actually receives. A single card: plain-language summary first, the chromatogram fingerprint, a component breakdown, and advice tied to exactly what was found — designed to be screenshotted and shared.',
  how:`This is the <b>individual result</b> as a harm-reduction product, following the UNC Street Drug Analysis Lab model. The <b>plain-language summary</b> leads (most people stop here). The <b>fingerprint</b> chromatogram shows complexity at a glance. The <b>breakdown</b> separates major components from trace finds. The <b>advice</b> is generated from what was detected, not boilerplate. <b>Crucial limit, stated on the card:</b> bar lengths show relative <i>signal</i>, not purity or dose — two samples that look identical here can differ wildly in strength.`,
  provenance:'Illustrative composite samples over real retention times; messaging mirrors published harm-reduction guidance.',
  harm:'This card communicates a result; it is not medical advice. When in doubt, start with a tiny amount and have naloxone and another person present.'
});

stage.innerHTML=`
<div class="controls"><label class="muted" style="font-size:13px">Sample</label><select id="sel"></select></div>
<div id="card"></div>`;
const sel=document.getElementById('sel');
for(const k of Object.keys(SAMPLES)) sel.add(new Option(`${SAMPLES[k].id} — sold as ${SAMPLES[k].expected}`,k));
sel.className='dcf-ctl-select';
sel.onchange=draw;

function draw(){
  const s=SAMPLES[sel.value]; const arch=CH[s.key];
  const peaks=arch.peaks.map(([n,rt,amp])=>({s:n,rt:RT[n]||rt,amp,sigma:0.05})).sort((a,b)=>b.amp-a.amp);
  const major=peaks.filter(p=>p.amp>=30), minor=peaks.filter(p=>p.amp<30);
  const primary=peaks[0];
  const primaryCol=subColor(primary.s);
  if(window.__vizAccentBar) window.__vizAccentBar(primaryCol);
  // gather harm messages from detected
  const msgs=[]; const seen=new Set();
  peaks.forEach(p=>{const k=Object.keys(HARM).find(h=>p.s.includes(h));if(k&&!seen.has(k)){seen.add(k);HARM[k].forEach(m=>msgs.push(m));}});
  const summary=`The main substance was <b>${primary.s}</b>. ${major.length>1?`We also found <b>${major.slice(1).map(p=>p.s).join('</b>, <b>')}</b> as major components. `:''}${minor.length?`Trace amounts of ${minor.map(p=>p.s).join(', ')} were detected. `:''}This sample contained <b>${peaks.length} substance${peaks.length>1?'s':''}</b> in total.`;
  const c=document.getElementById('card');
  c.innerHTML=`
   <div class="panel" style="padding:0;overflow:hidden">
     <div class="dcf-doc-header" style="padding:18px 20px;border-bottom:1px solid ${TOKENS.line};display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
       <div><div class="mono" style="font-size:13px;color:${TOKENS.ink}">${s.id}</div>
       <div class="muted" style="font-size:12px">sold as <b style="color:${TOKENS.ink}">${s.expected}</b> · ${s.loc} · ${s.date}</div></div>
       <div style="text-align:right"><div class="muted" style="font-size:11px">TESTED BY GC–MS</div><div style="font-size:12px;color:${primaryCol};font-weight:600">${classify(primary.s).label}</div></div>
     </div>
     <div style="padding:18px 20px;background:${TOKENS.panel2}">
       <div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:6px">PLAIN-LANGUAGE SUMMARY</div>
       <p style="margin:0;font-size:15px;line-height:1.55">${summary}</p>
     </div>
     <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:0">
       <div style="padding:16px 20px;border-right:1px solid ${TOKENS.line}">
         <div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:6px">FINGERPRINT (GC–MS)</div>
         <svg id="chrom" width="100%" height="170"></svg>
         <div class="faint" style="font-size:11px;margin-top:4px">More peaks = more substances. Peak height = signal, <b>not</b> purity or dose.</div>
       </div>
       <div style="padding:16px 20px">
         <div class="muted" style="font-size:11px;letter-spacing:.1em;margin-bottom:8px">WHAT'S IN IT</div>
         <div id="bars"></div>
       </div>
     </div>
     <div style="padding:16px 20px;border-top:1px solid ${TOKENS.line};background:linear-gradient(${TOKENS.panel},${TOKENS.panel})">
       <div style="font-size:11px;letter-spacing:.1em;margin-bottom:8px;color:${sigColor('ok')}">⚑ HARM REDUCTION — BASED ON WHAT WE FOUND</div>
       <ul style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.6;color:${TOKENS.ink}">${msgs.map(m=>`<li>${m}</li>`).join('')}</ul>
     </div>
   </div>`;
  // chromatogram
  const svg=d3.select('#chrom'); const w=svg.node().clientWidth||360,H=170,m={t:10,r:8,b:22,l:8};
  const trace=chromatogram(peaks,{x0:3,x1:13,sigma:0.05});
  const x=d3.scaleLinear([3,13],[m.l,w-m.r]),y=d3.scaleLinear([0,105],[H-m.b,m.t]);
  const area=d3.area().x((d,i)=>x(trace.x[i])).y0(y(0)).y1(d=>y(d)).curve(d3.curveBasis);
  svg.append('path').datum(trace.y).attr('d',area).attr('fill',primaryCol).attr('opacity',.18);
  svg.append('path').datum(trace.y).attr('d',d3.line().x((d,i)=>x(trace.x[i])).y(d=>y(d)).curve(d3.curveBasis)).attr('fill','none').attr('stroke',primaryCol).attr('stroke-width',1.5);
  peaks.forEach(p=>{if(p.amp>12&&(!window.DCFDesign||DCFDesign.showTier('peak')))svg.append('text').attr('class','dcf-lbl').attr('data-tier','peak').attr('x',x(p.rt)).attr('y',y(p.amp)-4).attr('text-anchor','middle').attr('font-size',8.5).attr('fill',TOKENS.muted).text(p.s.length>10?p.s.slice(0,9)+'…':p.s);});
  // bars
  const maxA=Math.max(...peaks.map(p=>p.amp));
  document.getElementById('bars').innerHTML=peaks.map(p=>{
    const col=subColor(p.s), pct=p.amp/maxA*100;
    return `<div style="margin-bottom:7px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span style="text-transform:capitalize">${p.s}</span><span class="faint mono">${p.amp>=30?'major':'trace'}</span></div>
      <div style="height:7px;background:${TOKENS.panel2};border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${col}"></div></div></div>`;
  }).join('');
}
draw();
addEventListener('resize',draw);
window.__vizRedraw=draw;
