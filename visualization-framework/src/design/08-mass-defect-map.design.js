/* Design Lab layout signature — Mass-Defect Constellation */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-08');
  if(!document.getElementById('dcf-design-sig-08_mass_defect_map')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-08_mass_defect_map';
    s.textContent=`.dcf-design-massdef .panel{min-height:480px}`;
    document.head.appendChild(s);
  }
})();
