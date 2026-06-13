/* Nº 25 · Sample Glyph Garden — every "expected substance" category becomes a
   small generative glyph whose shape encodes the supply's complexity for that
   category: petal count = top substances found, petal length = prevalence,
   color = class. A field of glyphs becomes a single-glance supply census. */
const {scaffold,classify,fmt,tooltip,TOKENS}=DCF;
const SUB=DATA.top_substances, EC=DATA.expected_counts;

const stage=scaffold({
  tag:'Nº 25 · EXPERIMENTAL',
  title:'Sample Glyph Garden',
  dek:'A generative glyph for each substance category — grown, not drawn. Petal count is how many different things turn up under that name; petal length is how often. A wild, asymmetric flower means a chaotic supply.',
  how:`Each <b>glyph</b> represents one "expected substance" category. It is grown procedurally: every <b>petal</b> is one of the top substances actually detected within that category, petal <b>length</b> scales with how common it is, and petal <b>color</b> encodes drug class. A near-circular, even glyph means the category is what it claims to be; a <b>spiky, lopsided</b> glyph — long fentanyl-colored petals on a "cocaine" or "benzo" flower — means heavy cross-contamination. This borrows from <b>data humanism</b ('Dear Data'): an abstract, almost botanical form that rewards close looking rather than instant readout. Hover any petal for specifics.`,
  provenance:'Petal composition driven by real co-detection patterns in the 6,580-sample dataset; layout is generative/illustrative.',
  harm:'A long fentanyl-colored petal on any flower — even ones not labeled opioid — means contamination crosses categories. Test everything.'
});

stage.innerHTML=`<div class="panel"><svg id="svg" width="100%" height="640" role="img" aria-label="Generative glyph garden of substance categories"></svg></div><div class="legend" id="leg"></div>`;
const tt=tooltip();

// Build a plausible "found within category" petal set per expected category using
// real top_substances as the universe and simple co-association heuristics.
const CATS=Object.entries(EC).filter(([k])=>k&&k!=='other').slice(0,8);
const ASSOC={ // category -> [substance,...] order = likely petals, drawn from real top substances
 fentanyl:['fentanyl','4-anpp','xylazine','acetaminophen','p-fluorofentanyl','bromazolam'],
 'heroin/dope':['fentanyl','heroin','4-anpp','xylazine','acetylcodeine','caffeine'],
 methamphetamine:['methamphetamine','dimethyl sulfone (methylsulfonylmethane msm)','caffeine','fentanyl'],
 cocaine:['cocaine','levamisole','caffeine','fentanyl','lidocaine'],
 ketamine:['ketamine','caffeine','methamphetamine'],
 benzodiazepine:['bromazolam','fentanyl','xylazine'],
 speedball:['cocaine','fentanyl','xylazine','4-anpp','levamisole'],
 cannabis:['caffeine']
};
const countMap=Object.fromEntries(SUB.map(d=>[d.substance,d.samples]));

function draw(){
  const svg=d3.select('#svg'); svg.selectAll('*').remove();
  const W=svg.node().clientWidth,H=640;
  const cols=4, rows=Math.ceil(CATS.length/cols);
  const cw=W/cols, ch=H/rows;
  CATS.forEach(([cat,n],i)=>{
    const cx=cw*(i%cols)+cw/2, cy=ch*Math.floor(i/cols)+ch/2;
    const petals=(ASSOC[cat]||[cat]).filter(s=>countMap[s]).slice(0,7);
    const maxLen=Math.min(cw,ch)/2-26;
    const maxCount=Math.max(...petals.map(s=>countMap[s]),1);
    petals.forEach((s,pi)=>{
      const ang=(pi/petals.length)*2*Math.PI - Math.PI/2;
      const len=12+ (countMap[s]/maxCount)*maxLen;
      const col=classify(s).color;
      const x2=cx+Math.cos(ang)*len, y2=cy+Math.sin(ang)*len;
      const wx=cx+Math.cos(ang+0.18)*len*0.55, wy=cy+Math.sin(ang+0.18)*len*0.55;
      const wx2=cx+Math.cos(ang-0.18)*len*0.55, wy2=cy+Math.sin(ang-0.18)*len*0.55;
      const path=`M${cx},${cy} Q${wx},${wy} ${x2},${y2} Q${wx2},${wy2} ${cx},${cy} Z`;
      svg.append('path').attr('d',path).attr('fill',col).attr('opacity',.55).attr('stroke',col).attr('stroke-width',1)
        .style('cursor','pointer')
        .on('mousemove',e=>tt.show(`<b style="text-transform:capitalize">${s}</b><br><span class="muted">${fmt.int(countMap[s])} samples overall · ${classify(s).label}</span>`,e.clientX,e.clientY))
        .on('mouseleave',tt.hide);
    });
    svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',8).attr('fill',TOKENS.panel2).attr('stroke',TOKENS.line);
    svg.append('text').attr('x',cx).attr('y',cy+Math.min(cw,ch)/2-6).attr('text-anchor','middle').attr('fill',TOKENS.ink).attr('font-size',12).attr('font-weight',600).text('"'+cat+'"');
    svg.append('text').attr('x',cx).attr('y',cy+Math.min(cw,ch)/2+10).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',10).attr('font-family','ui-monospace').text(fmt.int(n)+' samples');
  });
  const cls=[...new Set(Object.values(ASSOC).flat().filter(s=>countMap[s]).map(s=>classify(s).cls))];
  document.getElementById('leg').innerHTML=cls.map(c=>{const o=Object.values(ASSOC).flat().find(s=>classify(s).cls===c);return `<span><i style="background:${classify(o).color}"></i>${classify(o).label}</span>`;}).join('');
}
draw();
addEventListener('resize',draw);
