/* Design Lab layout signature — Fragmentation Radial */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-04');
  if(!document.getElementById('dcf-design-sig-04_fragment_tree')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-04_fragment_tree';
    s.textContent=`.dcf-design-radial .panel{border-radius:50%;max-width:560px;margin:0 auto}`;
    document.head.appendChild(s);
  }
})();
