/* Nº 03 · FTIR Overlay & Subtraction Bench — overlay a mixed street sample's
   infrared spectrum against pure reference components, then subtract them one by
   one to see what signal is "left over" (the unexplained residual). */
const {scaffold,ftirCurve,classify,tooltip,fmt,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
const F=SPEC.ftir;
const refs=Object.keys(F).filter(k=>Array.isArray(F[k]));

const stage=scaffold({
  tag:'Nº 03 · FTIR',
  title:'FTIR Overlay & Subtraction Bench',
  dek:'On-site FTIR reads a sample\'s infrared "molecular barcode." Build a synthetic mixture, then peel off known components to reveal what can\'t yet be explained.',
  how:`<b>FTIR</b> shines infrared light through a sample; chemical bonds absorb specific frequencies, producing bands at characteristic <b>wavenumbers</b> (<span class="mono">cm⁻¹</span>, plotted high→low by convention). The cluttered <b>fingerprint region</b> (1500–400, shaded) is nearly unique per molecule. A field tech identifies a mixture by matching and <b>subtracting</b> reference spectra; whatever signal remains (the <b>residual</b>) may be an unidentified or trace component — exactly where novel adulterants hide. <b>Limits:</b> FTIR struggles below ~5% of a mixture and can miss potent drugs present in tiny amounts (like fentanyl).`,
  provenance:'Band positions illustrative of characteristic functional-group absorptions; intensities approximate.',
  harm:'FTIR can miss fentanyl and other potent drugs present below its detection floor. A "clean" FTIR result is not an all-clear — use test strips too.'
});

stage.innerHTML=`
<div class="controls" id="mixctl"><span class="muted" style="font-size:13px">Mixture contains:</span></div>
<div class="controls" id="subctl"><span class="muted" style="font-size:13px">Subtract reference:</span></div>
<div class="panel"><svg id="svg" width="100%" height="420" role="img" aria-label="FTIR overlay and residual"></svg></div>
<div class="legend" id="leg"></div>`;

const mix=new Set(['fentanyl','caffeine','lactose']);
const subtracted=new Set();
const tt=tooltip();

function chips(host,set,onToggle,active){
  host.querySelectorAll('button').forEach(b=>b.remove());
  refs.forEach(r=>{
    const b=document.createElement('button'); b.className='tgl'; b.textContent=r;
    b.setAttribute('aria-pressed',set.has(r));
    b.onclick=()=>{onToggle(r);render();};
    host.appendChild(b);
  });
}
function render(){
  chips(document.getElementById('mixctl'),mix,r=>{mix.has(r)?mix.delete(r):mix.add(r);subtracted.delete(r);});
  chips(document.getElementById('subctl'),subtracted,r=>{if(mix.has(r))subtracted.has(r)?subtracted.delete(r):subtracted.add(r);});
  draw();
}

function curveFor(set){
  // sum band lists, scaled equally
  const bands=[];
  set.forEach(r=>F[r].forEach(b=>bands.push(b)));
  return ftirCurve(bands);
}
function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=420,m={t:20,r:16,b:40,l:30};
  const total=curveFor(mix);
  const resid=curveFor(new Set([...mix].filter(r=>!subtracted.has(r))));
  const sub=curveFor(subtracted);
  const x=d3.scaleLinear([4000,400],[m.l,W-m.r]); // reversed
  const ymax=Math.max(...total.y,1)*1.1;
  const y=d3.scaleLinear([0,ymax],[H-m.b,m.t]);
  // fingerprint shading
  svg.append('rect').attr('x',x(1500)).attr('y',m.t).attr('width',x(400)-x(1500)).attr('height',H-m.b-m.t).attr('fill',TOKENS.panel2).attr('opacity',.5);
  svg.append('text').attr('x',(x(1500)+x(400))/2).attr('y',m.t+13).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',10).text('fingerprint region');
  if(!window.DCFDesign||DCFDesign.showTier('axis'))
  [4000,3000,2000,1500,1000,500].forEach(t=>{
    svg.append('line').attr('x1',x(t)).attr('x2',x(t)).attr('y1',m.t).attr('y2',H-m.b).attr('stroke',TOKENS.line).attr('opacity',.4);
    svg.append('text').attr('class','dcf-lbl').attr('data-tier','axis').attr('x',x(t)).attr('y',H-14).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',11).attr('font-family','ui-monospace').text(t);
  });
  if(!window.DCFDesign||DCFDesign.showTier('axis'))
  svg.append('text').attr('class','dcf-lbl').attr('data-tier','axis').attr('x',W/2).attr('y',H-2).attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',11).text('wavenumber (cm⁻¹) — high to low');

  const line=d3.line().x((d,i)=>x(total.x[i])).y(d=>y(d)).curve(d3.curveBasis);
  // total mixture (faint)
  svg.append('path').datum(total.y).attr('d',line).attr('fill','none').attr('stroke',TOKENS.muted).attr('stroke-width',1).attr('opacity',.5).attr('stroke-dasharray','3,3');
  // subtracted refs (each colored)
  if(subtracted.size){
    svg.append('path').datum(sub.y).attr('d',d3.line().x((d,i)=>x(sub.x[i])).y(d=>y(d)).curve(d3.curveBasis)).attr('fill','none').attr('stroke',TOKENS.faint).attr('stroke-width',1.1).attr('opacity',.6);
  }
  // residual (bold gradient fill)
  const area=d3.area().x((d,i)=>x(resid.x[i])).y0(y(0)).y1(d=>y(d)).curve(d3.curveBasis);
  const g=svg.append('defs').append('linearGradient').attr('id','rg').attr('x1',0).attr('x2',0).attr('y1',0).attr('y2',1);
  g.append('stop').attr('offset','0%').attr('stop-color',sigColor('fent')).attr('stop-opacity',.4);
  g.append('stop').attr('offset','100%').attr('stop-color',sigColor('fent')).attr('stop-opacity',.03);
  svg.append('path').datum(resid.y).attr('d',area).attr('fill','url(#rg)');
  svg.append('path').datum(resid.y).attr('d',d3.line().x((d,i)=>x(resid.x[i])).y(d=>y(d)).curve(d3.curveBasis)).attr('fill','none').attr('stroke',sigColor('fent')).attr('stroke-width',1.8);
  svg.on('mousemove',e=>{const wn=Math.round(x.invert(e.offsetX));if(wn>400&&wn<4000)tt.show(`<b class="mono">${wn} cm⁻¹</b>`,e.clientX,e.clientY);}).on('mouseleave',tt.hide);

  if(!window.DCFDesign||DCFDesign.showTier('legend'))
  document.getElementById('leg').innerHTML=
    `<span><i style="background:${TOKENS.muted}"></i>full mixture</span>
     <span><i style="background:${sigColor('fent')}"></i>residual after subtraction (${[...mix].filter(r=>!subtracted.has(r)).length} components left)</span>
     <span class="faint">subtracting ${subtracted.size||'none'} reference${subtracted.size===1?'':'s'}</span>`;
}
render();
window.__vizRedraw=draw;
addEventListener('resize',draw);
