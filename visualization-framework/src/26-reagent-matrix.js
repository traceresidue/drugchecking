/* Nº 26 · Reagent Color Matrix — colorimetric spot tests (Marquis, Mandelin,
   Mecke, Froehde, Simon's, Robadope) applied to the most common street drugs.
   Each cell shows the expected reaction color. A field-portable reality check
   for what your eyes might see — with important limits. */
const {scaffold,classify,tooltip,TOKENS}=DCF;

const stage=scaffold({
  tag:'Nº 26 · EXPERIMENTAL',
  title:'Reagent Color Matrix',
  dek:'Colorimetric spot tests react with different drug families by turning distinct colors. This matrix maps expected results — what you\'d expect to see when you add a drop of reagent to a tiny sample.',
  how:`Each <b>cell</b> shows the color a drop of reagent is expected to produce when mixed with a tiny amount of that substance. <b>Rows</b> = reagents; <b>columns</b> = substances. Color accuracy is approximate (display gamut ≠ chemistry). <b>Critical limits:</b> (1) mixtures produce overlapping reactions — a fentanyl-laced stimulant may still turn orange; (2) fentanyl/analogs are often undetectable by standard reagents; (3) xylazine does not produce a reliable reaction in most field tests; (4) reagents confirm <i>class presence</i>, not identity or quantity. Use these results alongside GC-MS, FTIR, or immunoassay strips.`,
  provenance:'Expected reaction colors from published colorimetric chemistry literature and harm-reduction field guides.',
  harm:'Reagents cannot rule out fentanyl or xylazine. A "cocaine" result may still contain fentanyl analogs that don\'t react. Always use fentanyl test strips alongside reagent tests.'
});

// Reagents × substances matrix
const REAGENTS = [
  {name:'Marquis',desc:'H₂SO₄ + formaldehyde'},
  {name:'Mandelin',desc:'H₂SO₄ + ammonium metavanadate'},
  {name:'Mecke',desc:'H₂SO₄ + selenous acid'},
  {name:'Froehde',desc:'H₂SO₄ + molybdate'},
  {name:'Simon\'s',desc:'Na₂CO₃ + nitroprusside + acetic acid'},
  {name:'Robadope',desc:'o-phthalaldehyde, primary amines'},
  {name:'Ehrlich',desc:'DMAB, indoles & LSD'},
];

const SUBSTANCES = [
  {s:'MDMA',cls:'stim'},
  {s:'amphetamine',cls:'stim'},
  {s:'methamphetamine',cls:'stim'},
  {s:'cocaine',cls:'coke'},
  {s:'fentanyl',cls:'fent'},
  {s:'heroin',cls:'opioid'},
  {s:'ketamine',cls:'other'},
  {s:'xylazine',cls:'xyl'},
  {s:'caffeine',cls:'cut'},
  {s:'LSD',cls:'other'},
];

// [color, tooltip note] — hex colors approximating reaction colors
const MATRIX = {
  'Marquis': {
    'MDMA':['#7c3aed','purple → black (typical)'],
    'amphetamine':['#c2410c','orange → brown'],
    'methamphetamine':['#b45309','orange-brown'],
    'cocaine':['#3d3f3d','no reaction / slight yellow'],
    'fentanyl':['#4a4a3d','no color reaction'],
    'heroin':['#8b1a1a','purple → dark red'],
    'ketamine':['#6b6650','no/slight reaction'],
    'xylazine':['#3d3d3a','no reliable reaction'],
    'caffeine':['#b59a2e','dull yellow-orange'],
    'LSD':['#3d3d3a','none'],
  },
  'Mandelin': {
    'MDMA':['#1a1a18','black'],
    'amphetamine':['#b45309','orange'],
    'methamphetamine':['#c2410c','orange → brown'],
    'cocaine':['#6d5b1e','light yellow-brown'],
    'fentanyl':['#3d4040','no reliable color'],
    'heroin':['#064e3b','dark green'],
    'ketamine':['#b45309','orange'],
    'xylazine':['#3d3d3a','no reliable reaction'],
    'caffeine':['#3a3a38','no reaction'],
    'LSD':['#3d3d3a','none'],
  },
  'Mecke': {
    'MDMA':['#1e3a5f','blue-black'],
    'amphetamine':['#334155','blue-green → black'],
    'methamphetamine':['#334155','dark blue-green'],
    'cocaine':['#1a1a18','no reaction / very slight'],
    'fentanyl':['#475569','no reaction'],
    'heroin':['#166534','dark green'],
    'ketamine':['#1d4ed8','blue → yellow'],
    'xylazine':['#3d3d3a','no reliable reaction'],
    'caffeine':['#3a3a38','no reaction'],
    'LSD':['#1e3a5f','blue'],
  },
  'Froehde': {
    'MDMA':['#94a3b8','grey'],
    'amphetamine':['#b45309','faint orange'],
    'methamphetamine':['#b45309','orange-brown'],
    'cocaine':['#1d4ed8','blue (if pure)'],
    'fentanyl':['#475569','no reaction'],
    'heroin':['#166534','green → yellow'],
    'ketamine':['#c2410c','orange-red'],
    'xylazine':['#3d3d3a','no reliable reaction'],
    'caffeine':['#3a3a38','no reaction'],
    'LSD':['#94a3b8','yellow-grey'],
  },
  'Simon\'s': {
    'MDMA':['#1d4ed8','blue (positive for secondary amines)'],
    'amphetamine':['#3d3d3a','no reaction (primary amine)'],
    'methamphetamine':['#1d4ed8','blue (secondary amine)'],
    'cocaine':['#3d3d3a','no reaction'],
    'fentanyl':['#3d3d3a','no reaction'],
    'heroin':['#3d3d3a','no reaction'],
    'ketamine':['#3d3d3a','no reliable color'],
    'xylazine':['#3d3d3a','no reliable reaction'],
    'caffeine':['#3d3d3a','no reaction'],
    'LSD':['#3d3d3a','no reaction'],
  },
  'Robadope': {
    'MDMA':['#3d3d3a','no reaction (secondary amine)'],
    'amphetamine':['#c2410c','orange (primary amine)'],
    'methamphetamine':['#3d3d3a','no reaction'],
    'cocaine':['#3d3d3a','no reaction'],
    'fentanyl':['#3d3d3a','no reaction'],
    'heroin':['#3d3d3a','slight'],
    'ketamine':['#3d3d3a','no reliable reaction'],
    'xylazine':['#3d3d3a','no reliable reaction'],
    'caffeine':['#3d3d3a','no reaction'],
    'LSD':['#3d3d3a','no reaction'],
  },
  'Ehrlich': {
    'MDMA':['#7c3aed','purple (contains indole analog)'],
    'amphetamine':['#3d3d3a','no reaction'],
    'methamphetamine':['#3d3d3a','no reaction'],
    'cocaine':['#3d3d3a','no reaction'],
    'fentanyl':['#3d3d3a','no reaction'],
    'heroin':['#3d3d3a','no reaction'],
    'ketamine':['#3d3d3a','no reaction'],
    'xylazine':['#3d3d3a','no reaction'],
    'caffeine':['#3d3d3a','no reaction'],
    'LSD':['#7c3aed','strong purple'],
  },
};

