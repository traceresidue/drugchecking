/* Design Lab layout signature — Chord → Sankey Co-occurrence */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-12b');
  if(!document.getElementById('dcf-design-sig-12b_chord_sankey')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-12b_chord_sankey';
    s.textContent=`.dcf-design-chord-sankey .panel{display:grid;gap:12px}`;
    document.head.appendChild(s);
  }
})();
