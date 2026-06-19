/* Design Lab layout signature — Structure Flipbook */
(function(){
  const stage=document.getElementById('stage');
  if(!stage) return;
  stage.classList.add('dcf-design-23');
  if(!document.getElementById('dcf-design-sig-23_structure_flipbook')){
    const s=document.createElement('style');
    s.id='dcf-design-sig-23_structure_flipbook';
    s.textContent=`.dcf-design-flipbook #grid .panel:first-child{grid-column:span 2}`;
    document.head.appendChild(s);
  }
})();
