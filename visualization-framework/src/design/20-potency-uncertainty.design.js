/* Design Lab layout signature — Potency Uncertainty Gauge */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-20');
  if(!document.getElementById('dcf-design-sig-20_potency_uncertainty')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-20_potency_uncertainty';
    s.textContent=`.dcf-design-gauge #claim{font:700 32px ui-monospace;color:var(--ink)}`;
    document.head.appendChild(s);
  }
})();
