/* Design Lab layout signature — Hear the Spectrum (Sonification) */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-09');
  if(!document.getElementById('dcf-design-sig-09_sonification')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-09_sonification';
    s.textContent=`.dcf-design-sonify .controls{justify-content:flex-start;gap:12px}`;
    document.head.appendChild(s);
  }
})();
