/* Design Lab layout signature — Substance Horizon Wall */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-14');
  if(!document.getElementById('dcf-design-sig-14_horizon_wall')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-14_horizon_wall';
    s.textContent=`.dcf-design-horizon .panel{overflow-x:auto}`;
    document.head.appendChild(s);
  }
})();
