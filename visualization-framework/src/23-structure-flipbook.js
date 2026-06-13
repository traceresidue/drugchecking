/* Nº 23 · Structure Flipbook — the molecular structures behind the names. A gallery
   of 2D structures (rendered from SMILES) for the most common detected substances,
   grouped by class, revealing how chemically similar the fentanyl analogues are. */
const {scaffold,classify,fmt,TOKENS,drawSmiles}=DCF;
const MS=SPEC.ms, SUB=DATA.top_substances, ROLES=DATA.roles;

const stage=scaffold({
  tag:'Nº 23 · MS',
  title:'Structure Flipbook',
  dek:'Behind every substance name is a molecule. See the structures of the most common detections side by side — and notice how the fentanyl analogues are near-twins, which is exactly why they keep appearing.',
  how:`Each card renders a substance's <b>2D chemical structure</b> from its SMILES string (the text notation chemists use for molecules). Grouped by <b>class</b>, the gallery makes a key point visible: the fentanyl-family molecules differ by just an atom or two, so clandestine chemists can sidestep laws and detection by tiny tweaks — and labs must keep expanding their reference libraries to match. <b>Color</b> = drug class; the role tag (active, cut, precursor) says what each does in a sample. Atoms follow the convention: blue = nitrogen, orange = oxygen, green = halogen.`,
  provenance:'Structures rendered from SMILES for the substances with available reference structures; detection counts are real aggregates.',
  harm:'A one-atom change can make a drug far stronger. An unfamiliar name in the fentanyl family is not "weaker" — treat it as potent.'
});

stage.innerHTML=`
<div class="controls" id="flt"></div>
<div id="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px"></div>`;

const items=SUB.filter(d=>MS[d.substance]&&MS[d.substance].smiles).map(d=>({...d,...classify(d.substance),smiles:MS[d.substance].smiles,mw:MS[d.substance].mw,role:ROLES[d.substance]}));
const classes=[['all','All'],['fent','Fentanyl & analogs'],['opioid','Opioid'],['stim','Stimulant'],['coke','Cocaine'],['benzo','Benzo'],['cut','Cuts']];
let filt='all';
const fltHost=document.getElementById('flt');
classes.forEach(([c,l])=>{const b=document.createElement('button');b.className='tgl';b.textContent=l;b.setAttribute('aria-pressed',c==='all');b.onclick=()=>{filt=c;fltHost.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));draw();};fltHost.appendChild(b);});

function draw(){
  const grid=document.getElementById('grid'); grid.innerHTML='';
  const data=items.filter(d=>filt==='all'||d.cls===filt).sort((a,b)=>b.samples-a.samples);
  data.forEach((d,i)=>{
    const card=document.createElement('div');
    card.className='panel'; card.style.cssText='padding:12px;border-top:3px solid '+d.color;
    card.innerHTML=`
      <canvas id="m${i}" width="160" height="120" style="width:100%;background:#0e1320;border-radius:8px"></canvas>
      <div style="margin-top:8px;font-size:13px;font-weight:600;text-transform:capitalize;line-height:1.25">${d.substance}</div>
      <div class="muted" style="font-size:11px">${d.label}${d.role?' · '+d.role:''}</div>
      <div class="faint mono" style="font-size:10px;margin-top:3px">MW ${d.mw} · ${fmt.int(d.samples)} samples</div>`;
    grid.appendChild(card);
  });
  // render after in DOM
  requestAnimationFrame(()=>data.forEach((d,i)=>drawSmiles(d.smiles,'m'+i,160,120)));
}
draw();
