/* Design Lab layout signature — Supply Tile-Grid Cartogram */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-21');
  if(!document.getElementById('dcf-design-sig-21_geo_tilegrid')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-21_geo_tilegrid';
    s.textContent=`.dcf-design-geo .panel svg{max-width:720px}`;
    document.head.appendChild(s);
  }
})();
