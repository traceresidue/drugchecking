/* Design Lab layout signature — Sample Glyph Garden */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-25');
  if(!document.getElementById('dcf-design-sig-25_glyph_garden')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-25_glyph_garden';
    s.textContent=`.dcf-design-garden .panel svg{border-radius:50%}`;
    document.head.appendChild(s);
  }
})();
