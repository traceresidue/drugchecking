/* Nº 02 · Annotated Chromatogram Explorer — UNC's "visual fingerprint" made
   touchable. A synthesized GC–MS trace; tap any peak to reveal its mass spectrum,
   2D structure, plain-language drug card, and harm-reduction note. */
const {scaffold,chromatogram,stickSpectrum,classify,tooltip,fmt,TOKENS,drawSmiles}=DCF;
const CH=SPEC.chromatograms, MS=SPEC.ms, RT=Object.fromEntries(DATA.retention_times.map(d=>[d.substance,d.rt]));

const NOTE={
  fentanyl:'Potent synthetic opioid. Dominant peak ≠ known dose — small visual changes mean large potency changes.',
  '4-anpp':'A fentanyl precursor/impurity. Its presence is a chemical signature of fentanyl synthesis.',
  xylazine:'A veterinary sedative ("tranq"). Not an opioid — naloxone won\'t reverse its sedation, and it causes severe skin wounds.',
  acetaminophen:'A common cut (Tylenol). Inactive at these levels but signals a pressed or bulked product.',
  caffeine:'A stimulant cut that volatilises the mix for smoking and adds a rush.',
  lidocaine:'A local anesthetic cut that numbs — sometimes mistaken for "good" cocaine.',
  cocaine:'Stimulant. Watch for fentanyl cross-contamination in any powder supply.',
  heroin:'Classic opioid; increasingly displaced by fentanyl in the unregulated supply.',
  'p-fluorofentanyl':'A fentanyl analog that rides alongside fentanyl; adds to total opioid load.',
  diphenhydramine:'An antihistamine (Benadryl) cut that deepens sedation.',
  bromazolam:'A street benzodiazepine. Combined with opioids it deepens and prolongs overdose; naloxone won\'t fix the benzo part.',
  benzocaine:'Anesthetic cut mimicking cocaine\'s numbing.',
  levamisole:'A veterinary dewormer cut in cocaine; can damage white blood cells and skin.',
  'dimethyl sulfone':'An inert bulking agent (MSM) common in methamphetamine.',
  'n,n-dimethylamphetamine':'A methamphetamine synthesis byproduct.',
  benzoylecgonine:'A cocaine breakdown product — a fingerprint of cocaine itself.'
};

const stage=scaffold({
  tag:'Nº 02 · GC–MS',
  title:'Annotated Chromatogram Explorer',
  dek:'A GC–MS chromatogram is a sample\'s visual fingerprint. Each peak is one substance, separated by how fast it travels through the instrument. Tap a peak to learn what it is.',
  how:`<b>Reading the TIC.</b> The x-axis is <b>retention time</b> — how long a compound takes to pass through the column (a fixed property, like a fingerprint). The y-axis is <b>total ion current</b> (summed detector signal, normalized). <b>More peaks = more substances. Taller peaks = more signal, NOT higher purity or dose.</b> Different compounds ionise with wildly different efficiency, so a tall peak and a short peak can be present in similar amounts. <b>Tap any peak</b> to see its mass spectrum, structure, and a plain-language card.`,
  provenance:'Trace synthesized from real median GC–MS retention times in this dataset; mass spectra illustrative.',
  harm:'Carry naloxone and test strips. A clean-looking fingerprint can still hide a fatal dose — height shows signal, not strength.'
});

stage.innerHTML=`
<div class="controls">
  <label class="muted" style="font-size:13px">Sample archetype</label>
  <select id="arch"></select>
</div>
<div class="panel"><svg id="svg" width="100%" style="display:block;min-height:240px" role="img" aria-label="Interactive GC-MS total ion chromatogram"></svg></div>
<div id="detail" class="panel" style="margin-top:14px;min-height:170px"></div>`;

const archSel=document.getElementById('arch');
for(const k of Object.keys(CH)) archSel.add(new Option(CH[k].label,k));
archSel.style.cssText='background:#1a2234;color:#e8ecf4;border:1px solid #26304a;border-radius:8px;padding:7px 10px;font:500 13px Inter';
const tt=tooltip();
let selected=null;
archSel.onchange=()=>{selected=null;draw();};

const TIC_X0=3;
const TIC_X1=13;

function ticChartHeight(W){return Math.round(Math.max(240,Math.min(420,W*0.38)));}

function ticApexOnTrace(trace,rt,halfWin=0.12){
  let maxV=-1,maxI=0;
  trace.x.forEach((t,k)=>{if(Math.abs(t-rt)<=halfWin&&trace.y[k]>maxV){maxV=trace.y[k];maxI=k;}});
  if(maxV<0) maxI=trace.x.reduce((best,t,k)=>Math.abs(t-rt)<Math.abs(trace.x[best]-rt)?k:best,0);
  return {rt:trace.x[maxI],amp:trace.y[maxI]};
}

