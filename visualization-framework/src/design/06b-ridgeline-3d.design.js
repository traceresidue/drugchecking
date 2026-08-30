/* Design Lab layout signature — Batch Ridgeline — 3D Terrain */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-06b');
  if(!document.getElementById('dcf-design-sig-06b_ridgeline_3d')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-06b_ridgeline_3d';
    s.textContent=`.dcf-design-ridge-3d #plot{border-radius:12px}`;
    document.head.appendChild(s);
  }
})();
