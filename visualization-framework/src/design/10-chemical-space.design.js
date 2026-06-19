/* Design Lab layout signature — Chemical-Space Drift */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-10');
  if(!document.getElementById('dcf-design-sig-10_chemical_space')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-10_chemical_space';
    s.textContent=`.dcf-design-chemspace #month-readout{font:700 28px ui-monospace;color:var(--ink)}`;
    document.head.appendChild(s);
  }
})();
