/* Design Lab layout signature — FTIR Overlay & Subtraction Bench */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-03');
  if(!document.getElementById('dcf-design-sig-03_ftir_overlay')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-03_ftir_overlay';
    s.textContent=`.dcf-design-ftir .panel{border-left:4px solid var(--c-fent)}`;
    document.head.appendChild(s);
  }
})();
