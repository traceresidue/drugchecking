/* Shared co-occurrence network prep for Nº 17 / 17a / 17b / 17c. */
const CO=DATA.cooccurrence, SUB=DATA.top_substances, ROLES=DATA.roles;

const counts=Object.fromEntries(SUB.map(d=>[d.substance,d.samples]));
const nodeNames=[...new Set(CO.flatMap(d=>[d.a,d.b]))].filter(n=>counts[n]).sort((a,b)=>counts[b]-counts[a]).slice(0,22);
const nset=new Set(nodeNames);

function makeNodes(){
  return nodeNames.map(n=>({id:n,v:counts[n],...classify(n)}));
}

function makeLinks(){
  return CO.filter(d=>nset.has(d.a)&&nset.has(d.b)).map(d=>({source:d.a,target:d.b,v:d.n}));
}

function shortLabel(id,max=14){
  return id.length>max?id.slice(0,max-1)+'…':id;
}

function pullTargets(nodes){
  const picks=['xylazine','fentanyl','methamphetamine','methyl ecgonidine (med)','heroin','cocaine','4-anpp','caffeine','lidocaine','acetaminophen'];
  return picks.filter(id=>nodes.some(n=>n.id===id));
}

function neighborsOf(id,links){
  const out=[];
  links.forEach(l=>{
    const s=typeof l.source==='object'?l.source.id:l.source;
    const t=typeof l.target==='object'?l.target.id:l.target;
    if(s===id) out.push({id:t,v:l.v});
    else if(t===id) out.push({id:s,v:l.v});
  });
  return out.sort((a,b)=>b.v-a.v);
}

function renderLegend(nodes,hostId){
  const cls=[...new Set(nodes.map(n=>n.cls))];
  const host=document.getElementById(hostId);
  if(!host) return;
  host.innerHTML=cls.map(c=>{
    const o=nodes.find(n=>n.cls===c);
    return `<span><i style="background:${o.color}"></i>${o.label}</span>`;
  }).join('');
}

function nodeTooltipHtml(d){
  return `<b style="text-transform:capitalize">${d.id}</b><br><span class="muted">${d.label} · ${ROLES[d.id]||''}</span><br><span class="muted">${fmt.int(d.v)} samples</span>`;
}
