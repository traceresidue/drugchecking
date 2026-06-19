/* Design Lab layout signature — Batch Ridgeline Fingerprints */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-06');
  if(!document.getElementById('dcf-design-sig-06_spectral_ridgeline')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-06_spectral_ridgeline';
    s.textContent=`.dcf-design-ridge .panel{padding-top:8px}`;
    document.head.appendChild(s);
  }
})();
