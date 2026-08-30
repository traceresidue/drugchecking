/* Design Lab layout signature — FTIR Waterfall (3D) */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-07');
  if(!document.getElementById('dcf-design-sig-07_ftir_waterfall')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-07_ftir_waterfall';
    s.textContent=`.dcf-design-waterfall #plot{border-radius:12px}`;
    document.head.appendChild(s);
  }
})();
