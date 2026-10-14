/* Design Lab layout signature — Expected-Reality Gap */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-19');
  if(!document.getElementById('dcf-design-sig-19_expected_reality_gap')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-19_expected_reality_gap';
    s.textContent=`.dcf-design-gap #caption{font-size:15px;line-height:1.55;padding:10px 0}`;
    document.head.appendChild(s);
  }
})();
