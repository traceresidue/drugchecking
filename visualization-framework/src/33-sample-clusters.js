/* Nº 33 · Sample Point Clusters — each sample rendered as a miniature solar system:
   the primary substance sits at the center (large dot, thin outline), trace and
   secondary substances orbit around it (smaller dots). A grid of these clusters
   reveals the structural patterns of polydrug supply at a glance. */
const {scaffold,classify,fmt,tooltip,TOKENS}=DCF;
const CO=DATA.cooccurrence, SUB=DATA.top_substances;

// Representative sample archetypes derived from top co-occurrence pairs
// Each archetype: {primary, secondaries:[], traces:[]}
const ARCHETYPES=[
  {label:'Fentanyl + Xylazine',primary:'fentanyl',secondaries:['xylazine','4-anpp'],traces:['acetaminophen','caffeine']},
  {label:'Street Fentanyl',primary:'fentanyl',secondaries:['4-anpp','phenethyl 4-anpp'],traces:['caffeine','mannitol']},
  {label:'Fentanyl + Benzo',primary:'fentanyl',secondaries:['xylazine','etizolam'],traces:['4-anpp','caffeine']},
  {label:'Cocaine + Levamisole',primary:'cocaine',secondaries:['levamisole','caffeine'],traces:['lidocaine','phenacetin']},
  {label:'Cocaine + Fentanyl',primary:'cocaine',secondaries:['fentanyl','lidocaine'],traces:['levamisole','caffeine']},
  {label:'Meth + Fentanyl',primary:'methamphetamine',secondaries:['fentanyl','caffeine'],traces:['xylazine','4-anpp']},
  {label:'Pure Meth',primary:'methamphetamine',secondaries:['caffeine','dimethyl sulfone (methylsulfonylmethane msm)'],traces:['isopropylbenzylamine']},
  {label:'Heroin + Fentanyl',primary:'heroin',secondaries:['fentanyl','4-anpp'],traces:['xylazine','caffeine']},
  {label:'Xylazine Heavy',primary:'xylazine',secondaries:['fentanyl','4-anpp'],traces:['caffeine','clonazolam']},
  {label:'Novel Opioid',primary:'nitazene',secondaries:['fentanyl','xylazine'],traces:['caffeine','4-anpp']},
  {label:'Fentanyl + Meth',primary:'fentanyl',secondaries:['methamphetamine','4-anpp'],traces:['caffeine','xylazine']},
  {label:'MDMA Tablet',primary:'mdma',secondaries:['caffeine','methamphetamine'],traces:['mda','ketamine']},
  {label:'Stimulant Mix',primary:'methamphetamine',secondaries:['cocaine','caffeine'],traces:['fentanyl','levamisole']},
  {label:'Fentanyl Solo',primary:'fentanyl',secondaries:['4-anpp'],traces:['caffeine']},
  {label:'Benzo Adulterant',primary:'fentanyl',secondaries:['clonazolam','etizolam'],traces:['xylazine','4-anpp']},
  {label:'Cocaine Solo',primary:'cocaine',secondaries:['caffeine','lidocaine'],traces:['phenacetin']},
];

const stage=scaffold({
  tag:'Nº 33 · SUPPLY · POINT CLUSTERS',
  title:'Sample Point Clusters',
  dek:'Each cluster is a sample archetype: the primary substance at center, trace compounds orbiting. Color = drug class. A grid that shows what the supply really looks like — not individual substances, but mixtures.',
  how:`Each <b>cluster</b> represents a common sample archetype derived from co-occurrence patterns in the dataset. The <b>center dot</b> (large, with thin ring) is the primary substance. Smaller dots orbit at different radii: <b>inner ring</b> = secondary/adulterant substances, <b>outer ring</b> = trace compounds. Color encodes drug class (orange = fentanyl/opioid, blue = stimulant, green = xylazine). Hover any dot to identify the substance. This format communicates the <b>polysubstance reality</b> of the supply — few samples contain just one substance. The archetypes shown are derived from the 15 most common substance co-occurrence patterns in the dataset.`,
  provenance:'Archetypes derived from top co-occurrence pairs in 6,580-sample dataset. Not individual samples — representative patterns.',
  harm:'These are archetypes, not guarantees. Any given sample may contain substances not shown here. Always test the specific sample you have.'
});

stage.innerHTML=`
<div id="clusterGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;padding:4px 0"></div>`;

const tt=tooltip();
const grid=document.getElementById('clusterGrid');

