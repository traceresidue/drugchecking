/* Design Lab layout signature — GC–MS Data Cube (3D) */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-05');
  if(!document.getElementById('dcf-design-sig-05_chromatogram_3d')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-05_chromatogram_3d';
    s.textContent=`.dcf-design-cube #plot{border-radius:12px;overflow:hidden}`;
    document.head.appendChild(s);
  }
})();
