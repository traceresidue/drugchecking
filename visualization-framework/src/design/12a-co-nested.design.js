/* Design Lab layout signature — Nested Co-occurrence Chord */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-12a');
  if(!document.getElementById('dcf-design-sig-12a_co_nested')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-12a_co_nested';
    s.textContent=`.dcf-design-nested-chord .panel{padding:12px}`;
    document.head.appendChild(s);
  }
})();