function drawCluster(archetype,size){
  const wrap=document.createElement('div');
  wrap.style.cssText=`display:flex;flex-direction:column;align-items:center;gap:8px;cursor:default`;

  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width',size);
  svg.setAttribute('height',size);
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label',`Sample cluster: ${archetype.label}`);
  svg.style.cssText='overflow:visible;display:block';

  const cx=size/2, cy=size/2;
  const R1=size*0.27; // inner ring radius
  const R2=size*0.43; // outer ring radius

  // Background circle
  const bg=document.createElementNS('http://www.w3.org/2000/svg','circle');
  bg.setAttribute('cx',cx); bg.setAttribute('cy',cy);
  bg.setAttribute('r',size*0.46);
  bg.setAttribute('fill','#121826'); bg.setAttribute('stroke',TOKENS.line); bg.setAttribute('stroke-width','1');
  svg.appendChild(bg);

  // Primary substance — large center dot with thin outline ring
  const primC=classify(archetype.primary);
  const primR=size*0.13;

  // Outer glow ring
  const glow=document.createElementNS('http://www.w3.org/2000/svg','circle');
  glow.setAttribute('cx',cx); glow.setAttribute('cy',cy);
  glow.setAttribute('r',primR+4);
  glow.setAttribute('fill','none');
  glow.setAttribute('stroke',primC.color);
  glow.setAttribute('stroke-width','1.5');
  glow.setAttribute('opacity','0.3');
  svg.appendChild(glow);

  const primDot=document.createElementNS('http://www.w3.org/2000/svg','circle');
  primDot.setAttribute('cx',cx); primDot.setAttribute('cy',cy);
  primDot.setAttribute('r',primR);
  primDot.setAttribute('fill',primC.color);
  primDot.setAttribute('opacity','0.9');
  primDot.style.cursor='pointer';
  primDot.addEventListener('mousemove',e=>tt.show(`<b style="text-transform:capitalize;color:${primC.color}">${archetype.primary}</b><br>${primC.label} · <i>primary</i>`,e.clientX,e.clientY));
  primDot.addEventListener('mouseleave',tt.hide);
  svg.appendChild(primDot);

  // Secondary substances — inner ring
  const secR=size*0.08;
  archetype.secondaries.forEach((sub,i)=>{
    const angle=(i/archetype.secondaries.length)*Math.PI*2 - Math.PI/2;
    const sx=cx+Math.cos(angle)*R1;
    const sy=cy+Math.sin(angle)*R1;
    const c=classify(sub);
    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('cx',sx); dot.setAttribute('cy',sy);
    dot.setAttribute('r',secR);
    dot.setAttribute('fill',c.color);
    dot.setAttribute('opacity','0.8');
    dot.setAttribute('stroke',TOKENS.bg); dot.setAttribute('stroke-width','1');
    dot.style.cursor='pointer';
    dot.addEventListener('mousemove',e=>tt.show(`<b style="text-transform:capitalize;color:${c.color}">${sub}</b><br>${c.label} · <i>secondary</i>`,e.clientX,e.clientY));
    dot.addEventListener('mouseleave',tt.hide);
    svg.appendChild(dot);
  });

  // Trace substances — outer ring (smaller)
  const traceR=size*0.055;
  archetype.traces.forEach((sub,i)=>{
    const angle=(i/archetype.traces.length)*Math.PI*2 + (Math.PI/archetype.traces.length) - Math.PI/2;
    const sx=cx+Math.cos(angle)*R2;
    const sy=cy+Math.sin(angle)*R2;
    const c=classify(sub);
    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('cx',sx); dot.setAttribute('cy',sy);
    dot.setAttribute('r',traceR);
    dot.setAttribute('fill',c.color);
    dot.setAttribute('opacity','0.55');
    dot.style.cursor='pointer';
    dot.addEventListener('mousemove',e=>tt.show(`<b style="text-transform:capitalize;color:${c.color}">${sub}</b><br>${c.label} · <i>trace</i>`,e.clientX,e.clientY));
    dot.addEventListener('mouseleave',tt.hide);
    svg.appendChild(dot);
  });

  const lbl=document.createElement('div');
  lbl.style.cssText=`font-size:11px;text-align:center;color:${TOKENS.muted};font-weight:600;line-height:1.3`;
  lbl.textContent=archetype.label;

  const sublbl=document.createElement('div');
  sublbl.style.cssText=`font-size:10px;text-align:center;color:${classify(archetype.primary).color};text-transform:capitalize`;
  sublbl.textContent=archetype.primary;

  wrap.appendChild(svg);
  wrap.appendChild(lbl);
  wrap.appendChild(sublbl);
  return wrap;
}

function render(){
  grid.innerHTML='';
  ARCHETYPES.forEach(a=>grid.appendChild(drawCluster(a,140)));
}

// Legend
const legendWrap=document.createElement('div');
legendWrap.style.cssText='margin-top:18px;padding:12px 16px;background:#1a2234;border-radius:10px;display:flex;gap:18px;flex-wrap:wrap;font-size:11px;align-items:center';
legendWrap.innerHTML=`
  <span class="muted" style="font-weight:700;font-size:10px;letter-spacing:.1em">RING KEY:</span>
  <span style="display:flex;align-items:center;gap:6px"><svg width="22" height="22"><circle cx="11" cy="11" r="7" fill="${TOKENS.fent}" opacity="0.9"/><circle cx="11" cy="11" r="11" fill="none" stroke="${TOKENS.fent}" stroke-width="1.5" opacity="0.35"/></svg><span style="color:${TOKENS.muted}">Primary substance (center + ring)</span></span>
  <span style="display:flex;align-items:center;gap:6px"><svg width="22" height="22"><circle cx="11" cy="11" r="5" fill="${TOKENS.stim}" opacity="0.8"/></svg><span style="color:${TOKENS.muted}">Secondary / adulterant (inner ring)</span></span>
  <span style="display:flex;align-items:center;gap:6px"><svg width="22" height="22"><circle cx="11" cy="11" r="3.5" fill="${TOKENS.cut}" opacity="0.55"/></svg><span style="color:${TOKENS.muted}">Trace compound (outer ring)</span></span>`;
stage.appendChild(legendWrap);

render();
