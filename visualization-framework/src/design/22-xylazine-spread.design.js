/* Design Lab layout signature — Xylazine Spread Timeline */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-22');
  if(!document.getElementById('dcf-design-sig-22_xylazine_spread')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-22_xylazine_spread';
    s.textContent=`.dcf-design-xyl #month-label{font:600 14px ui-monospace;color:var(--c-xyl)}`;
    document.head.appendChild(s);
  }
})();