stage.innerHTML=`<div class="panel" style="overflow-x:auto"><svg id="svg" role="img" aria-label="Reagent color reaction matrix"></svg></div>
<div style="margin-top:12px;font-size:12px;color:${TOKENS.muted};line-height:1.6">
  <b>Limits:</b> Colors are approximate display representations. Field reactions vary with purity, matrix, and lighting.
  Fentanyl and xylazine are not reliably detected by any of these reagents. Always combine with strip tests.
</div>`;
const tt=tooltip();

function draw(){
  const cw=90,ch=44,rw=140,rh=26,pad=6;
  const W=rw+SUBSTANCES.length*(cw+pad)+40;
  const H=rh+REAGENTS.length*(ch+pad)+50;
  const svg=d3.select('#svg').attr('width',W).attr('height',H);
  svg.selectAll('*').remove();

  // Column headers (substances)
  SUBSTANCES.forEach((sub,ci)=>{
    const x=rw+(ci*(cw+pad))+cw/2;
    const col=classify(sub.s).color;
    svg.append('rect').attr('x',rw+ci*(cw+pad)).attr('y',0).attr('width',cw).attr('height',rh-4).attr('rx',4).attr('fill',col).attr('opacity',.18);
    svg.append('text').attr('x',x).attr('y',rh/2+2).attr('text-anchor','middle').attr('fill',col).attr('font-size',11).attr('font-weight',600).text(sub.s);
  });

  // Row headers + cells
  REAGENTS.forEach((rg,ri)=>{
    const y=rh+ri*(ch+pad);
    // Row label
    svg.append('text').attr('x',rw-10).attr('y',y+ch/2+4).attr('text-anchor','end').attr('fill',TOKENS.ink).attr('font-size',12).attr('font-weight',600).text(rg.name);
    svg.append('text').attr('x',rw-10).attr('y',y+ch/2+16).attr('text-anchor','end').attr('fill',TOKENS.faint).attr('font-size',9).text(rg.desc);
    // Cells
    SUBSTANCES.forEach((sub,ci)=>{
      const cx=rw+ci*(cw+pad), cy=y;
      const cell=(MATRIX[rg.name]||{})[sub.s]||['#2d2d2d','unknown'];
      const [bg,note]=cell;
      const isDark=['#3d3d3a','#3a3a38','#4a4a3d','#3d4040','#475569','#334155'].includes(bg);
      svg.append('rect').attr('x',cx).attr('y',cy).attr('width',cw).attr('height',ch).attr('rx',5)
        .attr('fill',bg).attr('stroke',TOKENS.line).attr('stroke-width',1)
        .style('cursor','pointer')
        .on('mousemove',e=>tt.show(`<b>${rg.name} + ${sub.s}</b><br><span class="muted">${note}</span>`,e.clientX,e.clientY))
        .on('mouseleave',tt.hide);
      // label the color name
      const label=isDark?'—':note.split(' ')[0];
      svg.append('text').attr('x',cx+cw/2).attr('y',cy+ch/2+4).attr('text-anchor','middle').attr('font-size',9).attr('fill',isDark?TOKENS.faint:'#fff').attr('font-weight',isDark?400:600).text(label);
    });
  });

  // Legend note at bottom
  svg.append('text').attr('x',rw).attr('y',H-10).attr('fill',TOKENS.muted).attr('font-size',10).text('Hover cells for expected color description · Colors are approximations only');
}
draw();
addEventListener('resize',draw);
