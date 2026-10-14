/* Design Lab layout signature — Novel-Substance Emergence Swarm */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-15');
  if(!document.getElementById('dcf-design-sig-15_emergence_beeswarm')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-15_emergence_beeswarm';
    s.textContent=`.dcf-design-beeswarm .panel{position:relative}`;
    document.head.appendChild(s);
  }
})();
