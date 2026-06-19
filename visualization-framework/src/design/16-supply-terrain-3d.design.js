/* Design Lab layout signature — Supply Terrain (3D) */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-16');
  if(!document.getElementById('dcf-design-sig-16_supply_terrain_3d')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-16_supply_terrain_3d';
    s.textContent=`.dcf-design-terrain #plot{border-radius:12px}`;
    document.head.appendChild(s);
  }
})();
