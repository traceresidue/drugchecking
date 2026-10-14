/* Design Lab layout signature — Batch Ridgeline — Class Focus */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-06c');
  if(!document.getElementById('dcf-design-sig-06c_ridgeline_filter')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-06c_ridgeline_filter';
    s.textContent=`.dcf-design-ridge-filter .dcf-design-bar{margin-bottom:12px}`;
    document.head.appendChild(s);
  }
})();
