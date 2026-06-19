/* Nº 04 · Fragmentation Radial — a mass spectrum re-imagined as a radial burst.
   The molecular ion sits at the center; fragments radiate outward by m/z, sized
   by abundance, with the neutral-loss (mass difference) labeled on each spoke. */
const {scaffold,stickSpectrum,classify,tooltip,fmt,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
const MS=SPEC.ms;
const names=Object.keys(MS);

const LOSS={28:'CO',18:'H₂O',17:'OH',15:'CH₃',27:'HCN',42:'C₂H₂O / propene',43:'CH₃CO',44:'CO₂',91:'tropylium C₇H₇',105:'benzoyl',77:'phenyl',146:'fentanyl core'};

const stage=scaffold({
  tag:'Nº 04 · MS',
  title:'Fragmentation Radial',
  dek:'Same data as a mass spectrum, drawn as a burst. The whole molecule sits at the center and shatters outward into fragment ions — each spoke a characteristic break.',
  how:`Every dot is a <b>fragment ion</b>; distance from center is its <span class="mono">m/z</span>, and dot size is abundance. The brightest ring is the <b>base peak</b> (the most stable fragment). The number on each spoke is the <b>neutral loss</b> — the mass that broke away from the molecular ion to make that fragment (e.g. losing 18 = water, 28 = CO). Forensic chemists recognise drugs by these signature losses. This is the same information as a conventional stick spectrum, re-encoded so the <i>relationships</i> between fragments are visible at a glance.`,
  provenance:'Fragment ions and neutral-loss assignments illustrative of characteristic electron-impact behaviour.',
  harm:'Identification confirms presence, not amount. Any opioid-positive result warrants naloxone on hand.'
});

stage.innerHTML=`
<div class="controls"><label class="muted" style="font-size:13px">Molecule</label><select id="sel"></select></div>
<div class="panel" style="display:flex;justify-content:center"><svg id="svg" width="100%" height="520" role="img" aria-label="Radial mass-spectrum burst"></svg></div>`;
const sel=document.getElementById('sel');
for(const n of names) sel.add(new Option(n,n));
sel.value='fentanyl';
sel.className='dcf-ctl-select';
sel.onchange=draw;
const tt=tooltip();

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=520,cx=W/2,cy=H/2;
  const mol=MS[sel.value]; const col=subColor(sel.value);
  const pk=stickSpectrum(mol.peaks);
  const maxmz=Math.max(...pk.map(p=>p.mz),mol.mw);
  const R=Math.min(W,H)/2-50;
  const rscale=d3.scaleLinear([0,maxmz],[26,R]);
  // rings
  [50,100,150,200,250,300,350].filter(t=>t<=maxmz).forEach(t=>{
    svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',rscale(t)).attr('fill','none').attr('stroke',TOKENS.line).attr('opacity',.5);
    svg.append('text').attr('x',cx+3).attr('y',cy-rscale(t)).attr('fill',TOKENS.faint).attr('font-size',9).attr('font-family','ui-monospace').text(t);
  });
  // center = molecular ion
  svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',16).attr('fill',col).attr('opacity',.25);
  svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',7).attr('fill',col);
  svg.append('text').attr('x',cx).attr('y',cy+30).attr('text-anchor','middle').attr('fill',TOKENS.ink).attr('font-size',12).attr('font-weight',600).text('M⁺• '+mol.mw);
  // spokes
  const n=pk.length;
  pk.forEach((p,i)=>{
    const ang=(i/n)*2*Math.PI - Math.PI/2;
    const r=rscale(p.mz);
    const px=cx+Math.cos(ang)*r, py=cy+Math.sin(ang)*r;
    svg.append('line').attr('x1',cx).attr('y1',cy).attr('x2',px).attr('y2',py).attr('stroke',col).attr('stroke-width',.6).attr('opacity',.3);
    const loss=mol.mw-p.mz;
    svg.append('circle').attr('cx',px).attr('cy',py).attr('r',4+p.i/100*16).attr('fill',col).attr('opacity',.85).style('cursor','pointer')
      .on('mousemove',e=>tt.show(`<b>m/z ${fmt.mz(p.mz)}</b> · ${fmt.pct(p.i)}<br><span class="muted">neutral loss ${loss.toFixed(0)}${LOSS[Math.round(loss)]?' = '+LOSS[Math.round(loss)]:''}</span>`,e.clientX,e.clientY))
      .on('mouseleave',tt.hide);
    if(p.i>25){
      svg.append('text').attr('x',cx+Math.cos(ang)*(r+16)).attr('y',cy+Math.sin(ang)*(r+16)).attr('text-anchor','middle').attr('font-size',10).attr('font-family','ui-monospace').attr('fill',TOKENS.muted).text(fmt.mz(p.mz));
    }
  });
}
window.__vizRedraw=draw;
draw();
addEventListener('resize',draw);
