/* Design Lab layout signature — Expected vs. Detected Sankey */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-13');
  if(!document.getElementById('dcf-design-sig-13_expected_detected_sankey')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-13_expected_detected_sankey';
    s.textContent=`.dcf-design-sankey .panel{border-top:3px solid var(--c-fent)}`;
    document.head.appendChild(s);
  }
})();