function peaksFor(key){
  return CH[key].peaks.map(([s,rt,amp])=>({s,rt:RT[s]||rt,amp,sigma:0.05}));
}

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=ticChartHeight(W),m={t:20,r:16,b:40,l:46};
  svg.attr('height',H);
  const peaks=peaksFor(archSel.value);
  const trace=chromatogram(peaks,{x0:TIC_X0,x1:TIC_X1,sigma:0.05,n:900});
  const x=d3.scaleLinear([TIC_X0,TIC_X1],[m.l,W-m.r]);
  const y=d3.scaleLinear([0,105],[H-m.b,m.t]);
  // grid
  if(!window.DCFDesign||DCFDesign.showTier('axis'))
    x.ticks(10).forEach(t=>svg.append('text').attr('class','dcf-lbl').attr('data-tier','axis').attr('x',x(t)).attr('y',H-14).attr('fill',TOKENS.faint).attr('font-size',11).attr('text-anchor','middle').attr('font-family','ui-monospace').text(t));
  svg.append('text').attr('class','dcf-lbl').attr('data-tier','axis').attr('x',(W)/2).attr('y',H-2).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',11).text('retention time (minutes)');
  svg.append('text').attr('class','dcf-lbl').attr('data-tier','axis').attr('transform',`translate(13,${H/2})rotate(-90)`).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',11).text('TIC (relative ion current)');
  // area
  const area=d3.area().x((d,i)=>x(trace.x[i])).y0(y(0)).y1(d=>y(d)).curve(d3.curveBasis);
  const grad=svg.append('defs').append('linearGradient').attr('id','g').attr('x1',0).attr('x2',0).attr('y1',0).attr('y2',1);
  grad.append('stop').attr('offset','0%').attr('stop-color',TOKENS.info).attr('stop-opacity',.5);
  grad.append('stop').attr('offset','100%').attr('stop-color',TOKENS.info).attr('stop-opacity',.04);
  svg.append('path').datum(trace.y).attr('d',area).attr('fill','url(#g)');
  svg.append('path').datum(trace.y).attr('d',d3.line().x((d,i)=>x(trace.x[i])).y(d=>y(d)).curve(d3.curveBasis)).attr('fill','none').attr('stroke',TOKENS.info).attr('stroke-width',1.6);
  // peak hotspots + labels
  peaks.forEach(p=>{
    const col=classify(p.s).color;
    const apex=ticApexOnTrace(trace,p.rt);
    const px=x(apex.rt), py=y(apex.amp);
    const isSel=selected===p.s;
    const dotR=isSel?3.5:2.5;
    svg.append('circle').attr('cx',px).attr('cy',py).attr('r',dotR).attr('fill',col).attr('stroke',TOKENS.bg).attr('stroke-width',1.5).style('cursor','pointer')
      .on('mousemove',e=>tt.show(`<b>${p.s}</b><br><span class="muted mono">RT ${fmt.rt(p.rt)} min · ${fmt.pct(apex.amp)} TIC</span>`,e.clientX,e.clientY))
      .on('mouseleave',tt.hide)
      .on('click',()=>{selected=p.s;draw();showDetail(p.s);});
    if((p.amp>14||isSel)&&(!window.DCFDesign||DCFDesign.showTier('peak')))
      svg.append('text').attr('class','dcf-lbl').attr('data-tier','peak').attr('x',px).attr('y',py-7).attr('text-anchor','middle').attr('font-size',9).attr('font-family','ui-monospace').attr('fill',isSel?col:TOKENS.muted).text(fmt.rt(p.rt));
  });
  if(!selected) document.getElementById('detail').innerHTML=`<div class="muted" style="display:flex;height:140px;align-items:center;justify-content:center;font-size:14px">▲ Tap a peak to identify the substance</div>`;
}

function showDetail(s){
  const d=document.getElementById('detail'); const c=classify(s);
  const ms=MS[s];
  d.innerHTML=`
   <div style="display:grid;grid-template-columns:1fr 200px 160px;gap:18px;align-items:start">
     <div>
       <div style="display:flex;align-items:center;gap:9px;margin-bottom:6px">
         <span style="width:12px;height:12px;border-radius:3px;background:${c.color};display:inline-block"></span>
         <span style="font-size:18px;font-weight:700;text-transform:capitalize">${s}</span>
         <span class="muted" style="font-size:12px">${c.label}</span>
       </div>
       <p class="muted" style="font-size:13.5px;line-height:1.55;margin:0;max-width:52ch">${NOTE[s]||'Detected component. Tap other peaks to compare.'}</p>
     </div>
     <div><div class="muted" style="font-size:11px;margin-bottom:4px">MASS SPECTRUM</div><svg id="ms" width="200" height="120"></svg></div>
     <div><div class="muted" style="font-size:11px;margin-bottom:4px">STRUCTURE</div><canvas id="mol" width="160" height="120" style="background:#0e1320;border-radius:8px"></canvas></div>
   </div>`;
  if(ms){
    const svg=d3.select('#ms'); const pk=stickSpectrum(ms.peaks);
    const x=d3.scaleLinear(d3.extent(pk,p=>p.mz),[6,194]), y=d3.scaleLinear([0,100],[112,8]);
    svg.selectAll('line').data(pk).join('line').attr('x1',p=>x(p.mz)).attr('x2',p=>x(p.mz)).attr('y1',112).attr('y2',p=>y(p.i)).attr('stroke',c.color).attr('stroke-width',1.4);
    svg.append('text').attr('x',6).attr('y',118).attr('fill',TOKENS.faint).attr('font-size',9).attr('font-family','ui-monospace').text('m/z');
    drawSmiles(ms.smiles,'mol',160,120);
  } else {
    document.getElementById('ms').outerHTML='<div class="faint" style="font-size:11px;width:200px">spectrum n/a</div>';
  }
}
draw();
addEventListener('resize',()=>{draw();if(selected)showDetail(selected);});
