/* Design Lab layout signature — Batch Ridgeline — Class Fills */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-06a');
  if(!document.getElementById('dcf-design-sig-06a_ridgeline_filled')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-06a_ridgeline_filled';
    s.textContent=`.dcf-design-ridge-filled .controls{margin-bottom:6px}`;
    document.head.appendChild(s);
  }
})();
