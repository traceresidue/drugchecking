/* Design Lab layout signature — Anatomy of a Sample (Scrollytelling) */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-24');
  if(!document.getElementById('dcf-design-sig-24_anatomy_scrolly')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-24_anatomy_scrolly';
    s.textContent=`.dcf-design-scrolly .sticky{box-shadow:inset 3px 0 0 var(--ok)}`;
    document.head.appendChild(s);
  }
})();
