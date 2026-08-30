/* Design Lab layout signature — Undirected Co-occurrence Chord */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-12c');
  if(!document.getElementById('dcf-design-sig-12c_co_undirected')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-12c_co_undirected';
    s.textContent=`.dcf-design-undirected .panel{padding:8px}`;
    document.head.appendChild(s);
  }
})();
